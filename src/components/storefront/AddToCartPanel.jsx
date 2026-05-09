import React, { useState } from 'react';
import { ShoppingBag, Zap, Minus, Plus, Truck, RotateCcw, Shield } from 'lucide-react';

export default function AddToCartPanel({
  product,
  selectedVariant,
  selectedColor,
  selectedSize,
  onAddToCart,
  onBuyNow,
  shippingNote,
  freeShippingThreshold = 75,
}) {
  const [qty, setQty] = useState(1);
  const [addedFlash, setAddedFlash] = useState(false);

  const price = selectedVariant?.price ?? product?.price ?? 0;
  const comparePrice = selectedVariant?.compare_at_price ?? product?.compare_at_price;
  const inventory = selectedVariant?.inventory ?? null;
  const available = selectedVariant ? selectedVariant.available && (selectedVariant.inventory ?? 1) > 0 : true;
  const isSale = comparePrice && comparePrice > price;

  const hasVariants = selectedColor !== null || selectedSize !== null;
  const canAdd = available && (!hasVariants || (selectedColor && selectedSize));

  const handleAdd = () => {
    if (!canAdd) return;
    onAddToCart?.({ product, variant: selectedVariant, qty, color: selectedColor, size: selectedSize });
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 2000);
  };

  const handleBuyNow = () => {
    if (!canAdd) return;
    onBuyNow?.({ product, variant: selectedVariant, qty, color: selectedColor, size: selectedSize });
  };

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-black tracking-tight" style={{ color: '#F5F5F5' }}>
          ${price.toFixed(2)}
        </span>
        {isSale && (
          <>
            <span className="text-lg line-through" style={{ color: '#333' }}>${comparePrice.toFixed(2)}</span>
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: '#00FFDA' }}>
              Save ${(comparePrice - price).toFixed(2)}
            </span>
          </>
        )}
      </div>

      {/* Stock status */}
      {inventory !== null && (
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: inventory === 0 ? '#ef4444' : inventory <= 5 ? '#f59e0b' : '#00FFDA',
              boxShadow: inventory > 0 ? `0 0 6px ${inventory <= 5 ? '#f59e0b' : '#00FFDA'}55` : 'none',
            }}
          />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: '#6a6a6a' }}>
            {inventory === 0 ? 'Out of Stock' : inventory <= 5 ? `Only ${inventory} Left` : inventory <= 10 ? 'Low Stock' : 'In Stock'}
          </span>
        </div>
      )}

      {/* Quantity selector */}
      <div>
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase block mb-3" style={{ color: '#555' }}>Quantity</span>
        <div
          className="flex items-center w-fit"
          style={{ border: '1px solid #262626' }}
        >
          <button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center transition-colors duration-150"
            style={{ color: '#555' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.background = '#1a1a1a'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Minus className="w-3 h-3" />
          </button>
          <span
            className="w-11 h-10 flex items-center justify-center font-bold text-sm"
            style={{ color: '#F5F5F5', borderLeft: '1px solid #262626', borderRight: '1px solid #262626' }}
          >
            {qty}
          </span>
          <button
            onClick={() => setQty(q => q + 1)}
            className="w-10 h-10 flex items-center justify-center transition-colors duration-150"
            style={{ color: '#555' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F5F5F5'; e.currentTarget.style.background = '#1a1a1a'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Selection prompt */}
      {hasVariants && (!selectedColor || !selectedSize) && (
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase" style={{ color: '#555' }}>
          {!selectedColor ? '← Select a color above' : '← Select a size above'}
        </p>
      )}

      {/* CTA buttons */}
      <div className="space-y-3">
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full h-14 flex items-center justify-center gap-3 text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300"
          style={{
            background: !canAdd ? '#0D0D0D' : addedFlash ? '#fff' : '#00FFDA',
            color: !canAdd ? '#333' : '#050505',
            cursor: !canAdd ? 'not-allowed' : 'pointer',
            border: !canAdd ? '1px solid #1a1a1a' : 'none',
          }}
          onMouseEnter={e => { if (canAdd && !addedFlash) e.currentTarget.style.background = '#fff'; }}
          onMouseLeave={e => { if (canAdd && !addedFlash) e.currentTarget.style.background = '#00FFDA'; }}
        >
          <ShoppingBag className="w-4 h-4" />
          {addedFlash ? 'Added to Cart ✓' : available ? 'Add to Cart' : 'Sold Out'}
        </button>

        <button
          onClick={handleBuyNow}
          disabled={!canAdd}
          className="w-full h-14 flex items-center justify-center gap-3 text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300"
          style={{
            background: 'transparent',
            color: !canAdd ? '#333' : '#F5F5F5',
            border: !canAdd ? '1px solid #1a1a1a' : '1px solid #F5F5F5',
            cursor: !canAdd ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (canAdd) { e.currentTarget.style.background = '#F5F5F5'; e.currentTarget.style.color = '#050505'; }}}
          onMouseLeave={e => { if (canAdd) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F5F5F5'; }}}
        >
          <Zap className="w-4 h-4" />
          Buy Now
        </button>
      </div>

      {/* Trust line */}
      <div className="pt-4 space-y-2.5" style={{ borderTop: '1px solid #111' }}>
        <div className="flex items-center gap-3">
          <Truck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#00FFDA' }} />
          <span className="text-xs" style={{ color: '#555' }}>{shippingNote || `Free shipping on orders over $${freeShippingThreshold}`}</span>
        </div>
        <div className="flex items-center gap-3">
          <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#00FFDA' }} />
          <span className="text-xs" style={{ color: '#555' }}>30-day hassle-free returns</span>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#00FFDA' }} />
          <span className="text-xs" style={{ color: '#555' }}>Secure checkout</span>
        </div>
      </div>
    </div>
  );
}