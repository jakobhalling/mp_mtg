/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#1a1a2e',
        'bg-secondary': '#16213e',
        'bg-tertiary': '#0f3460',
        'accent': '#e94560',
        'text-primary': '#f1f1f1',
        'text-secondary': '#d1d1d1',
      },
      height: {
        'game-board': 'calc(100vh - 64px)',
      },
      zIndex: {
        'card-hover': '10',
        'card-enlarged': '100',
      }
    },
  },
  plugins: [],
}
