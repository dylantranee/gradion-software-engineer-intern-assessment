/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'grad-orange': {
          DEFAULT: 'var(--grad-orange, #ff6b00)',
          hover: 'var(--grad-orange-hover, #e85f00)',
          light: 'var(--grad-orange-light, #ffa861)',
          pale: 'var(--grad-orange-pale, #ffc391)',
          deep: 'var(--grad-orange-deep, #3a160a)',
          subtle: 'var(--bg-accent-soft, #ffeedf)',
        },
        'grad-ink': {
          DEFAULT: 'var(--grad-ink, #231f20)',
          body: 'var(--grad-ink-body, #434343)',
          2: 'var(--grad-ink-2, #595959)',
          3: 'var(--grad-ink-3, #919699)',
        },
        'grad-paper': {
          DEFAULT: 'var(--grad-paper, #f2eee7)',
          2: 'var(--grad-paper-2, #f8f8f8)',
        },
        'grad-line': 'var(--grad-line, #bab7b1)',
        'grad-border-2': 'var(--border-2, #e8e2e0)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Lora"', 'Georgia', 'serif'],
      },
      borderRadius: {
        'r-1': '4px',
        'r-2': '8px',
        'r-3': '12px',
        'r-4': '16px',
        'pill': '999px',
      },
      boxShadow: {
        'card': '0 2px 6px rgba(35, 31, 32, 0.06), 0 1px 2px rgba(35, 31, 32, 0.04)',
        'pop': '0 8px 24px rgba(35, 31, 32, 0.1), 0 2px 6px rgba(35, 31, 32, 0.06)',
      },
    },
  },
  plugins: [],
}
