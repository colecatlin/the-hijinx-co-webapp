import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ICON_DARK = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/857494da6_Asset444x.png';
const WORDMARK_DARK = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69875e8c5d41c7f087ed1b90/8021cd5dd_Asset484x.png';
const WORDMARK_LIGHT = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/af971bdc9_Logo-HIjinxWeb4x.png';

// Tracks whether <html> currently carries the `.theme-light` class so the
// logo can swap to the black wordmark automatically once light theme is on.
function useIsLightTheme() {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsLight(el.classList.contains('theme-light'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isLight;
}

export default function HijinxLogo({ compact = false, className = '', iconClassName = 'h-6 w-auto', wordmarkClassName = 'h-10 w-auto', to }) {
  const isLight = useIsLightTheme();

  const iconStyle = isLight
    ? { filter: 'brightness(0)', opacity: 0.92 }
    : { filter: 'brightness(0) invert(1)', opacity: 0.92 };
  const wordmarkStyle = isLight
    ? { opacity: 0.92 }
    : { filter: 'brightness(0) invert(1)', opacity: 0.92 };

  const content = (
    <>
      <img src={ICON_DARK} alt="HIJINX icon" className={iconClassName} style={iconStyle} />
      {!compact && <img src={isLight ? WORDMARK_LIGHT : WORDMARK_DARK} alt="HIJINX" className={wordmarkClassName} style={wordmarkStyle} />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`flex items-center gap-2.5 flex-shrink-0 ${className}`}>
        {content}
      </Link>
    );
  }
  return <div className={`flex items-center gap-2.5 flex-shrink-0 ${className}`}>{content}</div>;
}