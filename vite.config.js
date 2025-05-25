import { defineConfig } from 'vite';

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
});
