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
    // Optimize bundle size and performance
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk for React and core libraries
          'vendor-react': ['react', 'react-dom'],
          // Animation libraries
          'vendor-animation': ['framer-motion'],
          // Chart.js and related (heavy - only loaded when Stats tab is opened)
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          // Date libraries
          'vendor-date': ['date-fns', 'react-big-calendar'],
          // Icons
          'vendor-icons': ['lucide-react'],
          // State management
          'vendor-state': ['zustand'],
        },
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 1000,
    // Source maps for debugging (can disable in production)
    sourcemap: false,
  },
});
