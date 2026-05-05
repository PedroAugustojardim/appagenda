const CACHE = 'ghestror-v2';
const ASSETS = [
  '/', '/index.html', '/manifest.json',
  '/style.css',
  '/css/base.css', '/css/layout.css', '/css/tasks.css',
  '/css/calendar.css', '/css/sheets.css', '/css/modal.css',
  '/js/main.js', '/js/store.js', '/js/utils.js',
  '/js/tasks.js', '/js/notifications.js', '/js/export.js',
  '/js/events.js', '/js/calendar.js',
  '/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Ghestror', body: 'Você tem tarefas pendentes!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      vibrate: [200, 100, 200],
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
