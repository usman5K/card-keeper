/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#F7F6F2',
        surface: '#FFFFFF',
        ink: '#1A1F1C',
        muted: '#6B7280',
        accent: '#0F6B4C',
        'accent-soft': '#E6F2EC',
        danger: '#B42318',
        border: '#E5E2DA',
        online: '#0F6B4C',
        offline: '#9A6700',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
      },
    },
  },
  plugins: [],
};
