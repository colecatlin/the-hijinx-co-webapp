import React from 'react';

/**
 * Generic, configuration-driven widget used across every organization
 * dashboard. Receives only {icon, label, value, hint, color, onClick} — no
 * org-type knowledge whatsoever.
 */
export default function OrganizationWidget({ icon: Icon, label, value, hint, color = '#1DA1A1', onClick }) {
  const Container = onClick ? 'button' : 'div';
  return (
    <Container
      onClick={onClick}
      className="text-left p-4 rounded-xl w-full transition-all"
      style={{
        background: 'rgba(4,8,8,0.72)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4" style={{ color }} />}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value ?? '—'}</div>
      {hint && <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{hint}</div>}
    </Container>
  );
}