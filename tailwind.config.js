/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#070c14',
          900: '#0c1424',
          850: '#111b2f',
          800: '#17243c',
          700: '#223556',
          600: '#2f4977',
        },
        squid: {
          400: '#f48ca5',
          500: '#eb6d8a',
          600: '#d75070',
          700: '#b83b58',
          light: '#ffe5ec',
        },
        polyGreen: {
          DEFAULT: '#10b981',
          hover: '#059669',
          bg: 'rgba(16, 185, 129, 0.12)',
        },
        polyRed: {
          DEFAULT: '#f43f5e',
          hover: '#e11d48',
          bg: 'rgba(244, 63, 94, 0.12)',
        }
      }
    },
  },
  plugins: [],
}
