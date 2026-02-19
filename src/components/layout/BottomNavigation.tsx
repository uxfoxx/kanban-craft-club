import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Building2, Clock, CalendarDays, MoreHorizontal, DollarSign, Settings, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { ViewType } from '@/components/layout/AppSidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface BottomNavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenProfileSettings?: () => void;
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: 'personal', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { view: 'workspace', label: 'Work', icon: <Building2 className="h-5 w-5" /> },
  { view: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-5 w-5" /> },
  { view: 'timetracking', label: 'Time', icon: <Clock className="h-5 w-5" /> },
];

const moreItems: { view: ViewType | 'profile'; label: string; icon: React.ReactNode }[] = [
  { view: 'financials', label: 'Financials', icon: <DollarSign className="h-5 w-5" /> },
  { view: 'plugin-settings', label: 'Plugin Settings', icon: <Settings className="h-5 w-5" /> },
  { view: 'profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentView,
  onViewChange,
  onOpenProfileSettings,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const { isSuperAdmin } = useSuperAdmin();

  const isMoreActive = currentView === 'financials' || currentView === 'plugin-settings' || currentView === 'admin';

  const dynamicMoreItems = [
    ...moreItems,
    ...(isSuperAdmin ? [{ view: 'admin' as ViewType | 'profile', label: 'Admin', icon: <Shield className="h-5 w-5" /> }] : []),
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ view, label, icon }) => (
            <Button
              key={view}
              variant="ghost"
              className={cn(
                'flex-1 flex flex-col items-center justify-center h-full gap-1 rounded-none',
                currentView === view && 'text-primary bg-primary/5'
              )}
              onClick={() => onViewChange(view)}
            >
              {icon}
              <span className="text-xs">{label}</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            className={cn(
              'flex-1 flex flex-col items-center justify-center h-full gap-1 rounded-none',
              isMoreActive && 'text-primary bg-primary/5'
            )}
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs">More</span>
          </Button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="space-y-1 mt-4">
            {dynamicMoreItems.map(({ view, label, icon }) => (
              <Button
                key={view}
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => {
                  if (view === 'profile') {
                    onOpenProfileSettings?.();
                  } else {
                    onViewChange(view as ViewType);
                  }
                  setMoreOpen(false);
                }}
              >
                {icon}
                <span>{label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
