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
        sans: ['var(--font-geist-sans)', 'Geist', 'Inter', 'system-ui', 'sans-serif'],
        geo: ['var(--font-geist-mono)', 'Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Azul: confianza, innovación, tecnología
        primary: '#2563EB',
        primaryHover: '#1D4ED8',
        primaryLight: '#DBEAFE',
        // CTA secundario: cyan
        secondary: '#06B6D4',
        secondaryHover: '#0891B2',
        // Neutrales (slate). El fondo nunca es 100% blanco.
        background: '#F8FAFC',
        surface: '#FFFFFF',
        line: '#E5E7EB',
        dark: '#111827',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        muted: '#64748B',
        // Semánticos (separados del acento)
        success: '#10B981',
        successBg: '#ECFDF5',
        warning: '#F59E0B',
        warningBg: '#FFFBEB',
        error: '#DC2626',
      },
      borderRadius: {
        // Radios del sistema: nunca esquinas cuadradas
        lg: '12px',
        input: '12px',
        button: '12px',
        card: '18px',
        modal: '20px',
        sidebar: '20px',
        hero: '24px',
      },
      boxShadow: {
        // Sombras muy suaves, nunca negro fuerte
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        cardHover: '0 8px 24px rgba(37, 99, 235, 0.10), 0 2px 8px rgba(16, 24, 40, 0.06)',
        soft: '0 1px 3px rgba(16, 24, 40, 0.05)',
      },
      // Escala de apilamiento nombrada. Los valores replican los z-index mágicos
      // previos para no alterar el orden respecto a los panes internos de Leaflet.
      zIndex: {
        mapoverlay: '500',
        mapcontrol: '900',
        nav: '1000',
        backdrop: '1400',
        panel: '1500',
        modal: '2000',
        top: '9999',
      },
    },
  },
  plugins: [],
}
