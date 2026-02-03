

## Fix Plan: Resolve Missing Database Tables and Build Errors

### Problem Summary

The application isn't working because:
1. The `organizations` and `organization_members` tables don't exist in the database, even though the code expects them
2. The `projects` table is missing the `organization_id` column
3. There are TypeScript build errors in SubtaskRow.tsx due to mismatched function signatures

---

### Phase 1: Create Missing Database Tables

**1.1 Create Organizations Table**
```sql
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
```

**1.2 Create Organization Members Table**
```sql
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
```

**1.3 Add organization_id to Projects Table**
```sql
ALTER TABLE public.projects 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
```

**1.4 Create RLS Policies for Organizations**
- Owner can do all CRUD operations
- Members can view the organization
- Authenticated users can create organizations
- Auto-add owner as a member when organization is created (via trigger)

**1.5 Create RLS Policies for Organization Members**
- Organization owners/admins can manage members
- Members can view other members

---

### Phase 2: Fix SubtaskRow.tsx Build Errors

The hook function signatures have changed but SubtaskRow.tsx uses old calling patterns:

| Line | Current Call | Expected Signature |
|------|-------------|-------------------|
| 69 | `toggleSubtask.mutateAsync(subtask)` | `{ subtaskId, completed, taskId }` |
| 81-84 | `updateSubtask.mutateAsync({ subtaskId, updates: {...} })` | `{ subtaskId, title, taskId }` |
| 93 | `deleteSubtask.mutateAsync(subtask.id)` | `{ subtaskId, taskId }` |
| 130 | `removeAssignee.mutateAsync(assigneeId)` | `{ subtaskId, userId }` |

**Fix each call:**

```typescript
// Line 69: Fix toggleSubtask call
await toggleSubtask.mutateAsync({
  subtaskId: subtask.id,
  completed: !subtask.completed,
  taskId: subtask.task_id
});

// Line 81-84: Fix updateSubtask call
await updateSubtask.mutateAsync({
  subtaskId: subtask.id,
  title: editedTitle,
  taskId: subtask.task_id
});

// Line 93: Fix deleteSubtask call
await deleteSubtask.mutateAsync({
  subtaskId: subtask.id,
  taskId: subtask.task_id
});

// Line 130: Fix removeSubtaskAssignee call
// Need to get the user_id from the assignee object
await removeAssignee.mutateAsync({
  subtaskId: subtask.id,
  userId: /* assignee's user_id */
});
```

---

### Phase 3: Create Organization Trigger

Create a trigger to automatically add the organization creator as an owner/admin member:

```sql
CREATE OR REPLACE FUNCTION handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION handle_new_organization();
```

---

### Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Create `organizations` table, `organization_members` table, add `organization_id` to `projects`, add RLS policies, add trigger |
| `src/components/kanban/SubtaskRow.tsx` | Fix all 4 hook call sites to match new function signatures |

---

### Expected Outcome

After implementation:
1. Users can create and manage organizations
2. Users can create projects (optionally within an organization)
3. Build errors are resolved
4. The app loads correctly after login

---

### Technical Details

**RLS Policies for Organizations:**
```sql
-- Users can view organizations they own or are members of
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid()
    )
  );

-- Users can create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can update their organizations
CREATE POLICY "Owners can update organizations"
  ON public.organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- Owners can delete their organizations
CREATE POLICY "Owners can delete organizations"
  ON public.organizations FOR DELETE
  USING (owner_id = auth.uid());
```

**RLS Policies for Organization Members:**
```sql
-- Members can view other members in their organizations
CREATE POLICY "Members can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_members.organization_id 
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
    )
  );

-- Owners/admins can add members
CREATE POLICY "Owners and admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_members.organization_id 
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Owners/admins can remove members
CREATE POLICY "Owners and admins can remove members"
  ON public.organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE id = organization_members.organization_id 
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );
```

