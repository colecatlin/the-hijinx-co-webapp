import React from 'react';
import { motion } from 'framer-motion';

/**
 * Dark cinematic page shell for identity/profile pages.
 * Replaces the generic gray PageShell for user-facing identity pages.
 */
export default function HijinxPageShell({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`min-h-screen ${className}`}
      style={{
        background: '#060A0A',
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(29,161,161,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(29,161,161,0.06) 0%, transparent 50%)
        `,
      }}
    >
      {children}
    </motion.div>
  );
}