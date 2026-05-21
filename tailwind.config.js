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
        accent: {
          blue: '#3B82F6',
          purple: '#8B5CF6',
          green: '#10B981',
          red: '#EF4444',
          yellow: '#F59E0B',
          cyan: '#06B6D4',
          orange: '#F97316'
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
}
