import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Compass, Mail } from 'lucide-react';

export default function PageNotFound({}) {
  const location = useLocation();

  const navOptions = [
    { label: 'Home', to: '/Home', icon: Home, description: 'Back to the homepage' },
    { label: 'Directory', to: '/Directory', icon: Compass, description: 'Browse racers, teams, tracks & series' },
    { label: 'Contact', to: '/Contact', icon: Mail, description: 'Reach out to our team' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'hsl(var(--canvas))' }}>
      <div className="max-w-lg w-full text-center">
        {/* Hijinx brand mark */}
        <img
          src="https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/857494da6_Asset444x.png"
          alt="Hijinx"
          className="h-8 w-auto mx-auto mb-10"
          style={{ opacity: 0.7 }}
        />

        {/* 404 */}
        <h1 className="text-7xl font-black tracking-tight mb-3" style={{ color: 'hsl(var(--foreground))' }}>
          404
        </h1>
        <div className="h-0.5 w-16 mx-auto mb-6" style={{ background: 'hsl(var(--motion))' }} />

        {/* Message */}
        <h2 className="text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          Page Not Found
        </h2>
        <p className="text-sm leading-relaxed mb-10 max-w-sm mx-auto" style={{ color: 'hsl(var(--foreground-secondary))' }}>
          The page you're looking for doesn't exist or may have moved.
          Let's get you back on track.
        </p>

        {/* Navigation options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {navOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <Link
                key={opt.label}
                to={opt.to}
                className="flex flex-col items-center gap-2 p-5 rounded-xl transition-all"
                style={{
                  background: 'hsl(var(--surface-elevated))',
                  border: '1px solid hsl(var(--divider))',
                  color: 'hsl(var(--foreground-secondary))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--motion) / 0.4)';
                  e.currentTarget.style.color = 'hsl(var(--foreground))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--divider))';
                  e.currentTarget.style.color = 'hsl(var(--foreground-secondary))';
                }}
              >
                <Icon className="w-5 h-5" style={{ color: 'hsl(var(--motion))' }} />
                <span className="text-sm font-bold">{opt.label}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  {opt.description}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Search hint */}
        <p className="mt-10 text-xs font-mono uppercase tracking-widest" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Tip: Use the search icon in the header to find what you're looking for.
        </p>
      </div>
    </div>
  );
}