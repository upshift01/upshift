import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Convert base64 to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { token, isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Register service worker and check subscription status
  useEffect(() => {
    if (!isSupported || !isAuthenticated) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking push subscription:', err);
      }
    };

    // Register service worker
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
        checkSubscription();
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  }, [isSupported, isAuthenticated]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !token) {
      setError('Push notifications not supported or not logged in');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${API_URL}/api/push/vapid-key`);
      const vapidData = await vapidResponse.json();

      if (!vapidData.success) {
        setError('Push notifications not configured on server');
        return false;
      }

      const vapidPublicKey = vapidData.vapid_public_key;

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const response = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
          },
          expirationTime: subscription.expirationTime
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsSubscribed(true);
        return true;
      } else {
        setError(data.detail || 'Failed to subscribe');
        return false;
      }

    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err.message || 'Failed to subscribe to notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, token]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !token) return false;

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await fetch(`${API_URL}/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      setIsSubscribed(false);
      return true;

    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      setError(err.message || 'Failed to unsubscribe');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, token]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe
  };
};

export default usePushNotifications;
