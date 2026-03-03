import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RateCardRate, OrganizationTier } from '@/types/database';

export interface RateCardEntry {
  id: string;
  organization_id: string;
  category: 'role' | 'deliverable' | 'documentation';
  name: string;
  complexity: string | null;
  sub_category: string | null;
  created_at: string;
  updated_at: string;
  rates: RateCardRate[];
}

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

      // Fetch all rates for these entries
      const ids = (data || []).map((d: any) => d.id);
      let rates: any[] = [];
      if (ids.length > 0) {
        const { data: ratesData, error: ratesError } = await supabase
          .from('rate_card_rates')
          .select('*')
          .in('rate_card_id', ids);
        if (ratesError) throw ratesError;
        rates = ratesData || [];
      }

      return (data || []).map((d: any) => ({
        ...d,
        rates: rates.filter((r: any) => r.rate_card_id === d.id),
      })) as RateCardEntry[];
    },
    enabled: !!orgId,
  });
};

export const getRateForTier = (entry: RateCardEntry, tierId: string): number => {
  const rate = entry.rates?.find(r => r.tier_id === tierId);
  return rate ? Number(rate.rate) : 0;
};

export const useRateCardRoles = (orgId?: string) => {
  const { data: entries = [] } = useRateCard(orgId);
  return entries.filter(e => e.category === 'role');
};

export const useRateCardDeliverables = (orgId?: string) => {
  const { data: entries = [] } = useRateCard(orgId);
  return entries.filter(e => e.category === 'deliverable');
};

export const useRateCardDocumentation = (orgId?: string) => {
  const { data: entries = [] } = useRateCard(orgId);
  return entries.filter(e => e.category === 'documentation');
};

export const useRateCardForTier = (orgId?: string, tierId?: string, subCategory?: string) => {
  const { data: entries = [] } = useRateCard(orgId);
  if (!tierId) return entries;
  return entries.filter(e => {
    const rate = getRateForTier(e, tierId);
    const tierMatch = rate > 0;
    const catMatch = !subCategory || e.sub_category === subCategory;
    return tierMatch && catMatch;
  });
};

export const useCreateRateCardEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { organization_id: string; category: string; name: string; complexity?: string | null; sub_category?: string | null; tierRates?: { tier_id: string; rate: number }[] }) => {
      const { tierRates, ...cardData } = entry;
      const { data, error } = await supabase
        .from('commission_rate_card')
        .insert(cardData as any)
        .select()
        .single();
      if (error) throw error;

      // Insert rates for each tier
      if (tierRates && tierRates.length > 0) {
        const ratesToInsert = tierRates.map(tr => ({
          rate_card_id: data.id,
          tier_id: tr.tier_id,
          rate: tr.rate,
        }));
        const { error: ratesError } = await supabase
          .from('rate_card_rates')
          .insert(ratesToInsert as any);
        if (ratesError) throw ratesError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-card'] });
    },
  });
};

export const useUpdateRateCardRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rateCardId, tierId, rate }: { rateCardId: string; tierId: string; rate: number }) => {
      const { data, error } = await supabase
        .from('rate_card_rates')
        .upsert({ rate_card_id: rateCardId, tier_id: tierId, rate } as any, { onConflict: 'rate_card_id,tier_id' })
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
    mutationFn: async ({ id, ...updates }: { id: string; name?: string }) => {
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
