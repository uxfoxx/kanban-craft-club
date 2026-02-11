
-- Add manual_override column
ALTER TABLE public.task_commissions ADD COLUMN manual_override boolean NOT NULL DEFAULT false;

-- Add UPDATE RLS policy for project owners and org admins
CREATE POLICY "Project owners and org admins can update commissions"
ON public.task_commissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = task_commissions.project_id
    AND (
      p.owner_id = auth.uid()
      OR is_organization_admin(p.organization_id, auth.uid())
      OR is_organization_owner(p.organization_id, auth.uid())
    )
  )
);

-- Replace recalculate_project_financials to respect manual_override
CREATE OR REPLACE FUNCTION public.recalculate_project_financials(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget numeric(12,2);
  v_direct_expenses numeric(12,2);
  v_overhead_expenses numeric(12,2);
  v_total_expenses numeric(12,2);
  v_gross_profit numeric(12,2);
  v_company_pct numeric(5,2);
  v_team_pct numeric(5,2);
  v_finder_pct numeric(5,2);
  v_company_earnings numeric(12,2);
  v_team_pool numeric(12,2);
  v_finder_commission numeric(12,2);
  v_is_frozen boolean;
  v_done_column_id uuid;
  v_total_weight numeric;
  v_completed_task_count integer;
  v_manual_total numeric(12,2);
  r record;
BEGIN
  -- Get project data
  SELECT budget, overhead_expenses, company_share_pct, team_share_pct, finder_commission_pct
  INTO v_budget, v_overhead_expenses, v_company_pct, v_team_pct, v_finder_pct
  FROM public.projects WHERE id = p_project_id;

  -- Sum task costs
  SELECT COALESCE(SUM(cost), 0) INTO v_direct_expenses
  FROM public.tasks WHERE project_id = p_project_id;

  UPDATE public.projects SET direct_expenses = v_direct_expenses WHERE id = p_project_id;

  v_total_expenses := v_direct_expenses + v_overhead_expenses;
  v_gross_profit := v_budget - v_total_expenses;
  v_is_frozen := v_gross_profit <= 0;

  IF v_is_frozen THEN
    v_company_earnings := 0;
    v_team_pool := 0;
    v_finder_commission := 0;
  ELSE
    v_company_earnings := v_gross_profit * v_company_pct / 100;
    v_team_pool := v_gross_profit * v_team_pct / 100;
    v_finder_commission := v_gross_profit * v_finder_pct / 100;
  END IF;

  -- Upsert project_financials
  INSERT INTO public.project_financials (project_id, total_expenses, gross_profit, company_earnings, team_pool, finder_commission, is_frozen, updated_at)
  VALUES (p_project_id, v_total_expenses, v_gross_profit, v_company_earnings, v_team_pool, v_finder_commission, v_is_frozen, now())
  ON CONFLICT (project_id) DO UPDATE SET
    total_expenses = EXCLUDED.total_expenses,
    gross_profit = EXCLUDED.gross_profit,
    company_earnings = EXCLUDED.company_earnings,
    team_pool = EXCLUDED.team_pool,
    finder_commission = EXCLUDED.finder_commission,
    is_frozen = EXCLUDED.is_frozen,
    updated_at = now();

  SELECT id INTO v_done_column_id
  FROM public.kanban_columns
  WHERE project_id = p_project_id AND lower(name) = 'done'
  LIMIT 1;

  IF v_is_frozen THEN
    -- Freeze all commissions, revert wallet for non-overridden confirmed ones
    FOR r IN SELECT tc.id, tc.user_id, tc.amount, tc.status, tc.manual_override
              FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed'
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;

    -- Freeze all but preserve manual_override flag
    UPDATE public.task_commissions
    SET status = 'frozen', amount = CASE WHEN manual_override THEN amount ELSE 0 END, updated_at = now()
    WHERE project_id = p_project_id;
  ELSE
    -- Revert wallet balances for NON-overridden confirmed commissions only
    FOR r IN SELECT tc.id, tc.user_id, tc.amount, tc.status
              FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed' AND tc.manual_override = false
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;

    -- Delete only non-overridden commissions
    DELETE FROM public.task_commissions WHERE project_id = p_project_id AND manual_override = false;

    -- Get total of manual override amounts to subtract from pool
    SELECT COALESCE(SUM(amount), 0) INTO v_manual_total
    FROM public.task_commissions
    WHERE project_id = p_project_id AND manual_override = true;

    -- Calculate completed tasks
    SELECT COUNT(*), COALESCE(SUM(COALESCE(weight_pct, 0)), 0)
    INTO v_completed_task_count, v_total_weight
    FROM public.tasks
    WHERE project_id = p_project_id AND column_id = v_done_column_id;

    -- Remaining pool after manual overrides
    DECLARE
      v_remaining_pool numeric(12,2);
    BEGIN
      v_remaining_pool := GREATEST(v_team_pool - v_manual_total, 0);

      -- Count non-overridden completed tasks
      DECLARE
        v_auto_task_count integer;
        v_auto_total_weight numeric;
      BEGIN
        SELECT COUNT(*), COALESCE(SUM(COALESCE(t.weight_pct, 0)), 0)
        INTO v_auto_task_count, v_auto_total_weight
        FROM public.tasks t
        JOIN public.task_assignees ta ON ta.task_id = t.id
        WHERE t.project_id = p_project_id AND t.column_id = v_done_column_id
        AND NOT EXISTS (
          SELECT 1 FROM public.task_commissions tc
          WHERE tc.task_id = t.id AND tc.user_id = ta.user_id AND tc.manual_override = true
        );

        IF v_auto_task_count > 0 AND v_done_column_id IS NOT NULL THEN
          FOR r IN SELECT t.id as task_id, t.weight_pct, ta.user_id
                    FROM public.tasks t
                    JOIN public.task_assignees ta ON ta.task_id = t.id
                    WHERE t.project_id = p_project_id AND t.column_id = v_done_column_id
                    AND NOT EXISTS (
                      SELECT 1 FROM public.task_commissions tc
                      WHERE tc.task_id = t.id AND tc.user_id = ta.user_id AND tc.manual_override = true
                    )
          LOOP
            DECLARE
              v_share numeric(12,2);
            BEGIN
              IF v_auto_total_weight > 0 THEN
                v_share := v_remaining_pool * COALESCE(r.weight_pct, 0) / v_auto_total_weight;
              ELSE
                v_share := v_remaining_pool / v_auto_task_count;
              END IF;

              INSERT INTO public.task_commissions (project_id, task_id, user_id, amount, status, manual_override, updated_at)
              VALUES (p_project_id, r.task_id, r.user_id, v_share, 'confirmed', false, now())
              ON CONFLICT (task_id, user_id) DO UPDATE SET
                amount = EXCLUDED.amount, status = 'confirmed', manual_override = false, updated_at = now();

              UPDATE public.user_wallets SET balance = balance + v_share, updated_at = now()
              WHERE user_id = r.user_id;
            END;
          END LOOP;
        END IF;
      END;
    END;

    -- Re-credit manual override confirmed commissions to wallets
    FOR r IN SELECT tc.user_id, tc.amount
              FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.manual_override = true AND tc.status = 'confirmed'
    LOOP
      -- These were not reverted above, so no action needed
      NULL;
    END LOOP;
  END IF;
END;
$function$;
