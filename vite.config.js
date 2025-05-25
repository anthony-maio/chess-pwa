import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // root: process.cwd(), // process.cwd() is /app, so this would be /app
  // root: '', // also /app
  // root: 'chess-pwa', // This would make vite look for vite.config.js in chess-pwa/chess-pwa
  // The root is the directory where index.html is located.
  // Since vite.config.js is in chess-pwa/ and index.html is also in chess-pwa/,
  // the root is effectively the current directory '.' from vite.config.js's perspective.
  // Vite's default root is process.cwd() where the vite command is run.
  // If we run `vite` from `/app/chess-pwa/`, then root defaults to `/app/chess-pwa`.
  // Let's be explicit for clarity.
  root: '.',
  publicDir: 'public', // relative to root. So, chess-pwa/public
  build: {
    outDir: 'dist', // relative to root. So, chess-pwa/dist
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', // This handles the SW registration
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wasm}'], // Cache common assets
        // Ensure that all piece sets and styles are cached.
        // VitePWA should pick up assets from the publicDir automatically if they are part of globPatterns.
        // For files copied from public/ to dist/ (like those in public/pieces/ and public/piece-css/),
        // they should be matched by the globPatterns if their paths in `dist` are like `pieces/...` or `piece-css/...`
        // which is typical.
      },
      manifest: {
        name: 'Offline Chess PWA',
        short_name: 'ChessPWA',
        description: 'A fully offline-capable chess game that can be installed to your home screen.',
        theme_color: '#3367D6', // Matching existing manifest
        background_color: '#ffffff', // Matching existing manifest
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192.png', // Path relative to public directory (becomes root in dist)
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png', // Maskable icon
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
});
