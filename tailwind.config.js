/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
        secondary: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c' },
        accent: { 50:'#ecfdf5',100:'#d1fae5',500:'#10b981',600:'#059669',700:'#047857' },
      },
      fontFamily: {
        sans: ['Noto Sans','Noto Sans Tamil','Noto Sans Sinhala','system-ui','sans-serif'],
        tamil: ['Noto Sans Tamil','sans-serif'],
        sinhala: ['Noto Sans Sinhala','sans-serif'],
      },
    },
  },
  plugins: [],
};
