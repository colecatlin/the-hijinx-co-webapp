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
        <span className={`font-mono text-xs tracking-[0.2em] uppercase ${light ? 'text-[#FFF8F5]' : 'text-[#1A3249]'}`}>
          {label}
        </span>
      )}
      <h1 className={`text-3xl md:text-5xl font-black tracking-tight mt-2 ${light ? 'text-[#FFF8F5]' : 'text-[#232323]'}`}>
        {title}
      </h1>
      {subtitle && (
        <p className={`mt-3 text-base md:text-lg max-w-2xl ${align === 'center' ? 'mx-auto' : ''} ${light ? 'text-[#FFF8F5] opacity-80' : 'text-[#1A3249]'}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}