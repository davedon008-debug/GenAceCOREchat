/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090D16',
        surface: 'rgba(15, 23, 42, 0.75)',
        surfaceBorder: 'rgba(255, 255, 255, 0.1)',
        brandCyan: '#06B6D4',
        brandPurple: '#8B5CF6',
        brandAccent: '#3B82F6',
        privacyBurn: '#EF4444',
        privacyPrivate: '#F59E0B',
        privacyVault: '#10B981'
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px'
      }
    },
  },
  plugins: [],
}
