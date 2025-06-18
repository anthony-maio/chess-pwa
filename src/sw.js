// src/sw.js - Your Service Worker file

// Import the Workbox library for precaching and routing
import { precacheAndRoute } from 'workbox-precaching';

 // Precache manifest injected by plugin
precacheAndRoute(self.__WB_MANIFEST || []);

// Optional: Add other Workbox strategies here, e.g., for runtime caching
//mport { registerRoute } from 'workbox-routing';
//import { NetworkFirst } from 'workbox-strategies';

// Example: Cache Google Fonts (runtime caching)
/*
registerRoute(
  ({url}) => url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
  new NetworkFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);
*/

// Any other service worker logic you need (e.g., push notifications, background sync)