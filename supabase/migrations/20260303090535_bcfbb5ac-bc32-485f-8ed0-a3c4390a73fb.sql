
-- ============================================================
-- PART 1A: Dynamic Tiers
-- ============================================================

-- organization_tiers table
CREATE TABLE public.organization_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  min_budget numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

ALTER TABLE public.organization_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tiers"
  ON public.organization_tiers FOR SELECT
  USING (is_organization_member(organization_id, auth.uid()));

CREATE POLICY "Org admins can insert tiers"
  ON public.organization_tiers FOR INSERT
  WITH CHECK (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

CREATE POLICY "Org admins can update tiers"
  ON public.organization_tiers FOR UPDATE
  USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

CREATE POLICY "Org admins can delete tiers"
  ON public.organization_tiers FOR DELETE
  USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

-- Seed default tiers for every existing organization
INSERT INTO public.organization_tiers (organization_id, name, slug, min_budget, position)
SELECT id, 'Major', 'major', 350000, 0 FROM public.organizations
UNION ALL
SELECT id, 'Minor', 'minor', 100000, 1 FROM public.organizations
UNION ALL
SELECT id, 'Nano', 'nano', 0, 2 FROM public.organizations;

-- ============================================================
-- PART 1A: rate_card_rates join table
-- ============================================================

CREATE TABLE public.rate_card_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_card_id uuid NOT NULL REFERENCES public.commission_rate_card(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.organization_tiers(id) ON DELETE CASCADE,
  rate numeric NOT NULL DEFAULT 0,
  UNIQUE(rate_card_id, tier_id)
);

ALTER TABLE public.rate_card_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rates"
  ON public.rate_card_rates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.commission_rate_card rc
    WHERE rc.id = rate_card_rates.rate_card_id
    AND is_organization_member(rc.organization_id, auth.uid())
  ));

CREATE POLICY "Org admins can insert rates"
  ON public.rate_card_rates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.commission_rate_card rc
    WHERE rc.id = rate_card_rates.rate_card_id
    AND (is_organization_owner(rc.organization_id, auth.uid()) OR is_organization_admin(rc.organization_id, auth.uid()))
  ));

CREATE POLICY "Org admins can update rates"
  ON public.rate_card_rates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.commission_rate_card rc
    WHERE rc.id = rate_card_rates.rate_card_id
    AND (is_organization_owner(rc.organization_id, auth.uid()) OR is_organization_admin(rc.organization_id, auth.uid()))
  ));

CREATE POLICY "Org admins can delete rates"
  ON public.rate_card_rates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.commission_rate_card rc
    WHERE rc.id = rate_card_rates.rate_card_id
    AND (is_organization_owner(rc.organization_id, auth.uid()) OR is_organization_admin(rc.organization_id, auth.uid()))
  ));

-- Migrate existing rate data into rate_card_rates
INSERT INTO public.rate_card_rates (rate_card_id, tier_id, rate)
SELECT rc.id, ot.id, rc.rate_major
FROM public.commission_rate_card rc
JOIN public.organization_tiers ot ON ot.organization_id = rc.organization_id AND ot.slug = 'major'
WHERE rc.rate_major > 0
UNION ALL
SELECT rc.id, ot.id, rc.rate_minor
FROM public.commission_rate_card rc
JOIN public.organization_tiers ot ON ot.organization_id = rc.organization_id AND ot.slug = 'minor'
WHERE rc.rate_minor > 0
UNION ALL
SELECT rc.id, ot.id, rc.rate_nano
FROM public.commission_rate_card rc
JOIN public.organization_tiers ot ON ot.organization_id = rc.organization_id AND ot.slug = 'nano'
WHERE rc.rate_nano > 0;

-- Also insert zero-rate rows so every card has all tiers
INSERT INTO public.rate_card_rates (rate_card_id, tier_id, rate)
SELECT rc.id, ot.id, 0
FROM public.commission_rate_card rc
JOIN public.organization_tiers ot ON ot.organization_id = rc.organization_id
ON CONFLICT (rate_card_id, tier_id) DO NOTHING;

-- Drop old columns from commission_rate_card
ALTER TABLE public.commission_rate_card DROP COLUMN rate_major;
ALTER TABLE public.commission_rate_card DROP COLUMN rate_minor;
ALTER TABLE public.commission_rate_card DROP COLUMN rate_nano;

-- ============================================================
-- PART 1A: Add tier_id to projects (keep project_tier for now)
-- ============================================================

ALTER TABLE public.projects ADD COLUMN tier_id uuid REFERENCES public.organization_tiers(id) ON DELETE SET NULL;

