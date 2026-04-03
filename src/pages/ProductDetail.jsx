import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ExternalLink, Tag } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

export default function ProductDetail() {
  const { slug } = useParams();
  const [selectedImage, setSelectedImage] = useState(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product_detail', slug],
    queryFn: () => base44.entities.Product.filter({ slug }, '-created_date', 1).then(r => r[0] || null),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Skeleton className="h-6 w-40 mb-8" />
          <div className="grid md:grid-cols-2 gap-10">
            <Skeleton className="h-96 w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500 mb-4">Product not found.</p>
          <Link to={createPageUrl('ApparelHome')} className="text-sm text-gray-700 underline">Back to store</Link>
        </div>
      </PageShell>
    );
  }

  const isDigital = product.product_type === 'digital';
  const displayImage = selectedImage || product.cover_image_url;
  const backTo = isDigital ? '/digital-downloads' : createPageUrl('ApparelHome');
  const backLabel = isDigital ? 'Digital Downloads' : 'Apparel';

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
              {displayImage
                ? <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
              }
            </div>
            {product.gallery_images?.length > 0 && (
              <div className="flex gap-2">
                {[product.cover_image_url, ...product.gallery_images].filter(Boolean).map((url, i) => (
                  <button key={i} onClick={() => setSelectedImage(url)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === url || (!selectedImage && i === 0) ? 'border-gray-900' : 'border-transparent'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{product.category}</p>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              {product.short_description && (
                <p className="text-gray-600 mt-2">{product.short_description}</p>
              )}
            </div>

            <p className="text-3xl font-bold text-gray-900">${product.price?.toFixed(2)} <span className="text-sm font-normal text-gray-400">{product.currency}</span></p>

            {product.description && (
              <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap border-t border-gray-100 pt-4">
                {product.description}
              </div>
            )}

            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <Tag className="w-3.5 h-3.5 text-gray-300" />
                {product.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{tag}</span>
                ))}
              </div>
            )}

            {isDigital && product.digital_asset_url && (
              <Button size="lg" className="w-full gap-2 bg-[#232323] hover:bg-black text-white" asChild>
                <a href={product.digital_asset_url} target="_blank" rel="noopener noreferrer">
                  <Download className="w-5 h-5" /> Download
                </a>
              </Button>
            )}

            {!isDigital && product.external_fulfillment_url && (
              <Button size="lg" className="w-full gap-2 bg-[#232323] hover:bg-black text-white" asChild>
                <a href={product.external_fulfillment_url} target="_blank" rel="noopener noreferrer">
                  Buy Now <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}