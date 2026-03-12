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
        'flex flex-col rounded-2xl p-3 min-h-96 transition-all bg-muted/30 border border-border/30',
        isDragOver && 'ring-2 ring-primary ring-offset-2 bg-primary/5'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: columnColor }}
          />
          <h3 className="font-medium text-sm text-foreground">{column.name}</h3>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-background/80 text-muted-foreground border border-border/50">
          {React.Children.count(children)}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {children}
      </div>
    </div>
  );
};
