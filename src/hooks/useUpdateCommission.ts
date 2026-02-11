import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateCommissionParams {
  commissionId: string;
  amount: number;
  status: string;
}

export const useUpdateCommission = () => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ commissionId, amount, status }: UpdateCommissionParams) => {
      const { error } = await supabase
        .from('task_commissions')
        .update({
          amount,
          status,
          manual_override: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['org-financials'] });
      toast.success('Commission updated');
    },
    onError: (err: Error) => {
      toast.error('Failed to update commission: ' + err.message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ commissionId, projectId }: { commissionId: string; projectId: string }) => {
      // Remove override flag
      const { error: updateError } = await supabase
        .from('task_commissions')
        .update({ manual_override: false, updated_at: new Date().toISOString() })
        .eq('id', commissionId);
      if (updateError) throw updateError;

      // Trigger recalculation via RPC
      const { error: rpcError } = await supabase.rpc('recalculate_project_financials', {
        p_project_id: projectId,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['org-financials'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      toast.success('Commission reset to automatic calculation');
    },
    onError: (err: Error) => {
      toast.error('Failed to reset commission: ' + err.message);
    },
  });

  return {
    updateCommission: updateMutation.mutate,
    resetCommission: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
  };
};
