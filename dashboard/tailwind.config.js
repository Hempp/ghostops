/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        ghost: {
          bg: '#07080a',
          'bg-subtle': '#0c0d10',
          card: '#111318',
          'card-hover': '#16181d',
          border: '#1e2028',
          'border-subtle': '#282a33',
          muted: '#5c5f6a',
          text: '#e4e4e7',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-strong': '0 0 40px rgba(16, 185, 129, 0.25)',
        'premium': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'premium-lg': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'accent-gradient': 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(17, 19, 24, 0.9) 0%, rgba(17, 19, 24, 0.7) 100%)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        'fade-in-scale': 'fade-in-scale 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-scale': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
