import React, { useState } from 'react';
import { useUserWallet, useUpdateWalletTarget, useMonthlyEarnings } from '@/hooks/useUserWallet';
import { useWithdrawalRequests } from '@/hooks/useWithdrawalRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, Target, TrendingUp, Pencil, Check, X, Sparkles, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatLKR } from '@/lib/currency';
import { format } from 'date-fns';
import { WithdrawalRequestDialog } from './WithdrawalRequestDialog';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export const UserWallet: React.FC = () => {
  const { data: wallet } = useUserWallet();
  const { data: monthlyEarnings = 0 } = useMonthlyEarnings();
  const { data: withdrawals = [] } = useWithdrawalRequests();
  const updateTarget = useUpdateWalletTarget();
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);

  const balance = Number(wallet?.balance || 0);
  const potentialBalance = Number((wallet as any)?.potential_balance || 0);
  const monthlyTarget = Number(wallet?.monthly_target || 0);
  const targetProgress = monthlyTarget > 0 ? Math.min((monthlyEarnings / monthlyTarget) * 100, 100) : 0;
  const targetRemaining = Math.max(monthlyTarget - monthlyEarnings, 0);

  const handleSaveTarget = async () => {
    const value = parseFloat(targetValue);
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await updateTarget.mutateAsync(value);
      toast.success('Monthly target updated');
      setIsEditingTarget(false);
    } catch {
      toast.error('Failed to update target');
    }
  };

  const startEditingTarget = () => {
    setTargetValue(String(monthlyTarget));
    setIsEditingTarget(true);
  };

  const recentWithdrawals = withdrawals.slice(0, 3);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance */}
          <div className="p-3 rounded-lg bg-primary/10">
            <p className="text-xs text-muted-foreground mb-1">Confirmed Balance</p>
            <p className="text-2xl font-bold text-primary">
              {formatLKR(balance)}
            </p>
          </div>

          {/* Withdraw Button */}
          {balance > 0 && (
            <Button className="w-full" onClick={() => setShowWithdrawalDialog(true)}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Request Withdrawal
            </Button>
          )}

          {/* Potential Earnings */}
          {potentialBalance > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-chart-4/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-chart-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Potential Earnings</p>
                <p className="text-sm font-semibold">
                  {formatLKR(potentialBalance)}
                </p>
                <p className="text-[10px] text-muted-foreground">If all assigned tasks are delivered</p>
              </div>
            </div>
          )}

          {/* This Month */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-chart-2" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-sm font-semibold">
                {formatLKR(monthlyEarnings)}
              </p>
            </div>
          </div>

          {/* Monthly Target */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Monthly Target</p>
              </div>
              {!isEditingTarget && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditingTarget}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>

            {isEditingTarget ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="h-8 text-sm"
                  min="0"
                  step="0.01"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTarget}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingTarget(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                {monthlyTarget > 0 ? (
                  <>
                    <Progress value={targetProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{targetProgress.toFixed(0)}% reached</span>
                      <span>{formatLKR(targetRemaining)} left</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No target set — tap the pencil to set one
                  </p>
                )}
              </>
            )}
          </div>

          {/* Recent Withdrawals */}
          {recentWithdrawals.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Recent Requests</p>
              {recentWithdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-xs">{formatLKR(Number(w.amount))}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(w.created_at), 'MMM d')}</p>
                  </div>
                  <Badge variant={statusVariant[w.status] || 'outline'} className="text-[10px]">
                    {w.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WithdrawalRequestDialog
        open={showWithdrawalDialog}
        onOpenChange={setShowWithdrawalDialog}
        maxAmount={balance}
      />
    </>
  );
};
