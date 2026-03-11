/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        apex: {
          dark: '#141414',
          darker: '#0A0A0A',
          accent: '#CCFF00',
          'accent-hover': '#D4FF33',
          'accent-muted': 'rgba(204, 255, 0, 0.15)',
          profit: '#00FF88',
          'profit-muted': 'rgba(0, 255, 136, 0.15)',
          loss: '#FF3366',
          'loss-muted': 'rgba(255, 51, 102, 0.15)',
          warning: '#FFB800',
          'warning-muted': 'rgba(255, 184, 0, 0.15)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundSize: {
        '200%': '200%',
      },
      transitionTimingFunction: {
        'snap': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.6, 0.01, 0.05, 0.95)',
      },
    },
  },
  plugins: [],
}