-- Migrate existing project_tier text values to tier_id
UPDATE public.projects p
SET tier_id = ot.id
FROM public.organization_tiers ot
WHERE ot.organization_id = p.organization_id
AND ot.slug = LOWER(p.project_tier)
AND p.project_tier IS NOT NULL;

-- ============================================================
-- PART 1B: Subtask Commission Columns
-- ============================================================

-- tasks: add commission_mode
ALTER TABLE public.tasks ADD COLUMN commission_mode text NOT NULL DEFAULT 'role';

-- subtasks: add work_type, complexity, commission_mode
ALTER TABLE public.subtasks ADD COLUMN work_type text;
ALTER TABLE public.subtasks ADD COLUMN complexity text;
ALTER TABLE public.subtasks ADD COLUMN commission_mode text NOT NULL DEFAULT 'role';

-- subtask_assignees: add role + UPDATE RLS policy
ALTER TABLE public.subtask_assignees ADD COLUMN role text;

CREATE POLICY "Project members can update subtask assignees"
  ON public.subtask_assignees FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.subtasks s
    JOIN public.tasks t ON t.id = s.task_id
    WHERE s.id = subtask_assignees.subtask_id
    AND (is_project_member(t.project_id, auth.uid()) OR is_project_owner(t.project_id, auth.uid()))
  ));

-- ============================================================
-- PART 1C: Withdrawal Requests Table
-- ============================================================

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  admin_note text,
  time_report jsonb,
  work_report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org admins can view all withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

