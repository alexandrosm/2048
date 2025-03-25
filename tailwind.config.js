/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './*.html',
    './*.js',
  ],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        'light-bg': '#faf8ef',
        'light-text': '#776e65',
        'light-grid-bg': '#bbada0',
        'light-cell-bg': 'rgba(238, 228, 218, 0.35)',
        'light-button-bg': '#8f7a66',
        'light-button-hover-bg': '#9f8b76',
        'light-message-bg': 'rgba(238, 228, 218, 0.73)',
        'light-win-message-bg': 'rgba(237, 194, 46, 0.5)',

        // Dark mode colors
        'dark-bg': '#000000',
        'dark-text': '#777777',
        'dark-grid-bg': '#000000',
        'dark-cell-bg': '#000000',
        'dark-button-bg': '#333333',
        'dark-button-hover-bg': '#444444',
        'dark-message-bg': 'rgba(0, 0, 0, 0.8)',
        'dark-win-message-bg': 'rgba(0, 0, 0, 0.8)',

        // Tile colors
        'tile-2-light': '#eee4da',
        'tile-2-dark': '#000000',
        'tile-4-light': '#ede0c8',
        'tile-4-dark': '#000000',
        'tile-8-light': '#f2b179',
        'tile-8-dark': '#000000',
        'tile-16-light': '#f59563',
        'tile-16-dark': '#000000',
        'tile-32-light': '#f67c5f',
        'tile-32-dark': '#000000',
        'tile-64-light': '#f65e3b',
        'tile-64-dark': '#000000',
        'tile-128-light': '#edcf72',
        'tile-128-dark': '#000000',
        'tile-256-light': '#edcc61',
        'tile-256-dark': '#000000',
        'tile-512-light': '#edc850',
        'tile-512-dark': '#000000',
        'tile-1024-light': '#edc53f',
        'tile-1024-dark': '#000000',
        'tile-2048-light': '#edc22e',
        'tile-2048-dark': '#000000',
        'tile-super-light': '#3c3a32',
        'tile-super-dark': '#000000',
      },
      spacing: {
        'grid-gap': '15px',
      },
      borderRadius: {
        'game': '6px',
      },
      fontSize: {
        'tile': 'clamp(16px, 5vw, 35px)',
        'tile-large': 'clamp(14px, 4.25vw, 30px)',
        'tile-larger': 'clamp(12px, 3.5vw, 25px)',
        'tile-largest': 'clamp(10px, 3vw, 21px)',
      },
      animation: {
        'appear': 'appear 0.1s ease-out',
        'merge-pop': 'merge-pop 0.1s ease-in-out',
        'score-pop': 'score-pop 0.6s ease-in',
        'fade-in': 'fade-in 0.8s ease',
      },
      keyframes: {
        'appear': {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '60%': { opacity: '0.9', transform: 'scale(1.1)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'merge-pop': {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'score-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
