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
        display: ['Orbitron', 'Space Grotesk', 'sans-serif'],
        data:    ['Share Tech Mono', 'JetBrains Mono', 'monospace'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        apex: {
          // Backgrounds — blue-tinted deep blacks (feels alive, not flat)
          void:    '#030508',
          deep:    '#07090F',
          dark:    '#0D1117',
          surface: '#131B24',
          raised:  '#1A2333',

          // Primary accent — electric lime, unchanged
          accent:        '#CCFF00',
          'accent-hover':'#D9FF4D',
          'accent-muted':'rgba(204, 255, 0, 0.10)',
          'accent-glow': 'rgba(204, 255, 0, 0.22)',

          // Data/live accent
          cyan:        '#00D4FF',
          'cyan-muted':'rgba(0, 212, 255, 0.10)',

          // AI / Claude content accent
          violet:        '#9D6FFF',
          'violet-muted':'rgba(157, 111, 255, 0.10)',

          // Semantic
          profit:          '#00E879',
          'profit-muted':  'rgba(0, 232, 121, 0.10)',
          loss:            '#FF2052',
          'loss-muted':    'rgba(255, 32, 82, 0.10)',
          warning:         '#FFB800',
          'warning-muted': 'rgba(255, 184, 0, 0.10)',

          // Legacy aliases (keep for backward compat)
          darker: '#030508',
          darker2:'#07090F',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'data-pulse': 'dataPulse 2.5s ease-in-out infinite',
        'flicker':    'flicker 6s ease-in-out infinite',
        'scan':       'scanLine 3s linear infinite',
        'glow':       'glowPulse 2.5s ease-in-out infinite',
        'marquee':    'marquee 22s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        dataPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        flicker: {
          '0%, 92%, 100%': { opacity: '1' },
          '93%': { opacity: '0.3' },
          '96%': { opacity: '0.85' },
          '97%': { opacity: '0.4' },
          '98%': { opacity: '0.95' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(500%)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.70' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backgroundSize: {
        '200%': '200%',
      },
      transitionTimingFunction: {
        'snap':   'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.6, 0.01, 0.05, 0.95)',
      },
    },
  },
  plugins: [],
}
