
-- 1. New columns on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS budget numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS direct_expenses numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_expenses numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS company_share_pct numeric(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS team_share_pct numeric(5,2) NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS finder_commission_pct numeric(5,2) NOT NULL DEFAULT 10;

-- 2. New columns on tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight_pct numeric(5,2);

-- 3. Organization plugins table
CREATE TABLE public.organization_plugins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plugin_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, plugin_name)
);
ALTER TABLE public.organization_plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view plugins"
  ON public.organization_plugins FOR SELECT
  USING (is_organization_member(organization_id, auth.uid()));

CREATE POLICY "Org owners and admins can manage plugins"
  ON public.organization_plugins FOR INSERT
  WITH CHECK (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

CREATE POLICY "Org owners and admins can update plugins"
  ON public.organization_plugins FOR UPDATE
  USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

CREATE POLICY "Org owners and admins can delete plugins"
  ON public.organization_plugins FOR DELETE
  USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

-- 4. Project financials table
CREATE TABLE public.project_financials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  total_expenses numeric(12,2) NOT NULL DEFAULT 0,
  gross_profit numeric(12,2) NOT NULL DEFAULT 0,
  company_earnings numeric(12,2) NOT NULL DEFAULT 0,
  team_pool numeric(12,2) NOT NULL DEFAULT 0,
  finder_commission numeric(12,2) NOT NULL DEFAULT 0,
  is_frozen boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view financials"
  ON public.project_financials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_financials.project_id
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
    )
  );

-- 5. Task commissions table
CREATE TABLE public.task_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);
ALTER TABLE public.task_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commissions"
  ON public.task_commissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Project owners can view all commissions"
  ON public.task_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = task_commissions.project_id
      AND (p.owner_id = auth.uid() OR is_project_organization_member(p.id, auth.uid()))
    )
  );

-- 6. User wallets table
CREATE TABLE public.user_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  monthly_target numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.user_wallets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own wallet"
  ON public.user_wallets FOR UPDATE
  USING (user_id = auth.uid());

-- 7. Auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_wallet();

-- 8. Recalculate project financials function
CREATE OR REPLACE FUNCTION public.recalculate_project_financials(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  r record;
  v_old_amount numeric(12,2);
  v_old_status text;
BEGIN
  -- Get project data
  SELECT budget, overhead_expenses, company_share_pct, team_share_pct, finder_commission_pct
  INTO v_budget, v_overhead_expenses, v_company_pct, v_team_pct, v_finder_pct
  FROM public.projects WHERE id = p_project_id;

  -- Sum task costs
  SELECT COALESCE(SUM(cost), 0) INTO v_direct_expenses
  FROM public.tasks WHERE project_id = p_project_id;

  -- Update direct_expenses on project
  UPDATE public.projects SET direct_expenses = v_direct_expenses WHERE id = p_project_id;

  -- Calculate
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

  -- Find the "Done" column for this project
  SELECT id INTO v_done_column_id
  FROM public.kanban_columns
  WHERE project_id = p_project_id AND lower(name) = 'done'
  LIMIT 1;

  IF v_is_frozen THEN
    -- Freeze all commissions and revert wallet balances for confirmed ones
    FOR r IN SELECT tc.id, tc.user_id, tc.amount, tc.status
              FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed'
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;

    UPDATE public.task_commissions
    SET status = 'frozen', amount = 0, updated_at = now()
    WHERE project_id = p_project_id;
  ELSE
    -- Calculate completed task count and total weight
    SELECT COUNT(*), COALESCE(SUM(COALESCE(weight_pct, 0)), 0)
    INTO v_completed_task_count, v_total_weight
    FROM public.tasks
    WHERE project_id = p_project_id AND column_id = v_done_column_id;

    -- Clear old confirmed amounts from wallets before recalculating
    FOR r IN SELECT tc.id, tc.user_id, tc.amount, tc.status
              FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed'
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;

    -- Delete existing commissions for this project
    DELETE FROM public.task_commissions WHERE project_id = p_project_id;

    -- Distribute to completed tasks
    IF v_completed_task_count > 0 AND v_done_column_id IS NOT NULL THEN
      FOR r IN SELECT t.id as task_id, t.weight_pct, ta.user_id
                FROM public.tasks t
                JOIN public.task_assignees ta ON ta.task_id = t.id
                WHERE t.project_id = p_project_id AND t.column_id = v_done_column_id
      LOOP
        DECLARE
          v_share numeric(12,2);
        BEGIN
          IF v_total_weight > 0 THEN
            v_share := v_team_pool * COALESCE(r.weight_pct, 0) / v_total_weight;
          ELSE
            v_share := v_team_pool / v_completed_task_count;
          END IF;

          INSERT INTO public.task_commissions (project_id, task_id, user_id, amount, status, updated_at)
          VALUES (p_project_id, r.task_id, r.user_id, v_share, 'confirmed', now())
          ON CONFLICT (task_id, user_id) DO UPDATE SET
            amount = EXCLUDED.amount, status = 'confirmed', updated_at = now();

          -- Credit wallet
          UPDATE public.user_wallets SET balance = balance + v_share, updated_at = now()
          WHERE user_id = r.user_id;
        END;
      END LOOP;
    END IF;
  END IF;
END;
$$;

-- 9. Trigger on tasks for recalculation
CREATE OR REPLACE FUNCTION public.trigger_recalc_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
  v_plugin_enabled boolean;
BEGIN
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);

  -- Check if expenses plugin is enabled for this project's org
  SELECT op.enabled INTO v_plugin_enabled
  FROM public.projects p
  JOIN public.organization_plugins op ON op.organization_id = p.organization_id AND op.plugin_name = 'expenses'
  WHERE p.id = v_project_id;

  IF COALESCE(v_plugin_enabled, false) THEN
    PERFORM public.recalculate_project_financials(v_project_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalc_on_task_change
  AFTER INSERT OR UPDATE OF cost, column_id, weight_pct OR DELETE
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_task();

-- 10. Trigger on projects for recalculation
CREATE OR REPLACE FUNCTION public.trigger_recalc_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plugin_enabled boolean;
BEGIN
  SELECT op.enabled INTO v_plugin_enabled
  FROM public.organization_plugins op
  WHERE op.organization_id = NEW.organization_id AND op.plugin_name = 'expenses';

  IF COALESCE(v_plugin_enabled, false) THEN
    PERFORM public.recalculate_project_financials(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recalc_on_project_change
  AFTER UPDATE OF budget, overhead_expenses, company_share_pct, team_share_pct, finder_commission_pct
  ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_project();

-- 11. Trigger for lead assignment notification
CREATE OR REPLACE FUNCTION public.notify_lead_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND (OLD.lead_id IS NULL OR OLD.lead_id != NEW.lead_id) THEN
    INSERT INTO public.notifications (user_id, project_id, type, title, message, metadata)
    VALUES (
      NEW.lead_id,
      NEW.id,
      'lead_assigned',
      'Project Lead Assignment',
      'You have been assigned as lead for project: ' || NEW.name,
      jsonb_build_object('project_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_assigned
  AFTER UPDATE OF lead_id ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_assigned();

-- 12. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_financials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_wallets;

-- 13. Create wallets for existing users
INSERT INTO public.user_wallets (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
