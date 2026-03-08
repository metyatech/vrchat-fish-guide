/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe3fd',
          300: '#93d1fc',
          400: '#60b5f8',
          500: '#3b96f3',
          600: '#2578e8',
          700: '#1d63d5',
          800: '#1e50ac',
          900: '#1e4688',
        },
      },
    },
  },
  plugins: [],
};
