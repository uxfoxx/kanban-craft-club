import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRateCard, useCreateRateCardEntry, useUpdateRateCardEntry, useDeleteRateCardEntry, useUpdateRateCardRate, RateCardEntry, getRateForTier } from '@/hooks/useRateCard';
import { useOrganizationTiers } from '@/hooks/useOrganizationTiers';
import { OrganizationTier } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface RateCardSettingsProps {
  onBack: () => void;
}

const SUB_CATEGORIES = ['films', 'photography', 'design', 'tech'] as const;

export const RateCardSettings: React.FC<RateCardSettingsProps> = ({ onBack }) => {
  const { currentOrganization } = useOrganization();
  const { data: entries = [] } = useRateCard(currentOrganization?.id);
  const { data: tiers = [] } = useOrganizationTiers(currentOrganization?.id);
  const createEntry = useCreateRateCardEntry();
  const updateEntry = useUpdateRateCardEntry();
  const deleteEntry = useDeleteRateCardEntry();
  const updateRate = useUpdateRateCardRate();

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSubCategory, setNewRoleSubCategory] = useState<string>('films');
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newDocName, setNewDocName] = useState('');

  const roles = entries.filter(e => e.category === 'role');
  const deliverables = entries.filter(e => e.category === 'deliverable');
  const documentation = entries.filter(e => e.category === 'documentation');

  const rolesByCategory = SUB_CATEGORIES.reduce<Record<string, RateCardEntry[]>>((acc, cat) => {
    acc[cat] = roles.filter(r => r.sub_category === cat);
    return acc;
  }, {} as Record<string, RateCardEntry[]>);
  const uncategorizedRoles = roles.filter(r => !r.sub_category || !SUB_CATEGORIES.includes(r.sub_category as any));

  const deliverableGroups = deliverables.reduce<Record<string, RateCardEntry[]>>((acc, d) => {
    if (!acc[d.name]) acc[d.name] = [];
    acc[d.name].push(d);
    return acc;
  }, {});

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !currentOrganization) return;
    try {
      await createEntry.mutateAsync({
        organization_id: currentOrganization.id,
        category: 'role',
        name: newRoleName.trim(),
        complexity: null,
        sub_category: newRoleSubCategory,
        tierRates: tiers.map(t => ({ tier_id: t.id, rate: 0 })),
      });
      setNewRoleName('');
      toast.success('Role added');
    } catch { toast.error('Failed to add role'); }
  };

  const handleAddDeliverable = async () => {
    if (!newDeliverableName.trim() || !currentOrganization) return;
    try {
      const complexities = ['quick', 'standard', 'advanced'];
      for (const c of complexities) {
        await createEntry.mutateAsync({
          organization_id: currentOrganization.id,
          category: 'deliverable',
          name: newDeliverableName.trim(),
          complexity: c,
          sub_category: null,
          tierRates: tiers.map(t => ({ tier_id: t.id, rate: 0 })),
        });
      }
      setNewDeliverableName('');
      toast.success('Deliverable added with all complexity tiers');
    } catch { toast.error('Failed to add deliverable'); }
  };

  const handleAddDocumentation = async () => {
    if (!newDocName.trim() || !currentOrganization) return;
    try {
      await createEntry.mutateAsync({
        organization_id: currentOrganization.id,
        category: 'documentation',
        name: newDocName.trim(),
        complexity: null,
        sub_category: null,
        tierRates: tiers.map(t => ({ tier_id: t.id, rate: 0 })),
      });
      setNewDocName('');
      toast.success('Documentation item added');
    } catch { toast.error('Failed to add'); }
  };

  const handleUpdateRate = async (rateCardId: string, tierId: string, value: string) => {
    try {
      await updateRate.mutateAsync({ rateCardId, tierId, rate: parseFloat(value) || 0 });
    } catch { toast.error('Failed to update rate'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast.success('Entry deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleDeleteDeliverableGroup = async (name: string) => {
    const group = deliverableGroups[name];
    if (!group) return;
    try {
      for (const entry of group) {
        await deleteEntry.mutateAsync(entry.id);
      }
      toast.success('Deliverable removed');
    } catch { toast.error('Failed to delete deliverable'); }
  };

  if (!currentOrganization) {
    return <p className="text-sm text-muted-foreground">Select an organization first</p>;
  }

  const renderRateTable = (roleList: RateCardEntry[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          {tiers.map(tier => (
            <TableHead key={tier.id} className="capitalize">{tier.name}</TableHead>
          ))}
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roleList.map(role => (
          <TableRow key={role.id}>
            <TableCell className="font-medium">{role.name}</TableCell>
            {tiers.map(tier => (
              <TableCell key={tier.id}>
                <Input
                  type="number"
                  defaultValue={getRateForTier(role, tier.id)}
                  onBlur={e => handleUpdateRate(role.id, tier.id, e.target.value)}
                  className="w-28 h-8" min="0"
                />
              </TableCell>
            ))}
            <TableCell>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(role.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Rate Card</h1>
          <p className="text-sm text-muted-foreground">Manage commission rates for {currentOrganization.name}</p>
        </div>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 mb-4">
                <Input placeholder="New role name (e.g. DOP)" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRole()} />
                <Select value={newRoleSubCategory} onValueChange={setNewRoleSubCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddRole} disabled={!newRoleName.trim() || createEntry.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {SUB_CATEGORIES.map(cat => {
                const catRoles = rolesByCategory[cat];
                if (!catRoles || catRoles.length === 0) return null;
                return (
                  <div key={cat} className="mb-6">
                    <h3 className="text-sm font-semibold capitalize mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{cat}</Badge>
                    </h3>
                    {renderRateTable(catRoles)}
                  </div>
                );
              })}

              {uncategorizedRoles.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Other</h3>
                  {renderRateTable(uncategorizedRoles)}
                </div>
              )}

              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No roles configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliverables" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 mb-4">
                <Input placeholder="New deliverable (e.g. Reel)" value={newDeliverableName} onChange={e => setNewDeliverableName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDeliverable()} />
                <Button onClick={handleAddDeliverable} disabled={!newDeliverableName.trim() || createEntry.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {Object.keys(deliverableGroups).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No deliverables configured</p>
              ) : (
                Object.entries(deliverableGroups).map(([name, group]) => (
                  <div key={name} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">{name}</h3>
                      <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => handleDeleteDeliverableGroup(name)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Remove
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Complexity</TableHead>
                          {tiers.map(tier => (
                            <TableHead key={tier.id} className="capitalize">{tier.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.sort((a, b) => {
                          const order = { quick: 0, standard: 1, advanced: 2 };
                          return (order[a.complexity as keyof typeof order] ?? 0) - (order[b.complexity as keyof typeof order] ?? 0);
                        }).map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{entry.complexity}</Badge>
                            </TableCell>
                            {tiers.map(tier => (
                              <TableCell key={tier.id}>
                                <Input type="number" defaultValue={getRateForTier(entry, tier.id)} onBlur={e => handleUpdateRate(entry.id, tier.id, e.target.value)} className="w-28 h-8" min="0" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 mb-4">
                <Input placeholder="New doc item (e.g. Moodboard)" value={newDocName} onChange={e => setNewDocName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDocumentation()} />
                <Button onClick={handleAddDocumentation} disabled={!newDocName.trim() || createEntry.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {documentation.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No documentation items configured</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      {tiers.map(tier => (
                        <TableHead key={tier.id} className="capitalize">{tier.name}</TableHead>
                      ))}
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentation.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        {tiers.map(tier => (
                          <TableCell key={tier.id}>
                            <Input type="number" defaultValue={getRateForTier(doc, tier.id)} onBlur={e => handleUpdateRate(doc.id, tier.id, e.target.value)} className="w-28 h-8" min="0" />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
