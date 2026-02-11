import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgProjectFinancials, useOrgCommissions } from '@/hooks/useOrgFinancials';
import { useProjects } from '@/hooks/useProjects';
import { useUpdateCommission } from '@/hooks/useUpdateCommission';
import { UserWallet } from '@/components/personal/UserWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, TrendingDown, Snowflake, ChevronDown, ChevronRight, Pencil, X, Check, RotateCcw } from 'lucide-react';
import { TaskCommission } from '@/types/database';

const fmt = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface EditingState {
  id: string;
  amount: string;
  status: string;
}

const CommissionRow: React.FC<{
  commission: TaskCommission;
  projectName?: string;
  showProject?: boolean;
  onEdit: (c: TaskCommission) => void;
  editing: EditingState | null;
  onSave: () => void;
  onCancel: () => void;
  onChangeAmount: (v: string) => void;
  onChangeStatus: (v: string) => void;
  onReset: (c: TaskCommission) => void;
  isUpdating: boolean;
}> = ({ commission: c, projectName, showProject, onEdit, editing, onSave, onCancel, onChangeAmount, onChangeStatus, onReset, isUpdating }) => {
  const isEditing = editing?.id === c.id;

  return (
    <TableRow key={c.id}>
      {showProject && <TableCell className="text-sm">{projectName || '—'}</TableCell>}
      <TableCell className="text-sm font-mono">{c.task_id.slice(0, 8)}…</TableCell>
      <TableCell className="text-sm font-medium">
        {isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={editing.amount}
            onChange={e => onChangeAmount(e.target.value)}
            className="w-24 h-7 text-sm"
          />
        ) : (
          fmt(c.amount)
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select value={editing.status} onValueChange={onChangeStatus}>
            <SelectTrigger className="w-[110px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-1">
            <Badge
              variant={c.status === 'confirmed' ? 'default' : c.status === 'frozen' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {c.status}
            </Badge>
            {c.manual_override && (
              <Badge variant="outline" className="text-[10px]">Manual</Badge>
            )}
          </div>
        )}
      </TableCell>
      {showProject && (
        <TableCell className="text-xs text-muted-foreground">
          {new Date(c.created_at).toLocaleDateString()}
        </TableCell>
      )}
      <TableCell className="text-right">
        {isEditing ? (
          <div className="flex items-center gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onSave} disabled={isUpdating}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 justify-end">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(c)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {c.manual_override && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onReset(c)} title="Reset to auto">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};

export const FinancialsTab: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const { data: financials = [], isLoading: finLoading } = useOrgProjectFinancials(currentOrganization?.id);
  const { data: commissions = [], isLoading: comLoading } = useOrgCommissions(currentOrganization?.id);
  const { data: allProjects = [] } = useProjects();
  const { updateCommission, resetCommission, isUpdating } = useUpdateCommission();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EditingState | null>(null);

  const orgProjects = allProjects.filter(p => p.organization_id === currentOrganization?.id);
  const projectMap = new Map(orgProjects.map(p => [p.id, p]));

  const totalBudget = orgProjects.reduce((s, p) => s + Number(p.budget || 0), 0);
  const totalExpenses = financials.reduce((s, f) => s + Number(f.total_expenses || 0), 0);
  const totalProfit = financials.reduce((s, f) => s + Number(f.gross_profit || 0), 0);
  const frozenCount = financials.filter(f => f.is_frozen).length;

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

  const startEdit = (c: TaskCommission) => {
    setEditing({ id: c.id, amount: String(c.amount), status: c.status });
  };

  const saveEdit = (c: TaskCommission) => {
    if (!editing) return;
    updateCommission({
      commissionId: editing.id,
      amount: parseFloat(editing.amount) || 0,
      status: editing.status,
    });
    setEditing(null);
  };

  const handleReset = (c: TaskCommission) => {
    resetCommission({ commissionId: c.id, projectId: c.project_id });
  };

  if (finLoading || comLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <UserWallet />

      {/* Organization Overview */}
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
          <CardContent><p className="text-2xl font-bold">{frozenCount}</p></CardContent>
        </Card>
      </div>

      {/* Per-Project Breakdown */}
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

                      {projectCommissions.length > 0 && (
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Task</TableHead>
                                <TableHead className="text-xs">Amount</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {projectCommissions.map(c => (
                                <CommissionRow
                                  key={c.id}
                                  commission={c}
                                  showProject={false}
                                  onEdit={startEdit}
                                  editing={editing}
                                  onSave={() => saveEdit(c)}
                                  onCancel={() => setEditing(null)}
                                  onChangeAmount={v => setEditing(prev => prev ? { ...prev, amount: v } : null)}
                                  onChangeStatus={v => setEditing(prev => prev ? { ...prev, status: v } : null)}
                                  onReset={handleReset}
                                  isUpdating={isUpdating}
                                />
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

      {/* Commission Records */}
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <CommissionRow
                    key={c.id}
                    commission={c}
                    projectName={projectMap.get(c.project_id)?.name}
                    showProject={true}
                    onEdit={startEdit}
                    editing={editing}
                    onSave={() => saveEdit(c)}
                    onCancel={() => setEditing(null)}
                    onChangeAmount={v => setEditing(prev => prev ? { ...prev, amount: v } : null)}
                    onChangeStatus={v => setEditing(prev => prev ? { ...prev, status: v } : null)}
                    onReset={handleReset}
                    isUpdating={isUpdating}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
};
