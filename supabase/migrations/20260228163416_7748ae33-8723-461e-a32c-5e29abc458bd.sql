
-- 1. Create commission_rate_card table
CREATE TABLE public.commission_rate_card (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  complexity text NULL,
  rate_major numeric NOT NULL DEFAULT 0,
  rate_minor numeric NOT NULL DEFAULT 0,
  rate_nano numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, category, name, complexity)
);

-- Enable RLS
ALTER TABLE public.commission_rate_card ENABLE ROW LEVEL SECURITY;

-- RLS: Org members can read
CREATE POLICY "Org members can view rate card"
ON public.commission_rate_card FOR SELECT
USING (is_organization_member(organization_id, auth.uid()));

-- RLS: Org owners/admins can insert
CREATE POLICY "Org admins can insert rate card"
ON public.commission_rate_card FOR INSERT
WITH CHECK (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

-- RLS: Org owners/admins can update
CREATE POLICY "Org admins can update rate card"
ON public.commission_rate_card FOR UPDATE
USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

-- RLS: Org owners/admins can delete
CREATE POLICY "Org admins can delete rate card"
ON public.commission_rate_card FOR DELETE
USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_commission_rate_card_updated_at
BEFORE UPDATE ON public.commission_rate_card
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add new columns to existing tables
ALTER TABLE public.projects ADD COLUMN project_tier text NULL;
ALTER TABLE public.tasks ADD COLUMN work_type text NULL;
ALTER TABLE public.tasks ADD COLUMN complexity text NULL;
ALTER TABLE public.task_assignees ADD COLUMN role text NULL;

-- 3. Allow UPDATE on task_assignees (currently missing)
CREATE POLICY "Project members can update task assignees"
ON public.task_assignees FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_assignees.task_id
  AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()))
));

-- 4. Seed rate card data for all existing organizations
INSERT INTO public.commission_rate_card (organization_id, category, name, complexity, rate_major, rate_minor, rate_nano)
SELECT o.id, v.category, v.name, v.complexity, v.rate_major, v.rate_minor, v.rate_nano
FROM public.organizations o
CROSS JOIN (VALUES
  ('role', 'DOP', NULL, 35000, 25000, 15000),
  ('role', 'Photographer', NULL, 25000, 15000, 10000),
  ('role', 'Editor', NULL, 25000, 15000, 7500),
  ('role', 'Colorist', NULL, 15000, 10000, 5000),
  ('role', 'Sound Designer', NULL, 7500, 5000, 5000),
  ('role', '2D Animator', NULL, 12500, 7500, 5000),
  ('role', '3D Animator', NULL, 25000, 15000, 10000),
  ('role', 'Graphic Designer', NULL, 10000, 7500, 5000),
  ('role', 'Production Manager', NULL, 10000, 7500, 5000),
  ('role', 'Production Assistant', NULL, 5000, 3500, 2500),
  ('deliverable', 'Video Edit', 'quick', 15000, 10000, 7500),
  ('deliverable', 'Video Edit', 'standard', 35000, 25000, 15000),
  ('deliverable', 'Video Edit', 'advanced', 75000, 50000, 25000),
  ('deliverable', 'Photography', 'quick', 15000, 10000, 7500),
  ('deliverable', 'Photography', 'standard', 35000, 25000, 15000),
  ('deliverable', 'Photography', 'advanced', 75000, 50000, 25000),
  ('deliverable', 'Social Media Design', 'quick', 5000, 3500, 2500),
  ('deliverable', 'Social Media Design', 'standard', 10000, 7500, 5000),
  ('deliverable', 'Social Media Design', 'advanced', 25000, 15000, 7500),
  ('deliverable', 'Color Grade', 'quick', 7500, 5000, 3500),
  ('deliverable', 'Color Grade', 'standard', 15000, 10000, 5000),
  ('deliverable', 'Color Grade', 'advanced', 25000, 15000, 7500)
) AS v(category, name, complexity, rate_major, rate_minor, rate_nano);

