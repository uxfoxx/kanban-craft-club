export type MemberRole = 'admin' | 'member';
export type OrganizationRole = 'owner' | 'admin' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type NotificationType = 'project_invite' | 'assignment' | 'deadline' | 'deadline_warning' | 'mention' | 'lead_assigned';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  organization_id: string | null;
  start_date: string | null;
  lead_id: string | null;
  budget: number;
  project_type: string | null;
  direct_expenses: number;
  overhead_expenses: number;
  company_share_pct: number;
  team_share_pct: number;
  finder_commission_pct: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface KanbanColumn {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
  position: number;
  is_default: boolean | null;
  created_at: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  column_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  cost: number;
  weight_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string | null;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface SubtaskAssignee {
  id: string;
  subtask_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string | null;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  created_at: string;
}

export interface SubtaskTimeEntry {
  id: string;
  subtask_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  project_id: string | null;
  enabled: boolean;
  deadline_alerts: boolean;
  assignment_alerts: boolean;
  created_at: string;
}

export interface OrganizationPlugin {
  id: string;
  organization_id: string;
  plugin_name: string;
  enabled: boolean;
  created_at: string;
}

export interface ProjectFinancials {
  id: string;
  project_id: string;
  total_expenses: number;
  gross_profit: number;
  company_earnings: number;
  team_pool: number;
  finder_commission: number;
  is_frozen: boolean;
  updated_at: string;
}

export interface TaskCommission {
  id: string;
  project_id: string;
  task_id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'frozen';
  created_at: string;
  updated_at: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  monthly_target: number;
  created_at: string;
  updated_at: string;
}
