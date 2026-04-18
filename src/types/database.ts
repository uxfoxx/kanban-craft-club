export type MemberRole = 'admin' | 'member';
export type OrganizationRole = 'owner' | 'admin' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type NotificationType = 'project_invite' | 'assignment' | 'deadline' | 'deadline_warning' | 'mention' | 'lead_assigned';
export type CommissionMode = 'role' | 'type' | 'hybrid';
export type SubtaskCommissionMode = 'role' | 'type';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

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

export interface OrganizationTier {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  min_budget: number;
  position: number;
  created_at: string;
}

export interface RateCardRate {
  id: string;
  rate_card_id: string;
  tier_id: string;
  rate: number;
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
  project_tier: string | null;
  tier_id: string | null;
  project_category: string | null;
  agency_markup_pct: number;
  equipment_cost: number;
  miscellaneous_cost: number;
  discount: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectLineItem {
  id: string;
  project_id: string;
  item_type: 'role' | 'deliverable' | 'documentation';
  item_name: string;
  complexity: string | null;
  unit_price: number;
  quantity: number;
  total: number;
  assigned_user_id: string | null;
  created_at: string;
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
  budget: number;
  tier_id: string | null;
  weight_pct: number | null;
  completed_at: string | null;
  estimated_hours: number | null;
  work_type: string | null;
  complexity: string | null;
  commission_mode: CommissionMode;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  role: string | null;
  created_at: string | null;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  commission_type: 'percentage' | 'fixed' | null;
  commission_value: number;
  estimated_hours: number | null;
  work_type: string | null;
  complexity: string | null;
  commission_mode: SubtaskCommissionMode;
  quantity: number;
  due_date: string | null;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string | null;
  subtask_id: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface PersonalTimeEntry {
  id: string;
  user_id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface SubtaskAssignee {
  id: string;
  subtask_id: string;
  user_id: string;
  assigned_by: string | null;
  role: string | null;
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

export interface TaskCommission {
  id: string;
  project_id: string;
  task_id: string;
  subtask_id: string | null;
  user_id: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'frozen';
  commission_source: 'task_manager' | 'subtask' | 'manual';
  manual_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  potential_balance: number;
  monthly_target: number;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  organization_id: string;
  amount: number;
  status: WithdrawalStatus;
  note: string | null;
  admin_note: string | null;
  time_report: Record<string, unknown> | null;
  work_report: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
