import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        // Keep console.warn and console.error for debugging
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.log'], // Only remove console.log, keep warn/error
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Source maps disabled for smaller production builds
    sourcemap: false,
    // Optimize bundle size and performance
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Chart.js (heavy - only loads with Stats tab)
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'vendor-charts';
          }
          // Animation library
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-animation';
          }
          // Date libraries
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/react-big-calendar')) {
            return 'vendor-date';
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // State management
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
          // Other node_modules go into vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
