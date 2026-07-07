import type { Config } from 'tailwindcss';

/**
 * Monochrome + copper-gold accent, soft corners, no shadow-play (master-plan §10).
 * Light background, RTL, Vazirmatn.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#B07D46', // copper-gold
          soft: '#C9A16B',
          ink: '#7A5730',
        },
        ink: {
          DEFAULT: '#1C1B19',
          muted: '#6B6862',
        },
        surface: {
          DEFAULT: '#FBFAF8',
          card: '#FFFFFF',
          border: '#EAE6DF',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
