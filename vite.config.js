import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({

  base: '/chess-pwa/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist', 
  },
  	optimizeDeps:{
		exclude:["@undecaf/zbar-wasm"]
	},
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', 
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,nnue}'],
        maximumFileSizeToCacheInBytes: 45000000
      },
      manifest: {
        name: 'Offline Chess PWA',
        short_name: 'ChessPWA',
        description: 'A fully offline-capable chess game that can be installed to your home screen.',
        theme_color: '#3367D6', // Matching existing manifest
        background_color: '#ffffff', // Matching existing manifest
        start_url: './',
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
