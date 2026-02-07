import { useState, useEffect, useCallback } from 'react';

const PUSH_ENABLED_KEY = 'push-notifications-enabled';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      setIsSubscribed(
        Notification.permission === 'granted' && 
        localStorage.getItem(PUSH_ENABLED_KEY) === 'true'
      );
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        localStorage.setItem(PUSH_ENABLED_KEY, 'true');
        setIsSubscribed(true);
        return true;
      }
    } catch (err) {
      console.error('Failed to request notification permission:', err);
    }
    return false;
  }, [isSupported]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || Notification.permission !== 'granted') return;

    try {
      // Try service worker notification first (works in background)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            ...options,
          });
        }).catch(() => {
          // Fallback to Notification API
          new Notification(title, { icon: '/pwa-192x192.png', ...options });
        });
      } else {
        new Notification(title, { icon: '/pwa-192x192.png', ...options });
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(() => {
    localStorage.removeItem(PUSH_ENABLED_KEY);
    setIsSubscribed(false);
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    sendLocalNotification,
    unsubscribe,
  };
};
