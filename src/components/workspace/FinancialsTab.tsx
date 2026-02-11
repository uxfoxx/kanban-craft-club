import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgProjectFinancials, useOrgCommissions } from '@/hooks/useOrgFinancials';
import { useProjects } from '@/hooks/useProjects';
import { UserWallet } from '@/components/personal/UserWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DollarSign, TrendingUp, TrendingDown, Snowflake, ChevronDown, ChevronRight } from 'lucide-react';

const fmt = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const FinancialsTab: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: financials = [], isLoading: finLoading } = useOrgProjectFinancials(currentOrganization?.id);
  const { data: commissions = [], isLoading: comLoading } = useOrgCommissions(currentOrganization?.id);
  const { data: allProjects = [] } = useProjects();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const orgProjects = allProjects.filter(p => p.organization_id === currentOrganization?.id);
  const projectMap = new Map(orgProjects.map(p => [p.id, p]));

  // Aggregates
  const totalBudget = orgProjects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const totalExpenses = financials.reduce((s, f) => s + Number(f.total_expenses || 0), 0);
  const totalProfit = financials.reduce((s, f) => s + Number(f.gross_profit || 0), 0);
  const frozenCount = financials.filter(f => f.is_frozen).length;

  // Filtered commissions
  const filtered = commissions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (projectFilter !== 'all' && c.project_id !== projectFilter) return false;
    return true;
  });

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (finLoading || comLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* A. My Wallet */}
      <UserWallet />

      {/* B. Organization Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fmt(totalBudget)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{fmt(totalExpenses)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {fmt(totalProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Snowflake className="h-4 w-4" /> Frozen Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{frozenCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* C. Per-Project Financial Breakdown */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Project Breakdown</h3>
        {orgProjects.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No projects in this organization</CardContent></Card>
        ) : (
          orgProjects.map(project => {
            const fin = financials.find(f => f.project_id === project.id);
            const isOpen = expandedProjects.has(project.id);
            const projectCommissions = commissions.filter(c => c.project_id === project.id);

            return (
              <Collapsible key={project.id} open={isOpen} onOpenChange={() => toggleProject(project.id)}>
                <Card>
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {project.name}
                          {fin?.is_frozen && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <Snowflake className="h-3 w-3" /> Frozen
                            </Badge>
                          )}
                        </CardTitle>
                        <span className={`text-sm font-semibold ${(fin?.gross_profit ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                          {fmt(fin?.gross_profit ?? 0)}
                        </span>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Financial details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Budget</p>
                          <p className="font-medium">{fmt(Number(project.budget))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Direct Expenses</p>
                          <p className="font-medium">{fmt(Number(project.direct_expenses))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Overhead</p>
                          <p className="font-medium">{fmt(Number(project.overhead_expenses))}</p>
                        </div>
                      </div>

                      {/* Splits */}
                      {fin && !fin.is_frozen && (
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="rounded-lg bg-muted/50 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Company ({Number(project.company_share_pct)}%)</p>
                            <p className="font-semibold">{fmt(fin.company_earnings)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Team ({Number(project.team_share_pct)}%)</p>
                            <p className="font-semibold">{fmt(fin.team_pool)}</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Finder ({Number(project.finder_commission_pct)}%)</p>
                            <p className="font-semibold">{fmt(fin.finder_commission)}</p>
                          </div>
                        </div>
                      )}

                      {/* Task commissions for this project */}
                      {projectCommissions.length > 0 && (
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Task</TableHead>
                                <TableHead className="text-xs">Amount</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectCommissions.map(c => (
                                <TableRow key={c.id}>
                                  <TableCell className="text-xs">{c.task_id.slice(0, 8)}…</TableCell>
                                  <TableCell className="text-xs font-medium">{fmt(c.amount)}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={c.status === 'confirmed' ? 'default' : c.status === 'frozen' ? 'destructive' : 'secondary'}
                                      className="text-[10px]"
                                    >
                                      {c.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* D. Commission Records */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Commission Records</h3>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {orgProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No commission records found</CardContent></Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{projectMap.get(c.project_id)?.name || '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{c.task_id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-sm font-medium">{fmt(c.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === 'confirmed' ? 'default' : c.status === 'frozen' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};
