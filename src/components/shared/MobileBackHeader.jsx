import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Unified, mobile-only back header for detail views (non-sticky so it never
 * collides with the global floating app header).
 *
 * - Left-aligned back arrow (history-aware) with a centered title.
 * - `tone="dark"` for dark surfaces (e.g. The Outlet), `tone="light"` for
 *   light pages (Driver/Event profiles).
 * - Hidden on `lg+` where the global app header and inline back links remain.
 */
export default function MobileBackHeader({ title, to, onBack, tone = 'dark' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (to) return navigate(to);
    if (window.history.length > 1) return navigate(-1);
    navigate('/');
  };

  const dark = tone !== 'light';

  return (
    <div
      className="lg:hidden relative flex items-center"
      style={{
        height: '3rem',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        background: dark ? 'rgba(8,10,12,0.92)' : 'rgba(255,255,255,0.92)',
        borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        color: dark ? '#fff' : '#0A0A0A',
      }}
    >
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
        style={{ color: dark ? 'rgba(255,255,255,0.85)' : 'rgba(10,10,10,0.8)' }}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <span
        className="absolute left-0 right-0 mx-auto text-center text-sm font-semibold truncate pointer-events-none"
        style={{ maxWidth: '60vw', margin: '0 auto' }}
      >
        {title}
      </span>
    </div>
  );
}