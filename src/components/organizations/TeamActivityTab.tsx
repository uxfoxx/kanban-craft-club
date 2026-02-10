import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTeamActivity, TeamMemberActivity } from '@/hooks/useTeamActivity';
import { formatDuration } from '@/hooks/useTimeTracking';
import { Clock, Activity, CheckCircle, Circle } from 'lucide-react';

const MemberActivityCard: React.FC<{ member: TeamMemberActivity }> = ({ member }) => {
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const completedToday = member.todayTasks.filter(t => t.status === 'done').length;
  const totalToday = member.todayTasks.length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(member.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{member.full_name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(member.todaySeconds)}
              </div>
            </div>

            {/* Active task */}
            {member.activeTask ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                <Activity className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
                <span className="text-xs font-medium truncate">{member.activeTask.title}</span>
                <Badge variant="outline" className="text-[10px] ml-auto flex-shrink-0 bg-primary/10 text-primary border-primary/20">
                  Active
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <Circle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">No active task</span>
              </div>
            )}

            {/* Today's tasks summary */}
            {totalToday > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Today: {completedToday}/{totalToday} tasks done
                </p>
                <div className="flex flex-wrap gap-1">
                  {member.todayTasks.slice(0, 3).map(task => (
                    <Badge
                      key={task.id}
                      variant="outline"
                      className={`text-[10px] ${task.status === 'done' ? 'opacity-50 line-through' : ''}`}
                    >
                      {task.status === 'done' && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                      {task.title.length > 20 ? task.title.slice(0, 20) + '...' : task.title}
                    </Badge>
                  ))}
                  {totalToday > 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{totalToday - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TeamActivityTab: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: activity = [], isLoading } = useTeamActivity(currentOrganization?.id);

  if (!currentOrganization) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeMembers = activity.filter(m => m.activeTask);
  const idleMembers = activity.filter(m => !m.activeTask);

  return (
    <div className="space-y-6">
      {/* Active now */}
      {activeMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Working Now ({activeMembers.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {activeMembers.map(m => (
              <MemberActivityCard key={m.user_id} member={m} />
            ))}
          </div>
        </div>
      )}

      {/* Idle members */}
      {idleMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Other Members ({idleMembers.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {idleMembers.map(m => (
              <MemberActivityCard key={m.user_id} member={m} />
            ))}
          </div>
        </div>
      )}

      {activity.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No team members found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
