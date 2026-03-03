import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectLineItem } from '@/types/database';

export const useProjectLineItems = (projectId?: string) => {
  return useQuery({
    queryKey: ['project-line-items', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_line_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      if (error) throw error;
      return data as ProjectLineItem[];
    },
    enabled: !!projectId,
  });
};

export const useAddLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<ProjectLineItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('project_line_items')
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-line-items', variables.project_id] });
    },
  });
};

export const useRemoveLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_line_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project-line-items', projectId] });
    },
  });
};

export const useUpdateLineItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string; quantity?: number; unit_price?: number; total?: number; assigned_user_id?: string | null }) => {
      const { data, error } = await supabase
        .from('project_line_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-line-items', result.projectId] });
    },
  });
};
