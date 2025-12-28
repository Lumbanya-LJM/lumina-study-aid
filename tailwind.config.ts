import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        lmv: {
          blue: {
            50: "hsl(var(--lmv-blue-50))",
            100: "hsl(var(--lmv-blue-100))",
            200: "hsl(var(--lmv-blue-200))",
            300: "hsl(var(--lmv-blue-300))",
            400: "hsl(var(--lmv-blue-400))",
            500: "hsl(var(--lmv-blue-500))",
            600: "hsl(var(--lmv-blue-600))",
            700: "hsl(var(--lmv-blue-700))",
            800: "hsl(var(--lmv-blue-800))",
            900: "hsl(var(--lmv-blue-900))",
          },
          grey: {
            50: "hsl(var(--lmv-grey-50))",
            100: "hsl(var(--lmv-grey-100))",
            200: "hsl(var(--lmv-grey-200))",
            300: "hsl(var(--lmv-grey-300))",
            400: "hsl(var(--lmv-grey-400))",
            500: "hsl(var(--lmv-grey-500))",
            600: "hsl(var(--lmv-grey-600))",
            700: "hsl(var(--lmv-grey-700))",
            800: "hsl(var(--lmv-grey-800))",
            900: "hsl(var(--lmv-grey-900))",
          },
          platinum: "hsl(var(--lmv-platinum))",
          silver: "hsl(var(--lmv-silver))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        'premium': 'var(--shadow-lg)',
        'glow': 'var(--shadow-glow)',
        'card': '0 2px 8px -2px hsl(220 9% 15% / 0.05), 0 4px 16px -4px hsl(220 9% 15% / 0.08)',
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-bounce": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "1" },
          "50%": { transform: "scale(1.05)", opacity: "0.5" },
          "100%": { transform: "scale(0.95)", opacity: "1" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "thinking": {
          "0%, 100%": { transform: "rotate(-5deg) scale(1)" },
          "25%": { transform: "rotate(0deg) scale(1.1)" },
          "50%": { transform: "rotate(5deg) scale(1)" },
          "75%": { transform: "rotate(0deg) scale(1.05)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" },
        },
        "confetti": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
        "celebrate": {
          "0%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.2)" },
          "50%": { transform: "scale(1)" },
          "75%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        "ripple": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        "slide-in-bottom": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "scale-bounce": "scale-bounce 0.4s ease-out forwards",
        "shimmer": "shimmer 2s linear infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        "wiggle": "wiggle 0.3s ease-in-out",
        "thinking": "thinking 1.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "confetti": "confetti 3s ease-out forwards",
        "celebrate": "celebrate 0.5s ease-in-out",
        "ripple": "ripple 0.6s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;