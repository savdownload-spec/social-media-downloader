import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // These resolve to CSS custom properties (see globals.css :root /
        // .dark) rather than flat hex. :root's values are copied verbatim
        // from what used to be hardcoded here, so light mode is byte-
        // identical to before — only .dark introduces new values.
        //
        // Most use the rgb(var(--x) / <alpha-value>) form (not a bare
        // var(--x) string) specifically so Tailwind's opacity-modifier
        // syntax (bg-primary/20, border-border/60, ...) keeps working —
        // it's used extensively throughout the site and silently produces
        // no color at all when the underlying value is a plain var() string
        // instead of RGB channels. primary-light/accent-light/border/
        // border-light are the deliberate exception (see globals.css).
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover) / <alpha-value>)',
          light: 'var(--primary-light)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          light: 'var(--accent-light)',
        },
        // Elevated surface (cards, modals, toasts, popovers) — previously
        // these were raw `bg-white` throughout; formalized as a token here
        // specifically so dark mode can give them a distinct dark value
        // without ever touching the light-mode class that used them.
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          hover: 'rgb(var(--card-hover) / <alpha-value>)',
        },
        // Dark-mode-only accent for warnings where the light design has
        // nothing to reuse. (A same-purpose flat `violet` token was removed
        // here — as a bare string it silently replaced Tailwind's entire
        // built-in violet-50..900 scale instead of adding to it, breaking
        // every `violet-*` class already used site-wide as a status color.
        // It was never actually referenced anywhere, so removing it is safe.)
        warning: '#F5B942',
        fuchsia: {
          brand: '#D946EF',
        },
        indigo: {
          brand: '#6366F1',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          subtle: 'rgb(var(--text-subtle) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--border-light)',
        },
        // Dark surfaces for high-contrast sections and the footer
        ink: {
          DEFAULT: '#0B0918',
          950: '#08061A',
          900: '#0B0918',
          800: '#151030',
          700: '#221A45',
          600: '#332A5C',
          muted: '#A79FC9',
          subtle: '#7A719E',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-jakarta)', 'var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(15 11 30 / 0.04), 0 1px 2px -1px rgb(15 11 30 / 0.03)',
        'soft-md': '0 4px 16px -4px rgb(15 11 30 / 0.08), 0 2px 6px -2px rgb(15 11 30 / 0.04)',
        'soft-lg': '0 16px 40px -8px rgb(15 11 30 / 0.10), 0 6px 12px -6px rgb(15 11 30 / 0.06)',
        'soft-xl': '0 28px 60px -12px rgb(15 11 30 / 0.14), 0 10px 20px -10px rgb(15 11 30 / 0.06)',
        'glow': '0 0 0 4px rgb(124 58 237 / 0.12)',
        'glow-lg': '0 10px 40px -8px rgb(124 58 237 / 0.35)',
        'glow-fuchsia': '0 10px 40px -8px rgb(217 70 239 / 0.30)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shimmer': 'shimmer 2.5s linear infinite',
        'blob': 'blob 18s ease-in-out infinite',
        'blob-slow': 'blob 26s ease-in-out infinite',
        'gradient': 'gradientShift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 14s linear infinite',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -40px) scale(1.1)' },
          '66%': { transform: 'translate(-25px, 25px) scale(0.95)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(120deg, #6366F1 0%, #8B5CF6 50%, #D946EF 100%)',
        'gradient-brand-soft': 'linear-gradient(120deg, #EEF2FF 0%, #F5F3FF 50%, #FDF4FF 100%)',
        'gradient-mesh': 'radial-gradient(at 15% 15%, rgba(99, 102, 241, 0.14) 0px, transparent 45%), radial-gradient(at 85% 25%, rgba(217, 70, 239, 0.12) 0px, transparent 45%), radial-gradient(at 50% 90%, rgba(139, 92, 246, 0.10) 0px, transparent 45%)',
        'gradient-mesh-dark': 'radial-gradient(at 12% 18%, rgba(99, 102, 241, 0.35) 0px, transparent 42%), radial-gradient(at 88% 12%, rgba(217, 70, 239, 0.28) 0px, transparent 42%), radial-gradient(at 60% 95%, rgba(139, 92, 246, 0.30) 0px, transparent 45%)',
      },
    },
  },
  plugins: [],
};
export default config;
