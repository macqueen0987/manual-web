import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
        display: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
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
  plugins: [typography],
}
