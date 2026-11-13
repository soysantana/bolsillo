self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Bolsillo', {
      body: data.body || 'Tienes una actualización en Bolsillo.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      silent: false,
      renotify: true,
      tag: data.tag || 'bolsillo-notification',
      data: { url: data.url || '/inicio' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/inicio', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const openWindow = windows.find((window) => window.url.startsWith(self.location.origin));
      if (openWindow) return openWindow.focus();
      return clients.openWindow(target);
    }),
  );
});
