/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pmam: {
          blue: '#1B3060',
          'blue-dark': '#0F1E3D',
          'blue-light': '#2D5FA3',
          'blue-hover': '#243d7a',
          gold: '#C8960C',
          'gold-light': '#E8B01A',
          'gold-dark': '#A07808',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
