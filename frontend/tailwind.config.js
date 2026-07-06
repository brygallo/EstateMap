/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: '#1E3A8A',
        primaryHover: '#1B3474',
        secondary: '#F59E0B',
        background: '#F7F8FA',
        surface: '#FFFFFF',
        line: '#E5E7EB',
        dark: '#111827',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        muted: '#64748B',
        success: '#10B981',
        error: '#EF4444',
      },
      borderRadius: {
        card: '0.625rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
        cardHover: '0 4px 12px rgba(15, 23, 42, 0.10)',
      },
    },
  },
  plugins: [],
}
