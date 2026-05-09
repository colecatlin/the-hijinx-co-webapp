import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Truck } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';

export default function OrderConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id');
  const orderNumber = params.get('order_number');

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        {/* Success icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(0,255,218,0.1)', border: '1px solid rgba(0,255,218,0.3)' }}
        >
          <CheckCircle className="w-8 h-8 text-[#00FFDA]" />
        </div>

        <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-[#00FFDA] block mb-3">Order Confirmed</span>
        <h1 className="text-3xl font-black text-[#F5F5F5] tracking-tight mb-2">Thank You!</h1>

        {orderNumber && (
          <p className="text-sm text-[#555] mb-8">
            Order <span className="font-mono text-[#A1A1A1]">{orderNumber}</span> has been received.
          </p>
        )}

        <div className="border border-[#1a1a1a] bg-[#0D0D0D] p-5 text-left space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <Package className="w-4 h-4 text-[#00FFDA] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#F5F5F5]">Order Received</p>
              <p className="text-xs text-[#555] mt-0.5">Your order is being processed. You'll receive an email confirmation shortly.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Truck className="w-4 h-4 text-[#555] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#555]">Shipping</p>
              <p className="text-xs text-[#333] mt-0.5">Tracking information will be sent to your email when your order ships.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/store"
            className="px-6 py-3 text-xs font-mono tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 border border-[#2a2a2a] text-[#A1A1A1] hover:border-[#00FFDA]/50 hover:text-[#00FFDA]"
          >
            Continue Shopping
          </Link>
          <Link
            to="/"
            className="px-6 py-3 text-xs font-mono tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2"
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