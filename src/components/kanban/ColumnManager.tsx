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
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
];

export const ColumnManager: React.FC<ColumnManagerProps> = ({ projectId }) => {
  const { data: columns = [] } = useKanbanColumns(projectId);
  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleAddColumn = async () => {
    if (!newName.trim()) {
      toast.error('Column name is required');
      return;
    }
    
    try {
      await createColumn.mutateAsync({
        projectId,
        name: newName.trim(),
        color: newColor,
        position: columns.length,
      });
      toast.success('Column added');
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      setIsAddOpen(false);
    } catch (error) {
      toast.error('Failed to add column');
    }
  };

  const handleUpdateColumn = async () => {
    if (!editingColumn || !newName.trim()) {
      toast.error('Column name is required');
      return;
    }
    
    try {
      await updateColumn.mutateAsync({
        columnId: editingColumn.id,
        projectId,
        name: newName.trim(),
        color: newColor,
      });
      toast.success('Column updated');
      setEditingColumn(null);
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
    } catch (error) {
      toast.error('Failed to update column');
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn.mutateAsync({ columnId, projectId });
      toast.success('Column deleted');
    } catch (error) {
      toast.error('Failed to delete column. Make sure no tasks are in this column.');
    }
  };

  const openEdit = (column: KanbanColumn) => {
    setEditingColumn(column);
    setNewName(column.name);
    setNewColor(column.color);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Manage Columns</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Column
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Column</DialogTitle>
              <DialogDescription>Create a new status column for your Kanban board.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Column Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., In Review"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        newColor === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddColumn} disabled={createColumn.isPending}>
                Add Column
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-2">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex items-center gap-3 p-3 border rounded-lg bg-card"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: column.color }}
            />
            <span className="flex-1 font-medium">{column.name}</span>
            {column.is_default && (
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                Default
              </span>
            )}
            <Dialog open={editingColumn?.id === column.id} onOpenChange={(open) => !open && setEditingColumn(null)}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => openEdit(column)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Column</DialogTitle>
                  <DialogDescription>Update the column name and color.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Column Name</Label>
                    <Input
                      id="edit-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            newColor === color ? 'border-foreground scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingColumn(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateColumn} disabled={updateColumn.isPending}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Column</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{column.name}"? Tasks in this column will lose their status.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteColumn(column.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
};
