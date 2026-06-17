export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A0F1E',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569'
        },
        theme: {
          50: 'rgb(var(--color-theme-50) / <alpha-value>)',
          100: 'rgb(var(--color-theme-100) / <alpha-value>)',
          200: 'rgb(var(--color-theme-200) / <alpha-value>)',
          300: 'rgb(var(--color-theme-300) / <alpha-value>)',
          400: 'rgb(var(--color-theme-400) / <alpha-value>)',
          500: 'rgb(var(--color-theme-500) / <alpha-value>)',
          600: 'rgb(var(--color-theme-600) / <alpha-value>)',
          700: 'rgb(var(--color-theme-700) / <alpha-value>)',
          800: 'rgb(var(--color-theme-800) / <alpha-value>)',
          900: 'rgb(var(--color-theme-900) / <alpha-value>)',
        },
        accent: {
          blue: '#3B82F6',
          purple: '#8B5CF6',
          green: '#10B981',
          red: '#EF4444',
          yellow: '#F59E0B',
          cyan: '#06B6D4',
          orange: '#F97316',
          pink: '#EC4899'
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}
