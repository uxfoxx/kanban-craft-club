import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SheetPage {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface SheetPageStackProps {
  pages: SheetPage[];
  className?: string;
}

export const useSheetPageStack = (initialPage = 'main') => {
  const [pageStack, setPageStack] = useState<string[]>([initialPage]);
  const currentPage = pageStack[pageStack.length - 1];

  const navigateTo = useCallback((pageId: string) => {
    setPageStack(prev => [...prev, pageId]);
  }, []);

  const goBack = useCallback(() => {
    setPageStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  const resetTo = useCallback((pageId: string) => {
    setPageStack([pageId]);
  }, []);

  const isRoot = pageStack.length <= 1;

  return { currentPage, navigateTo, goBack, resetTo, isRoot, pageStack };
};

export const SheetPageStack: React.FC<SheetPageStackProps & {
  currentPage: string;
  onBack: () => void;
  isRoot: boolean;
}> = ({ pages, currentPage, onBack, isRoot, className }) => {
  const activePage = pages.find(p => p.id === currentPage);
  if (!activePage) return null;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {!isRoot && (
        <div className="flex items-center gap-2 mb-4 -mt-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h3 className="text-sm font-semibold">{activePage.title}</h3>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {activePage.content}
      </div>
    </div>
  );
};

// Section card used on overview pages
interface SectionCardProps {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ icon, label, value, onClick, className }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group",
      className
    )}
  >
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-sm font-medium flex-1">{label}</span>
    {value && <span className="text-sm text-muted-foreground">{value}</span>}
    <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 opacity-50 group-hover:opacity-100 transition-opacity" />
  </button>
);
