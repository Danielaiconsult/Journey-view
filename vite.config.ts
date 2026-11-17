import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any path (e.g. GitHub Pages at /Journey-view/).
export default defineConfig({
  base: './',
  plugins: [react()],
});
