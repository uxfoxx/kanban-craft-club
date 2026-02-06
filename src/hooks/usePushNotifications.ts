import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY_STORAGE = 'push-notifications-enabled';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      setIsSubscribed(localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE) === 'true');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, 'true');
      setIsSubscribed(true);
      return true;
    }
    return false;
  }, [isSupported]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return;

    // Use service worker notification if available, fallback to Notification API
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        ...options,
      });
    }
  }, [isSupported, permission]);

  const unsubscribe = useCallback(() => {
    localStorage.removeItem(VAPID_PUBLIC_KEY_STORAGE);
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
