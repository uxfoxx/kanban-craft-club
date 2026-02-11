import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';

import { AuthPage } from '@/components/auth/AuthPage';
import { AppSidebar, ViewType } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ActiveTimer } from '@/components/time/ActiveTimer';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ProjectList } from '@/components/projects/ProjectList';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { PersonalDashboard } from '@/components/personal/PersonalDashboard';
import { TimeTrackingPage } from '@/components/personal/TimeTrackingPage';
import { OrganizationPage } from '@/components/organizations/OrganizationPage';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { Loader2, BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const { isLoading: orgLoading } = useOrganization();
  const { shouldShowPrompt, needsInstall, requestPermission, dismissPrompt } = usePushNotifications();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('personal');
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [kanbanSource, setKanbanSource] = useState<ViewType>('projects');

  useEffect(() => {
    if (currentView !== 'projects' && currentView !== 'team') {
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
      case 'projects':
        return <ProjectList onSelectProject={(id) => handleSelectProject(id, 'projects')} />;
      case 'team':
        return <OrganizationPage onSelectProject={(id) => handleSelectProject(id, 'team')} />;
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
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ActiveTimer />
              <NotificationBell />
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
