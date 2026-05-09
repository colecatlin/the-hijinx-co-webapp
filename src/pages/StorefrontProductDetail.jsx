import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useCart } from '@/lib/cartStore.jsx';

function AccordionSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid #1a1a1a' }}>
      <button
        className="w-full flex items-center justify-between py-4 text-left group"
        onClick={() => setOpen(!open)}
      >
        <span
          className="text-[10px] font-mono tracking-[0.25em] uppercase transition-colors duration-200"
          style={{ color: open ? '#F5F5F5' : '#A1A1A1' }}
        >
          {title}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-300"
          style={{ color: '#555', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-sm leading-relaxed" style={{ color: '#7a7a7a' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StorefrontProductDetail() {
  const { slug } = useParams();
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [wishlistAdded, setWishlistAdded] = useState(false);
  const { addItem } = useCart();

  const { data: productArr = [], isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => base44.entities.Product.filter({ slug }),
    enabled: !!slug,
  });
  const product = productArr[0] || null;

  const { data: variants = [] } = useQuery({
    queryKey: ['variants', product?.id],
    queryFn: () => base44.entities.ProductVariant.filter({ product_id: product.id }),
    enabled: !!product?.id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn: () => base44.entities.Review.filter({ product_id: product.id, status: 'approved' }),
    enabled: !!product?.id,
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['relatedProducts', product?.category, product?.id],
    queryFn: () => base44.entities.Product.filter({ category: product.category, status: 'active' }),
    enabled: !!product?.category,
    select: (data) => data.filter(p => p.id !== product?.id).slice(0, 4),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['storefrontSettings'],
    queryFn: () => base44.entities.StorefrontSettings.list(),
    staleTime: 10 * 60 * 1000,
  });
  const settings = settingsList[0] || {};

  const colors = variants.reduce((acc, v) => {
    if (v.color && !acc.find(c => c.color === v.color)) {
      acc.push({ color: v.color, color_hex: v.color_hex });
    }
    return acc;
  }, []);

  const sizes = variants.filter(v => !selectedColor || v.color === selectedColor);

  const selectedVariant = variants.find(
    v => v.color === selectedColor && v.size === selectedSize
  ) || null;

  useEffect(() => {
    if (!product) return;
    const key = 'hjx_rv';
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [product.id, ...stored.filter(id => id !== product.id)].slice(0, 8);
    localStorage.setItem(key, JSON.stringify(updated));
  }, [product?.id]);

  useEffect(() => {
    if (colors.length === 1 && !selectedColor) {
      setSelectedColor(colors[0].color);
    }
  }, [colors]);

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleAddToCart = ({ product, variant, qty, color, size }) => {
    addItem({
      variantId: variant?.id || `${product.id}__base`,
      productId: product.id,
      name: product.name,
      price: variant?.price ?? product.price,
      image: variant?.image_url || product.cover_image_url,
      color: color || variant?.color || null,
      size: size || variant?.size || null,
      slug: product.slug,
      quantity: qty || 1,
    });
  };

  if (isLoading) {
    return (
      <PageShell style={{ background: '#050505' }}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#00FFDA', borderTopColor: 'transparent' }}
          />
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell style={{ background: '#050505' }}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-[#444] font-mono tracking-[0.3em] uppercase text-xs">Product Not Found</p>
          <Link to="/store" className="text-xs text-[#00FFDA] underline underline-offset-4">Back to Store</Link>
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
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
        <nav className="flex items-center gap-2 text-[10px] font-mono text-[#333]">
          <Link to="/store" className="hover:text-[#00FFDA] transition-colors flex items-center gap-1.5">
            <ArrowLeft className="w-3 h-3" /> Store
          </Link>
          {product.category && (
            <>
              <span style={{ color: '#222' }}>/</span>
              <span style={{ color: '#444' }}>{product.category}</span>
            </>
          )}
          <span style={{ color: '#222' }}>/</span>
          <span style={{ color: '#666' }}>{product.name}</span>
        </nav>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-20">
        <div className="grid lg:grid-cols-[1fr_460px] gap-12 xl:gap-20 items-start">

          {/* Gallery */}
          <div className="lg:sticky lg:top-24">
            <ProductGallery
              images={product.gallery_images || []}
              coverImage={selectedVariant?.image_url || product.cover_image_url}
            />
          </div>

          {/* Purchase panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-7"
          >
            {/* Category + actions */}
            <div className="flex items-center justify-between">
              {product.category && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-px bg-[#00FFDA]" />
                  <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA] uppercase">{product.category}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWishlistAdded(!wishlistAdded)}
                  className="w-8 h-8 flex items-center justify-center transition-all duration-200"
                  style={{ border: `1px solid ${wishlistAdded ? 'rgba(239,68,68,0.4)' : '#262626'}` }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = wishlistAdded ? 'rgba(239,68,68,0.6)' : '#404040'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = wishlistAdded ? 'rgba(239,68,68,0.4)' : '#262626'}
                >
                  <Heart className={`w-3.5 h-3.5 transition-colors ${wishlistAdded ? 'text-red-400 fill-red-400' : 'text-[#555]'}`} />
                </button>
                <button
                  className="w-8 h-8 flex items-center justify-center transition-all duration-200"
                  style={{ border: '1px solid #262626' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#404040'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#262626'}
                >
                  <Share2 className="w-3.5 h-3.5 text-[#555]" />
                </button>
              </div>
            </div>

            {/* Name + tagline */}
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-black tracking-tight leading-[1.02]" style={{ color: '#F5F5F5' }}>
                {product.name}
              </h1>
              {product.tagline && (
                <p className="text-sm mt-2.5 leading-relaxed" style={{ color: '#6a6a6a' }}>
                  {product.tagline}
                </p>
              )}
            </div>

            {/* Review star summary */}
            {reviews.length > 0 && (
              <button
                onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2.5 hover:opacity-75 transition-opacity"
              >
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} className="text-[11px]" style={{ color: n <= Math.round(avgRating) ? '#00FFDA' : '#2a2a2a' }}>★</span>
                  ))}
                </div>
                <span className="text-[11px] text-[#555] underline underline-offset-2">{reviews.length} reviews</span>
              </button>
            )}

            {/* Short description */}
            {product.short_description && (
              <p
                className="text-sm leading-relaxed pl-4"
                style={{ color: '#7a7a7a', borderLeft: '2px solid rgba(0,255,218,0.2)' }}
              >
                {product.short_description}
              </p>
            )}

            <div style={{ height: '1px', background: '#111' }} />

            {/* Variant selectors */}
            {colors.length > 0 && (
              <VariantSelector
                colors={colors}
                selectedColor={selectedColor}
                onColorChange={setSelectedColor}
              />
            )}
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

            {/* Accordion details */}
            <div>
              {product.description && (
                <AccordionSection title="Details">
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }} />
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
          </motion.div>
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