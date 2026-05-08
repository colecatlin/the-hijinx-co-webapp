import React from 'react';
import { motion } from 'framer-motion';

export default function PageShell({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`min-h-screen ${className}`}
    >
      {children}
    </motion.div>
  );
}