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

  const price = selectedVariant?.price ?? product?.price ?? 0;
  const comparePrice = selectedVariant?.compare_at_price ?? product?.compare_at_price;
  const inventory = selectedVariant?.inventory ?? null;
  const available = selectedVariant ? selectedVariant.available && (selectedVariant.inventory ?? 1) > 0 : true;
  const isSale = comparePrice && comparePrice > price;

  const canAdd = available && (!selectedVariant || (selectedColor && selectedSize));
  const needsSelection = !selectedColor || !selectedSize;

  const handleAdd = () => {
    if (!canAdd) return;
    onAddToCart?.({ product, variant: selectedVariant, qty, color: selectedColor, size: selectedSize });
  };

  const handleBuyNow = () => {
    if (!canAdd) return;
    onBuyNow?.({ product, variant: selectedVariant, qty, color: selectedColor, size: selectedSize });
  };

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-black text-[#F5F5F5] tracking-tight">
          ${price.toFixed(2)}
        </span>
        {isSale && (
          <>
            <span className="text-lg text-[#555] line-through">${comparePrice.toFixed(2)}</span>
            <span className="text-xs font-mono text-[#00FFDA] tracking-wider uppercase">
              Save ${(comparePrice - price).toFixed(2)}
            </span>
          </>
        )}
      </div>

      {/* Inventory status */}
      {inventory !== null && (
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            inventory > 10 ? 'bg-[#00FFDA]' : inventory > 0 ? 'bg-yellow-400' : 'bg-red-500'
          }`} />
          <span className="text-xs text-[#A1A1A1] font-mono tracking-wide">
            {inventory === 0 ? 'OUT OF STOCK' : inventory <= 5 ? `ONLY ${inventory} LEFT` : inventory <= 10 ? 'LOW STOCK' : 'IN STOCK'}
          </span>
        </div>
      )}

      {/* Quantity */}
      <div>
        <span className="text-xs font-mono tracking-[0.15em] text-[#A1A1A1] uppercase block mb-3">Quantity</span>
        <div className="flex items-center gap-0 border border-[#262626] w-fit">
          <button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[#A1A1A1] hover:text-[#F5F5F5] hover:bg-[#1a1a1a] transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-12 h-10 flex items-center justify-center text-[#F5F5F5] font-bold text-sm border-x border-[#262626]">
            {qty}
          </span>
          <button
            onClick={() => setQty(q => q + 1)}
            className="w-10 h-10 flex items-center justify-center text-[#A1A1A1] hover:text-[#F5F5F5] hover:bg-[#1a1a1a] transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {needsSelection && (selectedColor === null || selectedSize === null) && (
          <p className="text-xs text-[#555] font-mono tracking-wide">
            {!selectedColor ? 'SELECT A COLOR' : 'SELECT A SIZE'}
          </p>
        )}

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={`w-full h-14 flex items-center justify-center gap-3 text-sm font-bold tracking-[0.1em] uppercase transition-all duration-200 ${
            canAdd
              ? 'bg-[#00FFDA] text-[#050505] hover:bg-white'
              : 'bg-[#111111] text-[#333] border border-[#262626] cursor-not-allowed'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {available ? 'Add to Cart' : 'Sold Out'}
        </button>

        <button
          onClick={handleBuyNow}
          disabled={!canAdd}
          className={`w-full h-14 flex items-center justify-center gap-3 text-sm font-bold tracking-[0.1em] uppercase border transition-all duration-200 ${
            canAdd
              ? 'border-[#F5F5F5] text-[#F5F5F5] hover:bg-[#F5F5F5] hover:text-[#050505]'
              : 'border-[#262626] text-[#333] cursor-not-allowed'
          }`}
        >
          <Zap className="w-4 h-4" />
          Buy Now
        </button>
      </div>

      {/* Trust badges */}
      <div className="pt-4 border-t border-[#1a1a1a] space-y-3">
        <div className="flex items-center gap-3 text-xs text-[#555]">
          <Truck className="w-4 h-4 flex-shrink-0 text-[#00FFDA]" />
          <span>{shippingNote || `Free shipping on orders over $${freeShippingThreshold}`}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#555]">
          <RotateCcw className="w-4 h-4 flex-shrink-0 text-[#00FFDA]" />
          <span>30-day hassle-free returns</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#555]">
          <Shield className="w-4 h-4 flex-shrink-0 text-[#00FFDA]" />
          <span>Secure checkout</span>
        </div>
      </div>
    </div>
  );
}