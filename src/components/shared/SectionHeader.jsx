import React from 'react';
import { motion } from 'framer-motion';

export default function SectionHeader({ label, title, subtitle, align = 'left', light = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`mb-10 ${align === 'center' ? 'text-center' : ''}`}
    >
      {label && (
        <span className={`font-mono text-xs tracking-[0.2em] uppercase ${light ? 'text-gray-400' : 'text-gray-500'}`}>
          {label}
        </span>
      )}
      <h1 className={`text-3xl md:text-5xl font-black tracking-tight mt-2 ${light ? 'text-white' : 'text-[#0A0A0A]'}`}>
        {title}
      </h1>
      {subtitle && (
        <p className={`mt-3 text-base md:text-lg max-w-2xl ${align === 'center' ? 'mx-auto' : ''} ${light ? 'text-gray-400' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}