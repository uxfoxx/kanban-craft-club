
-- ============================================================
-- 1. Add new columns to projects
-- ============================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_category text NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS agency_markup_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS equipment_cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS miscellaneous_cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

-- ============================================================
-- 2. Add sub_category column to commission_rate_card
-- ============================================================
ALTER TABLE public.commission_rate_card ADD COLUMN IF NOT EXISTS sub_category text NULL;

-- ============================================================
-- 3. Create project_line_items table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_name text NOT NULL,
  complexity text NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  total numeric NOT NULL DEFAULT 0,
  assigned_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view line items"
  ON public.project_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_line_items.project_id
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project members can insert line items"
  ON public.project_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_line_items.project_id
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project members can update line items"
  ON public.project_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_line_items.project_id
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project members can delete line items"
  ON public.project_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_line_items.project_id
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()) OR is_project_organization_member(p.id, auth.uid()))
    )
  );

-- ============================================================
-- 4. Clean up duplicate rate card entries (keep oldest per unique combo)
-- ============================================================
DELETE FROM public.commission_rate_card
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id, category, name, complexity) id
  FROM public.commission_rate_card
  ORDER BY organization_id, category, name, complexity, created_at ASC
);

-- ============================================================
-- 5. Delete old deliverable entries that don't match new structure
-- ============================================================
DELETE FROM public.commission_rate_card WHERE category = 'deliverable';

-- ============================================================
-- 6. Update existing roles and add new ones per org
-- ============================================================

-- Update existing role rates and set sub_category
UPDATE public.commission_rate_card SET rate_major = 25000, rate_minor = 15000, rate_nano = 8000, sub_category = 'films' WHERE category = 'role' AND name = 'DOP';
UPDATE public.commission_rate_card SET rate_major = 30000, rate_minor = 0, rate_nano = 0, sub_category = 'films' WHERE category = 'role' AND name = 'Editor';
UPDATE public.commission_rate_card SET rate_major = 15000, rate_minor = 0, rate_nano = 0, sub_category = 'films' WHERE category = 'role' AND name = 'Colorist';
UPDATE public.commission_rate_card SET rate_major = 15000, rate_minor = 0, rate_nano = 0, sub_category = 'films' WHERE category = 'role' AND name = 'Production Manager';
UPDATE public.commission_rate_card SET rate_major = 40000, rate_minor = 15000, rate_nano = 8000, sub_category = 'photography' WHERE category = 'role' AND name = 'Photographer';
UPDATE public.commission_rate_card SET rate_major = 15000, rate_minor = 5000, rate_nano = 2000, sub_category = 'photography' WHERE category = 'role' AND name = 'Stylist';

-- Insert new roles for each existing org
INSERT INTO public.commission_rate_card (organization_id, category, name, sub_category, rate_major, rate_minor, rate_nano)
SELECT o.id, 'role', r.name, r.sub_category, r.rate_major, r.rate_minor, r.rate_nano
FROM public.organizations o
CROSS JOIN (VALUES
  ('Director', 'films', 30000, 0, 0),
  ('Art Director', 'films', 15000, 0, 0),
  ('Gaffer', 'films', 0, 5000, 2000),
  ('Retoucher', 'photography', 30000, 0, 0),
  ('Designer', 'design', 30000, 0, 0),
  ('Animator', 'design', 50000, 0, 0),
  ('3D Artist', 'design', 40000, 0, 0),
  ('Product Designer', 'tech', 0, 0, 0),
  ('Developer', 'tech', 0, 0, 0),
  ('QA', 'tech', 0, 0, 0)
) AS r(name, sub_category, rate_major, rate_minor, rate_nano)
WHERE NOT EXISTS (
  SELECT 1 FROM public.commission_rate_card rc
  WHERE rc.organization_id = o.id AND rc.category = 'role' AND rc.name = r.name
);

-- ============================================================
-- 7. Insert new deliverable entries for each org
-- ============================================================
INSERT INTO public.commission_rate_card (organization_id, category, name, complexity, rate_major, rate_minor, rate_nano)
SELECT o.id, 'deliverable', d.name, d.complexity, d.rate_major, d.rate_minor, d.rate_nano
FROM public.organizations o
CROSS JOIN (VALUES
  ('Reel', 'quick', 0, 2500, 2500),
  ('Reel', 'standard', 0, 5000, 5000),
  ('Reel', 'advanced', 0, 10000, 10000),
  ('Static Post', 'quick', 0, 1500, 1500),
  ('Static Post', 'standard', 0, 2500, 2500),
  ('Retouch Photo', 'quick', 0, 500, 500),
  ('Retouch Photo', 'standard', 0, 1000, 1000),
  ('Animation', 'standard', 0, 5000, 5000),
  ('Animation', 'advanced', 0, 10000, 10000),
  ('Video', 'standard', 0, 10000, 10000),
  ('Video', 'advanced', 0, 15000, 15000),
  ('Corporate / Music Video', 'advanced', 0, 30000, 30000)
) AS d(name, complexity, rate_major, rate_minor, rate_nano);

-- ============================================================
-- 8. Insert documentation entries for each org
-- ============================================================
INSERT INTO public.commission_rate_card (organization_id, category, name, complexity, rate_major, rate_minor, rate_nano)
SELECT o.id, 'documentation', d.name, NULL, 0, d.rate_minor, d.rate_nano
FROM public.organizations o
CROSS JOIN (VALUES
  ('Moodboard / Script', 2000, 1000),
  ('Pitch Deck', 3500, 2000)
) AS d(name, rate_minor, rate_nano);

-- ============================================================
-- 9. Fix recalculate_project_financials function (variable collision + line items)
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
  v_done_column_id uuid;
  v_total_task_budgets numeric(12,2);
  v_project_tier text;
  v_org_id uuid;
  r record;
  v_task_budget numeric(12,2);
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

        -- Subtask commissions - FIXED: renamed inner loop var from r to sub_r
        DECLARE
          sub_r record;
        BEGIN
          FOR sub_r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value
                    FROM public.subtasks s
                    WHERE s.task_id = r.task_id AND s.commission_type IS NOT NULL AND s.commission_value > 0
          LOOP
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
          END LOOP;
        END;
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

      -- Potential subtask commissions - FIXED: renamed to sub_r
      DECLARE sub_r record; v_sub_share numeric(12,2); v_sub_count integer;
      BEGIN
        FOR sub_r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value
                    FROM public.subtasks s WHERE s.task_id = r.task_id AND s.commission_type IS NOT NULL AND s.commission_value > 0
        LOOP
          IF sub_r.commission_type = 'percentage' THEN v_sub_share := (sub_r.commission_value / 100) * v_task_budget;
          ELSE v_sub_share := sub_r.commission_value; END IF;
          SELECT COUNT(*) INTO v_sub_count FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id;
          IF v_sub_count > 0 THEN
            DECLARE v_per numeric(12,2); sa2 record;
            BEGIN
              v_per := v_sub_share / v_sub_count;
              FOR sa2 IN SELECT user_id FROM public.subtask_assignees WHERE subtask_id = sub_r.subtask_id
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
