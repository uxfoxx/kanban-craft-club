import React, { useState } from 'react';
import { Profile } from '@/types/database';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KanbanFilterState {
  assigneeIds: string[];
  priorities: string[];
  deadlineStatuses: string[];
}

interface KanbanFiltersProps {
  members: { user_id: string; profiles: Profile }[];
  filters: KanbanFilterState;
  onFiltersChange: (filters: KanbanFilterState) => void;
}

const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const DEADLINE_OPTIONS = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'urgent', label: 'Urgent (24h)' },
  { id: 'warning', label: 'Warning (48h)' },
];

export const KanbanFilters: React.FC<KanbanFiltersProps> = ({
  members,
  filters,
  onFiltersChange,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleAssigneeToggle = (userId: string) => {
    const newAssigneeIds = filters.assigneeIds.includes(userId)
      ? filters.assigneeIds.filter(id => id !== userId)
      : [...filters.assigneeIds, userId];
    onFiltersChange({ ...filters, assigneeIds: newAssigneeIds });
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  const handleDeadlineToggle = (status: string) => {
    const newStatuses = filters.deadlineStatuses.includes(status)
      ? filters.deadlineStatuses.filter(s => s !== status)
      : [...filters.deadlineStatuses, status];
    onFiltersChange({ ...filters, deadlineStatuses: newStatuses });
  };

  const clearFilters = () => {
    onFiltersChange({ assigneeIds: [], priorities: [], deadlineStatuses: [] });
  };

  const hasActiveFilters = filters.assigneeIds.length > 0 ||
                           filters.priorities.length > 0 ||
                           filters.deadlineStatuses.length > 0;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DropdownMenu open={openMenu === 'assignees'} onOpenChange={(open) => setOpenMenu(open ? 'assignees' : null)}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={filters.assigneeIds.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1"
          >
            Assignee
            <ChevronDown className="h-4 w-4" />
            {filters.assigneeIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                {filters.assigneeIds.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {members.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-1.5">No team members</div>
          ) : (
            <>
              {members.map(member => (
                <DropdownMenuCheckboxItem
                  key={member.user_id}
                  checked={filters.assigneeIds.includes(member.user_id)}
                  onCheckedChange={() => handleAssigneeToggle(member.user_id)}
                >
                  <span className="text-xs">{member.profiles.full_name}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu open={openMenu === 'priority'} onOpenChange={(open) => setOpenMenu(open ? 'priority' : null)}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={filters.priorities.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1"
          >
            Priority
            <ChevronDown className="h-4 w-4" />
            {filters.priorities.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                {filters.priorities.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {PRIORITY_OPTIONS.map(priority => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.priorities.includes(priority)}
              onCheckedChange={() => handlePriorityToggle(priority)}
            >
              <span className="capitalize text-xs">{priority}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu open={openMenu === 'deadline'} onOpenChange={(open) => setOpenMenu(open ? 'deadline' : null)}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={filters.deadlineStatuses.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1"
          >
            Deadline
            <ChevronDown className="h-4 w-4" />
            {filters.deadlineStatuses.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                {filters.deadlineStatuses.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {DEADLINE_OPTIONS.map(option => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={filters.deadlineStatuses.includes(option.id)}
              onCheckedChange={() => handleDeadlineToggle(option.id)}
            >
              <span className="text-xs">{option.label}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
};
