import React, { useState, useMemo } from 'react';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRateCardForTier, getRateForTier, ProjectTier } from '@/hooks/useRateCard';
import { useProjectLineItems, useAddLineItem, useRemoveLineItem } from '@/hooks/useProjectLineItems';
import { formatLKR } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectCostSheetProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectCostSheet: React.FC<ProjectCostSheetProps> = ({ projectId, onBack }) => {
  const { data: project } = useProject(projectId);
  const { currentOrganization } = useOrganization();
  const updateProject = useUpdateProject();
  const { data: lineItems = [] } = useProjectLineItems(projectId);
  const addLineItem = useAddLineItem();
  const removeLineItem = useRemoveLineItem();

  const tier = (project?.project_tier as ProjectTier) || 'nano';
  const category = project?.project_category || undefined;

  const rateCardEntries = useRateCardForTier(currentOrganization?.id, tier, undefined);

  const availableRoles = useMemo(() => {
    let roles = rateCardEntries.filter(e => e.category === 'role');
    if (tier === 'major' && category) {
      roles = roles.filter(r => r.sub_category === category);
    }
    return roles;
  }, [rateCardEntries, tier, category]);

  const availableDeliverables = useMemo(() => 
    rateCardEntries.filter(e => e.category === 'deliverable'),
  [rateCardEntries]);

  const availableDocumentation = useMemo(() =>
    rateCardEntries.filter(e => e.category === 'documentation'),
  [rateCardEntries]);

  // Unique deliverable names for selection
  const deliverableNames = [...new Set(availableDeliverables.map(d => d.name))];

  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDeliverable, setSelectedDeliverable] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState('');
  const [selectedDoc, setSelectedDoc] = useState('');

  // Local cost fields
  const [agencyMarkup, setAgencyMarkup] = useState(String(project?.agency_markup_pct || 0));
  const [equipmentCost, setEquipmentCost] = useState(String(project?.equipment_cost || 0));
  const [miscCost, setMiscCost] = useState(String(project?.miscellaneous_cost || 0));
  const [discountVal, setDiscountVal] = useState(String(project?.discount || 0));

  // Sync when project loads
  React.useEffect(() => {
    if (project) {
      setAgencyMarkup(String(project.agency_markup_pct || 0));
      setEquipmentCost(String(project.equipment_cost || 0));
      setMiscCost(String(project.miscellaneous_cost || 0));
      setDiscountVal(String(project.discount || 0));
    }
  }, [project?.id]);

  const roleItems = lineItems.filter(i => i.item_type === 'role');
  const deliverableItems = lineItems.filter(i => i.item_type === 'deliverable');
  const docItems = lineItems.filter(i => i.item_type === 'documentation');

  const subtotalLineItems = lineItems.reduce((s, i) => s + Number(i.total), 0);
  const markup = (parseFloat(agencyMarkup) || 0) / 100 * subtotalLineItems;
  const equipment = parseFloat(equipmentCost) || 0;
  const misc = parseFloat(miscCost) || 0;
  const disc = parseFloat(discountVal) || 0;
  const grandTotal = subtotalLineItems + markup + equipment + misc - disc;

  const handleAddRole = async () => {
    if (!selectedRole) return;
    const entry = availableRoles.find(r => r.name === selectedRole);
    if (!entry) return;
    const rate = getRateForTier(entry, tier);
    try {
      await addLineItem.mutateAsync({
        project_id: projectId,
        item_type: 'role',
        item_name: entry.name,
        complexity: null,
        unit_price: rate,
        quantity: 1,
        total: rate,
        assigned_user_id: null,
      });
      setSelectedRole('');
      toast.success('Role added to cost sheet');
    } catch { toast.error('Failed to add role'); }
  };

  const handleAddDeliverable = async () => {
    if (!selectedDeliverable || !selectedComplexity) return;
    const entry = availableDeliverables.find(d => d.name === selectedDeliverable && d.complexity === selectedComplexity);
    if (!entry) return;
    const rate = getRateForTier(entry, tier);
    try {
      await addLineItem.mutateAsync({
        project_id: projectId,
        item_type: 'deliverable',
        item_name: entry.name,
        complexity: entry.complexity,
        unit_price: rate,
        quantity: 1,
        total: rate,
        assigned_user_id: null,
      });
      setSelectedDeliverable('');
      setSelectedComplexity('');
      toast.success('Deliverable added');
    } catch { toast.error('Failed to add deliverable'); }
  };

  const handleAddDoc = async () => {
    if (!selectedDoc) return;
    const entry = availableDocumentation.find(d => d.name === selectedDoc);
    if (!entry) return;
    const rate = getRateForTier(entry, tier);
    try {
      await addLineItem.mutateAsync({
        project_id: projectId,
        item_type: 'documentation',
        item_name: entry.name,
        complexity: null,
        unit_price: rate,
        quantity: 1,
        total: rate,
        assigned_user_id: null,
      });
      setSelectedDoc('');
      toast.success('Documentation added');
    } catch { toast.error('Failed to add'); }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await removeLineItem.mutateAsync({ id, projectId });
      toast.success('Item removed');
    } catch { toast.error('Failed to remove'); }
  };

  const handleSaveCosts = async () => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({
        projectId,
        name: project.name,
        agencyMarkupPct: parseFloat(agencyMarkup) || 0,
        equipmentCost: parseFloat(equipmentCost) || 0,
        miscellaneousCost: parseFloat(miscCost) || 0,
        discount: parseFloat(discountVal) || 0,
        budget: grandTotal,
      });
      toast.success('Cost sheet saved');
    } catch { toast.error('Failed to save'); }
  };

  const complexitiesForDeliverable = selectedDeliverable
    ? availableDeliverables.filter(d => d.name === selectedDeliverable).map(d => d.complexity!).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold">Cost Sheet</h2>
          <p className="text-sm text-muted-foreground">
            {project?.name} — <Badge variant="outline" className="uppercase text-[10px]">{tier}</Badge>
            {tier === 'major' && category && <Badge variant="outline" className="capitalize text-[10px] ml-1">{category}</Badge>}
          </p>
        </div>
      </div>

      {/* Roles Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Crew / Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {roleItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded border">
              <div>
                <span className="text-sm font-medium">{item.item_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{formatLKR(Number(item.total))}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(r => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name} — {formatLKR(getRateForTier(r, tier))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddRole} disabled={!selectedRole || addLineItem.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Deliverables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deliverableItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.item_name}</span>
                {item.complexity && <Badge variant="outline" className="text-[10px] capitalize">{item.complexity}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{formatLKR(Number(item.total))}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Select value={selectedDeliverable} onValueChange={v => { setSelectedDeliverable(v); setSelectedComplexity(''); }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select deliverable..." />
              </SelectTrigger>
              <SelectContent>
                {deliverableNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDeliverable && (
              <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Complexity" />
                </SelectTrigger>
                <SelectContent>
                  {complexitiesForDeliverable.map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleAddDeliverable} disabled={!selectedDeliverable || !selectedComplexity || addLineItem.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Section (Minor/Nano only) */}
      {tier !== 'major' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Documentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {docItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded border">
                <span className="text-sm font-medium">{item.item_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{formatLKR(Number(item.total))}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Select value={selectedDoc} onValueChange={setSelectedDoc}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDocumentation.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name} — {formatLKR(getRateForTier(d, tier))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddDoc} disabled={!selectedDoc || addLineItem.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Costs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Additional Costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Agency Markup (%)</Label>
              <Input type="number" value={agencyMarkup} onChange={e => setAgencyMarkup(e.target.value)} min="0" step="0.1" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Equipment Cost</Label>
              <Input type="number" value={equipmentCost} onChange={e => setEquipmentCost(e.target.value)} min="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Miscellaneous</Label>
              <Input type="number" value={miscCost} onChange={e => setMiscCost(e.target.value)} min="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Discount</Label>
              <Input type="number" value={discountVal} onChange={e => setDiscountVal(e.target.value)} min="0" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (Line Items)</span>
            <span className="font-mono">{formatLKR(subtotalLineItems)}</span>
          </div>
          {markup > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Agency Markup ({agencyMarkup}%)</span>
              <span className="font-mono">{formatLKR(markup)}</span>
            </div>
          )}
          {equipment > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Equipment</span>
              <span className="font-mono">{formatLKR(equipment)}</span>
            </div>
          )}
          {misc > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Miscellaneous</span>
              <span className="font-mono">{formatLKR(misc)}</span>
            </div>
          )}
          {disc > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-mono text-destructive">-{formatLKR(disc)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Grand Total</span>
            <span className="font-mono">{formatLKR(grandTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSaveCosts} disabled={updateProject.isPending}>
        Save Cost Sheet & Update Budget
      </Button>
    </div>
  );
};
