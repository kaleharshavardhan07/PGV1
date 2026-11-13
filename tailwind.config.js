/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6938EF',
          50: '#F2EDFE',
          100: '#E5DBFD',
          200: '#CBB7FB',
          300: '#B192F8',
          400: '#976EF5',
          500: '#7E4AF2',
          600: '#6938EF',
          700: '#572BC7',
          800: '#451E9E',
          900: '#341577',
        },
        secondary: {
          DEFAULT: '#8B5CF6',
          50: '#F5F1FF',
          100: '#EBE3FF',
          200: '#D6C7FF',
          300: '#C2ABFF',
          400: '#AD8FFF',
          500: '#9973FF',
          600: '#8B5CF6',
          700: '#6F47D1',
          800: '#5332AB',
          900: '#371E86',
        },
        dark: {
          DEFAULT: '#17132B',
          50: '#F5F4F8',
          100: '#E7E4EF',
          200: '#C5BFD5',
          300: '#A39AB7',
          400: '#7D7191',
          500: '#574D6E',
          600: '#3F3651',
          700: '#2A243D',
          800: '#1F1B2E',
          900: '#17132B',
        },
        background: {
          DEFAULT: '#F7F5FF',
          100: '#FFFFFF',
          200: '#F7F5FF',
          300: '#EFEBFB',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(105, 56, 239, 0.06)',
        'card': '0 4px 16px rgba(23, 19, 43, 0.06)',
        'glow': '0 8px 32px rgba(105, 56, 239, 0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
