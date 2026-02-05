import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, LogOut, Settings, Home, FolderOpen, Users, Clock } from 'lucide-react';
import { ActiveTimer } from '@/components/time/ActiveTimer';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { OrganizationSwitcher } from '@/components/organizations/OrganizationSwitcher';
import { cn } from '@/lib/utils';

export type ViewType = 'personal' | 'projects' | 'team' | 'timetracking';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  profileSettingsOpen: boolean;
  setProfileSettingsOpen: (open: boolean) => void;
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: 'personal', label: 'My Tasks', icon: <Home className="h-4 w-4" /> },
  { view: 'projects', label: 'Projects', icon: <FolderOpen className="h-4 w-4" /> },
  { view: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
  { view: 'timetracking', label: 'Time', icon: <Clock className="h-4 w-4" /> },
];

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onViewChange, 
  profileSettingsOpen, 
  setProfileSettingsOpen 
}) => {
  const { profile, signOut } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">TaskFlow</span>
            </div>
            <OrganizationSwitcher />
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ view, label, icon }) => (
              <Button
                key={view}
                variant={currentView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange(view)}
                className={cn(
                  'gap-2',
                  currentView === view && 'bg-primary text-primary-foreground'
                )}
              >
                {icon}
                {label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ActiveTimer />
            <NotificationBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <ProfileSettings open={profileSettingsOpen} onOpenChange={setProfileSettingsOpen} />
    </>
  );
};
