/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './src/pages/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/app/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#080b14',
        bgAlt: '#090d18',
        card: '#101625',
        cardAlt: '#0f172a',
        cardBorder: '#1d273e',
        cardBorderSubtle: '#151c2e',
        surface: '#0f172a',
        surfaceAlt: '#0c101c',
        inputBg: '#101625',
        inputBorder: '#1d273e',
        tabBarBg: '#0a0e1a',
        bubbleReceivedBg: '#151c2e',
        bubbleReceivedBorder: '#1e293b',
        primaryStart: '#4f46e5',
        primaryEnd: '#7c3aed',
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
