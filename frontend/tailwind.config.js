/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Inter', '"Segoe UI Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Фирменный зелёный (#00815F) и золотой (#F1A400)
        brand: { 50: '#e6f4ef', 100: '#c7e7da', 500: '#1fae7a', 600: '#00815f', 700: '#006a4e' },
        gold: { 300: '#ffd24d', 400: '#ffc629', 500: '#f1a400', 600: '#d18e00' },
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
