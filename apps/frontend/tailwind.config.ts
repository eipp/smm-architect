import type { Config } from "tailwindcss"
import { tokens } from "./src/design-system/tokens"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Brand colors align with CSS variables for runtime theming
        primary: {
          DEFAULT: 'hsl(var(--color-primary-500))',
          foreground: 'hsl(var(--primary-foreground))',
          50: 'hsl(var(--color-primary-50))',
          100: 'hsl(var(--color-primary-100))',
          200: 'hsl(var(--color-primary-200))',
          300: 'hsl(var(--color-primary-300))',
          400: 'hsl(var(--color-primary-400))',
          500: 'hsl(var(--color-primary-500))',
          600: 'hsl(var(--color-primary-600))',
          700: 'hsl(var(--color-primary-700))',
          800: 'hsl(var(--color-primary-800))',
          900: 'hsl(var(--color-primary-900))',
          950: 'hsl(var(--color-primary-950))',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent-500))',
          foreground: 'hsl(var(--accent-foreground))',
          50: 'hsl(var(--color-accent-50))',
          100: 'hsl(var(--color-accent-100))',
          200: 'hsl(var(--color-accent-200))',
          300: 'hsl(var(--color-accent-300))',
          400: 'hsl(var(--color-accent-400))',
          500: 'hsl(var(--color-accent-500))',
          600: 'hsl(var(--color-accent-600))',
          700: 'hsl(var(--color-accent-700))',
          800: 'hsl(var(--color-accent-800))',
          900: 'hsl(var(--color-accent-900))',
          950: 'hsl(var(--color-accent-950))',
        },
        // Status colors
        success: {
          DEFAULT: 'hsl(var(--color-success-500))',
          50: 'hsl(var(--color-success-50))',
          100: 'hsl(var(--color-success-100))',
          200: 'hsl(var(--color-success-200))',
          300: 'hsl(var(--color-success-300))',
          400: 'hsl(var(--color-success-400))',
          500: 'hsl(var(--color-success-500))',
          600: 'hsl(var(--color-success-600))',
          700: 'hsl(var(--color-success-700))',
          800: 'hsl(var(--color-success-800))',
          900: 'hsl(var(--color-success-900))',
          950: 'hsl(var(--color-success-950))',
        },
        warning: {
          DEFAULT: 'hsl(var(--color-warning-500))',
          50: 'hsl(var(--color-warning-50))',
          100: 'hsl(var(--color-warning-100))',
          200: 'hsl(var(--color-warning-200))',
          300: 'hsl(var(--color-warning-300))',
          400: 'hsl(var(--color-warning-400))',
          500: 'hsl(var(--color-warning-500))',
          600: 'hsl(var(--color-warning-600))',
          700: 'hsl(var(--color-warning-700))',
          800: 'hsl(var(--color-warning-800))',
          900: 'hsl(var(--color-warning-900))',
          950: 'hsl(var(--color-warning-950))',
        },
        error: {
          DEFAULT: 'hsl(var(--color-error-500))',
          50: 'hsl(var(--color-error-50))',
          100: 'hsl(var(--color-error-100))',
          200: 'hsl(var(--color-error-200))',
          300: 'hsl(var(--color-error-300))',
          400: 'hsl(var(--color-error-400))',
          500: 'hsl(var(--color-error-500))',
          600: 'hsl(var(--color-error-600))',
          700: 'hsl(var(--color-error-700))',
          800: 'hsl(var(--color-error-800))',
          900: 'hsl(var(--color-error-900))',
          950: 'hsl(var(--color-error-950))',
        },
        // Neutral scale from design tokens
        neutral: {
          50: 'hsl(var(--color-neutral-50))',
          100: 'hsl(var(--color-neutral-100))',
          200: 'hsl(var(--color-neutral-200))',
          300: 'hsl(var(--color-neutral-300))',
          400: 'hsl(var(--color-neutral-400))',
          500: 'hsl(var(--color-neutral-500))',
          600: 'hsl(var(--color-neutral-600))',
          700: 'hsl(var(--color-neutral-700))',
          800: 'hsl(var(--color-neutral-800))',
          900: 'hsl(var(--color-neutral-900))',
          950: 'hsl(var(--color-neutral-950))',
        },
        // Semantic colors
        canvas: {
          background: 'hsl(var(--color-canvas-background))',
          grid: 'hsl(var(--color-neutral-300))',
          node: 'hsl(var(--color-workspace-background))',
          edge: 'hsl(var(--color-neutral-500))',
        },
        agent: {
          active: 'hsl(var(--color-agent-active))',
          idle: 'hsl(var(--color-neutral-400))',
        },
        simulation: {
          running: 'hsl(var(--color-simulation-running))',
          complete: 'hsl(var(--color-policy-compliant))',
        },
        policy: {
          compliant: 'hsl(var(--color-policy-compliant))',
          violation: 'hsl(var(--color-error-500))',
        },
        audit: {
          verified: 'hsl(var(--color-audit-verified))',
          pending: 'hsl(var(--color-warning-500))',
        },
        // Design system colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: tokens.typography.fontFamily.primary.split(', '),
        serif: tokens.typography.fontFamily.secondary.split(', '),
        mono: tokens.typography.fontFamily.mono.split(', '),
      },
      fontSize: {
        xs: [tokens.typography.fontSize.xs, { lineHeight: tokens.typography.lineHeight.xs }],
        sm: [tokens.typography.fontSize.sm, { lineHeight: tokens.typography.lineHeight.sm }],
        base: [tokens.typography.fontSize.base, { lineHeight: tokens.typography.lineHeight.base }],
        lg: [tokens.typography.fontSize.lg, { lineHeight: tokens.typography.lineHeight.lg }],
        xl: [tokens.typography.fontSize.xl, { lineHeight: tokens.typography.lineHeight.xl }],
        '2xl': [tokens.typography.fontSize['2xl'], { lineHeight: tokens.typography.lineHeight['2xl'] }],
        '3xl': [tokens.typography.fontSize['3xl'], { lineHeight: tokens.typography.lineHeight['3xl'] }],
        '4xl': [tokens.typography.fontSize['4xl'], { lineHeight: tokens.typography.lineHeight['4xl'] }],
      },
      spacing: {
        ...Object.fromEntries(
          Object.entries(tokens.spacing).map(([key, value]) => [key, value])
        ),
        18: '4.5rem',
        88: '22rem',
      },
      borderRadius: {
        none: tokens.borderRadius.none,
        sm: tokens.borderRadius.sm,
        md: tokens.borderRadius.md,
        lg: tokens.borderRadius.lg,
        xl: tokens.borderRadius.xl,
        full: tokens.borderRadius.full,
        DEFAULT: "var(--radius)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-primary": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-out-to-top": {
          from: { transform: "translateY(0)", opacity: "1" },
          to: { transform: "translateY(-100%)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-primary": "pulse-primary 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        "slide-out-to-top": "slide-out-to-top 0.3s ease-in",
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config