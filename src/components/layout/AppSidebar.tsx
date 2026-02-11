import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Home, FolderOpen, Building2, Clock, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'personal' | 'projects' | 'team' | 'timetracking';

interface AppSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenProfileSettings: () => void;
}

const navItems: { view: ViewType; label: string; icon: React.ElementType }[] = [
  { view: 'personal', label: 'Dashboard', icon: Home },
  { view: 'projects', label: 'Projects', icon: FolderOpen },
  { view: 'team', label: 'Organization', icon: Building2 },
  { view: 'timetracking', label: 'Time Tracking', icon: Clock },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onViewChange,
  onOpenProfileSettings,
}) => {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary flex-shrink-0" />
          {!isCollapsed && <span className="text-lg font-bold truncate">TaskFlow</span>}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ view, label, icon: Icon }) => (
                <SidebarMenuItem key={view}>
                  <SidebarMenuButton
                    isActive={currentView === view}
                    onClick={() => onViewChange(view)}
                    tooltip={label}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenProfileSettings} tooltip="Settings">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sign out"
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {!isCollapsed && profile && (
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{profile.full_name}</span>
              <span className="text-xs text-muted-foreground truncate">{profile.email}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
