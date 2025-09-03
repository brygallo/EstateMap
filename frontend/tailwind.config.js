export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: '#1E3A8A',
        secondary: '#F59E0B',
        background: '#F9FAFB',
        dark: '#111827',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        success: '#10B981',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
}
