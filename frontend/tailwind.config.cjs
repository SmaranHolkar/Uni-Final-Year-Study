/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,html}"
  ],
  theme: {
    extend: {
      colors: {
        foreground: 'oklch(0.9185 0.0257 285.8834)',
        card: 'oklch(0.2284 0.0384 282.9324)',
        'card-foreground': 'oklch(0.9185 0.0257 285.8834)',
        popover: 'oklch(0.2284 0.0384 282.9324)',
        'popover-foreground': 'oklch(0.9185 0.0257 285.8834)',
        primary: 'oklch(0.7162 0.1597 290.3962)',
        'primary-foreground': 'oklch(0.1743 0.0227 283.7998)',
        secondary: 'oklch(0.3139 0.0736 283.4591)',
        'secondary-foreground': 'oklch(0.8367 0.0849 285.9111)',
        muted: 'oklch(0.2710 0.0621 281.4377)',
        'muted-foreground': 'oklch(0.7166 0.0462 285.1741)',
        accent: 'oklch(0.3354 0.0828 280.9705)',
        'accent-foreground': 'oklch(0.9185 0.0257 285.8834)',
        destructive: 'oklch(0.6861 0.2061 14.9941)',
        'destructive-foreground': 'oklch(1.0000 0 0)',
        border: 'oklch(0.3261 0.0597 282.5832)',
        input: 'oklch(0.3261 0.0597 282.5832)',
        ring: 'oklch(0.7162 0.1597 290.3962)',
        'chart-1': 'oklch(0.7162 0.1597 290.3962)',
        'chart-2': 'oklch(0.6382 0.1047 274.9117)',
        'chart-3': 'oklch(0.7482 0.1235 244.7492)',
        'chart-4': 'oklch(0.7124 0.0977 186.6761)',
        'chart-5': 'oklch(0.7546 0.1831 346.8124)',
        sidebar: 'oklch(0.2284 0.0384 282.9324)',
        'sidebar-foreground': 'oklch(0.9185 0.0257 285.8834)',
        'sidebar-primary': 'oklch(0.7162 0.1597 290.3962)',
        'sidebar-primary-foreground': 'oklch(0.1743 0.0227 283.7998)',
        'sidebar-accent': 'oklch(0.3354 0.0828 280.9705)',
        'sidebar-accent-foreground': 'oklch(0.9185 0.0257 285.8834)',
        'sidebar-border': 'oklch(0.3261 0.0597 282.5832)',
        'sidebar-ring': 'oklch(0.7162 0.1597 290.3962)',
        background: 'oklch(0.1743 0.0227 283.7998)'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      borderRadius: {
        radius: '0.5rem'
      },
      boxShadow: {
        '2xs': '0px 4px 10px 0px hsl(240 30% 25% / 0.06)',
        xs: '0px 4px 10px 0px hsl(240 30% 25% / 0.06)',
        sm: '0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12)',
        DEFAULT: '0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12)',
        md: '0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 2px 4px -1px hsl(240 30% 25% / 0.12)',
        lg: '0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 4px 6px -1px hsl(240 30% 25% / 0.12)',
        xl: '0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 8px 10px -1px hsl(240 30% 25% / 0.12)',
        '2xl': '0px 4px 10px 0px hsl(240 30% 25% / 0.30)'
      }
    }
  },
  plugins: []
};
