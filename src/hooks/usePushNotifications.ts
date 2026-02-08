import { useState, useEffect, useCallback } from 'react';

const PUSH_ENABLED_KEY = 'push-notifications-enabled';
const PUSH_PROMPTED_KEY = 'push-notifications-prompted';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [hasBeenPrompted, setHasBeenPrompted] = useState(true); // default true to avoid flash

  useEffect(() => {
    // Check support outside iframe restrictions
    const supported = typeof window !== 'undefined' && 
      'Notification' in window && 
      'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      setIsSubscribed(
        Notification.permission === 'granted' && 
        localStorage.getItem(PUSH_ENABLED_KEY) === 'true'
      );
      setHasBeenPrompted(localStorage.getItem(PUSH_PROMPTED_KEY) === 'true');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    localStorage.setItem(PUSH_PROMPTED_KEY, 'true');
    setHasBeenPrompted(true);

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

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(PUSH_PROMPTED_KEY, 'true');
    setHasBeenPrompted(true);
  }, []);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            ...options,
          });
        }).catch(() => {
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

  // Should show a visible prompt banner
  const shouldShowPrompt = isSupported && !isSubscribed && !hasBeenPrompted && permission === 'default';

  return {
    isSupported,
    isSubscribed,
    permission,
    shouldShowPrompt,
    requestPermission,
    dismissPrompt,
    sendLocalNotification,
    unsubscribe,
  };
};
