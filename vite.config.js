import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5555,
  },
  preview: {
    port: 4173,
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
    // Source maps enabled for production debugging
    sourcemap: true,
    // Optimize bundle size and performance
    rollupOptions: {
      output: {
        // Simplified chunk splitting: only separate Chart.js since it's lazy-loaded
        manualChunks(id) {
          // Chart.js only (lazy-loaded with StatsTab, so safe to separate)
          if (id.includes('node_modules/chart.js') ||
              id.includes('node_modules/react-chartjs-2')) {
            return 'vendor-charts';
          }
          // Everything else stays together to ensure proper loading order
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
