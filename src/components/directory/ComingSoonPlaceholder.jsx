import React from 'react';
import { motion } from 'framer-motion';

const ACCENT = 'hsl(var(--motion))';
const ACCENT_MUTED = 'hsl(var(--motion-muted))';
const FG = 'hsl(var(--foreground))';
const FG_SEC = 'hsl(var(--foreground-secondary))';
const FG_QUIET = 'hsl(var(--foreground-quiet))';
const DIV = 'hsl(var(--divider))';
const SURF = 'hsl(var(--surface-elevated))';

export default function ComingSoonPlaceholder({ category }) {
  const Icon = category?.icon;
  const label = category?.label || 'This Section';

  return (
    <div className="flex items-center justify-center px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-md"
      >
        {/* Mono tag */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-5 h-[1px]" style={{ background: ACCENT }} />
          <span className="font-mono text-[9px] tracking-[0.45em] uppercase" style={{ color: ACCENT }}>
            Index46 · {label}
          </span>
          <div className="w-5 h-[1px]" style={{ background: ACCENT }} />
        </div>

        {/* Icon in muted motion-tinted circle */}
        {Icon && (
          <div
            className="flex items-center justify-center w-24 h-24 rounded-full mb-8"
            style={{
              background: ACCENT_MUTED,
              border: `1px solid ${DIV}`,
            }}
          >
            <Icon
              className="w-10 h-10"
              style={{ color: ACCENT }}
              strokeWidth={1.5}
            />
          </div>
        )}

        {/* Headline */}
        <h2
          className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-[0.95] mb-4"
          style={{ color: FG }}
        >
          Coming Soon.
        </h2>

        {/* Supporting line */}
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: FG_SEC }}>
          We're building this section. Check back soon.
        </p>

        {/* Subtle bottom rule */}
        <div
          className="mt-10 w-16 h-[1px]"
          style={{ background: DIV }}
        />
        <span className="mt-4 font-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: FG_QUIET }}>
          Phase Rollout · In Progress
        </span>
      </motion.div>
    </div>
  );
}