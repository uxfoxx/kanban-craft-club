import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationTiers, useCreateTier, useUpdateTier, useDeleteTier } from '@/hooks/useOrganizationTiers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { formatLKR } from '@/lib/currency';

interface TierSettingsProps {
  onBack: () => void;
}

export const TierSettings: React.FC<TierSettingsProps> = ({ onBack }) => {
  const { currentOrganization } = useOrganization();
  const { data: tiers = [], isLoading } = useOrganizationTiers(currentOrganization?.id);
  const createTier = useCreateTier();
  const updateTier = useUpdateTier();
  const deleteTier = useDeleteTier();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newMinBudget, setNewMinBudget] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMinBudget, setEditMinBudget] = useState('');

  const handleAdd = async () => {
    if (!newName.trim() || !newSlug.trim() || !currentOrganization) return;
    try {
      await createTier.mutateAsync({
        organization_id: currentOrganization.id,
        name: newName.trim(),
        slug: newSlug.trim().toLowerCase().replace(/\s+/g, '_'),
        min_budget: parseFloat(newMinBudget) || 0,
        position: tiers.length,
      });
      toast.success('Tier created');
      setShowAdd(false);
      setNewName('');
      setNewSlug('');
      setNewMinBudget('');
    } catch {
      toast.error('Failed to create tier');
    }
  };

  const startEdit = (tier: typeof tiers[0]) => {
    setEditingId(tier.id);
    setEditName(tier.name);
    setEditMinBudget(String(tier.min_budget));
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateTier.mutateAsync({ id, name: editName.trim(), min_budget: parseFloat(editMinBudget) || 0 });
      toast.success('Tier updated');
      setEditingId(null);
    } catch {
      toast.error('Failed to update tier');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTier.mutateAsync(id);
      toast.success('Tier deleted');
    } catch {
      toast.error('Failed to delete tier — it may be in use by projects');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Project Tiers</h1>
          <p className="text-sm text-muted-foreground">
            Define budget-based tiers that control rate card pricing
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tiers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No tiers configured yet</p>
            </CardContent>
          </Card>
        ) : (
          tiers.map((tier) => (
            <Card key={tier.id}>
              <CardContent className="p-4">
                {editingId === tier.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Min Budget (LKR)</Label>
                        <Input type="number" value={editMinBudget} onChange={e => setEditMinBudget(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(tier.id)}>
                        <Check className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="uppercase text-xs">{tier.slug}</Badge>
                      <div>
                        <p className="text-sm font-medium">{tier.name}</p>
                        <p className="text-xs text-muted-foreground">Min budget: {formatLKR(Number(tier.min_budget))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(tier)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{tier.name}" tier?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Projects using this tier will need to be reassigned. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(tier.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showAdd ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Premium" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="e.g. premium" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Min Budget</Label>
                <Input type="number" value={newMinBudget} onChange={e => setNewMinBudget(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={createTier.isPending}>
                <Plus className="h-3 w-3 mr-1" /> Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Tier
        </Button>
      )}
    </div>
  );
};
