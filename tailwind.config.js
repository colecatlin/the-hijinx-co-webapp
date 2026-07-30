/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        /* ════════════════════════════════════════════════════════
           HIJINX DESIGN SYSTEM v1.0 — Semantic Tokens
           ════════════════════════════════════════════════════════
           Components use semantic tokens. Never raw hex.
           Light Mode = swap token VALUES only, never classes. */

        /* ── Canvas ─────────────────────────────────────── */
        canvas: 'hsl(var(--canvas))',

        /* ── Surfaces ──────────────────────────────────── */
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          elevated: 'hsl(var(--surface-elevated))',
          interactive: 'hsl(var(--surface-interactive))',
          sunken: 'hsl(var(--surface-sunken))',
        },

        /* ── Motion (brand color — interactive only) ───── */
        motion: {
          DEFAULT: 'hsl(var(--motion))',
          hover: 'hsl(var(--motion-hover))',
          active: 'hsl(var(--motion-active))',
          muted: 'hsl(var(--motion-muted))',
        },

        /* ── Foreground / typography ───────────────────── */
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          secondary: 'hsl(var(--foreground-secondary))',
          quiet: 'hsl(var(--foreground-quiet))',
        },

        /* ── Structure ─────────────────────────────────── */
        divider: 'hsl(var(--divider))',

        /* ── Semantic status ───────────────────────────── */
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',

        /* ── Data visualization palette ────────────────── */
        chart: {
          motion: 'hsl(var(--chart-motion))',
          ocean: 'hsl(var(--chart-ocean))',
          slate: 'hsl(var(--chart-slate))',
          bronze: 'hsl(var(--chart-bronze))',
          gold: 'hsl(var(--chart-gold))',
        },

        /* ── Generic / shadcn compatibility aliases ───────
           Keep every existing `bg-background`, `bg-card`,
           `border-border`, `text-foreground`, `bg-primary`,
           `ring-ring` … utility working and mapped onto the
           Hijinx semantic system. */
        background: 'hsl(var(--background))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
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
        ring: 'hsl(var(--ring))',

        /* chart-1..5 convenience aliases (used by shadcn chart) */
        'chart-1': 'hsl(var(--chart-1))',
        'chart-2': 'hsl(var(--chart-2))',
        'chart-3': 'hsl(var(--chart-3))',
        'chart-4': 'hsl(var(--chart-4))',
        'chart-5': 'hsl(var(--chart-5))',

        'hijinx-blue': 'hsl(var(--motion))',

        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
