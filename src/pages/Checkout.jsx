import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/lib/cartStore.jsx';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { ShoppingBag, Check, ChevronRight, Lock, Tag, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const STEPS = ['Cart', 'Information', 'Shipping', 'Review', 'Payment'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: i < current ? '#00FFDA' : i === current ? '#00FFDA' : '#1a1a1a',
                color: i <= current ? '#050505' : '#444',
              }}
            >
              {i < current ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-[10px] font-mono uppercase tracking-wider hidden sm:block ${i === current ? 'text-[#F5F5F5]' : i < current ? 'text-[#00FFDA]' : 'text-[#333]'}`}>
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px" style={{ background: i < current ? '#00FFDA33' : '#1a1a1a' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [preparedOrder, setPreparedOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');

  const [info, setInfo] = useState({
    email: '', first_name: '', last_name: '',
  });
  const [shipping, setShipping] = useState({
    address_line1: '', address_line2: '', city: '', state: '', zip: '', country: 'US',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  React.useEffect(() => {
    if (user?.email && !info.email) {
      setInfo(prev => ({ ...prev, email: user.email }));
    }
    if (user?.full_name && !info.first_name) {
      const parts = user.full_name.split(' ');
      setInfo(prev => ({ ...prev, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' }));
    }
  }, [user]);

  if (items.length === 0 && !preparedOrder) {
    navigate('/cart');
    return null;
  }

  const handlePrepare = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('prepareCheckout', {
        items: items.map(i => ({ variantId: i.variantId, name: i.name, quantity: i.quantity })),
        discountCode: discountCode || null,
        email: info.email,
        shippingInfo: {
          name: `${info.first_name} ${info.last_name}`.trim(),
          ...shipping,
        },
      });
      setPreparedOrder(res.data);
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createStripePaymentIntent', {
        order_id: preparedOrder.order_id,
      });
      setClientSecret(res.data.client_secret);
      setPaymentIntentId(res.data.payment_intent_id);
      setStep(4);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Could not initialize payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <Link to="/cart" className="text-[#555] hover:text-[#00FFDA] transition-colors">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Link>
          <span className="font-mono text-xs tracking-[0.4em] uppercase text-[#555]">Checkout</span>
        </div>

        <StepIndicator current={step} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Main form */}
          <div>
            {error && (
              <div className="mb-5 p-4 border border-red-900/40 bg-red-900/10 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Step 1: Information */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-[#F5F5F5] mb-5">Contact Information</h2>
                <FormField label="Email" value={info.email} onChange={v => setInfo(p => ({ ...p, email: v }))} placeholder="you@email.com" type="email" />
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="First Name" value={info.first_name} onChange={v => setInfo(p => ({ ...p, first_name: v }))} />
                  <FormField label="Last Name" value={info.last_name} onChange={v => setInfo(p => ({ ...p, last_name: v }))} />
                </div>
                <div className="pt-2">
                  <FormField label="Discount Code (optional)" value={discountCode} onChange={v => setDiscountCode(v.toUpperCase())} placeholder="HIJINX20" />
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!info.email || !info.first_name}
                  className="w-full py-3.5 mt-2 text-sm font-black tracking-widest uppercase transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: '#00FFDA', color: '#050505' }}
                >
                  Continue to Shipping →
                </button>
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-black text-[#F5F5F5] mb-5">Shipping Address</h2>
                <FormField label="Address" value={shipping.address_line1} onChange={v => setShipping(p => ({ ...p, address_line1: v }))} placeholder="123 Main St" />
                <FormField label="Apt, Suite, etc. (optional)" value={shipping.address_line2} onChange={v => setShipping(p => ({ ...p, address_line2: v }))} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="City" value={shipping.city} onChange={v => setShipping(p => ({ ...p, city: v }))} />
                  <FormField label="State" value={shipping.state} onChange={v => setShipping(p => ({ ...p, state: v }))} placeholder="CA" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="ZIP Code" value={shipping.zip} onChange={v => setShipping(p => ({ ...p, zip: v }))} />
                  <FormField label="Country" value={shipping.country} onChange={v => setShipping(p => ({ ...p, country: v }))} placeholder="US" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 text-xs font-mono tracking-wider uppercase border border-[#2a2a2a] text-[#555] hover:text-[#F5F5F5] hover:border-[#444] transition-all">
                    ← Back
                  </button>
                  <button
                    onClick={handlePrepare}
                    disabled={!shipping.address_line1 || !shipping.city || !shipping.zip || loading}
                    className="flex-[2] py-3.5 text-sm font-black tracking-widest uppercase transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: '#00FFDA', color: '#050505' }}
                  >
                    {loading ? 'Validating…' : 'Review Order →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Place Order */}
            {step === 3 && preparedOrder && (
              <div className="space-y-5">
                <h2 className="text-lg font-black text-[#F5F5F5] mb-5">Order Review</h2>

                {/* Validated items */}
                <div className="border border-[#1a1a1a] divide-y divide-[#141414]">
                  {preparedOrder.validated_items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#F5F5F5]">{item.product_name}</p>
                        {item.variant_label && <p className="text-[10px] text-[#555]">{item.variant_label}</p>}
                        <p className="text-[10px] text-[#444] mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-xs font-black text-[#F5F5F5]">${item.line_total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border border-[#1a1a1a] bg-[#0D0D0D] p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-[#A1A1A1]">Subtotal</span><span>${preparedOrder.subtotal.toFixed(2)}</span></div>
                  {preparedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-[#00FFDA]">
                      <span>Discount ({discountCode})</span><span>-${preparedOrder.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-[#A1A1A1]">Shipping</span><span className="text-[#555]">TBD</span></div>
                  <div className="pt-2 border-t border-[#1a1a1a] flex justify-between font-black">
                    <span>Total</span><span className="text-[#00FFDA]">${preparedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Shipping address summary */}
                <div className="p-4 border border-[#1a1a1a] text-xs text-[#A1A1A1] space-y-0.5">
                  <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#444] mb-2">Ships To</p>
                  <p>{info.first_name} {info.last_name}</p>
                  <p>{shipping.address_line1}{shipping.address_line2 ? `, ${shipping.address_line2}` : ''}</p>
                  <p>{shipping.city}, {shipping.state} {shipping.zip}</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 py-3 text-xs font-mono tracking-wider uppercase border border-[#2a2a2a] text-[#555] hover:text-[#F5F5F5] hover:border-[#444] transition-all">
                    ← Back
                  </button>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={loading}
                    className="flex-[2] py-3.5 text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{ background: '#00FFDA', color: '#050505' }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = '#00e6c4')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#00FFDA')}
                  >
                    <Lock className="w-3.5 h-3.5" /> {loading ? 'Loading…' : 'Proceed to Payment →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {step === 4 && clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#00FFDA', colorBackground: '#0a0a0a', colorText: '#F5F5F5', colorDanger: '#ef4444', fontFamily: 'Inter, system-ui, sans-serif', borderRadius: '0px' } } }}>
                <PaymentStep
                  preparedOrder={preparedOrder}
                  onBack={() => setStep(3)}
                  onSuccess={(orderId, orderNumber) => {
                    clearCart();
                    navigate(`/order-confirmation?order_id=${orderId}&order_number=${orderNumber}`);
                  }}
                  onError={setError}
                />
              </Elements>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="border border-[#1a1a1a] bg-[#0D0D0D] p-5 h-fit">
            <h3 className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#555] mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.variantId} className="flex items-start gap-2">
                  <div className="relative">
                    <div className="w-10 h-12 bg-[#111] overflow-hidden flex-shrink-0">
                      {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                      style={{ background: '#00FFDA', color: '#050505' }}
                    >
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#F5F5F5] truncate">{item.name}</p>
                    {(item.color || item.size) && <p className="text-[9px] text-[#444]">{[item.color, item.size].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <span className="text-[10px] font-bold text-[#F5F5F5] whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[#1a1a1a] flex justify-between">
              <span className="text-xs text-[#A1A1A1]">Subtotal</span>
              <span className="text-sm font-black text-[#F5F5F5]">${subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function PaymentStep({ preparedOrder, onBack, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + `/order-confirmation?order_id=${preparedOrder.order_id}&order_number=${preparedOrder.order_number}` },
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message);
      setLoading(false);
    } else {
      onSuccess(preparedOrder.order_id, preparedOrder.order_number);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-lg font-black text-[#F5F5F5] mb-5">Payment</h2>
      <div className="border border-[#2a2a2a] p-4">
        <PaymentElement />
      </div>
      <div className="border border-[#1a1a1a] bg-[#0D0D0D] p-4 flex justify-between font-black">
        <span>Total</span>
        <span className="text-[#00FFDA]">${preparedOrder.total.toFixed(2)}</span>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 py-3 text-xs font-mono tracking-wider uppercase border border-[#2a2a2a] text-[#555] hover:text-[#F5F5F5] hover:border-[#444] transition-all">
          ← Back
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-[2] py-3.5 text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: '#00FFDA', color: '#050505' }}
        >
          <Lock className="w-3.5 h-3.5" /> {loading ? 'Processing…' : 'Pay Now'}
        </button>
      </div>
      <p className="text-center text-[10px] text-[#333] flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Secured by Stripe
      </p>
    </form>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block font-mono text-[9px] tracking-[0.3em] uppercase text-[#555] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-2.5 text-sm text-[#F5F5F5] outline-none focus:border-[#00FFDA]/50 transition-colors placeholder-[#333]"
      />
    </div>
  );
}