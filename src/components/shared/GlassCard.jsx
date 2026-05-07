import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * Shared glass card system for HIJINX dark UI.
 * variant="dark"  — translucent dark panel (default, for dark backgrounds)
 * variant="light" — translucent white panel (editorial, onboarding callouts)
 */
export default function GlassCard({ children, className, variant = 'dark', hover = true, onClick, as: ComponentTag = 'div', ...props }) {
  const Tag = ComponentTag;
  const base = 'rounded-2xl transition-all duration-300';

  const styles = {
    dark: {
      background: 'rgba(8, 12, 14, 0.72)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    },
    light: {
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.6)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    },
    teal: {
      background: 'rgba(29,161,161,0.12)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(29,161,161,0.3)',
      boxShadow: '0 4px 32px rgba(29,161,161,0.1)',
    },
  };

  const hoverStyle = hover ? {
    '--hover-border': variant === 'teal' ? 'rgba(29,161,161,0.5)' : variant === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
  } : {};

  return (
    <Tag
      className={cn(base, hover && 'hover:shadow-lg cursor-default', className)}
      style={{ ...styles[variant] || styles.dark, ...hoverStyle }}
      onClick={onClick}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function GlassCardMotion({ children, className, variant = 'dark', delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={cn('rounded-2xl transition-all duration-300', className)}
      style={{
        background: variant === 'light' ? 'rgba(255,255,255,0.94)' : 'rgba(8,12,14,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: variant === 'light' ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: variant === 'light' ? '0 4px 24px rgba(0,0,0,0.08)' : '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}