CREATE POLICY "Users can create own withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org admins can update withdrawal requests"
  ON public.withdrawal_requests FOR UPDATE
  USING (is_organization_owner(organization_id, auth.uid()) OR is_organization_admin(organization_id, auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART 1D: Rewrite recalculate_project_financials
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_project_financials(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_budget numeric(12,2);
  v_is_frozen boolean;
  v_total_task_budgets numeric(12,2);
  v_tier_id uuid;
  v_org_id uuid;
  r record;
  v_task_budget numeric(12,2);
  v_subtask_share numeric(12,2);
  v_assignee_count integer;
BEGIN
  SELECT budget, tier_id, organization_id INTO v_budget, v_tier_id, v_org_id
  FROM public.projects WHERE id = p_project_id;

  -- Auto-determine tier if not set
  IF v_tier_id IS NULL AND v_org_id IS NOT NULL THEN
    SELECT id INTO v_tier_id
    FROM public.organization_tiers
    WHERE organization_id = v_org_id AND min_budget <= v_budget
    ORDER BY min_budget DESC
    LIMIT 1;
  END IF;

  SELECT COALESCE(SUM(budget), 0) INTO v_total_task_budgets
  FROM public.tasks WHERE project_id = p_project_id;

  v_is_frozen := v_total_task_budgets > v_budget AND v_budget > 0;

  IF v_is_frozen THEN
    -- Freeze: revert all confirmed commissions from wallets
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

    -- ============================================================
    -- CONFIRMED commissions: tasks with completed_at IS NOT NULL (delivered)
    -- ============================================================
    FOR r IN SELECT t.id as task_id, t.budget as task_budget, t.commission_mode as task_mode
              FROM public.tasks t
              WHERE t.project_id = p_project_id AND t.completed_at IS NOT NULL AND t.budget > 0
    LOOP
      v_task_budget := r.task_budget;

      -- Process subtask-level commissions
      DECLARE
        sub_r record;
      BEGIN
        FOR sub_r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value,
                            COALESCE(s.commission_mode, r.task_mode) as sub_mode,
                            s.work_type as sub_work_type, s.complexity as sub_complexity
                      FROM public.subtasks s WHERE s.task_id = r.task_id
        LOOP
          -- Manual override subtasks (percentage/fixed) take priority
          IF sub_r.commission_type IS NOT NULL AND sub_r.commission_value > 0 THEN
            IF sub_r.commission_type = 'percentage' THEN
              v_subtask_share := (sub_r.commission_value / 100) * v_task_budget;
            ELSE
              v_subtask_share := sub_r.commission_value;
            END IF;
            SELECT COUNT(*) INTO v_assignee_count FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id;
            IF v_assignee_count > 0 THEN
              DECLARE
                v_per_assignee numeric(12,2);
                sa record;
              BEGIN
                v_per_assignee := v_subtask_share / v_assignee_count;
                FOR sa IN SELECT user_id FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id
                LOOP
                  IF NOT EXISTS (
                    SELECT 1 FROM public.task_commissions tc
                    WHERE tc.task_id = r.task_id AND tc.subtask_id = sub_r.subtask_id AND tc.user_id = sa.user_id AND tc.manual_override = true
                  ) THEN
                    INSERT INTO public.task_commissions (project_id, task_id, subtask_id, user_id, amount, status, commission_source, manual_override, updated_at)
                    VALUES (p_project_id, r.task_id, sub_r.subtask_id, sa.user_id, v_per_assignee, 'confirmed', 'subtask', false, now())
                    ON CONFLICT (task_id, user_id) DO UPDATE SET
                      amount = EXCLUDED.amount, status = 'confirmed', commission_source = 'subtask', subtask_id = sub_r.subtask_id, manual_override = false, updated_at = now();
                    UPDATE public.user_wallets SET balance = balance + v_per_assignee, updated_at = now() WHERE user_id = sa.user_id;
                  END IF;
                END LOOP;
              END;
            END IF;
          ELSE
            -- Rate card based commission per subtask
            IF sub_r.sub_mode = 'role' THEN
              -- Role-based: each assignee has a role, lookup rate
              DECLARE
                sa_role record;
                v_rate numeric(12,2);
              BEGIN
                FOR sa_role IN SELECT sa.user_id, sa.role FROM public.subtask_assignees sa WHERE sa.subtask_id = sub_r.subtask_id AND sa.role IS NOT NULL
                LOOP
                  v_rate := 0;
                  IF v_tier_id IS NOT NULL THEN
                    SELECT rr.rate INTO v_rate
                    FROM public.commission_rate_card rc
                    JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_tier_id
                    WHERE rc.organization_id = v_org_id
                      AND rc.category = 'role'
                      AND rc.name = sa_role.role
                      AND rc.complexity IS NULL;
                  END IF;
                  v_rate := COALESCE(v_rate, 0);
                  IF v_rate > 0 AND NOT EXISTS (
                    SELECT 1 FROM public.task_commissions tc
                    WHERE tc.task_id = r.task_id AND tc.subtask_id = sub_r.subtask_id AND tc.user_id = sa_role.user_id AND tc.manual_override = true
                  ) THEN
                    INSERT INTO public.task_commissions (project_id, task_id, subtask_id, user_id, amount, status, commission_source, manual_override, updated_at)
                    VALUES (p_project_id, r.task_id, sub_r.subtask_id, sa_role.user_id, v_rate, 'confirmed', 'task_manager', false, now())
                    ON CONFLICT (task_id, user_id) DO UPDATE SET
                      amount = EXCLUDED.amount, status = 'confirmed', commission_source = 'task_manager', subtask_id = sub_r.subtask_id, manual_override = false, updated_at = now();
                    UPDATE public.user_wallets SET balance = balance + v_rate, updated_at = now() WHERE user_id = sa_role.user_id;
                  END IF;
                END LOOP;
              END;
            ELSIF sub_r.sub_mode = 'type' AND sub_r.sub_work_type IS NOT NULL THEN
              -- Type-based: subtask has work_type + complexity, all assignees earn the same rate
              DECLARE
                v_type_rate numeric(12,2);
                sa_type record;
              BEGIN
                v_type_rate := 0;
                IF v_tier_id IS NOT NULL THEN
                  SELECT rr.rate INTO v_type_rate
                  FROM public.commission_rate_card rc
                  JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_tier_id
                  WHERE rc.organization_id = v_org_id
                    AND rc.category = 'deliverable'
                    AND rc.name = sub_r.sub_work_type
                    AND (rc.complexity = sub_r.sub_complexity OR (rc.complexity IS NULL AND sub_r.sub_complexity IS NULL));
                END IF;
                v_type_rate := COALESCE(v_type_rate, 0);
                IF v_type_rate > 0 THEN
                  FOR sa_type IN SELECT user_id FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id
                  LOOP
                    IF NOT EXISTS (
                      SELECT 1 FROM public.task_commissions tc
                      WHERE tc.task_id = r.task_id AND tc.subtask_id = sub_r.subtask_id AND tc.user_id = sa_type.user_id AND tc.manual_override = true
                    ) THEN
                      INSERT INTO public.task_commissions (project_id, task_id, subtask_id, user_id, amount, status, commission_source, manual_override, updated_at)
                      VALUES (p_project_id, r.task_id, sub_r.subtask_id, sa_type.user_id, v_type_rate, 'confirmed', 'task_manager', false, now())
                      ON CONFLICT (task_id, user_id) DO UPDATE SET
                        amount = EXCLUDED.amount, status = 'confirmed', commission_source = 'task_manager', subtask_id = sub_r.subtask_id, manual_override = false, updated_at = now();
                      UPDATE public.user_wallets SET balance = balance + v_type_rate, updated_at = now() WHERE user_id = sa_type.user_id;
                    END IF;
                  END LOOP;
                END IF;
              END;
            END IF;
          END IF;
        END LOOP;
      END;
    END LOOP;

    -- ============================================================
    -- POTENTIAL commissions: tasks without completed_at (not delivered)
    -- ============================================================
    -- Reset potential balances for all project participants
    UPDATE public.user_wallets SET potential_balance = 0, updated_at = now()
    WHERE user_id IN (
      SELECT DISTINCT sa.user_id FROM public.subtask_assignees sa
      JOIN public.subtasks s ON s.id = sa.subtask_id
      JOIN public.tasks t ON t.id = s.task_id WHERE t.project_id = p_project_id
    );

    FOR r IN SELECT t.id as task_id, t.budget as task_budget, t.commission_mode as task_mode
              FROM public.tasks t
              WHERE t.project_id = p_project_id AND t.completed_at IS NULL AND t.budget > 0
    LOOP
      v_task_budget := r.task_budget;

      DECLARE
        sub_r record;
      BEGIN
        FOR sub_r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value,
                            COALESCE(s.commission_mode, r.task_mode) as sub_mode,
                            s.work_type as sub_work_type, s.complexity as sub_complexity
                      FROM public.subtasks s WHERE s.task_id = r.task_id
        LOOP
          IF sub_r.commission_type IS NOT NULL AND sub_r.commission_value > 0 THEN
            IF sub_r.commission_type = 'percentage' THEN
              v_subtask_share := (sub_r.commission_value / 100) * v_task_budget;
            ELSE
              v_subtask_share := sub_r.commission_value;
            END IF;
            SELECT COUNT(*) INTO v_assignee_count FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id;
            IF v_assignee_count > 0 THEN
              DECLARE v_per numeric(12,2); sa2 record;
              BEGIN
                v_per := v_subtask_share / v_assignee_count;
                FOR sa2 IN SELECT user_id FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id
                LOOP
                  UPDATE public.user_wallets SET potential_balance = potential_balance + v_per, updated_at = now()
                  WHERE user_id = sa2.user_id;
                END LOOP;
              END;
            END IF;
          ELSE
            IF sub_r.sub_mode = 'role' THEN
              DECLARE sa_role record; v_rate numeric(12,2);
              BEGIN
                FOR sa_role IN SELECT sa.user_id, sa.role FROM public.subtask_assignees sa WHERE sa.subtask_id = sub_r.subtask_id AND sa.role IS NOT NULL
                LOOP
                  v_rate := 0;
                  IF v_tier_id IS NOT NULL THEN
                    SELECT rr.rate INTO v_rate
                    FROM public.commission_rate_card rc
                    JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_tier_id
                    WHERE rc.organization_id = v_org_id AND rc.category = 'role' AND rc.name = sa_role.role AND rc.complexity IS NULL;
                  END IF;
                  v_rate := COALESCE(v_rate, 0);
                  IF v_rate > 0 THEN
                    UPDATE public.user_wallets SET potential_balance = potential_balance + v_rate, updated_at = now()
                    WHERE user_id = sa_role.user_id;
                  END IF;
                END LOOP;
              END;
            ELSIF sub_r.sub_mode = 'type' AND sub_r.sub_work_type IS NOT NULL THEN
              DECLARE v_type_rate numeric(12,2); sa_type record;
              BEGIN
                v_type_rate := 0;
                IF v_tier_id IS NOT NULL THEN
                  SELECT rr.rate INTO v_type_rate
                  FROM public.commission_rate_card rc
                  JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_tier_id
                  WHERE rc.organization_id = v_org_id AND rc.category = 'deliverable' AND rc.name = sub_r.sub_work_type
                    AND (rc.complexity = sub_r.sub_complexity OR (rc.complexity IS NULL AND sub_r.sub_complexity IS NULL));
                END IF;
                v_type_rate := COALESCE(v_type_rate, 0);
                IF v_type_rate > 0 THEN
                  FOR sa_type IN SELECT user_id FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id
                  LOOP
                    UPDATE public.user_wallets SET potential_balance = potential_balance + v_type_rate, updated_at = now()
                    WHERE user_id = sa_type.user_id;
                  END LOOP;
                END IF;
              END;
            END IF;
          END IF;
        END LOOP;
      END;
    END LOOP;
  END IF;
END;
$function$;

-- ============================================================
-- Enable realtime for withdrawal_requests
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
