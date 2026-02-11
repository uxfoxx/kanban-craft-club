import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';

import { AuthPage } from '@/components/auth/AuthPage';
import { AppSidebar, ViewType } from '@/components/layout/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ActiveTimer } from '@/components/time/ActiveTimer';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { PersonalDashboard } from '@/components/personal/PersonalDashboard';
import { TimeTrackingPage } from '@/components/personal/TimeTrackingPage';
import { WorkspacePage } from '@/components/workspace/WorkspacePage';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { useProject } from '@/hooks/useProjects';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

const viewTitles: Record<ViewType, string> = {
  personal: 'Dashboard',
  workspace: 'Workspace',
  timetracking: 'Time Tracking',
};

const PageTitle: React.FC<{ currentView: ViewType; selectedProjectId: string | null }> = ({ currentView, selectedProjectId }) => {
  const { data: project } = useProject(selectedProjectId || undefined);

  if (selectedProjectId && project) {
    return <h1 className="text-lg font-semibold truncate">{project.name}</h1>;
  }
  return <h1 className="text-lg font-semibold">{viewTitles[currentView]}</h1>;
};

const Dashboard: React.FC = () => {
  const { user, loading, profile } = useAuth();
  const { isLoading: orgLoading } = useOrganization();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('personal');
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [kanbanSource, setKanbanSource] = useState<ViewType>('workspace');

  useEffect(() => {
    if (currentView !== 'workspace') {
      setSelectedProjectId(null);
    }
  }, [currentView]);

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setSelectedProjectId(null);
  };

  const handleSelectProject = (projectId: string, source: ViewType = 'projects') => {
    setSelectedProjectId(projectId);
    setKanbanSource(source);
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const renderContent = () => {
    if (selectedProjectId) {
      return (
        <KanbanBoard
          projectId={selectedProjectId}
          onBack={() => setSelectedProjectId(null)}
        />
      );
    }

    switch (currentView) {
      case 'personal':
        return <PersonalDashboard onViewTimeTracking={() => setCurrentView('timetracking')} />;
      case 'workspace':
        return <WorkspacePage onSelectProject={(id) => handleSelectProject(id, 'workspace')} />;
      case 'timetracking':
        return <TimeTrackingPage onBack={() => setCurrentView('personal')} />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          onOpenProfileSettings={() => setProfileSettingsOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="border-b bg-card h-14 flex items-center justify-between px-4 flex-shrink-0">
            <PageTitle currentView={currentView} selectedProjectId={selectedProjectId} />
            <div className="flex items-center gap-2 md:gap-3">
              <ActiveTimer />
              <NotificationBell />
              {profile && (
                <button onClick={() => setProfileSettingsOpen(true)} className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              )}
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {renderContent()}
          </main>
        </div>
      </div>
      <ProfileSettings open={profileSettingsOpen} onOpenChange={setProfileSettingsOpen} />
    </SidebarProvider>
  );
};

const Index: React.FC = () => {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <Dashboard />
      </OrganizationProvider>
    </AuthProvider>
  );
};

export default Index;
