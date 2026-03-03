import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WithdrawalRequest, Profile } from '@/types/database';

export type WithdrawalWithProfile = WithdrawalRequest & { profiles?: Profile };

export const useOrgWithdrawals = (orgId?: string) => {
  return useQuery({
    queryKey: ['org-withdrawals', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch profiles
      const userIds = [...new Set(data.map((w: any) => w.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      return data.map((w: any) => ({
        ...w,
        profiles: profiles?.find((p: any) => p.user_id === w.user_id),
      })) as WithdrawalWithProfile[];
    },
    enabled: !!orgId,
  });
};

export const useApproveWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminNote, userId, amount }: { id: string; adminNote?: string; userId: string; amount: number }) => {
      // Update withdrawal status
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ status: 'approved', admin_note: adminNote || null } as any)
        .eq('id', id);
      if (error) throw error;

      // Deduct from user wallet balance
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('user_wallets')
          .update({ balance: Math.max(0, Number(wallet.balance) - amount) } as any)
          .eq('user_id', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
    },
  });
};

export const useRejectWithdrawal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote?: string }) => {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ status: 'rejected', admin_note: adminNote || null } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-withdrawals'] });
    },
  });
};
