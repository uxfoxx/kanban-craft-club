import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { TodayTimeCard } from './TodayTimeCard';
import { TaskDueToday } from './TaskDueToday';
import { QuickAddTask } from './QuickAddTask';

interface PersonalDashboardProps {
  onViewTimeTracking: () => void;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ onViewTimeTracking }) => {
  const { profile } = useAuth();
  const today = new Date();
  
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  
  return (
    <div className="space-y-6">
      {/* Welcome + Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            {format(today, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <QuickAddTask />
      
      {/* Dashboard Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Primary: Tasks due today */}
        <div className="lg:col-span-2">
          <TaskDueToday />
        </div>
        
        {/* Secondary: Time */}
        <div className="space-y-4">
          <TodayTimeCard onViewHistory={onViewTimeTracking} />
        </div>
      </div>
    </div>
  );
};