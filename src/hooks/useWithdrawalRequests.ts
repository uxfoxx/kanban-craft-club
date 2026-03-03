import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WithdrawalRequest } from '@/types/database';

export const useWithdrawalRequests = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['withdrawal-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateWithdrawalRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ organizationId, amount, note, timeReport, workReport }: {
      organizationId: string;
      amount: number;
      note?: string;
      timeReport?: Record<string, unknown>;
      workReport?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user!.id,
          organization_id: organizationId,
          amount,
          note: note || null,
          time_report: timeReport || null,
          work_report: workReport || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-requests'] });
    },
  });
};
