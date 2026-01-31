/* eslint-disable no-restricted-globals */

// UpShift Service Worker for Push Notifications

const CACHE_NAME = 'upshift-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {
    title: 'UpShift Notification',
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'upshift-notification',
    data: {}
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || payload.message || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || `upshift-${Date.now()}`,
        data: payload.data || {},
        actions: payload.actions || []
      };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: true,
    actions: data.actions.length > 0 ? data.actions : [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  // Determine URL to open
  let urlToOpen = '/';
  
  if (data.link) {
    urlToOpen = data.link;
  } else if (data.type === 'new_proposal') {
    urlToOpen = data.job_id ? `/remote-jobs/${data.job_id}/proposals` : '/employer';
  } else if (data.type === 'contract_created' || data.type === 'contract_signed') {
    urlToOpen = data.contract_id ? `/contracts/${data.contract_id}` : '/contracts';
  } else if (data.type === 'milestone_submitted' || data.type === 'milestone_approved') {
    urlToOpen = data.contract_id ? `/contracts/${data.contract_id}` : '/contracts';
  } else if (data.type === 'payment_received') {
    urlToOpen = '/stripe-connect';
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus().then(() => {
              if ('navigate' in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
