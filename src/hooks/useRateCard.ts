import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RateCardEntry {
  id: string;
  organization_id: string;
  category: 'role' | 'deliverable' | 'documentation';
  name: string;
  complexity: string | null;
  sub_category: string | null;
  rate_major: number;
  rate_minor: number;
  rate_nano: number;
  created_at: string;
  updated_at: string;
}

export type ProjectTier = 'major' | 'minor' | 'nano';

export const computeProjectTier = (budget: number): ProjectTier => {
  if (budget >= 350000) return 'major';
  if (budget >= 100000) return 'minor';
  return 'nano';
};

export const getRateForTier = (entry: RateCardEntry, tier: ProjectTier): number => {
  switch (tier) {
    case 'major': return Number(entry.rate_major);
    case 'minor': return Number(entry.rate_minor);
    case 'nano': return Number(entry.rate_nano);
  }
};

export const useRateCard = (orgId?: string) => {
  return useQuery({
    queryKey: ['rate-card', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('commission_rate_card')
        .select('*')
        .eq('organization_id', orgId)
        .order('category')
        .order('name');
      if (error) throw error;
      return data as RateCardEntry[];
    },
    enabled: !!orgId,
  });
};

export const useRateCardRoles = (orgId?: string) => {
  const { data: entries = [] } = useRateCard(orgId);
  return entries.filter(e => e.category === 'role');
};

export const useRateCardDeliverables = (orgId?: string) => {
  const { data: entries = [] } = useRateCard(orgId);
  return entries.filter(e => e.category === 'deliverable');
};

export const useCreateRateCardEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<RateCardEntry, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('commission_rate_card')
        .insert(entry as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-card'] });
    },
  });
};

export const useUpdateRateCardEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; rate_major?: number; rate_minor?: number; rate_nano?: number; name?: string }) => {
      const { data, error } = await supabase
        .from('commission_rate_card')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-card'] });
    },
  });
};

export const useDeleteRateCardEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_rate_card')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-card'] });
    },
  });
};
