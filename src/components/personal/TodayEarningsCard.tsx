import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatLKR } from '@/lib/currency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const useTodayEarnings = () => {
  const { user } = useAuth();
  const now = new Date();
  const dayStart = startOfDay(now).toISOString();
  const dayEnd = endOfDay(now).toISOString();

  return useQuery({
    queryKey: ['today-earnings', user?.id, dayStart],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data, error } = await supabase
        .from('task_commissions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('updated_at', dayStart)
        .lte('updated_at', dayEnd);
      if (error) throw error;
      return (data || []).reduce((sum, c) => sum + Number(c.amount), 0);
    },
    enabled: !!user?.id,
  });
};

export const TodayEarningsCard: React.FC = () => {
  const { data: earnings = 0, isLoading } = useTodayEarnings();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-chart-2/10">
            <DollarSign className="h-4 w-4 text-chart-2" />
          </div>
          Today's Earnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className="text-2xl font-bold text-chart-2">
            {formatLKR(earnings)}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5">Confirmed commissions today</p>
      </CardContent>
    </Card>
  );
};
