import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * OperationsStatCard — reusable metric card for the Operations Hub.
 * Displays an icon, count, label, and optional deep link.
 */
export default function OperationsStatCard({
  icon: Icon,
  label,
  value,
  href,
  sublabel,
  alert = false,
  loading = false,
}) {
  const content = (
    <div
      className={`group relative bg-surface-elevated border rounded-xl p-4 transition-all ${
        href
          ? 'border-divider hover:border-motion/40 hover:shadow-md cursor-pointer'
          : 'border-divider'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          alert ? 'bg-danger/10' : 'bg-surface-interactive'
        }`}>
          <Icon className={`w-4 h-4 ${alert ? 'text-danger' : 'text-foreground-secondary'}`} />
        </div>
        {alert && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-danger">
            <AlertTriangle className="w-3 h-3" /> Action
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16 mb-1" />
      ) : (
        <p className={`text-2xl font-black ${alert ? 'text-danger' : 'text-foreground'}`}>
          {value ?? 0}
        </p>
      )}
      <p className="text-xs font-semibold text-foreground-secondary mt-0.5">{label}</p>
      {sublabel && (
        <p className="text-[10px] text-foreground-quiet mt-0.5">{sublabel}</p>
      )}
      {href && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="w-3.5 h-3.5 text-motion" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}