// brand/tailwind-brand-plugin.cjs
const plugin = require('tailwindcss/plugin');

module.exports = plugin(function ({ addBase }) {
  addBase({
    ':root': {
      /* Brand shade tokens (HSL components only) */

      /* Primary (blue) */
      '--primary-50': '218 76% 95%',
      '--primary-100': '220 75% 91%',
      '--primary-200': '220 76% 82%',
      '--primary-300': '220 77% 73%',
      '--primary-400': '220 76% 64%',
      '--primary-500': '220 77% 55%',
      '--primary-600': '220 77% 44%',
      '--primary-700': '219 77% 33%',
      '--primary-800': '220 77% 22%',
      '--primary-900': '219 78% 11%',
      '--primary-950': '219 77% 5%',

      /* Secondary (orange) */
      '--secondary-50': '12 79% 96%',
      '--secondary-100': '10 85% 92%',
      '--secondary-200': '10 84% 82%',
      '--secondary-300': '10 84% 74%',
      '--secondary-400': '10 84% 66%',
      '--secondary-500': '10 84% 55%',
      '--secondary-600': '11 70% 46%',
      '--secondary-700': '11 72% 37%',
      '--secondary-800': '11 76% 26%',
      '--secondary-900': '11 73% 16%',
      '--secondary-950': '10 81% 11%',

      /* Tertiary (yellow) */
      '--tertiary-50': '46 93% 95%',
      '--tertiary-100': '46 85% 90%',
      '--tertiary-200': '47 84% 81%',
      '--tertiary-300': '47 83% 74%',
      '--tertiary-400': '47 82% 66%',
      '--tertiary-500': '47 84% 55%',
      '--tertiary-600': '47 87% 46%',
      '--tertiary-700': '44 84% 36%',
      '--tertiary-800': '41 82% 26%',
      '--tertiary-900': '39 79% 17%',
      '--tertiary-950': '39 81% 11%',

      /* Alert (red/pink) */
      '--alert-50': '345 71% 91%',
      '--alert-100': '345 69% 86%',
      '--alert-200': '345 67% 79%',
      '--alert-300': '345 70% 72%',
      '--alert-400': '345 71% 66%',
      '--alert-500': '345 71% 52%',
      '--alert-600': '345 73% 41%',
      '--alert-700': '345 71% 29%',
      '--alert-800': '345 71% 19%',
      '--alert-900': '345 79% 8%',
      '--alert-950': '345 86% 2%',

      /* Success (green) */
      '--success-50': '143 64% 93%',
      '--success-100': '146 62% 88%',
      '--success-200': '147 63% 76%',
      '--success-300': '148 63% 69%',
      '--success-400': '148 63% 54%',
      '--success-500': '148 62% 40%',
      '--success-600': '147 64% 32%',
      '--success-700': '147 60% 25%',
      '--success-800': '147 61% 17%',
      '--success-900': '147 60% 10%',
      '--success-950': '148 62% 4%',

      /* Neutral gray (Tailwind gray) */
      '--neutral-50': '0 0% 98%',
      '--neutral-100': '0 0% 96%',
      '--neutral-200': '0 0% 90%',
      '--neutral-300': '0 0% 83%',
      '--neutral-400': '0 0% 64%',
      '--neutral-500': '0 0% 45%',
      '--neutral-600': '0 0% 32%',
      '--neutral-700': '0 0% 25%',
      '--neutral-800': '0 0% 15%',
      '--neutral-900': '0 0% 9%',
      '--neutral-950': '0 0% 4%',

      /* Semantic tokens: light mode */
      '--background': '0 0% 100%',
      '--foreground': 'var(--neutral-900)',

      '--card': '0 0% 100%',
      '--card-foreground': 'var(--neutral-900)',

      '--popover': '0 0% 100%',
      '--popover-foreground': 'var(--neutral-900)',

      '--primary': 'var(--primary-500)',
      '--primary-foreground': '0 0% 100%',

      '--secondary': 'var(--secondary-100)',
      '--secondary-foreground': 'var(--secondary-800)',

      '--muted': 'var(--neutral-100)',
      '--muted-foreground': 'var(--neutral-600)',

      '--accent': 'var(--tertiary-50)',
      '--accent-foreground': 'var(--neutral-900)',

      '--destructive': 'var(--alert-500)',
      '--destructive-foreground': '0 0% 100%',

      '--success': 'var(--success-500)',
      '--success-foreground': '0 0% 100%',

      '--border': 'var(--neutral-200)',
      '--input': 'var(--neutral-200)',
      '--ring': 'var(--primary-500)',

      '--radius': '0.75rem',
    },

    '.dark': {
      '--background': '0 0% 6%',
      '--foreground': '0 0% 98%',

      '--card': '0 0% 10%',
      '--card-foreground': '0 0% 98%',

      '--popover': '0 0% 10%',
      '--popover-foreground': '0 0% 98%',

      '--primary': 'var(--primary-500)',
      '--primary-foreground': '0 0% 100%',

      '--secondary': 'var(--secondary-700)',
      '--secondary-foreground': '0 0% 100%',

      '--muted': 'var(--neutral-800)',
      '--muted-foreground': 'var(--neutral-300)',

      '--accent': 'var(--tertiary-600)',
      '--accent-foreground': '0 0% 10%',

      '--destructive': 'var(--alert-500)',
      '--destructive-foreground': '0 0% 100%',

      '--success': 'var(--success-500)',
      '--success-foreground': '0 0% 100%',

      '--border': 'var(--neutral-700)',
      '--input': 'var(--neutral-700)',
      '--ring': 'var(--primary-400)',
    }
  });
});

