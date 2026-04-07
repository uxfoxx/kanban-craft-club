import React, { useState } from 'react';
import { Subtask } from '@/types/database';
import { useToggleSubtask, useDeleteSubtask, useUpdateSubtask, useDuplicateSubtask } from '@/hooks/useTasks';
import { useSubtaskTimeEntries } from '@/hooks/useSubtaskTimeTracking';
import { formatDuration } from '@/hooks/useTimeTracking';
import { formatLKR } from '@/lib/currency';
import { useSubtaskAssignees } from '@/hooks/useAssignees';
import { useRateCardRoles, useRateCardDeliverables, getRateForTier } from '@/hooks/useRateCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, XCircle, Pencil, Trash2, Clock, MoreHorizontal, ChevronRight, TrendingUp, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OrganizationMemberWithProfile } from '@/hooks/useOrganizations';

interface SubtaskRowProps {
  subtask: Subtask;
  organizationMembers?: OrganizationMemberWithProfile[];
  taskBudget?: number;
  isOrgAdmin?: boolean;
  expensesEnabled?: boolean;
  currentUserId?: string;
  projectTierId?: string;
  orgId?: string;
  tierSlug?: string;
  onOpenDetail?: () => void;
}

export const SubtaskRow: React.FC<SubtaskRowProps> = ({ subtask, organizationMembers, taskBudget = 0, isOrgAdmin = false, expensesEnabled = false, currentUserId, projectTierId, orgId, tierSlug, onOpenDetail }) => {
  const toggleSubtask = useToggleSubtask();
  const deleteSubtask = useDeleteSubtask();
  const updateSubtask = useUpdateSubtask();
  const duplicateSubtask = useDuplicateSubtask();

  const { data: timeEntries = [] } = useSubtaskTimeEntries(subtask.id);
  const { data: assignees = [] } = useSubtaskAssignees(subtask.id);
  const rateCardRoles = useRateCardRoles(orgId);
  const rateCardDeliverables = useRateCardDeliverables(orgId);

  const isMajor = tierSlug === 'major';
  const qty = subtask.quantity || 1;

  // Compute rate from rate card (case-insensitive sub_category matching)
  let subtaskRate = 0;
  if (projectTierId && expensesEnabled) {
    const mode = subtask.commission_mode || 'role';
    if (mode === 'role') {
      const role = assignees[0]?.role;
      if (role) {
        const entry = rateCardRoles.find(r => r.name === role && (!isMajor || r.sub_category?.toLowerCase() === subtask.work_type?.toLowerCase()));
        if (entry) subtaskRate = getRateForTier(entry, projectTierId);
      }
    } else if (mode === 'type' && subtask.work_type) {
      const entry = rateCardDeliverables.find(d => d.name === subtask.work_type && d.complexity === subtask.complexity);
      if (entry) subtaskRate = getRateForTier(entry, projectTierId);
    }
  }

  const totalRate = subtaskRate * qty;
  const perPersonRate = assignees.length > 0 ? totalRate / assignees.length : totalRate;

  // Current user's earning
  let myEarning = 0;
  if (currentUserId && projectTierId && expensesEnabled) {
    const isAssigned = assignees.some(a => a.user_id === currentUserId);
    if (isAssigned && totalRate > 0) {
      myEarning = perPersonRate;
    }
  }

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(subtask.title);
  const [editingQty, setEditingQty] = useState(false);
  const [localQty, setLocalQty] = useState(String(qty));

  const handleToggle = async () => {
    try {
      await toggleSubtask.mutateAsync({ subtaskId: subtask.id, completed: !subtask.completed, taskId: subtask.task_id });
    } catch { toast.error('Failed to update subtask'); }
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) { toast.error('Title cannot be empty'); return; }
    try {
      await updateSubtask.mutateAsync({ subtaskId: subtask.id, title: editedTitle, taskId: subtask.task_id });
      setIsEditing(false);
    } catch { toast.error('Failed to update subtask'); }
  };

  const handleDelete = async () => {
    try {
      await deleteSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id });
      toast.success('Subtask deleted');
    } catch { toast.error('Failed to delete subtask'); }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id });
      toast.success('Subtask duplicated');
    } catch { toast.error('Failed to duplicate subtask'); }
  };

  const handleSaveQty = async () => {
    const val = parseInt(localQty) || 1;
    if (val < 1) { setLocalQty('1'); return; }
    try {
      await updateSubtask.mutateAsync({ subtaskId: subtask.id, taskId: subtask.task_id, quantity: val } as any);
      setEditingQty(false);
    } catch { toast.error('Failed to update quantity'); }
  };

  const totalTime = timeEntries.reduce((acc, entry) => acc + (entry.duration_seconds || 0), 0);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      <Checkbox checked={subtask.completed} onCheckedChange={handleToggle} />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)}
            className="h-7 text-sm" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setIsEditing(false); }}
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}><Check className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}><XCircle className="h-3 w-3" /></Button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenDetail}>
            <span className={cn('text-sm block truncate', subtask.completed && 'line-through text-muted-foreground')}>
              {subtask.title}
            </span>
            {/* Summary badges */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {qty > 1 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setLocalQty(String(qty)); setEditingQty(true); }}>
                  ×{qty}
                </Badge>
              )}
              {expensesEnabled && subtask.work_type && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">{subtask.work_type}</Badge>
              )}
              {expensesEnabled && subtask.complexity && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">{subtask.complexity}</Badge>
              )}
              {expensesEnabled && subtask.commission_mode === 'role' && assignees[0]?.role && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">{assignees[0].role}</Badge>
              )}
              {assignees.length > 0 && (
                <span className="text-xs text-muted-foreground">{assignees.length} assignee{assignees.length > 1 ? 's' : ''}</span>
              )}
              {totalTime > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" /> {formatDuration(totalTime)}
                </span>
              )}
              {totalRate > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 border-chart-2/30 bg-chart-2/10 text-chart-2 font-semibold">
                  {formatLKR(totalRate)}
                  {assignees.length > 1 && ` ÷${assignees.length}`}
                </Badge>
              )}
              {myEarning > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 border-chart-2/30 bg-chart-2/10 text-chart-2 font-semibold">
                  <TrendingUp className="h-2.5 w-2.5" />
                  +{formatLKR(myEarning)}
                </Badge>
              )}
            </div>
            {/* Inline quantity editor */}
            {editingQty && (
              <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  type="number" min="1" value={localQty} onChange={(e) => setLocalQty(e.target.value)}
                  className="h-6 w-16 text-xs" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveQty(); if (e.key === 'Escape') setEditingQty(false); }}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveQty}><Check className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingQty(false)}><XCircle className="h-3 w-3" /></Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onOpenDetail && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onOpenDetail}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3 w-3" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}><Pencil className="h-3 w-3 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setLocalQty(String(qty)); setEditingQty(true); }}>×  Quantity</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}><Copy className="h-3 w-3 mr-2" /> Duplicate</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}><Trash2 className="h-3 w-3 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
};
