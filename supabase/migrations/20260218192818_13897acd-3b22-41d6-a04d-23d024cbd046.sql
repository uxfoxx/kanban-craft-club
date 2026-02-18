
-- Add budget column to tasks (keep cost for backward compat, copy data)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS budget numeric(12,2) NOT NULL DEFAULT 0;
UPDATE public.tasks SET budget = cost WHERE budget = 0 AND cost > 0;

-- Add commission fields to subtasks
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS commission_type text DEFAULT NULL;
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS commission_value numeric(12,2) NOT NULL DEFAULT 0;

-- Add commission_source and subtask_id to task_commissions
ALTER TABLE public.task_commissions ADD COLUMN IF NOT EXISTS commission_source text DEFAULT 'manual';
ALTER TABLE public.task_commissions ADD COLUMN IF NOT EXISTS subtask_id uuid REFERENCES public.subtasks(id) ON DELETE SET NULL DEFAULT NULL;

-- Add potential_balance to user_wallets
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS potential_balance numeric(12,2) NOT NULL DEFAULT 0;

-- Replace recalculate_project_financials function with task-budget-based logic
CREATE OR REPLACE FUNCTION public.recalculate_project_financials(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget numeric(12,2);
  v_overhead_expenses numeric(12,2);
  v_total_task_budgets numeric(12,2);
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
  r record;
  v_task_budget numeric(12,2);
  v_manager_share numeric(12,2);
  v_subtask_share numeric(12,2);
  v_assignee_count integer;
BEGIN
  -- Get project data
  SELECT budget, overhead_expenses, company_share_pct, team_share_pct, finder_commission_pct
  INTO v_budget, v_overhead_expenses, v_company_pct, v_team_pct, v_finder_pct
  FROM public.projects WHERE id = p_project_id;

  -- Sum task budgets as direct expenses
  SELECT COALESCE(SUM(budget), 0) INTO v_total_task_budgets
  FROM public.tasks WHERE project_id = p_project_id;

  UPDATE public.projects SET direct_expenses = v_total_task_budgets WHERE id = p_project_id;

  v_total_expenses := v_total_task_budgets + v_overhead_expenses;
  v_gross_profit := v_budget - v_total_expenses;
  v_is_frozen := v_gross_profit <= 0;

  IF v_is_frozen THEN
    v_company_earnings := 0; v_team_pool := 0; v_finder_commission := 0;
  ELSE
    v_company_earnings := v_gross_profit * v_company_pct / 100;
    v_team_pool := v_gross_profit * v_team_pct / 100;
    v_finder_commission := v_gross_profit * v_finder_pct / 100;
  END IF;

  -- Upsert project_financials
  INSERT INTO public.project_financials (project_id, total_expenses, gross_profit, company_earnings, team_pool, finder_commission, is_frozen, updated_at)
  VALUES (p_project_id, v_total_expenses, v_gross_profit, v_company_earnings, v_team_pool, v_finder_commission, v_is_frozen, now())
  ON CONFLICT (project_id) DO UPDATE SET
    total_expenses = EXCLUDED.total_expenses, gross_profit = EXCLUDED.gross_profit,
    company_earnings = EXCLUDED.company_earnings, team_pool = EXCLUDED.team_pool,
    finder_commission = EXCLUDED.finder_commission, is_frozen = EXCLUDED.is_frozen, updated_at = now();

  -- Find done column
  SELECT id INTO v_done_column_id
  FROM public.kanban_columns
  WHERE project_id = p_project_id AND lower(name) = 'done'
  LIMIT 1;

  IF v_is_frozen THEN
    -- Revert confirmed commissions from wallets
    FOR r IN SELECT tc.id, tc.user_id, tc.amount FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed'
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;
    -- Freeze all
    UPDATE public.task_commissions SET status = 'frozen', updated_at = now()
    WHERE project_id = p_project_id;
    -- Reset potential balances for this project's users
    UPDATE public.user_wallets SET potential_balance = 0, updated_at = now()
    WHERE user_id IN (SELECT DISTINCT user_id FROM public.task_commissions WHERE project_id = p_project_id);
  ELSE
    -- Revert non-manual confirmed commissions from wallets
    FOR r IN SELECT tc.id, tc.user_id, tc.amount FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed' AND tc.manual_override = false
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;
    -- Delete non-manual commissions
    DELETE FROM public.task_commissions WHERE project_id = p_project_id AND manual_override = false;

    -- Process completed tasks (in done column)
    IF v_done_column_id IS NOT NULL THEN
      FOR r IN SELECT t.id as task_id, t.budget as task_budget
                FROM public.tasks t
                WHERE t.project_id = p_project_id AND t.column_id = v_done_column_id AND t.budget > 0
      LOOP
        v_task_budget := r.task_budget;
        -- 10% to task manager (first assignee)
        v_manager_share := v_task_budget * 0.10;
        DECLARE
          v_manager_id uuid;
        BEGIN
          SELECT ta.user_id INTO v_manager_id
          FROM public.task_assignees ta
          WHERE ta.task_id = r.task_id
          ORDER BY ta.created_at ASC
          LIMIT 1;

          IF v_manager_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.task_commissions tc
            WHERE tc.task_id = r.task_id AND tc.user_id = v_manager_id AND tc.manual_override = true
          ) THEN
            INSERT INTO public.task_commissions (project_id, task_id, user_id, amount, status, commission_source, manual_override, updated_at)
            VALUES (p_project_id, r.task_id, v_manager_id, v_manager_share, 'confirmed', 'task_manager', false, now())
            ON CONFLICT (task_id, user_id) DO UPDATE SET
              amount = EXCLUDED.amount, status = 'confirmed', commission_source = 'task_manager', manual_override = false, updated_at = now();
            UPDATE public.user_wallets SET balance = balance + v_manager_share, updated_at = now() WHERE user_id = v_manager_id;
          END IF;
        END;

        -- Subtask commissions
        FOR r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value
                  FROM public.subtasks s
                  WHERE s.task_id = r.task_id AND s.commission_type IS NOT NULL AND s.commission_value > 0
        LOOP
          IF r.commission_type = 'percentage' THEN
            v_subtask_share := (r.commission_value / 100) * v_task_budget;
          ELSE
            v_subtask_share := r.commission_value;
          END IF;

          -- Distribute to subtask assignees
          SELECT COUNT(*) INTO v_assignee_count FROM public.subtask_assignees WHERE subtask_id = r.subtask_id;
          IF v_assignee_count > 0 THEN
            DECLARE
              v_per_assignee numeric(12,2);
              sa record;
            BEGIN
              v_per_assignee := v_subtask_share / v_assignee_count;
              FOR sa IN SELECT user_id FROM public.subtask_assignees WHERE subtask_id = r.subtask_id
              LOOP
                IF NOT EXISTS (
                  SELECT 1 FROM public.task_commissions tc
                  WHERE tc.task_id = r.task_id AND tc.subtask_id = r.subtask_id AND tc.user_id = sa.user_id AND tc.manual_override = true
                ) THEN
                  INSERT INTO public.task_commissions (project_id, task_id, subtask_id, user_id, amount, status, commission_source, manual_override, updated_at)
                  VALUES (p_project_id, r.task_id, r.subtask_id, sa.user_id, v_per_assignee, 'confirmed', 'subtask', false, now())
                  ON CONFLICT (task_id, user_id) DO UPDATE SET
                    amount = EXCLUDED.amount, status = 'confirmed', commission_source = 'subtask', subtask_id = r.subtask_id, manual_override = false, updated_at = now();
                  UPDATE public.user_wallets SET balance = balance + v_per_assignee, updated_at = now() WHERE user_id = sa.user_id;
                END IF;
              END LOOP;
            END;
          END IF;
        END LOOP;
      END LOOP;
    END IF;

    -- Calculate potential earnings for incomplete tasks
    -- Reset potential balances first
    UPDATE public.user_wallets SET potential_balance = 0, updated_at = now()
    WHERE user_id IN (
      SELECT DISTINCT ta.user_id FROM public.task_assignees ta
      JOIN public.tasks t ON t.id = ta.task_id WHERE t.project_id = p_project_id
      UNION
      SELECT DISTINCT sa.user_id FROM public.subtask_assignees sa
      JOIN public.subtasks s ON s.id = sa.subtask_id
      JOIN public.tasks t ON t.id = s.task_id WHERE t.project_id = p_project_id
    );

    -- Add potential for incomplete tasks
    FOR r IN SELECT t.id as task_id, t.budget as task_budget
              FROM public.tasks t
              WHERE t.project_id = p_project_id AND t.budget > 0
              AND (v_done_column_id IS NULL OR t.column_id != v_done_column_id)
    LOOP
      v_task_budget := r.task_budget;
      -- Potential 10% for task manager
      DECLARE
        v_mgr uuid;
      BEGIN
        SELECT ta.user_id INTO v_mgr FROM public.task_assignees ta
        WHERE ta.task_id = r.task_id ORDER BY ta.created_at ASC LIMIT 1;
        IF v_mgr IS NOT NULL THEN
          UPDATE public.user_wallets SET potential_balance = potential_balance + (v_task_budget * 0.10), updated_at = now()
          WHERE user_id = v_mgr;
        END IF;
      END;

      -- Potential for subtask assignees
      DECLARE
        sub record;
        v_sub_share numeric(12,2);
        v_sub_count integer;
      BEGIN
        FOR sub IN SELECT s.id as subtask_id, s.commission_type, s.commission_value
                    FROM public.subtasks s WHERE s.task_id = r.task_id AND s.commission_type IS NOT NULL AND s.commission_value > 0
        LOOP
          IF sub.commission_type = 'percentage' THEN
            v_sub_share := (sub.commission_value / 100) * v_task_budget;
          ELSE
            v_sub_share := sub.commission_value;
          END IF;
          SELECT COUNT(*) INTO v_sub_count FROM public.subtask_assignees WHERE subtask_id = sub.subtask_id;
          IF v_sub_count > 0 THEN
            DECLARE
              v_per numeric(12,2);
              sa2 record;
            BEGIN
              v_per := v_sub_share / v_sub_count;
              FOR sa2 IN SELECT user_id FROM public.subtask_assignees WHERE subtask_id = sub.subtask_id
              LOOP
                UPDATE public.user_wallets SET potential_balance = potential_balance + v_per, updated_at = now()
                WHERE user_id = sa2.user_id;
              END LOOP;
            END;
          END IF;
        END LOOP;
      END;
    END LOOP;
  END IF;
END;
$function$;
