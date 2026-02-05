 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
 
 export type TeamDateRange = 'today' | 'week' | 'month';
 
 export interface TeamMemberTimeStats {
   user_id: string;
   full_name: string;
   email: string;
   avatar_url: string | null;
   todaySeconds: number;
   weekSeconds: number;
   monthSeconds: number;
 }
 
 export interface MemberTimeEntry {
   id: string;
   task_id: string;
   subtask_id?: string;
   started_at: string;
   ended_at: string | null;
   duration_seconds: number | null;
   description: string | null;
   type: 'task' | 'subtask';
   task_title: string;
   project_name: string;
   project_id: string;
   subtask_title?: string;
 }
 
 export const useTeamMemberTimeSummary = (organizationId: string | undefined) => {
   const { user } = useAuth();
   const now = new Date();
   const todayStart = startOfDay(now);
   const todayEnd = endOfDay(now);
   const weekStart = startOfWeek(now, { weekStartsOn: 1 });
   const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
   const monthStart = startOfMonth(now);
   const monthEnd = endOfMonth(now);
   
   return useQuery({
     queryKey: ['team-member-time-summary', organizationId, todayStart.toISOString()],
     queryFn: async () => {
       if (!organizationId || !user) return [];
       
       // First get all organization members
       const { data: members, error: membersError } = await supabase
         .from('organization_members')
         .select(`
           user_id,
           profiles:user_id (
             full_name,
             email,
             avatar_url
           )
         `)
         .eq('organization_id', organizationId);
       
       if (membersError) throw membersError;
       
       // Get all projects in the organization
       const { data: projects, error: projectsError } = await supabase
         .from('projects')
         .select('id')
         .eq('organization_id', organizationId);
       
       if (projectsError) throw projectsError;
       
       const projectIds = projects?.map(p => p.id) || [];
       
       if (projectIds.length === 0) {
         return members?.map(m => {
           const profile = m.profiles as unknown as { full_name: string; email: string; avatar_url: string | null };
           return {
             user_id: m.user_id,
             full_name: profile?.full_name || 'Unknown',
             email: profile?.email || '',
             avatar_url: profile?.avatar_url,
             todaySeconds: 0,
             weekSeconds: 0,
             monthSeconds: 0,
           };
         }) || [];
       }
       
       // Get all tasks in org projects
       const { data: tasks, error: tasksError } = await supabase
         .from('tasks')
         .select('id')
         .in('project_id', projectIds);
       
       if (tasksError) throw tasksError;
       
       const taskIds = tasks?.map(t => t.id) || [];
       
       // Calculate time for each member
       const teamStats: TeamMemberTimeStats[] = [];
       
       for (const member of members || []) {
         const profile = member.profiles as unknown as { full_name: string; email: string; avatar_url: string | null };
         
         let todaySeconds = 0;
         let weekSeconds = 0;
         let monthSeconds = 0;
         
         if (taskIds.length > 0) {
           // Get time entries for this month (covers all ranges)
           const { data: entries } = await supabase
             .from('time_entries')
             .select('started_at, duration_seconds')
             .eq('user_id', member.user_id)
             .in('task_id', taskIds)
             .gte('started_at', monthStart.toISOString())
             .lte('started_at', monthEnd.toISOString());
           
           entries?.forEach(entry => {
             const seconds = entry.duration_seconds || 0;
             const startedAt = new Date(entry.started_at);
             
             if (startedAt >= monthStart && startedAt <= monthEnd) {
               monthSeconds += seconds;
             }
             if (startedAt >= weekStart && startedAt <= weekEnd) {
               weekSeconds += seconds;
             }
             if (startedAt >= todayStart && startedAt <= todayEnd) {
               todaySeconds += seconds;
             }
           });
         }
         
         teamStats.push({
           user_id: member.user_id,
           full_name: profile?.full_name || 'Unknown',
           email: profile?.email || '',
           avatar_url: profile?.avatar_url,
           todaySeconds,
           weekSeconds,
           monthSeconds,
         });
       }
       
       // Sort by week time descending
       teamStats.sort((a, b) => b.weekSeconds - a.weekSeconds);
       
       return teamStats;
     },
     enabled: !!organizationId && !!user,
     refetchInterval: 60000, // Refresh every minute
   });
 };
 
 export const useMemberTimeHistory = (
   organizationId: string | undefined,
   memberId: string | undefined,
   dateRange: TeamDateRange = 'week'
 ) => {
   const now = new Date();
   let start: Date;
   let end: Date;
   
   switch (dateRange) {
     case 'today':
       start = startOfDay(now);
       end = endOfDay(now);
       break;
     case 'week':
       start = startOfWeek(now, { weekStartsOn: 1 });
       end = endOfWeek(now, { weekStartsOn: 1 });
       break;
     case 'month':
       start = startOfMonth(now);
       end = endOfMonth(now);
       break;
   }
   
   return useQuery({
     queryKey: ['member-time-history', organizationId, memberId, dateRange, start.toISOString()],
     queryFn: async () => {
       if (!organizationId || !memberId) return [];
       
       // Get projects in the organization
       const { data: projects } = await supabase
         .from('projects')
         .select('id, name')
         .eq('organization_id', organizationId);
       
       const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);
       const projectIds = projects?.map(p => p.id) || [];
       
       if (projectIds.length === 0) return [];
       
       // Get tasks in those projects
       const { data: tasks } = await supabase
         .from('tasks')
         .select('id, title, project_id')
         .in('project_id', projectIds);
       
       const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
       const taskIds = tasks?.map(t => t.id) || [];
       
       if (taskIds.length === 0) return [];
       
       // Get time entries for this member
       const { data: entries, error } = await supabase
         .from('time_entries')
         .select('*')
         .eq('user_id', memberId)
         .in('task_id', taskIds)
         .gte('started_at', start.toISOString())
         .lte('started_at', end.toISOString())
         .order('started_at', { ascending: false });
       
       if (error) throw error;
       
       const result: MemberTimeEntry[] = [];
       
       entries?.forEach(entry => {
         const task = taskMap.get(entry.task_id);
         if (task) {
           result.push({
             id: entry.id,
             task_id: entry.task_id,
             started_at: entry.started_at,
             ended_at: entry.ended_at,
             duration_seconds: entry.duration_seconds,
             description: entry.description,
             type: 'task',
             task_title: task.title,
             project_name: projectMap.get(task.project_id) || 'Unknown Project',
             project_id: task.project_id,
           });
         }
       });
       
       return result;
     },
     enabled: !!organizationId && !!memberId,
   });
 };