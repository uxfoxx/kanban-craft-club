 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
 
 export type DateRange = 'today' | 'week' | 'month' | 'all';
 
 export interface TimeEntryWithDetails {
   id: string;
   task_id: string;
   subtask_id?: string;
   user_id: string;
   started_at: string;
   ended_at: string | null;
   duration_seconds: number | null;
   description: string | null;
   created_at: string;
   type: 'task' | 'subtask';
   task_title: string;
   project_name: string;
   project_id: string;
   subtask_title?: string;
 }
 
 const getDateRangeFilter = (range: DateRange) => {
   const now = new Date();
   switch (range) {
     case 'today':
       return { start: startOfDay(now), end: endOfDay(now) };
     case 'week':
       return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
     case 'month':
       return { start: startOfMonth(now), end: endOfMonth(now) };
     case 'all':
       return { start: subDays(now, 365), end: now }; // Last year
   }
 };
 
 export const useAllMyTimeEntries = (dateRange: DateRange = 'today') => {
   const { user } = useAuth();
   const { start, end } = getDateRangeFilter(dateRange);
   
   return useQuery({
     queryKey: ['all-my-time-entries', user?.id, dateRange, start.toISOString()],
     queryFn: async () => {
       if (!user) return [];
       
       const entries: TimeEntryWithDetails[] = [];
       
       // Fetch task time entries
       const { data: taskEntries, error: taskError } = await supabase
         .from('time_entries')
         .select(`
           *,
           tasks:task_id (
             id,
             title,
             project_id,
             projects:project_id (
               id,
               name
             )
           )
         `)
         .eq('user_id', user.id)
         .gte('started_at', start.toISOString())
         .lte('started_at', end.toISOString())
         .order('started_at', { ascending: false });
       
       if (taskError) throw taskError;
       
       // Transform task entries
       taskEntries?.forEach(entry => {
         const task = entry.tasks as { id: string; title: string; project_id: string; projects: { id: string; name: string } };
         if (task && task.projects) {
           entries.push({
             id: entry.id,
             task_id: entry.task_id,
             user_id: entry.user_id,
             started_at: entry.started_at,
             ended_at: entry.ended_at,
             duration_seconds: entry.duration_seconds,
             description: entry.description,
             created_at: entry.created_at,
             type: 'task',
             task_title: task.title,
             project_name: task.projects.name,
             project_id: task.projects.id,
           });
         }
       });
       
       // Fetch subtask time entries
       const { data: subtaskEntries, error: subtaskError } = await supabase
         .from('subtask_time_entries')
         .select(`
           *,
           subtasks:subtask_id (
             id,
             title,
             task_id,
             tasks:task_id (
               id,
               title,
               project_id,
               projects:project_id (
                 id,
                 name
               )
             )
           )
         `)
         .eq('user_id', user.id)
         .gte('started_at', start.toISOString())
         .lte('started_at', end.toISOString())
         .order('started_at', { ascending: false });
       
       if (subtaskError) throw subtaskError;
       
       // Transform subtask entries
       subtaskEntries?.forEach(entry => {
         const subtask = entry.subtasks as { 
           id: string; 
           title: string; 
           task_id: string;
           tasks: { id: string; title: string; project_id: string; projects: { id: string; name: string } } 
         };
         if (subtask && subtask.tasks && subtask.tasks.projects) {
           entries.push({
             id: entry.id,
             task_id: subtask.task_id,
             subtask_id: entry.subtask_id,
             user_id: entry.user_id,
             started_at: entry.started_at,
             ended_at: entry.ended_at,
             duration_seconds: entry.duration_seconds,
             description: entry.description,
             created_at: entry.created_at,
             type: 'subtask',
             task_title: subtask.tasks.title,
             project_name: subtask.tasks.projects.name,
             project_id: subtask.tasks.projects.id,
             subtask_title: subtask.title,
           });
         }
       });
       
       // Sort all entries by started_at descending
       entries.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
       
       return entries;
     },
     enabled: !!user,
   });
 };
 
 export const useTotalTimeForRange = (dateRange: DateRange = 'today') => {
   const { data: entries = [] } = useAllMyTimeEntries(dateRange);
   
   let totalSeconds = 0;
   entries.forEach(entry => {
     if (entry.duration_seconds) {
       totalSeconds += entry.duration_seconds;
     } else if (entry.started_at && entry.ended_at) {
       const duration = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
       totalSeconds += Math.floor(duration);
     }
   });
   
   return totalSeconds;
 };