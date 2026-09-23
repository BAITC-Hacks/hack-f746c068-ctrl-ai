/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Inter', '"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Apple-синий
        brand: { 50: '#eef6ff', 100: '#d9ebff', 500: '#0a84ff', 600: '#0071e3', 700: '#0058b0' },
        // Нейтральные серые в духе apple.com (переопределяют slate во всём проекте)
        slate: {
          50: '#f5f5f7', 100: '#ededf0', 200: '#e3e3e8', 300: '#d2d2d7', 400: '#a1a1a6',
          500: '#86868b', 600: '#6e6e73', 700: '#424245', 800: '#2c2c2e', 900: '#1d1d1f',
        },
      },
      borderRadius: { '4xl': '2rem' },
      letterSpacing: { tightest: '-0.035em' },
    },
  },
  plugins: [],
}
