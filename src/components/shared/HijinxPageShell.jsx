import React from 'react';
import { motion } from 'framer-motion';

/**
 * Theme-aware page shell for identity/profile pages.
 * Uses semantic canvas + motion tokens so it adapts to light/dark theme.
 */
export default function HijinxPageShell({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`min-h-screen ${className}`}
      style={{
        background: 'hsl(var(--canvas))',
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--motion) / 0.10) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 80%, hsl(var(--motion) / 0.05) 0%, transparent 50%)
        `,
      }}
    >
      {children}
    </motion.div>
  );
}