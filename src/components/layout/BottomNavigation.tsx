 import React from 'react';
 import { Button } from '@/components/ui/button';
import { Home, FolderOpen, Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'personal' | 'projects' | 'team' | 'timetracking';

interface BottomNavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: 'personal', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { view: 'projects', label: 'Projects', icon: <FolderOpen className="h-5 w-5" /> },
  { view: 'team', label: 'Org', icon: <Building2 className="h-5 w-5" /> },
  { view: 'timetracking', label: 'Time', icon: <Clock className="h-5 w-5" /> },
];
 
 export const BottomNavigation: React.FC<BottomNavigationProps> = ({
   currentView,
   onViewChange,
 }) => {
   return (
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
       </div>
     </nav>
   );
 };