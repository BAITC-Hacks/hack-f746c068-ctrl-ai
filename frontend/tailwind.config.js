/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef4ff', 100: '#dbe6ff', 500: '#4f6bed', 600: '#3d55d4', 700: '#2f43a8' },
      },
    },
  },
  plugins: [],
}
