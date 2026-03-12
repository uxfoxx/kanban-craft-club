import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { TodayTimeCard } from './TodayTimeCard';
import { TaskDueToday } from './TaskDueToday';
import { UpcomingDeadlines } from './UpcomingDeadlines';
import { TodayEarningsCard } from './TodayEarningsCard';

interface PersonalDashboardProps {
  onViewTimeTracking: () => void;
}

export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ onViewTimeTracking }) => {
  const { profile } = useAuth();
  const today = new Date();
  
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(today, "EEEE, MMMM d, yyyy")}
        </p>
      </div>
      
      {/* Dashboard Grid */}
      <div className="grid gap-5 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Primary: Upcoming Deadlines */}
        <div className="lg:col-span-2">
          <UpcomingDeadlines />
        </div>
        
        {/* Secondary: Time + Earnings */}
        <div className="space-y-5">
          <TodayTimeCard onViewHistory={onViewTimeTracking} />
          <TodayEarningsCard />
        </div>
      </div>

      {/* Tasks due today */}
      <TaskDueToday />
    </div>
  );
};
