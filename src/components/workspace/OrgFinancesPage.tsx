import React, { useState, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useIsOrgAdmin } from '@/hooks/useIsOrgAdmin';
import { useOrgCommissionsWithProfiles } from '@/hooks/useOrgFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';
import { formatLKR } from '@/lib/currency';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface OrgFinancesPageProps {
  onBack: () => void;
}

export const OrgFinancesPage: React.FC<OrgFinancesPageProps> = ({ onBack }) => {
  const { currentOrganization } = useOrganization();
  const { data: isAdmin = false } = useIsOrgAdmin();
  const { data: commissions = [], isLoading } = useOrgCommissionsWithProfiles(currentOrganization?.id);

  const [monthOffset, setMonthOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');

  const selectedMonth = subMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      offset: i,
      label: format(subMonths(new Date(), i), 'MMMM yyyy'),
    }));
  }, []);

  const filtered = useMemo(() => {
    return commissions.filter(c => {
      const date = new Date(c.created_at);
      if (date < monthStart || date > monthEnd) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [commissions, monthStart, monthEnd, statusFilter]);

  // Group by user
  const byUser = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      confirmed: number;
      pending: number;
      taskCount: number;
    }>();
    for (const c of filtered) {
      const existing = map.get(c.user_id) || {
        userId: c.user_id,
        name: c.user_name || 'Unknown',
        confirmed: 0,
        pending: 0,
        taskCount: 0,
      };
      if (c.status === 'confirmed') existing.confirmed += Number(c.amount);
      else if (c.status === 'pending') existing.pending += Number(c.amount);
      existing.taskCount += 1;
      map.set(c.user_id, existing);
    }
    return Array.from(map.values()).sort((a, b) => (b.confirmed + b.pending) - (a.confirmed + a.pending));
  }, [filtered]);

  const totalConfirmed = byUser.reduce((s, u) => s + u.confirmed, 0);
  const totalPending = byUser.reduce((s, u) => s + u.pending, 0);

  if (!isAdmin) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Only organization admins can view team finances.
      </div>
    );
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Team Finances</h2>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(monthOffset)} onValueChange={(v) => setMonthOffset(Number(v))}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => (
              <SelectItem key={m.offset} value={String(m.offset)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Finances</SelectItem>
            <SelectItem value="confirmed">Completed Work</SelectItem>
            <SelectItem value="pending">Pending Work</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" /> Total Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatLKR(totalConfirmed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{formatLKR(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{byUser.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Employee Table */}
      {byUser.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No commission records for {format(selectedMonth, 'MMMM yyyy')}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Confirmed (LKR)</TableHead>
                <TableHead>Pending (LKR)</TableHead>
                <TableHead>Records</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byUser.map(u => (
                <TableRow key={u.userId}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">{formatLKR(u.confirmed)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{formatLKR(u.pending)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{u.taskCount}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
