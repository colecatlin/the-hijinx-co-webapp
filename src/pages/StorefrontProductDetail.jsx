import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Share2, ChevronDown } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import SeoMeta from '@/components/system/seoMeta';
import ProductGallery from '@/components/storefront/ProductGallery';
import VariantSelector from '@/components/storefront/VariantSelector';
import SizeSelector from '@/components/storefront/SizeSelector';
import AddToCartPanel from '@/components/storefront/AddToCartPanel';
import ProductStoryBlock from '@/components/storefront/ProductStoryBlock';
import FeatureIconGrid from '@/components/storefront/FeatureIconGrid';
import RelatedProducts from '@/components/storefront/RelatedProducts';
import ReviewList from '@/components/storefront/ReviewList';
import DOMPurify from 'dompurify';

function AccordionSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#1a1a1a]">
      <button
        className="w-full flex items-center justify-between py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-mono tracking-[0.2em] text-[#F5F5F5] uppercase">{title}</span>
        <ChevronDown className={`w-4 h-4 text-[#555] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-6 text-sm text-[#A1A1A1] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

export default function StorefrontProductDetail() {
  const { slug } = useParams();
  const purchasePanelRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [wishlistAdded, setWishlistAdded] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Fetch product
  const { data: productArr = [], isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => base44.entities.Product.filter({ slug }),
    enabled: !!slug,
  });
  const product = productArr[0] || null;

  // Fetch variants
  const { data: variants = [] } = useQuery({
    queryKey: ['variants', product?.id],
    queryFn: () => base44.entities.ProductVariant.filter({ product_id: product.id }),
    enabled: !!product?.id,
  });

  // Fetch reviews (approved only)
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn: () => base44.entities.Review.filter({ product_id: product.id, status: 'approved' }),
    enabled: !!product?.id,
  });

  // Fetch related products
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['relatedProducts', product?.category, product?.id],
    queryFn: () => base44.entities.Product.filter({ category: product.category, status: 'active' }),
    enabled: !!product?.category,
    select: (data) => data.filter(p => p.id !== product?.id).slice(0, 4),
  });

  // Fetch storefront settings
  const { data: settingsList = [] } = useQuery({
    queryKey: ['storefrontSettings'],
    queryFn: () => base44.entities.StorefrontSettings.list(),
    staleTime: 10 * 60 * 1000,
  });
  const settings = settingsList[0] || {};

  // Build unique colors and sizes from variants
  const colors = variants
    .reduce((acc, v) => {
      if (v.color && !acc.find(c => c.color === v.color)) {
        acc.push({ color: v.color, color_hex: v.color_hex });
      }
      return acc;
    }, []);

  const sizes = variants.filter(v => !selectedColor || v.color === selectedColor);

  // Selected variant resolution
  const selectedVariant = variants.find(
    v => v.color === selectedColor && v.size === selectedSize
  ) || null;

  // Track recently viewed
  useEffect(() => {
    if (!product) return;
    const key = 'hjx_rv';
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [product.id, ...stored.filter(id => id !== product.id)].slice(0, 8);
    localStorage.setItem(key, JSON.stringify(updated));
    setRecentlyViewed(stored.filter(id => id !== product.id).slice(0, 4));
  }, [product?.id]);

  // Auto-select first color if only one
  useEffect(() => {
    if (colors.length === 1 && !selectedColor) {
      setSelectedColor(colors[0].color);
    }
  }, [colors]);

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleAddToCart = ({ product, variant, qty, color, size }) => {
    const key = 'hjx_cart';
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    const id = `${product.id}__${variant?.id || 'base'}`;
    const existing = cart.find(i => i.id === id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id,
        product_id: product.id,
        variant_id: variant?.id,
        name: product.name,
        price: variant?.price || product.price,
        image: variant?.image_url || product.cover_image_url,
        color,
        size,
        qty,
      });
    }
    localStorage.setItem(key, JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    alert(`Added ${product.name} (${color || ''} ${size || ''}) to cart!`);
  };

  if (isLoading) {
    return (
      <PageShell style={{ background: '#050505' }}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#00FFDA] border-t-transparent rounded-full animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell style={{ background: '#050505' }}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-[#555] font-mono tracking-widest uppercase text-sm">Product Not Found</p>
          <Link to="/ApparelHome" className="text-xs text-[#00FFDA] underline">Back to Store</Link>
        </div>
      </PageShell>
    );
  }

  const allImages = [
    product.cover_image_url,
    ...(product.gallery_images || []),
    ...(selectedVariant?.image_url ? [selectedVariant.image_url] : []),
  ].filter(Boolean);

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <SeoMeta
        title={product.seo_title || product.name}
        description={product.seo_description || product.short_description}
        image={product.cover_image_url}
      />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center gap-2 text-xs font-mono text-[#555]">
          <Link to="/ApparelHome" className="hover:text-[#00FFDA] transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Store
          </Link>
          {product.category && (
            <>
              <span>/</span>
              <span className="text-[#555]">{product.category}</span>
            </>
          )}
          <span>/</span>
          <span className="text-[#A1A1A1]">{product.name}</span>
        </nav>
      </div>

      {/* Main product section */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid lg:grid-cols-[1fr_480px] gap-16 items-start">

          {/* LEFT: Gallery */}
          <div className="lg:sticky lg:top-24">
            <ProductGallery
              images={product.gallery_images || []}
              coverImage={selectedVariant?.image_url || product.cover_image_url}
            />
          </div>

          {/* RIGHT: Purchase panel */}
          <div ref={purchasePanelRef} className="space-y-8">

            {/* Category + wishlist row */}
            <div className="flex items-center justify-between">
              {product.category && (
                <span className="font-mono text-[10px] tracking-[0.35em] text-[#00FFDA] uppercase">
                  {product.category}
                </span>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWishlistAdded(!wishlistAdded)}
                  className="w-8 h-8 flex items-center justify-center border border-[#262626] hover:border-[#00FFDA] transition-colors"
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlistAdded ? 'text-red-400 fill-red-400' : 'text-[#555]'}`} />
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-[#262626] hover:border-[#404040] transition-colors">
                  <Share2 className="w-3.5 h-3.5 text-[#555]" />
                </button>
              </div>
            </div>

            {/* Name + tagline */}
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#F5F5F5] leading-[1.05]">
                {product.name}
              </h1>
              {product.tagline && (
                <p className="text-base text-[#A1A1A1] mt-2 leading-relaxed">{product.tagline}</p>
              )}
            </div>

            {/* Review summary */}
            {reviews.length > 0 && (
              <button
                onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`text-xs ${n <= Math.round(avgRating) ? 'text-[#00FFDA]' : 'text-[#333]'}`}>★</span>
                  ))}
                </div>
                <span className="text-xs text-[#555] underline underline-offset-2">{reviews.length} reviews</span>
              </button>
            )}

            {/* Short description */}
            {product.short_description && (
              <p className="text-sm text-[#A1A1A1] leading-relaxed border-l-2 border-[#00FFDA]/30 pl-4">
                {product.short_description}
              </p>
            )}

            <div className="w-full h-px bg-[#1a1a1a]" />

            {/* Color selector */}
            {colors.length > 0 && (
              <VariantSelector
                colors={colors}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
              />
            )}

            {/* Size selector */}
            {sizes.length > 0 && (
              <SizeSelector
                sizes={sizes}
                selectedSize={selectedSize}
                onSizeChange={setSelectedSize}
                sizeGuideUrl={settings.size_guide_url}
              />
            )}

            {/* Add to cart */}
            <AddToCartPanel
              product={product}
              selectedVariant={selectedVariant}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              onAddToCart={handleAddToCart}
              onBuyNow={handleAddToCart}
              shippingNote={product.shipping_note || settings.shipping_note}
              freeShippingThreshold={settings.free_shipping_threshold || 75}
            />

            {/* Feature icons */}
            {product.feature_icons?.length > 0 && (
              <FeatureIconGrid features={product.feature_icons} />
            )}

            {/* Accordion sections */}
            <div className="space-y-0">
              {product.description && (
                <AccordionSection title="Details">
                  <div
                    className="prose-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
                  />
                </AccordionSection>
              )}
              {product.fit_and_sizing && (
                <AccordionSection title="Fit & Sizing">
                  <p>{product.fit_and_sizing}</p>
                </AccordionSection>
              )}
              {product.material_and_care && (
                <AccordionSection title="Material & Care">
                  <p>{product.material_and_care}</p>
                </AccordionSection>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Story block */}
      {(product.story || product.lifestyle_images?.length > 0) && (
        <ProductStoryBlock
          story={product.story}
          lifestyleImages={product.lifestyle_images || []}
        />
      )}

      {/* Related products */}
      <RelatedProducts products={relatedProducts} />

      {/* Reviews */}
      <div id="reviews-section" className="max-w-7xl mx-auto px-6">
        <ReviewList reviews={reviews} avgRating={avgRating} totalCount={reviews.length} />
      </div>
    </PageShell>
  );
}