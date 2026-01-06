import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  base: '/',
  plugins: [
    react(),

    // Bundle analyzer - generates stats.html after build
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
  ],

  server: {
    port: 3000,
    open: true
  },

  build: {
    outDir: 'dist',
    sourcemap: false, // DISABLE for production (saves ~6 MB)

    // Chunk size warnings
    chunkSizeWarningLimit: 500, // Warn if chunk > 500 KB

    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks(id) {
          // Vendor chunks (rarely change)
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }

            // Icons library
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            // State management
            if (id.includes('zustand')) {
              return 'vendor-state';
            }

            // Charting library (heavy)
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }

            // Utilities
            if (id.includes('pako') || id.includes('seedrandom')) {
              return 'vendor-utils';
            }

            // Country flags (already optimized)
            if (id.includes('country-flag-icons')) {
              return 'vendor-flags';
            }

            // All other vendor code
            return 'vendor';
          }

          // Core game engines (separate chunks for lazy loading)
          if (id.includes('core/match-engine')) {
            return 'engine-match';
          }

          if (id.includes('core/auction-system')) {
            return 'engine-auction';
          }

          if (id.includes('core/simulation')) {
            return 'engine-simulation';
          }

          if (id.includes('core/league')) {
            return 'engine-league';
          }
        },

        // Asset naming for long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },

    // Enable gzip reporting
    reportCompressedSize: true,

    // Optimize CSS
    cssCodeSplit: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand'],
    exclude: ['master_player_database.json'] // Don't pre-bundle (now in public/)
  }
});
