import React, { useState } from 'react';
import { useUserWallet, useUpdateWalletTarget, useMonthlyEarnings } from '@/hooks/useUserWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, Target, TrendingUp, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export const UserWallet: React.FC = () => {
  const { data: wallet } = useUserWallet();
  const { data: monthlyEarnings = 0 } = useMonthlyEarnings();
  const updateTarget = useUpdateWalletTarget();
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');

  const balance = Number(wallet?.balance || 0);
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

  return (
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
          <p className="text-xs text-muted-foreground mb-1">Total Balance</p>
          <p className="text-2xl font-bold text-primary">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* This Month */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-chart-2/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-sm font-semibold">
              ${monthlyEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                    <span>${targetRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} left</span>
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
      </CardContent>
    </Card>
  );
};
