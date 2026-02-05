 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { startOfDay, endOfDay } from 'date-fns';
 
 export interface TaskWithProject {
   id: string;
   title: string;
   description: string | null;
   status: string;
   priority: string;
   due_date: string | null;
   project_id: string;
   column_id: string | null;
   created_by: string;
   created_at: string;
   updated_at: string;
   projects: {
     id: string;
     name: string;
     organization_id: string | null;
   };
 }
 
 export const useMyTasksToday = () => {
   const { user } = useAuth();
   const today = new Date();
   const todayStart = startOfDay(today).toISOString().split('T')[0];
   
   return useQuery({
     queryKey: ['my-tasks-today', user?.id, todayStart],
     queryFn: async () => {
       if (!user) return [];
       
       // Get tasks assigned to the user that are due today
       const { data: assignedTaskIds, error: assigneeError } = await supabase
         .from('task_assignees')
         .select('task_id')
         .eq('user_id', user.id);
       
       if (assigneeError) throw assigneeError;
       
       if (!assignedTaskIds || assignedTaskIds.length === 0) {
         return [];
       }
       
       const taskIds = assignedTaskIds.map(a => a.task_id);
       
       const { data, error } = await supabase
         .from('tasks')
         .select(`
           *,
           projects:project_id (
             id,
             name,
             organization_id
           )
         `)
         .in('id', taskIds)
         .eq('due_date', todayStart)
         .order('priority', { ascending: false });
       
       if (error) throw error;
       return data as TaskWithProject[];
     },
     enabled: !!user,
   });
 };
 
 export const useMyAssignedTasks = () => {
   const { user } = useAuth();
   
   return useQuery({
     queryKey: ['my-assigned-tasks', user?.id],
     queryFn: async () => {
       if (!user) return [];
       
       const { data: assignedTaskIds, error: assigneeError } = await supabase
         .from('task_assignees')
         .select('task_id')
         .eq('user_id', user.id);
       
       if (assigneeError) throw assigneeError;
       
       if (!assignedTaskIds || assignedTaskIds.length === 0) {
         return [];
       }
       
       const taskIds = assignedTaskIds.map(a => a.task_id);
       
       const { data, error } = await supabase
         .from('tasks')
         .select(`
           *,
           projects:project_id (
             id,
             name,
             organization_id
           )
         `)
         .in('id', taskIds)
         .neq('status', 'done')
         .order('due_date', { ascending: true, nullsFirst: false });
       
       if (error) throw error;
       return data as TaskWithProject[];
     },
     enabled: !!user,
   });
 };
 
 export const useMyTodayTimeTotal = () => {
   const { user } = useAuth();
   const today = new Date();
   const dayStart = startOfDay(today).toISOString();
   const dayEnd = endOfDay(today).toISOString();
   
   return useQuery({
     queryKey: ['my-today-time-total', user?.id, dayStart],
     queryFn: async () => {
       if (!user) return 0;
       
       // Get completed time entries for today
       const { data: taskEntries, error: taskError } = await supabase
         .from('time_entries')
         .select('duration_seconds, started_at, ended_at')
         .eq('user_id', user.id)
         .gte('started_at', dayStart)
         .lte('started_at', dayEnd);
       
       if (taskError) throw taskError;
       
       // Get subtask time entries for today
       const { data: subtaskEntries, error: subtaskError } = await supabase
         .from('subtask_time_entries')
         .select('duration_seconds, started_at, ended_at')
         .eq('user_id', user.id)
         .gte('started_at', dayStart)
         .lte('started_at', dayEnd);
       
       if (subtaskError) throw subtaskError;
       
       let totalSeconds = 0;
       
       // Sum task entries
       taskEntries?.forEach(entry => {
         if (entry.duration_seconds) {
           totalSeconds += entry.duration_seconds;
         } else if (entry.started_at && entry.ended_at) {
           const duration = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
           totalSeconds += Math.floor(duration);
         }
       });
       
       // Sum subtask entries
       subtaskEntries?.forEach(entry => {
         if (entry.duration_seconds) {
           totalSeconds += entry.duration_seconds;
         } else if (entry.started_at && entry.ended_at) {
           const duration = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
           totalSeconds += Math.floor(duration);
         }
       });
       
       return totalSeconds;
     },
     enabled: !!user,
     refetchInterval: 60000, // Refetch every minute
   });
 };