 import React from 'react';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { Button } from '@/components/ui/button';
 import { ChevronRight } from 'lucide-react';
 import { TeamMemberTimeStats } from '@/hooks/useTeamTimeTracking';
 import { formatDuration } from '@/hooks/useTimeTracking';
 
 interface TeamMemberRowProps {
   member: TeamMemberTimeStats;
   onClick: (member: TeamMemberTimeStats) => void;
 }
 
 const getInitials = (name: string) => {
   return name
     .split(' ')
     .map((n) => n[0])
     .join('')
     .toUpperCase()
     .slice(0, 2);
 };
 
 export const TeamMemberRow: React.FC<TeamMemberRowProps> = ({ member, onClick }) => {
   return (
     <Button
       variant="ghost"
       className="w-full justify-start h-auto p-3 md:p-4"
       onClick={() => onClick(member)}
     >
       <div className="flex items-center gap-3 md:gap-4 w-full">
         <Avatar className="h-10 w-10 flex-shrink-0">
           <AvatarFallback className="bg-primary/10 text-primary">
             {getInitials(member.full_name)}
           </AvatarFallback>
         </Avatar>
         
         <div className="flex-1 min-w-0 text-left">
           <p className="font-medium truncate">{member.full_name}</p>
           <p className="text-xs text-muted-foreground truncate">{member.email}</p>
         </div>
         
         <div className="flex items-center gap-4 md:gap-8 text-sm flex-shrink-0">
           <div className="text-center min-w-[60px]">
             <p className="font-mono font-medium">{formatDuration(member.todaySeconds)}</p>
             <p className="text-xs text-muted-foreground">Today</p>
           </div>
           <div className="text-center min-w-[60px] hidden sm:block">
             <p className="font-mono font-medium text-primary">{formatDuration(member.weekSeconds)}</p>
             <p className="text-xs text-muted-foreground">This Week</p>
           </div>
         </div>
         
         <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
       </div>
     </Button>
   );
 };