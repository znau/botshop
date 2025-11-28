/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f5f7fb',
        body: '#1f2432',
        accent: {
          DEFAULT: '#2563eb',
          soft: '#dbeafe',
        },
      },
    },
  },
  plugins: [],
};
