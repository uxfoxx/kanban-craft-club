import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { Header, ViewType } from '@/components/layout/Header';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { ProjectList } from '@/components/projects/ProjectList';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { PersonalDashboard } from '@/components/personal/PersonalDashboard';
import { TimeTrackingPage } from '@/components/personal/TimeTrackingPage';
import { TeamAnalyticsPage } from '@/components/organizations/TeamAnalyticsPage';
import { Loader2 } from 'lucide-react';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('personal');
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  // Reset project selection when changing views
  useEffect(() => {
    if (currentView !== 'projects') {
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

  const renderContent = () => {
    switch (currentView) {
      case 'personal':
        return (
          <PersonalDashboard 
            onViewTimeTracking={() => setCurrentView('timetracking')} 
          />
        );
      
      case 'projects':
        return selectedProjectId ? (
          <KanbanBoard
            projectId={selectedProjectId}
            onBack={() => setSelectedProjectId(null)}
          />
        ) : (
          <ProjectList
            organizationId={currentOrganization?.id}
            onSelectProject={setSelectedProjectId}
          />
        );
      
      case 'team':
        return <TeamAnalyticsPage />;
      
      case 'timetracking':
        return (
          <TimeTrackingPage 
            onBack={() => setCurrentView('personal')} 
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        currentView={currentView}
        onViewChange={handleViewChange}
        profileSettingsOpen={profileSettingsOpen}
        setProfileSettingsOpen={setProfileSettingsOpen}
      />
      <main className="container py-4 md:py-8 pb-20 md:pb-8">
        {renderContent()}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation 
        currentView={currentView} 
        onViewChange={handleViewChange} 
      />
      
      {/* Profile Settings Dialog */}
      <ProfileSettings 
        open={profileSettingsOpen} 
        onOpenChange={setProfileSettingsOpen} 
      />
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
