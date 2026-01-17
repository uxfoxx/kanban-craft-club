import React, { useState } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { Header } from '@/components/layout/Header';
import { ProjectList } from '@/components/projects/ProjectList';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Loader2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        {selectedProjectId ? (
          <KanbanBoard
            projectId={selectedProjectId}
            onBack={() => setSelectedProjectId(null)}
          />
        ) : (
          <ProjectList onSelectProject={setSelectedProjectId} />
        )}
      </main>
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
};

export default Index;
