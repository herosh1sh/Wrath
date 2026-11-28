/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A'
        },
        // Soft tones
        soft: {
          cream: '#FFFDF5',
          'warm-white': '#FEFEFE',
          pearl: '#F7F5F0',
          sand: '#E8E4DB',
          dust: '#D4CFC4',
          mist: '#C8C4B8',
          fog: '#B8B4A8',
          stone: '#A8A498',
          slate: '#989488',
          charcoal: '#888478'
        },
        // Accent colors
        sage: {
          50: '#F3F5F0',
          100: '#E6EAD6',
          200: '#CCD5AD',
          300: '#B2C084',
          400: '#98AB5A',
          500: '#7E963B',
          600: '#65782E',
          700: '#4C5A24',
          800: '#333C1B',
          900: '#1A1E10'
        },
        rose: {
          50: '#FDF2F3',
          100: '#FBE4E7',
          200: '#F6C9CF',
          300: '#EF9FAE',
          400: '#E87583',
          500: '#E14B5C',
          600: '#C43747',
          700: '#9E2C38',
          800: '#7A242D',
          900: '#601E24'
        },
        amber: {
          50: '#FEFBF0',
          100: '#FDF5D8',
          200: '#FBE9AD',
          300: '#F9DD82',
          400: '#F7D157',
          500: '#F5C52C',
          600: '#D4A425',
          700: '#A87F1E',
          800: '#805C18',
          900: '#664914'
        },
        lavender: {
          50: '#F5F3FA',
          100: '#EBE7F5',
          200: '#D7CFEB',
          300: '#C3B7E1',
          400: '#AF9FD7',
          500: '#9B87CD',
          600: '#7E6BB3',
          700: '#62538A',
          800: '#4A3E67',
          900: '#382F4F'
        },
        // Semantic colors
        background: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          hover: 'var(--color-bg-hover)',
          active: 'var(--color-bg-active)'
        },
        foreground: {
          primary: 'var(--color-fg-primary)',
          secondary: 'var(--color-fg-secondary)',
          tertiary: 'var(--color-fg-tertiary)',
          inverse: 'var(--color-fg-inverse)'
        },
        border: {
          light: 'var(--color-border-light)',
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)'
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          light: 'var(--color-primary-light)',
          foreground: 'var(--color-primary-fg)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          active: 'var(--color-secondary-active)',
          light: 'var(--color-secondary-light)',
          foreground: 'var(--color-secondary-fg)'
        },
        accent: {
          rose: {
            DEFAULT: 'var(--color-accent-rose)',
            hover: 'var(--color-accent-rose-hover)',
            light: 'var(--color-accent-rose-light)'
          },
          amber: {
            DEFAULT: 'var(--color-accent-amber)',
            hover: 'var(--color-accent-amber-hover)',
            light: 'var(--color-accent-amber-light)'
          },
          lavender: {
            DEFAULT: 'var(--color-accent-lavender)',
            hover: 'var(--color-accent-lavender-hover)',
            light: 'var(--color-accent-lavender-light)'
          }
        },
        success: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success-light)'
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          light: 'var(--color-warning-light)'
        },
        error: {
          DEFAULT: 'var(--color-error)',
          light: 'var(--color-error-light)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['DM Sans', 'Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }]
      },
      spacing: {
        '0': '0',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '7': '1.75rem',
        '8': '2rem',
        '9': '2.25rem',
        '10': '2.5rem',
        '11': '2.75rem',
        '12': '3rem',
        '14': '3.5rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '28': '7rem',
        '32': '8rem'
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px'
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.06)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms'
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-down': 'slide-in-from-top 200ms ease-out',
        'slide-up': 'slide-in-from-bottom 200ms ease-out',
        'slide-right': 'slide-in-from-left 200ms ease-out',
        'scale-in': 'scale-in 150ms ease-out'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-in-from-top': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-from-bottom': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-from-left': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
};