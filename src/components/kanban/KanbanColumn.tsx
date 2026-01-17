import React, { useState } from 'react';
import { TaskStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  children: React.ReactNode;
  onDrop: (taskId: string, status: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
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
      onDrop(taskId, status);
    }
  };

  const getColumnColor = () => {
    switch (status) {
      case 'todo':
        return 'bg-muted/50';
      case 'in_progress':
        return 'bg-primary/5';
      case 'done':
        return 'bg-chart-5/10';
      default:
        return 'bg-muted/50';
    }
  };

  const getBadgeColor = () => {
    switch (status) {
      case 'todo':
        return 'bg-muted text-muted-foreground';
      case 'in_progress':
        return 'bg-primary/20 text-primary';
      case 'done':
        return 'bg-chart-5/20 text-chart-5';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg p-4 min-h-96 transition-colors',
        getColumnColor(),
        isDragOver && 'ring-2 ring-primary ring-offset-2'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getBadgeColor())}>
          {React.Children.count(children)}
        </span>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {children}
      </div>
    </div>
  );
};
