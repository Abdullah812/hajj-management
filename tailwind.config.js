/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f1',
          100: '#f9e8d4',
          200: '#f5d0a9',
          300: '#edb777',
          400: '#e19e4e',
          500: '#d4822f',
          600: '#bc6b24',
          700: '#9c5520',
          800: '#7e441f',
          900: '#663920',
          950: '#391e10',
        },
      }
    },
  },
  plugins: [],
}

