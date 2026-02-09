import React from 'react';
import PageShell from '@/components/shared/PageShell';

export default function ApparelHome() {
  return (
    <PageShell>
      <div className="w-full h-[calc(100vh-200px)] min-h-screen">
        <iframe
          src="https://e2c016-ab.myshopify.com"
          title="Hijinx Apparel Store"
          className="w-full h-full border-0"
          allow="payment"
        />
      </div>
    </PageShell>
  );
}