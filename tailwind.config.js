/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F1117',
        surface: '#1A1D29',
        'surface-light': '#252836',
        primary: '#C9A96E',
        'primary-dark': '#B89B5F',
        success: '#0A6C74',
        error: '#A83232',
        warning: '#D4A574',
        'text-primary': '#F8F9FA',
        'text-secondary': '#B8BCC8',
        'text-muted': '#6B7280',
        border: '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 169, 110, 0.7)' },
          '50%': { boxShadow: '0 0 0 10px rgba(201, 169, 110, 0)' },
        },
      },
      boxShadow: {
        'gold': '0 4px 14px 0 rgba(201, 169, 110, 0.39)',
        'gold-light': '0 2px 8px 0 rgba(201, 169, 110, 0.2)',
        'surface': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
