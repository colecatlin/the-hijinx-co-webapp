import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, Truck } from 'lucide-react';
import { useCart } from '@/lib/cartStore.jsx';
import PageShell from '@/components/shared/PageShell';

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [discountCode, setDiscountCode] = useState('');

  const freeShippingThreshold = 75;
  const remaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-2">HIJINX Store</span>
          <h1 className="text-3xl font-black text-[#F5F5F5] tracking-tight">Your Cart</h1>
        </div>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
            {/* Items */}
            <div>
              {/* Free shipping progress */}
              {remaining > 0 && (
                <div className="mb-6 p-4 border border-[#1e3a3a] bg-[#0a1a1a]">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-3.5 h-3.5 text-[#00FFDA]" />
                    <p className="text-xs text-[#A1A1A1]">
                      Add <span className="text-[#00FFDA] font-bold">${remaining.toFixed(2)}</span> more for free shipping
                    </p>
                  </div>
                  <div className="h-0.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00FFDA] transition-all duration-500"
                      style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {remaining === 0 && (
                <div className="mb-6 p-3 border border-[#00FFDA]/20 bg-[#00FFDA]/5 flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#00FFDA]" />
                  <p className="text-xs text-[#00FFDA] font-medium">You qualify for free shipping!</p>
                </div>
              )}

              <div className="border border-[#1a1a1a]">
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_auto] px-4 py-2 border-b border-[#1a1a1a] bg-[#0D0D0D]">
                  {['Product', 'Price', 'Quantity', ''].map(h => (
                    <span key={h} className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#444]">{h}</span>
                  ))}
                </div>

                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.variantId}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] items-center gap-3 px-4 py-4 border-b border-[#141414] last:border-0"
                    >
                      {/* Product */}
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-18 flex-shrink-0 bg-[#111] overflow-hidden" style={{ height: '72px' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-4 h-4 text-[#333]" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            to={`/product/${item.slug || item.productId}`}
                            className="text-xs font-bold text-[#F5F5F5] hover:text-[#00FFDA] transition-colors line-clamp-2"
                          >
                            {item.name}
                          </Link>
                          {(item.color || item.size) && (
                            <p className="text-[10px] text-[#555] mt-0.5">
                              {[item.color, item.size].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex sm:block items-center gap-2">
                        <span className="sm:hidden text-[9px] font-mono text-[#444] uppercase tracking-wider">Price</span>
                        <span className="text-sm font-bold text-[#F5F5F5]">${item.price.toFixed(2)}</span>
                      </div>

                      {/* Qty */}
                      <div className="flex sm:block items-center gap-2">
                        <span className="sm:hidden text-[9px] font-mono text-[#444] uppercase tracking-wider">Qty</span>
                        <div className="flex items-center gap-2 border border-[#2a2a2a] px-2 py-1 w-fit">
                          <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} disabled={item.quantity <= 1} className="text-[#555] hover:text-[#F5F5F5] disabled:opacity-30">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono text-[#F5F5F5] w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className="text-[#555] hover:text-[#F5F5F5]">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Remove */}
                      <div className="flex items-center justify-end gap-4">
                        <span className="sm:hidden text-sm font-black text-[#F5F5F5]">${(item.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => removeItem(item.variantId)} className="p-1 text-[#333] hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Continue shopping */}
              <div className="mt-4 flex justify-between items-center">
                <Link to="/store" className="text-xs font-mono tracking-[0.2em] uppercase text-[#555] hover:text-[#F5F5F5] transition-colors">
                  ← Continue Shopping
                </Link>
                <button onClick={clearCart} className="text-xs font-mono tracking-[0.15em] uppercase text-[#333] hover:text-red-500 transition-colors">
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Order summary */}
            <div className="space-y-4">
              <div className="border border-[#1a1a1a] bg-[#0D0D0D] p-5">
                <h2 className="font-mono text-[10px] tracking-[0.3em] uppercase text-[#555] mb-4">Order Summary</h2>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1A1]">Subtotal</span>
                    <span className="text-[#F5F5F5] font-bold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1A1]">Shipping</span>
                    <span className="text-[#555]">{subtotal >= freeShippingThreshold ? <span className="text-[#00FFDA]">Free</span> : 'Calculated at checkout'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A1A1A1]">Tax</span>
                    <span className="text-[#555]">Calculated at checkout</span>
                  </div>
                  <div className="pt-3 border-t border-[#1a1a1a] flex justify-between">
                    <span className="text-sm font-bold text-[#F5F5F5]">Estimated Total</span>
                    <span className="text-lg font-black text-[#F5F5F5]">${subtotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Discount code */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 border border-[#2a2a2a] px-3 py-2 bg-[#0a0a0a]">
                      <Tag className="w-3 h-3 text-[#444]" />
                      <input
                        type="text"
                        placeholder="Discount code"
                        value={discountCode}
                        onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-transparent text-xs text-[#F5F5F5] outline-none placeholder-[#333]"
                      />
                    </div>
                    <button
                      className="px-4 py-2 text-xs font-mono tracking-wider uppercase border border-[#2a2a2a] text-[#A1A1A1] hover:border-[#00FFDA]/50 hover:text-[#00FFDA] transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[10px] text-[#444] mt-1.5">Codes are validated at checkout</p>
                </div>

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3.5 text-sm font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                  style={{ background: '#00FFDA', color: '#050505' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#00e6c4'}
                  onMouseLeave={e => e.currentTarget.style.background = '#00FFDA'}
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>

                <div className="mt-3 flex items-center justify-center gap-3">
                  {['Secure', 'Encrypted', 'SSL'].map(label => (
                    <span key={label} className="text-[9px] font-mono text-[#333] tracking-wider uppercase">✓ {label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <ShoppingBag className="w-14 h-14 text-[#1e1e1e]" />
      <div className="text-center">
        <p className="text-lg font-bold text-[#444] mb-1">Your cart is empty</p>
        <p className="text-sm text-[#333]">Add some gear to get started.</p>
      </div>
      <Link
        to="/store"
        className="mt-2 px-6 py-3 text-xs font-mono tracking-[0.3em] uppercase transition-all"
        style={{ background: '#00FFDA', color: '#050505' }}
        onMouseEnter={e => e.currentTarget.style.background = '#00e6c4'}
        onMouseLeave={e => e.currentTarget.style.background = '#00FFDA'}
      >
        Shop Now →
      </Link>
    </div>
  );
}