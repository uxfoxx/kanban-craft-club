import React, { useState } from 'react';
import { KanbanColumn as KanbanColumnType } from '@/types/database';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: KanbanColumnType;
  children: React.ReactNode;
  onDrop: (taskId: string, columnId: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  children,
  onDrop,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDrop(taskId, column.id);
    }
  };

  const columnColor = column.color || '#6366f1';

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl p-4 min-h-96 transition-all bg-muted/50 border border-border/50',
        isDragOver && 'ring-2 ring-primary ring-offset-2 bg-primary/5'
      )}
      style={{
        borderTop: `3px solid ${columnColor}`,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: columnColor }}
          />
          <h3 className="font-semibold text-sm text-foreground">{column.name}</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-background text-muted-foreground border">
          {React.Children.count(children)}
        </span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {children}
      </div>
    </div>
  );
};
