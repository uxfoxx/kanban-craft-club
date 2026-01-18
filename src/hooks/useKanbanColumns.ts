import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KanbanColumn } from '@/types/database';

export const useKanbanColumns = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['kanban-columns', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as KanbanColumn[];
    },
    enabled: !!projectId,
  });
};

export const useCreateColumn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      projectId,
      name,
      color,
      position,
    }: {
      projectId: string;
      name: string;
      color?: string;
      position: number;
    }) => {
      const { data, error } = await supabase
        .from('kanban_columns')
        .insert({
          project_id: projectId,
          name,
          color: color || '#6366f1',
          position,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns', variables.projectId] });
    },
  });
};

export const useUpdateColumn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      columnId,
      projectId,
      name,
      color,
      position,
    }: {
      columnId: string;
      projectId: string;
      name?: string;
      color?: string;
      position?: number;
    }) => {
      const updates: Partial<KanbanColumn> = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;
      if (position !== undefined) updates.position = position;
      
      const { data, error } = await supabase
        .from('kanban_columns')
        .update(updates)
        .eq('id', columnId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns', variables.projectId] });
    },
  });
};

export const useDeleteColumn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      columnId,
      projectId,
    }: {
      columnId: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns', variables.projectId] });
    },
  });
};

export const useReorderColumns = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      projectId,
      columns,
    }: {
      projectId: string;
      columns: { id: string; position: number }[];
    }) => {
      const updates = columns.map(col =>
        supabase
          .from('kanban_columns')
          .update({ position: col.position })
          .eq('id', col.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns', variables.projectId] });
    },
  });
};