-- 5. Update recalculate_project_financials to use rate card
CREATE OR REPLACE FUNCTION public.recalculate_project_financials(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_budget numeric(12,2);
  v_is_frozen boolean;
  v_done_column_id uuid;
  v_total_task_budgets numeric(12,2);
  v_project_tier text;
  v_org_id uuid;
  r record;
  v_task_budget numeric(12,2);
  v_assignee_commission numeric(12,2);
  v_subtask_share numeric(12,2);
  v_assignee_count integer;
BEGIN
  SELECT budget, project_tier, organization_id INTO v_budget, v_project_tier, v_org_id
  FROM public.projects WHERE id = p_project_id;

  -- Auto-compute tier if not set
  IF v_project_tier IS NULL THEN
    IF v_budget >= 350000 THEN v_project_tier := 'major';
    ELSIF v_budget >= 100000 THEN v_project_tier := 'minor';
    ELSE v_project_tier := 'nano';
    END IF;
  END IF;

  SELECT COALESCE(SUM(budget), 0) INTO v_total_task_budgets
  FROM public.tasks WHERE project_id = p_project_id;

  v_is_frozen := v_total_task_budgets > v_budget AND v_budget > 0;

  SELECT id INTO v_done_column_id
  FROM public.kanban_columns
  WHERE project_id = p_project_id AND lower(name) = 'done'
  LIMIT 1;

  IF v_is_frozen THEN
    FOR r IN SELECT tc.id, tc.user_id, tc.amount FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed'
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;
    UPDATE public.task_commissions SET status = 'frozen', updated_at = now()
    WHERE project_id = p_project_id;
    UPDATE public.user_wallets SET potential_balance = 0, updated_at = now()
    WHERE user_id IN (SELECT DISTINCT user_id FROM public.task_commissions WHERE project_id = p_project_id);
  ELSE
    -- Remove old auto-calculated commissions and revert wallet balances
    FOR r IN SELECT tc.id, tc.user_id, tc.amount FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed' AND tc.manual_override = false
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;
    DELETE FROM public.task_commissions WHERE project_id = p_project_id AND manual_override = false;

    IF v_done_column_id IS NOT NULL THEN
      FOR r IN SELECT t.id as task_id, t.budget as task_budget
                FROM public.tasks t
                WHERE t.project_id = p_project_id AND t.column_id = v_done_column_id AND t.budget > 0
      LOOP
        v_task_budget := r.task_budget;

        -- Rate card based commission for each assignee with a role
        DECLARE
          assignee_rec record;
          v_rate numeric(12,2);
        BEGIN
          FOR assignee_rec IN
            SELECT ta.user_id, ta.role
            FROM public.task_assignees ta
            WHERE ta.task_id = r.task_id AND ta.role IS NOT NULL
          LOOP
            -- Look up rate from rate card
            v_rate := 0;
            SELECT CASE v_project_tier
              WHEN 'major' THEN rc.rate_major
              WHEN 'minor' THEN rc.rate_minor
              ELSE rc.rate_nano
            END INTO v_rate
            FROM public.commission_rate_card rc
            WHERE rc.organization_id = v_org_id
              AND rc.category = 'role'
              AND rc.name = assignee_rec.role
              AND rc.complexity IS NULL;

            v_rate := COALESCE(v_rate, 0);

            IF v_rate > 0 AND NOT EXISTS (
              SELECT 1 FROM public.task_commissions tc
              WHERE tc.task_id = r.task_id AND tc.user_id = assignee_rec.user_id AND tc.manual_override = true
            ) THEN
              INSERT INTO public.task_commissions (project_id, task_id, user_id, amount, status, commission_source, manual_override, updated_at)
              VALUES (p_project_id, r.task_id, assignee_rec.user_id, v_rate, 'confirmed', 'task_manager', false, now())
              ON CONFLICT (task_id, user_id) DO UPDATE SET
                amount = EXCLUDED.amount, status = 'confirmed', commission_source = 'task_manager', manual_override = false, updated_at = now();
              UPDATE public.user_wallets SET balance = balance + v_rate, updated_at = now() WHERE user_id = assignee_rec.user_id;
            END IF;
          END LOOP;
        END;

        -- Subtask commissions remain as-is
        FOR r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value
                  FROM public.subtasks s
                  WHERE s.task_id = r.task_id AND s.commission_type IS NOT NULL AND s.commission_value > 0
        LOOP
          IF r.commission_type = 'percentage' THEN
            v_subtask_share := (r.commission_value / 100) * v_task_budget;
          ELSE
            v_subtask_share := r.commission_value;
          END IF;
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

    -- Reset potential balances
    UPDATE public.user_wallets SET potential_balance = 0, updated_at = now()
    WHERE user_id IN (
      SELECT DISTINCT ta.user_id FROM public.task_assignees ta
      JOIN public.tasks t ON t.id = ta.task_id WHERE t.project_id = p_project_id
      UNION
      SELECT DISTINCT sa.user_id FROM public.subtask_assignees sa
      JOIN public.subtasks s ON s.id = sa.subtask_id
      JOIN public.tasks t ON t.id = s.task_id WHERE t.project_id = p_project_id
    );

    -- Calculate potential balances for non-done tasks
    FOR r IN SELECT t.id as task_id, t.budget as task_budget
              FROM public.tasks t
              WHERE t.project_id = p_project_id AND t.budget > 0
              AND (v_done_column_id IS NULL OR t.column_id != v_done_column_id)
    LOOP
      v_task_budget := r.task_budget;
      -- Potential commission per assignee with role
      DECLARE
        pot_rec record;
        v_pot_rate numeric(12,2);
      BEGIN
        FOR pot_rec IN
          SELECT ta.user_id, ta.role
          FROM public.task_assignees ta
          WHERE ta.task_id = r.task_id AND ta.role IS NOT NULL
        LOOP
          v_pot_rate := 0;
          SELECT CASE v_project_tier
            WHEN 'major' THEN rc.rate_major
            WHEN 'minor' THEN rc.rate_minor
            ELSE rc.rate_nano
          END INTO v_pot_rate
          FROM public.commission_rate_card rc
          WHERE rc.organization_id = v_org_id
            AND rc.category = 'role'
            AND rc.name = pot_rec.role
            AND rc.complexity IS NULL;

          v_pot_rate := COALESCE(v_pot_rate, 0);
          IF v_pot_rate > 0 THEN
            UPDATE public.user_wallets SET potential_balance = potential_balance + v_pot_rate, updated_at = now()
            WHERE user_id = pot_rec.user_id;
          END IF;
        END LOOP;
      END;

      -- Potential subtask commissions
      DECLARE sub record; v_sub_share numeric(12,2); v_sub_count integer;
      BEGIN
        FOR sub IN SELECT s.id as subtask_id, s.commission_type, s.commission_value
                    FROM public.subtasks s WHERE s.task_id = r.task_id AND s.commission_type IS NOT NULL AND s.commission_value > 0
        LOOP
          IF sub.commission_type = 'percentage' THEN v_sub_share := (sub.commission_value / 100) * v_task_budget;
          ELSE v_sub_share := sub.commission_value; END IF;
          SELECT COUNT(*) INTO v_sub_count FROM public.subtask_assignees WHERE subtask_id = sub.subtask_id;
          IF v_sub_count > 0 THEN
            DECLARE v_per numeric(12,2); sa2 record;
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
