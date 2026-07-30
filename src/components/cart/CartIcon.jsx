import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cartStore.jsx';

export default function CartIcon({ style = {} }) {
  const { totalItems, setDrawerOpen } = useCart();

  return (
    <button
      onClick={() => setDrawerOpen(true)}
      className="relative p-2 rounded-lg transition-colors flex items-center justify-center"
      style={style}
      aria-label="Open cart"
    >
      <ShoppingBag className="w-4 h-4" />
      {totalItems > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black leading-none px-1"
          style={{ background: 'hsl(var(--motion))', color: 'hsl(var(--canvas))' }}
        >
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  );
}