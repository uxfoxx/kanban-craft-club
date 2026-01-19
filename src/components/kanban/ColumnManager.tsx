import React, { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useKanbanColumns, useCreateColumn, useUpdateColumn, useDeleteColumn } from '@/hooks/useKanbanColumns';
import { KanbanColumn } from '@/types/database';
import { toast } from 'sonner';

interface ColumnManagerProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
];

export const ColumnManager: React.FC<ColumnManagerProps> = ({ projectId, open, onOpenChange }) => {
  const { data: columns = [] } = useKanbanColumns(projectId);
  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleAddColumn = async () => {
    if (!newName.trim()) return;
    try {
      await createColumn.mutateAsync({ projectId, name: newName.trim(), color: newColor, position: columns.length });
      toast.success('Column added');
      setNewName('');
      setIsAddOpen(false);
    } catch { toast.error('Failed to add column'); }
  };

  const handleUpdateColumn = async () => {
    if (!editingColumn || !newName.trim()) return;
    try {
      await updateColumn.mutateAsync({ columnId: editingColumn.id, projectId, name: newName.trim(), color: newColor });
      toast.success('Column updated');
      setEditingColumn(null);
    } catch { toast.error('Failed to update column'); }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn.mutateAsync({ columnId, projectId });
      toast.success('Column deleted');
    } catch { toast.error('Failed to delete column'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Columns</DialogTitle>
          <DialogDescription>Add, edit, or remove status columns.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-end">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Column</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., In Review" />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button key={color} type="button" className={`w-8 h-8 rounded border-2 ${newColor === color ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => setNewColor(color)} />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddColumn}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: column.color || '#6366f1' }} />
                <span className="flex-1 font-medium">{column.name}</span>
                <Button variant="ghost" size="icon" onClick={() => { setEditingColumn(column); setNewName(column.name); setNewColor(column.color || '#6366f1'); }}><Pencil className="h-4 w-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Column?</AlertDialogTitle><AlertDialogDescription>Tasks in this column will lose their status.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteColumn(column.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
        <Dialog open={!!editingColumn} onOpenChange={(o) => !o && setEditingColumn(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Column</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Color</Label><div className="flex gap-2 flex-wrap">{PRESET_COLORS.map((color) => (<button key={color} type="button" className={`w-8 h-8 rounded border-2 ${newColor === color ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} onClick={() => setNewColor(color)} />))}</div></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditingColumn(null)}>Cancel</Button><Button onClick={handleUpdateColumn}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
