import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Dark theme: combined white icon + wordmark (single asset).
const LOGO_DARK = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/735f3b096_Asset62x.png';
// Light theme: black HIJINX wordmark.
const LOGO_LIGHT = 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/af971bdc9_Logo-HIjinxWeb4x.png';

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

export default function HijinxLogo({ className = '', imgClassName = 'h-10 w-auto', to }) {
  const isLight = useIsLightTheme();
  const src = isLight ? LOGO_LIGHT : LOGO_DARK;
  const style = { opacity: 0.92 };

  const content = <img src={src} alt="HIJINX" className={imgClassName} style={style} />;

  if (to) {
    return (
      <Link to={to} className={`flex items-center flex-shrink-0 ${className}`}>
        {content}
      </Link>
    );
  }
  return <div className={`flex items-center flex-shrink-0 ${className}`}>{content}</div>;
}