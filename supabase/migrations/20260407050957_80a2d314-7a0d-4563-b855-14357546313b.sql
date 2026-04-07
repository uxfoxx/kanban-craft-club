
ALTER TABLE public.subtasks ADD COLUMN quantity integer NOT NULL DEFAULT 1;

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
  v_org_id uuid;
  r record;
  v_task_budget numeric(12,2);
  v_subtask_share numeric(12,2);
  v_assignee_count integer;
  v_task_tier_id uuid;
BEGIN
  SELECT budget, organization_id INTO v_budget, v_org_id
  FROM public.projects WHERE id = p_project_id;

  SELECT COALESCE(SUM(budget), 0) INTO v_total_task_budgets
  FROM public.tasks WHERE project_id = p_project_id;

  v_is_frozen := v_total_task_budgets > v_budget AND v_budget > 0;

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
    FOR r IN SELECT tc.id, tc.user_id, tc.amount FROM public.task_commissions tc
              WHERE tc.project_id = p_project_id AND tc.status = 'confirmed' AND tc.manual_override = false
    LOOP
      UPDATE public.user_wallets SET balance = balance - r.amount, updated_at = now()
      WHERE user_id = r.user_id AND balance >= r.amount;
    END LOOP;
    DELETE FROM public.task_commissions WHERE project_id = p_project_id AND manual_override = false;

    -- CONFIRMED commissions: tasks with completed_at IS NOT NULL
    FOR r IN SELECT t.id as task_id, t.budget as task_budget, t.commission_mode as task_mode, t.tier_id as task_tier_id
              FROM public.tasks t
              WHERE t.project_id = p_project_id AND t.completed_at IS NOT NULL AND t.budget > 0
    LOOP
      v_task_budget := r.task_budget;
      v_task_tier_id := r.task_tier_id;

      IF v_task_tier_id IS NULL THEN
        CONTINUE;
      END IF;

      DECLARE
        sub_r record;
      BEGIN
        FOR sub_r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value,
                            COALESCE(s.commission_mode, r.task_mode) as sub_mode,
                            s.work_type as sub_work_type, s.complexity as sub_complexity,
                            COALESCE(s.quantity, 1) as sub_quantity
                      FROM public.subtasks s WHERE s.task_id = r.task_id
        LOOP
          IF sub_r.commission_type IS NOT NULL AND sub_r.commission_value > 0 THEN
            IF sub_r.commission_type = 'percentage' THEN
              v_subtask_share := (sub_r.commission_value / 100) * v_task_budget * sub_r.sub_quantity;
            ELSE
              v_subtask_share := sub_r.commission_value * sub_r.sub_quantity;
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
            IF sub_r.sub_mode = 'role' THEN
              DECLARE
                sa_role record;
                v_rate numeric(12,2);
              BEGIN
                FOR sa_role IN SELECT sa.user_id, sa.role FROM public.subtask_assignees sa WHERE sa.subtask_id = sub_r.subtask_id AND sa.role IS NOT NULL
                LOOP
                  v_rate := 0;
                  SELECT rr.rate INTO v_rate
                  FROM public.commission_rate_card rc
                  JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_task_tier_id
                  WHERE rc.organization_id = v_org_id
                    AND rc.category = 'role'
                    AND rc.name = sa_role.role
                    AND rc.complexity IS NULL;
                  v_rate := COALESCE(v_rate, 0) * sub_r.sub_quantity;
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
              DECLARE
                v_type_rate numeric(12,2);
                sa_type record;
              BEGIN
                v_type_rate := 0;
                SELECT rr.rate INTO v_type_rate
                FROM public.commission_rate_card rc
                JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_task_tier_id
                WHERE rc.organization_id = v_org_id
                  AND rc.category = 'deliverable'
                  AND rc.name = sub_r.sub_work_type
                  AND (rc.complexity = sub_r.sub_complexity OR (rc.complexity IS NULL AND sub_r.sub_complexity IS NULL));
                v_type_rate := COALESCE(v_type_rate, 0) * sub_r.sub_quantity;
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

    -- POTENTIAL commissions: tasks without completed_at
    UPDATE public.user_wallets SET potential_balance = 0, updated_at = now()
    WHERE user_id IN (
      SELECT DISTINCT sa.user_id FROM public.subtask_assignees sa
      JOIN public.subtasks s ON s.id = sa.subtask_id
      JOIN public.tasks t ON t.id = s.task_id WHERE t.project_id = p_project_id
    );

    FOR r IN SELECT t.id as task_id, t.budget as task_budget, t.commission_mode as task_mode, t.tier_id as task_tier_id
              FROM public.tasks t
              WHERE t.project_id = p_project_id AND t.completed_at IS NULL AND t.budget > 0
    LOOP
      v_task_budget := r.task_budget;
      v_task_tier_id := r.task_tier_id;

      IF v_task_tier_id IS NULL THEN
        CONTINUE;
      END IF;

      DECLARE
        sub_r record;
      BEGIN
        FOR sub_r IN SELECT s.id as subtask_id, s.commission_type, s.commission_value,
                            COALESCE(s.commission_mode, r.task_mode) as sub_mode,
                            s.work_type as sub_work_type, s.complexity as sub_complexity,
                            COALESCE(s.quantity, 1) as sub_quantity
                      FROM public.subtasks s WHERE s.task_id = r.task_id
        LOOP
          IF sub_r.commission_type IS NOT NULL AND sub_r.commission_value > 0 THEN
            IF sub_r.commission_type = 'percentage' THEN
              v_subtask_share := (sub_r.commission_value / 100) * v_task_budget * sub_r.sub_quantity;
            ELSE
              v_subtask_share := sub_r.commission_value * sub_r.sub_quantity;
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
                  SELECT rr.rate INTO v_rate
                  FROM public.commission_rate_card rc
                  JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_task_tier_id
                  WHERE rc.organization_id = v_org_id AND rc.category = 'role' AND rc.name = sa_role.role AND rc.complexity IS NULL;
                  v_rate := COALESCE(v_rate, 0) * sub_r.sub_quantity;
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
                SELECT rr.rate INTO v_type_rate
                FROM public.commission_rate_card rc
                JOIN public.rate_card_rates rr ON rr.rate_card_id = rc.id AND rr.tier_id = v_task_tier_id
                WHERE rc.organization_id = v_org_id AND rc.category = 'deliverable' AND rc.name = sub_r.sub_work_type
                  AND (rc.complexity = sub_r.sub_complexity OR (rc.complexity IS NULL AND sub_r.sub_complexity IS NULL));
                v_type_rate := COALESCE(v_type_rate, 0) * sub_r.sub_quantity;
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
