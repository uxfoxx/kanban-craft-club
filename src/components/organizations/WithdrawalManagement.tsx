import React, { useState } from 'react';
import { useOrgWithdrawals, useApproveWithdrawal, useRejectWithdrawal, WithdrawalWithProfile } from '@/hooks/useOrgWithdrawals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Check, X, ChevronDown, Clock, FileText, Loader2, Wallet } from 'lucide-react';
import { formatLKR } from '@/lib/currency';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface WithdrawalManagementProps {
  organizationId: string;
}

const statusColor: Record<string, string> = {
  pending: 'bg-chart-4/10 text-chart-4',
  approved: 'bg-chart-2/10 text-chart-2',
  rejected: 'bg-destructive/10 text-destructive',
};

export const WithdrawalManagement: React.FC<WithdrawalManagementProps> = ({ organizationId }) => {
  const { data: withdrawals = [], isLoading } = useOrgWithdrawals(organizationId);
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pending = withdrawals.filter(w => w.status === 'pending');
  const processed = withdrawals.filter(w => w.status !== 'pending');

  const handleApprove = async (w: WithdrawalWithProfile) => {
    try {
      await approveWithdrawal.mutateAsync({
        id: w.id,
        adminNote: adminNotes[w.id],
        userId: w.user_id,
        amount: Number(w.amount),
      });
      toast.success('Withdrawal approved');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (w: WithdrawalWithProfile) => {
    try {
      await rejectWithdrawal.mutateAsync({ id: w.id, adminNote: adminNotes[w.id] });
      toast.success('Withdrawal rejected');
    } catch {
      toast.error('Failed to reject');
    }
  };

  const renderWithdrawal = (w: WithdrawalWithProfile, showActions: boolean) => {
    const profile = w.profiles;
    const initials = (profile?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const timeReport = w.time_report as any;
    const workReport = w.work_report as any;

    return (
      <Card key={w.id}>
        <Collapsible open={expandedId === w.id} onOpenChange={(open) => setExpandedId(open ? w.id : null)}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(w.created_at), 'MMM d, yyyy')}</p>
                </div>
                <p className="text-sm font-bold">{formatLKR(Number(w.amount))}</p>
                <Badge className={`text-[10px] ${statusColor[w.status] || ''}`} variant="outline">
                  {w.status}
                </Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              <Separator />

              {w.note && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">User Note</p>
                  <p className="text-sm bg-muted/50 rounded p-2">{w.note}</p>
                </div>
              )}

              {/* Reports */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs font-medium">Time Report</p>
                  </div>
                  {timeReport ? (
                    <div className="space-y-1">
                      <p className="text-lg font-bold">{timeReport.totalHours || 0}h</p>
                      <p className="text-[10px] text-muted-foreground">{timeReport.entries || 0} entries</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No data</p>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs font-medium">Work Report</p>
                  </div>
                  {workReport ? (
                    <div className="space-y-1">
                      <p className="text-lg font-bold">{workReport.commissions?.length || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Confirmed commissions</p>
                      <p className="text-xs font-medium">{formatLKR(Number(workReport.totalConfirmed || 0))}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No data</p>
                  )}
                </div>
              </div>

              {w.admin_note && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Admin Note</p>
                  <p className="text-sm bg-muted/50 rounded p-2">{w.admin_note}</p>
                </div>
              )}

              {showActions && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Admin Note (optional)</Label>
                    <Input
                      value={adminNotes[w.id] || ''}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [w.id]: e.target.value }))}
                      placeholder="Add a note..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(w)} disabled={approveWithdrawal.isPending}>
                      {approveWithdrawal.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(w)} disabled={rejectWithdrawal.isPending}>
                      {rejectWithdrawal.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          Pending Requests
          {pending.length > 0 && <Badge variant="secondary" className="text-[10px]">{pending.length}</Badge>}
        </h3>
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <Wallet className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No pending withdrawal requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">{pending.map(w => renderWithdrawal(w, true))}</div>
        )}
      </div>

      {/* History */}
      {processed.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">History</h3>
          <div className="space-y-2">{processed.map(w => renderWithdrawal(w, false))}</div>
        </div>
      )}
    </div>
  );
};
