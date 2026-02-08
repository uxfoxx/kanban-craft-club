import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AuthPage } from '@/components/auth/AuthPage';
import { Header, ViewType } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { ProjectList } from '@/components/projects/ProjectList';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { PersonalDashboard } from '@/components/personal/PersonalDashboard';
import { TimeTrackingPage } from '@/components/personal/TimeTrackingPage';
import { OrganizationPage } from '@/components/organizations/OrganizationPage';
import { Loader2, BellRing, X } from 'lucide-react';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const { isLoading: orgLoading } = useOrganization();
  const { shouldShowPrompt, requestPermission, dismissPrompt } = usePushNotifications();
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
    // If a project is selected, show Kanban regardless of view
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
    <div className="min-h-screen bg-background">
      {shouldShowPrompt && (
        <div className="border-b bg-primary/10 px-4 py-3">
          <div className="container flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <BellRing className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Enable push notifications to stay updated on tasks and deadlines.</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" onClick={requestPermission}>Enable</Button>
              <Button size="sm" variant="ghost" onClick={dismissPrompt}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <Header 
        currentView={currentView}
        onViewChange={handleViewChange}
        profileSettingsOpen={profileSettingsOpen}
        setProfileSettingsOpen={setProfileSettingsOpen}
      />
      <main className="container py-4 md:py-8 pb-20 md:pb-8">
        {renderContent()}
      </main>
      <BottomNavigation currentView={currentView} onViewChange={handleViewChange} />
      <ProfileSettings open={profileSettingsOpen} onOpenChange={setProfileSettingsOpen} />
    </div>
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
