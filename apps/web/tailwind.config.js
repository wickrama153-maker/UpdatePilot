/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Enterprise Design Tokens
        enterprise: {
          navy: '#101827',
          surface: '#182334',
          surfaceAlt: '#202E40',
          teal: '#19C6B4',
          cyan: '#63D9D0',
          lightBg: '#F4F7FA',
          lightText: '#172334',
          lightTeal: '#009F91',
          success: '#22C55E',
          warning: '#F5B942',
          error: '#EF5350',
          info: '#60A5FA',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'enterprise-sm': '0 1px 2px 0 rgba(16, 24, 39, 0.05)',
        'enterprise-md': '0 4px 12px -2px rgba(16, 24, 39, 0.08), 0 2px 4px -2px rgba(16, 24, 39, 0.04)',
        'enterprise-dark': '0 8px 24px -4px rgba(0, 0, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
