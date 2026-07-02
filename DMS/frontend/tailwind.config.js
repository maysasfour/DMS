/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Disaster/Emergency custom palette
        'disaster-navy': '#0E2A47',
        'disaster-red': '#E63946',
        'disaster-orange': '#FF7A00',
        'emergency-amber': '#FFC107',
        'safety-green': '#16A34A',
        'alert-purple': '#6D28D9',
      },
      backgroundImage: {
        'gradient-disaster': 'linear-gradient(135deg, #DC2626 0%, #EA580C 50%, #1E3A8A 100%)',
        'gradient-emergency': 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
        'gradient-relief': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-subtle': 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
      },
      boxShadow: {
        'disaster': '0 10px 30px rgba(220, 38, 38, 0.3)',
        'card-hover': '0 20px 40px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'pulse-disaster': 'pulse-disaster 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-alert': 'bounce-alert 1s ease-in-out infinite',
        'slide-in': 'slide-in 0.5s ease-out',
        'fade-in': 'fade-in 0.6s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        'pulse-disaster': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.8' },
        },
        'bounce-alert': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}

