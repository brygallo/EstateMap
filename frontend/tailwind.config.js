/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
	extend: {
		fontFamily: {
			sans: [
				'var(--font-geist-sans)',
				'Geist',
				'Inter',
				'system-ui',
				'sans-serif'
			],
			geo: [
				'var(--font-geist-mono)',
				'Geist Mono',
				'ui-monospace',
				'SFMono-Regular',
				'monospace'
			]
		},
		colors: {
			primary: {
				DEFAULT: '#1F6F5B',
				foreground: '#FFFFFF'
			},
			primaryHover: '#14523F',
			primaryLight: '#E5F2EE',
			secondary: {
				DEFAULT: '#C8A96A',
				foreground: '#111827'
			},
			secondaryHover: '#A8863F',
			// Paleta azul/navy reutilizable (footer y secciones oscuras).
			// De 100 (más claro) a 500 (más oscuro); cambiar aquí actualiza todo.
			navy: {
				100: '#E7E2F3',
				200: '#A7B2E6',
				300: '#688CCA',
				400: '#496D9C',
				500: '#2D3C67'
			},
			surface: '#FFFFFF',
			line: '#E5E2DA',
			dark: '#111827',
			textPrimary: '#111827',
			textSecondary: '#6B7280',
			success: '#1F6F5B',
			successBg: '#E5F2EE',
			warning: '#B7791F',
			warningBg: '#FBF4E3',
			error: '#DC2626',
			background: 'hsl(var(--background))',
			foreground: 'hsl(var(--foreground))',
			muted: {
				DEFAULT: 'hsl(var(--muted))',
				foreground: 'hsl(var(--muted-foreground))'
			},
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			accent: {
				DEFAULT: 'hsl(var(--accent))',
				foreground: 'hsl(var(--accent-foreground))'
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
			border: 'hsl(var(--border))',
			input: 'hsl(var(--input))',
			ring: 'hsl(var(--ring))'
		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)',
			input: '6px',
			button: '7px',
			card: '8px',
			modal: '10px',
			sidebar: '10px',
			hero: '10px'
		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out'
		},
		boxShadow: {
			card: '0 1px 2px rgba(32, 45, 40, 0.06)',
			cardHover: '0 10px 28px rgba(32, 45, 40, 0.12), 0 2px 8px rgba(32, 45, 40, 0.08)',
			soft: '0 1px 3px rgba(32, 45, 40, 0.06)'
		},
		zIndex: {
			mapoverlay: '500',
			mapcontrol: '900',
			nav: '1000',
			backdrop: '1400',
			panel: '1500',
			modal: '2000',
			top: '9999'
		}
	}
  },
  plugins: [require('tailwindcss-animate')],
}
