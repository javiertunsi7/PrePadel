// Parte del service worker que recibe el aviso del partido con la app cerrada.
// Lo carga el service worker generado (vite.config.ts → workbox.importScripts).

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // aviso sin contenido legible: se enseña el texto por defecto
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Toca calentar', {
      body: data.body || 'Tu partido empieza pronto. Diez minutos de calentamiento y a la pista.',
      icon: '/icons/icon-192.png',
      // Misma etiqueta que el aviso de la app abierta: si llegan los dos, se ve uno solo.
      tag: 'prepadel-partido',
      data: { url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
