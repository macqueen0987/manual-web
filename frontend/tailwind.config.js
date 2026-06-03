import typography from '@tailwindcss/typography'
import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        surface: {
          DEFAULT: '#fafaf9',
          raised: '#ffffff',
          muted: '#f5f5f4',
        },
        ink: {
          DEFAULT: '#1c1917',
          muted: '#57534e',
          faint: '#a8a29e',
        },
        accent: {
          DEFAULT: '#0d9488',
          hover: '#0f766e',
          muted: '#ccfbf1',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
        display: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 25, 23, 0.06), 0 0 0 1px rgba(28, 25, 23, 0.04)',
        elevated: '0 8px 30px rgba(28, 25, 23, 0.08), 0 0 0 1px rgba(28, 25, 23, 0.04)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  plugins: [typography, tailwindcssAnimate],
}
