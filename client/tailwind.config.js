export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark theme surfaces
        surface: {
          base: '#0D1117',
          card: '#161B22',
          raised: '#1C2333',
          hover: '#21262D',
        },
        // Borders
        edge: {
          DEFAULT: '#30363D',
          strong: '#3D4450',
        },
        // Brand accent — warm amber/gold
        accent: {
          DEFAULT: '#F0A500',
          dark: '#C87D00',
        },
        // Secondary accent — teal
        teal: {
          DEFAULT: '#00B4D8',
        },
        // Text hierarchy
        tx: {
          h: '#F0F6FC',
          b: '#C9D1D9',
          m: '#8B949E',
          f: '#484F58',
        },
        // Status colors
        ok: '#3FB950',
        danger: '#F85149',
        caution: '#D29922',
        highlight: '#BC8CFF',
        // Keep for any residual refs
        brand: {
          50:  '#f3f0ff',
          100: '#ece5ff',
          200: '#d9cefd',
          300: '#bea8fc',
          400: '#9f79f8',
          500: '#8249f5',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4B2A91',
          900: '#3b1f72',
          950: '#250f50',
        },
        lavender: {
          50:  '#f8f6ff',
          100: '#f0ecff',
          200: '#e4daff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        sm:        '0 1px 3px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3)',
        md:        '0 8px 24px rgba(0,0,0,.5)',
        glow:      '0 0 20px rgba(240,165,0,0.12)',
        card:      '0 1px 3px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3)',
        'card-hover': '0 8px 24px rgba(0,0,0,.5)',
      },
    },
  },
  plugins: [],
}
