import React from 'react';

export default function Home1() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="index-mono-tag mb-6">HIJINX // HOME v1</div>
      <h1
        className="text-5xl md:text-6xl font-black uppercase tracking-tight"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        Home1
      </h1>
      <p
        className="mt-4 text-sm"
        style={{ color: 'hsl(var(--foreground-secondary))' }}
      >
        New landing page — in progress.
      </p>
    </div>
  );
}