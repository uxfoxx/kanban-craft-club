import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrganizationPlugins } from '@/hooks/useOrganizationPlugins';
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
import { Button } from '@/components/ui/button';
import { Home, Building2, Clock, LogOut, Settings, PanelLeftClose, PanelLeft, CalendarDays, DollarSign, Puzzle, Shield } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { cn } from '@/lib/utils';

export type ViewType = 'personal' | 'workspace' | 'timetracking' | 'calendar' | 'financials' | 'plugin-settings' | 'admin';

interface AppSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenProfileSettings: () => void;
}

const coreNavItems: { view: ViewType; label: string; icon: React.ElementType }[] = [
  { view: 'personal', label: 'Dashboard', icon: Home },
  { view: 'workspace', label: 'Workspace', icon: Building2 },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
  { view: 'timetracking', label: 'Time Tracking', icon: Clock },
];

const pluginNavMap: Record<string, { view: ViewType; label: string; icon: React.ElementType }> = {
  expenses: { view: 'financials', label: 'Financials', icon: DollarSign },
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onViewChange,
  onOpenProfileSettings,
}) => {
  const { profile, signOut } = useAuth();
  const { currentOrganization } = useOrganization();
  const { data: plugins = [] } = useOrganizationPlugins(currentOrganization?.id);
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { isSuperAdmin } = useSuperAdmin();

  const enabledPlugins = plugins.filter(p => p.enabled);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderNavItem = (view: ViewType, label: string, Icon: React.ElementType) => (
    <SidebarMenuItem key={view}>
      <SidebarMenuButton
        isActive={currentView === view}
        onClick={() => onViewChange(view)}
        tooltip={label}
        className={cn(
          'relative rounded-xl transition-all duration-200',
          currentView === view && 'bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="glass-subtle !border-r-0">
      <SidebarHeader className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0 overflow-hidden max-h-[56px]">
            <img src={logo} alt="Bandit Theory" className="w-auto max-h-[56px] object-cover flex-shrink-0" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 rounded-lg"
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="opacity-30" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {coreNavItems.map(({ view, label, icon }) => renderNavItem(view, label, icon))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Plugin nav items */}
        {enabledPlugins.length > 0 && (
          <>
            <SidebarSeparator className="opacity-30" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium">Modules</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {enabledPlugins.map(plugin => {
                    const navInfo = pluginNavMap[plugin.plugin_name];
                    if (!navInfo) return null;
                    return renderNavItem(navInfo.view, navInfo.label, navInfo.icon);
                  })}
                  {renderNavItem('plugin-settings', 'Plugin Settings', Puzzle)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {enabledPlugins.length === 0 && currentOrganization && (
          <>
            <SidebarSeparator className="opacity-30" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium">Modules</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {renderNavItem('plugin-settings', 'Plugin Settings', Puzzle)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isSuperAdmin && (
          <>
            <SidebarSeparator className="opacity-30" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium">System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {renderNavItem('admin', 'Admin', Shield)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarSeparator className="opacity-30" />

      <SidebarFooter>
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-3 w-full rounded-xl hover:bg-muted/50 transition-colors">
                <Avatar className="h-9 w-9 flex-shrink-0 shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-sm font-medium truncate">{profile.full_name}</span>
                    <span className="text-xs text-muted-foreground truncate">{profile.email}</span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuItem onClick={onOpenProfileSettings}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
