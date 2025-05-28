// src/sw.js - Your Service Worker file

// Import the Workbox library for precaching and routing
import { precacheAndRoute } from 'workbox-precaching';

// self.__WB_MANIFEST is injected by vite-plugin-pwa during the build process
// It contains the list of all files to precache for offline access.
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