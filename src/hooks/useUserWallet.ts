import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserWallet, TaskCommission } from '@/types/database';
import { useEffect } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';

export const useUserWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey: ['user-wallet', user.id] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ['user-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserWallet | null;
    },
    enabled: !!user?.id,
  });
};

export const useUpdateWalletTarget = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (monthlyTarget: number) => {
      const { error } = await supabase
        .from('user_wallets')
        .update({ monthly_target: monthlyTarget })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
    },
  });
};

export const useMonthlyEarnings = () => {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  return useQuery({
    queryKey: ['monthly-earnings', user?.id, monthStart],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from('task_commissions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd);
      if (error) throw error;
      return (data || []).reduce((sum, c) => sum + Number(c.amount), 0);
    },
    enabled: !!user?.id,
  });
};
