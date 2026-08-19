/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        border: 'var(--border)',
        slate: 'var(--slate)',
        'slate-soft': 'var(--slate-soft)',
        forest: 'var(--forest)',
        bridge: 'var(--bridge)',
        white: 'var(--white)',
        muted: 'var(--muted)',
        dim: 'var(--dim)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
