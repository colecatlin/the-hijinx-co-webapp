import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function CheckoutCancel() {
  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <XCircle className="w-8 h-8 text-[#555]" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-[#555] block mb-3">Checkout Cancelled</span>
        <h1 className="text-2xl font-black text-[#F5F5F5] mb-2">No payment was taken</h1>
        <p className="text-sm text-[#555] mb-8">Your cart is still saved. Go back whenever you're ready.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/cart"
            className="px-6 py-3 text-xs font-mono tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all"
            style={{ background: '#00FFDA', color: '#050505' }}
            onMouseEnter={e => e.currentTarget.style.background = '#00e6c4'}
            onMouseLeave={e => e.currentTarget.style.background = '#00FFDA'}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
        </div>
      </div>
    </PageShell>
  );
}