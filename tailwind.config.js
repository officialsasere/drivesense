/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ds: {
          bg:      '#0A0E1A',
          surface: '#111827',
          card:    '#161D2E',
          border:  '#1E2A3E',
          blue:    '#3B82F6',
          cyan:    '#06B6D4',
          green:   '#22C55E',
          amber:   '#F59E0B',
          red:     '#EF4444',
          text:    '#E2E8F0',
          muted:   '#64748B',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':  'spin 3s linear infinite',
        'slide-up':   'slideUp 0.35s ease-out',
        'fade-in':    'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
