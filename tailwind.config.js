/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0e14',
          secondary: '#151922',
          tertiary: '#1e2530',
        },
        text: {
          primary: '#e6e8ea',
          secondary: '#9195a0',
          tertiary: '#5a5f6b',
        },
        green: {
          glow: '#3dd68c',
          dark: '#2a9d66',
          muted: '#1a5c3f',
          canvas: '#4ade80',
          manual: '#10b981',
        },
        status: {
          'not-started': '#6b7280',
          'in-progress': '#f59e0b',
          complete: '#3dd68c',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(61, 214, 140, 0.3)',
        'glow-strong': '0 0 30px rgba(61, 214, 140, 0.5)',
      },
    },
  },
  plugins: [],
};
