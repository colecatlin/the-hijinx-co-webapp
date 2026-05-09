import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function CheckoutSuccess() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const orderNumber = params.get('order_number');

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(0,255,218,0.1)', border: '1px solid rgba(0,255,218,0.3)' }}
        >
          <CheckCircle className="w-8 h-8 text-[#00FFDA]" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-[#00FFDA] block mb-3">Payment Confirmed</span>
        <h1 className="text-3xl font-black text-[#F5F5F5] mb-2">Thank You!</h1>
        {orderNumber && (
          <p className="text-sm text-[#555] mb-8">Order <span className="font-mono text-[#A1A1A1]">{orderNumber}</span> is confirmed.</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/store"
            className="px-6 py-3 text-xs font-mono tracking-[0.2em] uppercase border border-[#2a2a2a] text-[#A1A1A1] hover:border-[#00FFDA]/50 hover:text-[#00FFDA] transition-all">
            Continue Shopping
          </Link>
          <Link to="/"
            className="px-6 py-3 text-xs font-mono tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all"
            style={{ background: '#00FFDA', color: '#050505' }}
            onMouseEnter={e => e.currentTarget.style.background = '#00e6c4'}
            onMouseLeave={e => e.currentTarget.style.background = '#00FFDA'}
          >
            Back to Home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}