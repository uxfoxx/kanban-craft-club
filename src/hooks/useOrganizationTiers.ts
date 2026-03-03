import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrganizationTier } from '@/types/database';

export const useOrganizationTiers = (orgId?: string) => {
  return useQuery({
    queryKey: ['organization-tiers', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('organization_tiers')
        .select('*')
        .eq('organization_id', orgId)
        .order('position');
      if (error) throw error;
      return data as OrganizationTier[];
    },
    enabled: !!orgId,
  });
};

export const useCreateTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tier: Omit<OrganizationTier, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('organization_tiers')
        .insert(tier as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-tiers'] });
    },
  });
};

export const useUpdateTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; slug?: string; min_budget?: number; position?: number }) => {
      const { data, error } = await supabase
        .from('organization_tiers')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-tiers'] });
    },
  });
};

export const useDeleteTier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organization_tiers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-tiers'] });
    },
  });
};

export const getTierForBudget = (tiers: OrganizationTier[], budget: number): OrganizationTier | undefined => {
  const sorted = [...tiers].sort((a, b) => Number(b.min_budget) - Number(a.min_budget));
  return sorted.find(t => budget >= Number(t.min_budget));
};

export const getDefaultCommissionMode = (tier?: OrganizationTier): 'role' | 'type' | 'hybrid' => {
  if (!tier) return 'role';
  const slug = tier.slug.toLowerCase();
  if (slug === 'major') return 'role';
  return 'hybrid';
};
