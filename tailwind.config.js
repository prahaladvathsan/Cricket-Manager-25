/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cricket-themed color palette from dev guide
        cricket: {
          primary: '#1a472a',      // Dark green
          secondary: '#2d5016',    // Cricket green
          accent: '#ff6b6b',       // Red for alerts
          background: '#0f1419',   // Dark background
          surface: '#1a1f2a',      // Card background
          'text-primary': '#ffffff',   // White text
          'text-secondary': '#8b92a3', // Grey text
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}