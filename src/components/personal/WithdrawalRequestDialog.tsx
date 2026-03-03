import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { useCreateWithdrawalRequest } from '@/hooks/useWithdrawalRequests';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatLKR } from '@/lib/currency';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WithdrawalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAmount: number;
}

export const WithdrawalRequestDialog: React.FC<WithdrawalRequestDialogProps> = ({ open, onOpenChange, maxAmount }) => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const createRequest = useCreateWithdrawalRequest();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Fetch work report: delivered tasks with commissions
  const { data: workReport } = useQuery({
    queryKey: ['withdrawal-work-report', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user?.id || !currentOrganization?.id) return [];
      const { data } = await supabase
        .from('task_commissions')
        .select('amount, status, commission_source, task_id, subtask_id, updated_at')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  // Fetch time report: total hours
  const { data: timeReport } = useQuery({
    queryKey: ['withdrawal-time-report', user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalHours: 0, entries: 0 };
      const { data: taskEntries } = await supabase
        .from('time_entries')
        .select('duration_seconds')
        .eq('user_id', user.id)
        .not('duration_seconds', 'is', null);
      const { data: subtaskEntries } = await supabase
        .from('subtask_time_entries')
        .select('duration_seconds')
        .eq('user_id', user.id)
        .not('duration_seconds', 'is', null);
      const allEntries = [...(taskEntries || []), ...(subtaskEntries || [])];
      const totalSeconds = allEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
      return { totalHours: Math.round((totalSeconds / 3600) * 10) / 10, entries: allEntries.length };
    },
    enabled: open && !!user?.id,
  });

  const totalConfirmed = useMemo(() => (workReport || []).reduce((sum, c) => sum + Number(c.amount), 0), [workReport]);

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || val > maxAmount) {
      toast.error(`Enter an amount between 1 and ${formatLKR(maxAmount)}`);
      return;
    }
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }
    try {
      await createRequest.mutateAsync({
        organizationId: currentOrganization.id,
        amount: val,
        note: note.trim() || undefined,
        timeReport: timeReport as any,
        workReport: { commissions: workReport, totalConfirmed } as any,
      });
      toast.success('Withdrawal request submitted');
      setAmount('');
      setNote('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to submit request');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription>
            Submit a withdrawal from your confirmed balance. Your org admin will review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">LKR</span>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-12"
                placeholder="0.00"
                max={maxAmount}
                min={1}
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">Available: {formatLKR(maxAmount)}</p>
            {maxAmount > 0 && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setAmount(String(maxAmount))}>
                Withdraw all
              </Button>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>

          {/* Report Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Reports attached with this request</Label>
            <div className="grid grid-cols-2 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{timeReport?.totalHours || 0}h</p>
                  <p className="text-[10px] text-muted-foreground">{timeReport?.entries || 0} time entries</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{(workReport || []).length}</p>
                  <p className="text-[10px] text-muted-foreground">Confirmed commissions</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createRequest.isPending || !amount}>
            {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
