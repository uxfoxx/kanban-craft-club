import { useState, useEffect, useCallback } from 'react';

const PUSH_ENABLED_KEY = 'push-notifications-enabled';
const PUSH_PROMPTED_KEY = 'push-notifications-prompted';

/**
 * Detect if the app is running as an installed PWA (standalone mode).
 */
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

/**
 * Detect iOS devices.
 */
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [hasBeenPrompted, setHasBeenPrompted] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isiOS = isIOS();
    const standalone = isStandalone();

    // On iOS, Notification API is only available when installed as PWA (iOS 16.4+)
    if (isiOS && !standalone) {
      setNeedsInstall(true);
      setIsSupported(false);
      setReady(true);
      return;
    }

    const supported =
      typeof window !== 'undefined' &&
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

    setReady(true);
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

  const sendLocalNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || Notification.permission !== 'granted') return;

      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification(title, {
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                ...options,
              });
            })
            .catch(() => {
              new Notification(title, { icon: '/pwa-192x192.png', ...options });
            });
        } else {
          new Notification(title, { icon: '/pwa-192x192.png', ...options });
        }
      } catch (err) {
        console.error('Failed to send notification:', err);
      }
    },
    [isSupported]
  );

  const unsubscribe = useCallback(() => {
    localStorage.removeItem(PUSH_ENABLED_KEY);
    setIsSubscribed(false);
  }, []);

  // Show prompt when: supported + not subscribed + not yet prompted + default permission
  // OR when iOS but not installed as PWA
  const shouldShowPrompt =
    ready &&
    ((isSupported && !isSubscribed && !hasBeenPrompted && permission === 'default') ||
      needsInstall);

  return {
    isSupported,
    isSubscribed,
    permission,
    shouldShowPrompt,
    needsInstall,
    requestPermission,
    dismissPrompt,
    sendLocalNotification,
    unsubscribe,
  };
};
