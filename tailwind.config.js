/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cricket-themed color palette - Design System v1.0
        cricket: {
          // Primary colors (Cricket Green)
          primary: '#2D5F3F',
          'primary-light': '#3A7D52',
          'primary-dark': '#1E4229',

          // Accent colors (Trophy Gold)
          accent: '#D4AF37',
          'accent-light': '#E6C963',
          'accent-dark': '#B8941F',
        },

        // Background hierarchy
        bg: {
          primary: '#0F1419',
          secondary: 'rgba(0, 0, 0, 0.4)',
          tertiary: '#242B33',
          hover: '#2D3540',
        },

        // Border colors
        border: {
          primary: '#2D3540',
          secondary: '#3D4550',
          accent: '#4D5560',
        },

        // Text colors — shifted one step lighter (Mar 2026) to lift body-text
        // contrast on the dark dashboard. Old tertiary was ~3.5:1 (below AA);
        // new tertiary is ~5:1, and new secondary clears 9:1.
        text: {
          primary: '#E8EAED',
          secondary: '#C5C8CC',
          tertiary: '#9AA0A6',
          inverse: '#0F1419',
          positive: '#34A853',
          negative: '#EA4335',
          neutral: '#C5C8CC',
          highlight: '#D4AF37',
        },

        // Status colors
        status: {
          win: '#34A853',
          loss: '#EA4335',
          tie: '#FBBC04',
          upcoming: '#4285F4',
          live: '#EA4335',
          excellent: '#0F9D58',
          good: '#34A853',
          average: '#FBBC04',
          poor: '#F4B400',
          critical: '#EA4335',
        },

        // Data visualization
        chart: {
          1: '#4285F4',
          2: '#34A853',
          3: '#FBBC04',
          4: '#EA4335',
          5: '#9334E6',
          6: '#00ACC1',
          7: '#FF6D00',
          8: '#E91E63',
        },

        // Heatmap gradient
        heat: {
          cold: '#4285F4',
          cool: '#34A853',
          warm: '#FBBC04',
          hot: '#EA4335',
        },
      },

      fontFamily: {
        primary: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Bebas Neue', 'sans-serif'],
        heading: ['Rajdhani', 'sans-serif'],
        data: ['Rajdhani', 'ui-monospace', 'monospace'], // Using Rajdhani for data consistency within 3-font limit
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },

      fontSize: {
        '4xl': '1.875rem',  // 30px - Page titles (reduced from 36px)
        '3xl': '1.5rem',    // 24px - Section headers (reduced from 30px)
        '2xl': '1.25rem',   // 20px - Card headers (reduced from 24px)
        'xl': '1.125rem',   // 18px - Sub-headers (reduced from 20px)
        'lg': '1rem',       // 16px - Large body (reduced from 18px)
        'base': '0.875rem', // 14px - Default body (reduced from 16px)
        'sm': '0.8125rem',  // 13px - Small text (reduced from 14px)
        'xs': '0.75rem',    // 12px - Captions (same)
        'xxs': '0.6875rem', // 11px - Micro text (increased from 10px for readability)
      },

      fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },

      lineHeight: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },

      spacing: {
        // Component-specific spacing
        'header': '64px',
        'sidebar': '240px',
        'sidebar-collapsed': '60px',
        'card-padding': '16px',
        'card-padding-lg': '24px',
        'card-padding-sm': '12px',
        'table-row': '36px',
        'table-row-dense': '28px',
        'input-height': '40px',
        'button-height': '40px',
      },

      borderRadius: {
        'card': '8px',
      },

      maxWidth: {
        'content-sm': '640px',
        'content-md': '768px',
        'content-lg': '1024px',
        'content-xl': '1280px',
      },

      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ball-flight': 'ball-flight 1s ease-in-out',
        'score-flash': 'score-flash 0.5s ease-out',
      },

      keyframes: {
        'ball-flight': {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(50%, -50%) scale(0.8)' },
          '100%': { transform: 'translate(100%, 0) scale(1)' },
        },
        'score-flash': {
          '0%': { backgroundColor: 'var(--cricket-accent)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },

      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },

      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}