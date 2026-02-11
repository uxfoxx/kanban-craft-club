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
import { LayoutDashboard, Home, Building2, Clock, LogOut, Settings, PanelLeftClose, PanelLeft, CalendarDays, DollarSign, Puzzle } from 'lucide-react';

export type ViewType = 'personal' | 'workspace' | 'timetracking' | 'calendar' | 'financials' | 'plugin-settings';

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

  const enabledPlugins = plugins.filter(p => p.enabled);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LayoutDashboard className="h-6 w-6 text-primary flex-shrink-0" />
            {!isCollapsed && <span className="text-lg font-bold truncate">TaskFlow</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
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

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreNavItems.map(({ view, label, icon: Icon }) => (
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

        {/* Plugin nav items */}
        {enabledPlugins.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Modules</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {enabledPlugins.map(plugin => {
                    const navInfo = pluginNavMap[plugin.plugin_name];
                    if (!navInfo) return null;
                    const Icon = navInfo.icon;
                    return (
                      <SidebarMenuItem key={plugin.id}>
                        <SidebarMenuButton
                          isActive={currentView === navInfo.view}
                          onClick={() => onViewChange(navInfo.view)}
                          tooltip={navInfo.label}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{navInfo.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentView === 'plugin-settings'}
                      onClick={() => onViewChange('plugin-settings')}
                      tooltip="Plugin Settings"
                    >
                      <Puzzle className="h-4 w-4" />
                      <span>Plugin Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Show plugin settings even if no plugins enabled yet */}
        {enabledPlugins.length === 0 && currentOrganization && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Modules</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={currentView === 'plugin-settings'}
                      onClick={() => onViewChange('plugin-settings')}
                      tooltip="Plugin Settings"
                    >
                      <Puzzle className="h-4 w-4" />
                      <span>Plugin Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-2 w-full rounded-md hover:bg-sidebar-accent transition-colors">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
