import React from 'react';
import { AlertTriangle } from 'lucide-react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ background: 'hsl(var(--canvas))' }}>
      <div className="max-w-md w-full p-8 rounded-2xl" style={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--divider))' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full" style={{ background: 'hsl(var(--warning) / 0.12)' }}>
            <AlertTriangle className="w-8 h-8" style={{ color: 'hsl(var(--warning))' }} />
          </div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Access Restricted</h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'hsl(var(--foreground-secondary))' }}>
            You need a Hijinx account to access this page. Please contact the platform administrator to request access.
          </p>
          <div className="p-4 rounded-lg text-sm text-left" style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))' }}>
            <p className="font-semibold mb-2">If you believe this is an error:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the platform administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;