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
  				DEFAULT: '#2563EB',
  				foreground: '#FFFFFF'
  			},
  			primaryHover: '#1D4ED8',
  			primaryLight: '#DBEAFE',
  			secondary: {
  				DEFAULT: '#06B6D4',
  				foreground: '#FFFFFF'
  			},
  			secondaryHover: '#0891B2',
  			surface: '#FFFFFF',
  			line: '#E5E7EB',
  			dark: '#111827',
  			textPrimary: '#111827',
  			textSecondary: '#6B7280',
  			success: '#10B981',
  			successBg: '#ECFDF5',
  			warning: '#F59E0B',
  			warningBg: '#FFFBEB',
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
  			input: '12px',
  			button: '12px',
  			card: '18px',
  			modal: '20px',
  			sidebar: '20px',
  			hero: '24px'
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
  			card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
  			cardHover: '0 8px 24px rgba(37, 99, 235, 0.10), 0 2px 8px rgba(16, 24, 40, 0.06)',
  			soft: '0 1px 3px rgba(16, 24, 40, 0.05)'
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
