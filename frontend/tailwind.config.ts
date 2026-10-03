import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-sora)', 'sans-serif'],
        serif: ['var(--font-merriweather)', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
        devanagari: ['var(--font-noto-sans-devanagari)', 'sans-serif'],
      },
      colors: {
        // Backgrounds
        pagebg: 'var(--color-pagebg)',
        surface: 'var(--color-surface)',
        'surface-subtle': 'var(--color-surface-subtle)',
        'surface-border': 'var(--color-border)',
        
        // Brand
        'brand-navy': 'var(--color-brand-navy)',
        'brand-navy-light': 'var(--color-brand-navy-light)',
        shakti: 'var(--color-shakti)', 
        shaktiHover: 'var(--color-shakti-hover)',
        chakra: 'var(--color-chakra)',
        chakraHover: 'var(--color-chakra-hover)',
        
        // Semantic
        verified: 'var(--color-verified)',
        verifiedBg: 'var(--color-verified-bg)',
        warning: 'var(--color-warning)', 
        warningBg: 'var(--color-warning-bg)',
        danger: 'var(--color-danger)', 
        dangerBg: 'var(--color-danger-bg)',

        // Text
        'text-main': 'var(--color-text-main)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        
        // Text on dark backgrounds
        'on-dark-primary': 'var(--on-dark-primary)',
        'on-dark-secondary': 'var(--on-dark-secondary)',
        'on-dark-muted': 'var(--on-dark-muted)',
      },
      boxShadow: {
        'soft-elevated': '0 4px 20px -2px rgba(11, 18, 48, 0.05)',
        'chakra-glow': '0 0 0 3px rgba(6, 3, 141, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }
    },
  },
  plugins: [],
};
export default config;
