/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design system colors
        primary: {
          DEFAULT: '#6B7280',
          hover: '#4B5563',
        },
        secondary: {
          DEFAULT: '#78716C',
        },
        accent: {
          DEFAULT: '#0891B2',
          hover: '#0E7490',
        },
        background: '#F5F5F0',
        surface: '#FFFFFF',
        'surface-hover': '#FAFAF8',
        foreground: '#0F172A',
        'foreground-muted': '#475569',
        border: '#EDEEEF',
        'border-strong': '#E5E5E5',
        muted: '#F6F6F7',
        'muted-foreground': '#475569',
        destructive: '#DC2626',
        'destructive-hover': '#B91C1C',
        ring: '#0891B2',
        success: '#059669',
        warning: '#D97706',
      },
      fontFamily: {
        heading: ['Lora', 'Georgia', 'serif'],
        body: ['Raleway', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'heading-1': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-3': ['20px', { lineHeight: '1.4', fontWeight: '500' }],
        'heading-4': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'code': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15, 23, 42, 0.03)',
        'sm': '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
        'md': '0 4px 6px rgba(15, 23, 42, 0.04), 0 2px 4px rgba(15, 23, 42, 0.03)',
        'lg': '0 10px 15px rgba(15, 23, 42, 0.05), 0 4px 6px rgba(15, 23, 42, 0.03)',
        'xl': '0 20px 25px rgba(15, 23, 42, 0.06), 0 10px 10px rgba(15, 23, 42, 0.03)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'ease': 'ease',
      },
    },
  },
  plugins: [],
}