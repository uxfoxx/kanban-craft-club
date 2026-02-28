import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRateCard, useCreateRateCardEntry, useUpdateRateCardEntry, useDeleteRateCardEntry, RateCardEntry } from '@/hooks/useRateCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatLKR } from '@/lib/currency';

interface RateCardSettingsProps {
  onBack: () => void;
}

export const RateCardSettings: React.FC<RateCardSettingsProps> = ({ onBack }) => {
  const { currentOrganization } = useOrganization();
  const { data: entries = [], isLoading } = useRateCard(currentOrganization?.id);
  const createEntry = useCreateRateCardEntry();
  const updateEntry = useUpdateRateCardEntry();
  const deleteEntry = useDeleteRateCardEntry();

  const [newRoleName, setNewRoleName] = useState('');
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newComplexity, setNewComplexity] = useState<string>('standard');

  const roles = entries.filter(e => e.category === 'role');
  const deliverables = entries.filter(e => e.category === 'deliverable');

  // Group deliverables by name
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
        rate_major: 0,
        rate_minor: 0,
        rate_nano: 0,
      });
      setNewRoleName('');
      toast.success('Role added');
    } catch { toast.error('Failed to add role'); }
  };

  const handleAddDeliverable = async () => {
    if (!newDeliverableName.trim() || !currentOrganization) return;
    try {
      // Add all three complexities at once
      const complexities = ['quick', 'standard', 'advanced'];
      for (const c of complexities) {
        await createEntry.mutateAsync({
          organization_id: currentOrganization.id,
          category: 'deliverable',
          name: newDeliverableName.trim(),
          complexity: c,
          rate_major: 0,
          rate_minor: 0,
          rate_nano: 0,
        });
      }
      setNewDeliverableName('');
      toast.success('Deliverable added with all complexity tiers');
    } catch { toast.error('Failed to add deliverable'); }
  };

  const handleUpdateRate = async (id: string, field: 'rate_major' | 'rate_minor' | 'rate_nano', value: string) => {
    try {
      await updateEntry.mutateAsync({ id, [field]: parseFloat(value) || 0 });
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
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="New role name (e.g. DOP)"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                />
                <Button onClick={handleAddRole} disabled={!newRoleName.trim() || createEntry.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No roles configured</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Major</TableHead>
                      <TableHead>Minor</TableHead>
                      <TableHead>Nano</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map(role => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={role.rate_major}
                            onBlur={e => handleUpdateRate(role.id, 'rate_major', e.target.value)}
                            className="w-28 h-8"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={role.rate_minor}
                            onBlur={e => handleUpdateRate(role.id, 'rate_minor', e.target.value)}
                            className="w-28 h-8"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={role.rate_nano}
                            onBlur={e => handleUpdateRate(role.id, 'rate_nano', e.target.value)}
                            className="w-28 h-8"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(role.id)}>
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

        <TabsContent value="deliverables" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="New deliverable (e.g. Video Edit)"
                  value={newDeliverableName}
                  onChange={e => setNewDeliverableName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddDeliverable()}
                />
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
                          <TableHead>Major</TableHead>
                          <TableHead>Minor</TableHead>
                          <TableHead>Nano</TableHead>
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
                            <TableCell>
                              <Input
                                type="number"
                                defaultValue={entry.rate_major}
                                onBlur={e => handleUpdateRate(entry.id, 'rate_major', e.target.value)}
                                className="w-28 h-8"
                                min="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                defaultValue={entry.rate_minor}
                                onBlur={e => handleUpdateRate(entry.id, 'rate_minor', e.target.value)}
                                className="w-28 h-8"
                                min="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                defaultValue={entry.rate_nano}
                                onBlur={e => handleUpdateRate(entry.id, 'rate_nano', e.target.value)}
                                className="w-28 h-8"
                                min="0"
                              />
                            </TableCell>
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
      </Tabs>
    </div>
  );
};
