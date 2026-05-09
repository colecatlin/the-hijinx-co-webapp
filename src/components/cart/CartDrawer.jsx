import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/cartStore.jsx';

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, removeItem, updateQuantity, subtotal, totalItems } = useCart();

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 bottom-0 z-[71] w-full sm:w-[420px] flex flex-col"
            style={{
              background: 'rgba(8, 10, 10, 0.97)',
              backdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-16px 0 64px rgba(0,0,0,0.7)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-[#00FFDA]" />
                <span className="font-mono text-xs tracking-[0.3em] uppercase text-[#F5F5F5]">
                  Cart {totalItems > 0 && `(${totalItems})`}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                  <ShoppingBag className="w-10 h-10 text-[#2a2a2a]" />
                  <p className="text-sm text-[#555] font-medium">Your cart is empty</p>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="text-xs font-mono tracking-[0.2em] uppercase text-[#00FFDA] hover:underline"
                  >
                    Continue Shopping →
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <CartItem
                    key={item.variantId}
                    item={item}
                    onRemove={() => removeItem(item.variantId)}
                    onQtyChange={(qty) => updateQuantity(item.variantId, qty)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-[#1a1a1a] px-6 py-5 space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-mono text-[#555] uppercase tracking-wider">Subtotal</span>
                  <span className="text-lg font-black text-[#F5F5F5]">${subtotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-[#444] leading-snug">
                  Shipping and taxes calculated at checkout. Discount codes applied at checkout.
                </p>
                <Link
                  to="/cart"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-bold tracking-widest uppercase transition-all"
                  style={{
                    background: '#00FFDA',
                    color: '#050505',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#00e6c4'}
                  onMouseLeave={e => e.currentTarget.style.background = '#00FFDA'}
                >
                  Review Cart <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-full py-2.5 text-xs font-mono tracking-[0.2em] uppercase text-[#555] hover:text-[#F5F5F5] transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CartItem({ item, onRemove, onQtyChange }) {
  return (
    <div className="flex gap-3 py-3 border-b border-[#141414]">
      {/* Image */}
      <div className="w-16 h-20 flex-shrink-0 bg-[#111] overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-[#333]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#F5F5F5] leading-snug truncate">{item.name}</p>
        {(item.color || item.size) && (
          <p className="text-[10px] text-[#555] mt-0.5">
            {[item.color, item.size].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          {/* Qty */}
          <div className="flex items-center gap-1.5 border border-[#2a2a2a] px-1.5 py-0.5">
            <button
              onClick={() => onQtyChange(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="p-0.5 text-[#555] hover:text-[#F5F5F5] disabled:opacity-30 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-mono text-[#F5F5F5] w-4 text-center">{item.quantity}</span>
            <button
              onClick={() => onQtyChange(item.quantity + 1)}
              className="p-0.5 text-[#555] hover:text-[#F5F5F5] transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs font-black text-[#F5F5F5]">${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="self-start mt-0.5 p-1 text-[#333] hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}