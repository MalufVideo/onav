/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./led/**/*.html",
    "./blog/**/*.html",
    "./tours/**/*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00ff9d',
        secondary: '#0066ff',
        purpleish: '#9370DB',
        dark: '#0a0a0a',
        darker: '#020202',
        'light-text': '#e0e0e0',
        'medium-text': '#a0a0a0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'subtle-float': 'subtle-float 6s ease-in-out infinite',
      },
      keyframes: {
        'subtle-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    }
  },
  plugins: [],
}
