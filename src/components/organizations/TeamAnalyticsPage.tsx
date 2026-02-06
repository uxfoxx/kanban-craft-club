 import React, { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Users, Clock, AlertCircle } from 'lucide-react';
 import { useOrganization } from '@/contexts/OrganizationContext';
 import { useTeamMemberTimeSummary, TeamMemberTimeStats } from '@/hooks/useTeamTimeTracking';
 import { TeamMemberRow } from './TeamMemberRow';
 import { MemberTimeHistory } from './MemberTimeHistory';
 import { Skeleton } from '@/components/ui/skeleton';
 import { formatDuration } from '@/hooks/useTimeTracking';
 
export const TeamAnalyticsPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: teamStats = [], isLoading } = useTeamMemberTimeSummary(currentOrganization?.id);
  const [selectedMember, setSelectedMember] = useState<TeamMemberTimeStats | null>(null);
  
  const totalTeamHoursToday = teamStats.reduce((sum, m) => sum + m.todaySeconds, 0);
  const totalTeamHoursWeek = teamStats.reduce((sum, m) => sum + m.weekSeconds, 0);
  
  if (!currentOrganization) return null;
  
  return (
    <div className="space-y-6">
       
       {/* Summary Cards */}
       <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <Users className="h-4 w-4" />
               Team Size
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-2xl font-bold">{teamStats.length}</p>
           </CardContent>
         </Card>
         
         <Card>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <Clock className="h-4 w-4" />
               Today Total
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-2xl font-bold text-primary">
               {formatDuration(totalTeamHoursToday)}
             </p>
           </CardContent>
         </Card>
         
         <Card className="col-span-2 lg:col-span-2">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <Clock className="h-4 w-4" />
               This Week Total
             </CardTitle>
           </CardHeader>
           <CardContent>
             <p className="text-2xl font-bold text-primary">
               {formatDuration(totalTeamHoursWeek)}
             </p>
           </CardContent>
         </Card>
       </div>
       
       {/* Team Members List */}
       <Card>
         <CardHeader>
           <CardTitle className="text-base font-medium">Team Members</CardTitle>
         </CardHeader>
         <CardContent className="p-0">
           {isLoading ? (
             <div className="p-4 space-y-3">
               <Skeleton className="h-16 w-full" />
               <Skeleton className="h-16 w-full" />
               <Skeleton className="h-16 w-full" />
             </div>
           ) : teamStats.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12">
               <Users className="h-8 w-8 text-muted-foreground mb-2" />
               <p className="text-sm text-muted-foreground">No team members found</p>
             </div>
           ) : (
             <div className="divide-y">
               {teamStats.map(member => (
                 <TeamMemberRow
                   key={member.user_id}
                   member={member}
                   onClick={setSelectedMember}
                 />
               ))}
             </div>
           )}
         </CardContent>
       </Card>
       
       {/* Member Detail Sheet */}
       <MemberTimeHistory
         member={selectedMember}
         organizationId={currentOrganization.id}
         open={!!selectedMember}
         onOpenChange={(open) => !open && setSelectedMember(null)}
       />
     </div>
   );
 };