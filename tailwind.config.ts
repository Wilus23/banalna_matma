import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './types/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#081a33',
          elevated: '#102744'
        },
        accent: {
          DEFAULT: '#6be4ff',
          success: '#45d18f',
          danger: '#ff6b7d'
        }
      },
      boxShadow: {
        glass: '0 10px 40px rgba(4, 14, 35, 0.45)',
        glow: '0 0 0 1px rgba(107, 228, 255, 0.3), 0 0 40px rgba(107, 228, 255, 0.15)'
      },
      backdropBlur: {
        xs: '2px'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: []
};

export default config;
