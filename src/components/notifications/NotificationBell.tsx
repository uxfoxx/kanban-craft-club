import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, Users, Calendar, ClipboardList, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useClearNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  onNavigateToProject?: (projectId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigateToProject }) => {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const clearNotifications = useClearNotifications();
  const { isSupported, isSubscribed, permission, requestPermission, sendLocalNotification } = usePushNotifications();
  const prevUnreadRef = useRef(unreadCount);

  // Send push notification when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && isSubscribed && notifications.length > 0) {
      const latest = notifications[0];
      if (latest && !latest.read) {
        sendLocalNotification(latest.title, {
          body: latest.message || undefined,
          tag: latest.id,
        });
      }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, isSubscribed, notifications, sendLocalNotification]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'project_invite':
        return <Users className="h-4 w-4 text-primary" />;
      case 'assignment':
        return <ClipboardList className="h-4 w-4 text-primary" />;
      case 'deadline':
      case 'deadline_warning':
        return <Calendar className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-popover" align="end">
        {/* Push notification prompt */}
        {isSupported && !isSubscribed && (
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">Get push notifications</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={requestPermission}>
                Enable
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                className="h-8 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearNotifications.mutate()}
                className="h-8 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                    !notification.read && 'bg-muted/30'
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead.mutate(notification.id);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
