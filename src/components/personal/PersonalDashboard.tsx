 import React from 'react';
 import { useAuth } from '@/contexts/AuthContext';
 import { format } from 'date-fns';
 import { TodayTimeCard } from './TodayTimeCard';
 import { TaskDueToday } from './TaskDueToday';
 import { QuickAddTask } from './QuickAddTask';
 import { Button } from '@/components/ui/button';
 import { Clock, ArrowRight } from 'lucide-react';
 
 interface PersonalDashboardProps {
   onViewTimeTracking: () => void;
 }
 
 export const PersonalDashboard: React.FC<PersonalDashboardProps> = ({ onViewTimeTracking }) => {
   const { profile } = useAuth();
   const today = new Date();
   
   const firstName = profile?.full_name?.split(' ')[0] || 'there';
   
   return (
     <div className="space-y-6">
       {/* Welcome Header */}
       <div className="space-y-1">
         <h1 className="text-2xl md:text-3xl font-bold">
           Welcome back, {firstName}!
         </h1>
         <p className="text-muted-foreground">
           {format(today, "EEEE, MMMM d, yyyy")}
         </p>
       </div>
       
       {/* Dashboard Grid */}
       <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
         {/* Left Column */}
         <div className="space-y-4 md:space-y-6">
           <TodayTimeCard />
           <QuickAddTask />
         </div>
         
         {/* Right Column */}
         <div className="space-y-4 md:space-y-6">
           <TaskDueToday />
         </div>
       </div>
       
       {/* Time Tracking Link */}
       <Button 
         variant="outline" 
         className="w-full md:w-auto" 
         onClick={onViewTimeTracking}
       >
         <Clock className="h-4 w-4 mr-2" />
         View Full Time Tracking
         <ArrowRight className="h-4 w-4 ml-2" />
       </Button>
     </div>
   );
 };