import React from 'react';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, DollarSign, TrendingUp, Building2, Users, UserCheck } from 'lucide-react';

interface ProjectFinancialsProps {
  projectId: string;
  budget: number;
  companyPct: number;
  teamPct: number;
  finderPct: number;
}

export const ProjectFinancials: React.FC<ProjectFinancialsProps> = ({
  projectId,
  budget,
  companyPct,
  teamPct,
  finderPct,
}) => {
  const { data: financials } = useProjectFinancials(projectId);

  if (!financials && budget <= 0) return null;

  const totalExpenses = financials?.total_expenses ?? 0;
  const grossProfit = financials?.gross_profit ?? budget;
  const isFrozen = financials?.is_frozen ?? false;
  const expenseProgress = budget > 0 ? Math.min((totalExpenses / budget) * 100, 100) : 0;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Project Financials
          </span>
          {isFrozen && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Frozen
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Budget vs Expenses */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Expenses: ${totalExpenses.toLocaleString()}</span>
            <span>Budget: ${budget.toLocaleString()}</span>
          </div>
          <Progress value={expenseProgress} className="h-2" />
        </div>

        {/* Gross Profit */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Gross Profit</span>
          <span className={`text-sm font-bold ${grossProfit > 0 ? 'text-chart-2' : 'text-destructive'}`}>
            ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Splits */}
        {!isFrozen && grossProfit > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-md bg-muted/50">
              <Building2 className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Company</p>
              <p className="text-xs font-semibold">${(financials?.company_earnings ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{companyPct}%</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <Users className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Team</p>
              <p className="text-xs font-semibold">${(financials?.team_pool ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{teamPct}%</p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <UserCheck className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Finder</p>
              <p className="text-xs font-semibold">${(financials?.finder_commission ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{finderPct}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
