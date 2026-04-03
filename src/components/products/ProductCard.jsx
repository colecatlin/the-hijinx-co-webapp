import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink } from 'lucide-react';

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.slug}`} className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="aspect-square overflow-hidden bg-gray-50">
        {product.cover_image_url ? (
          <img src={product.cover_image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Download className="w-10 h-10 text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 text-sm leading-snug">{product.name}</p>
        {product.short_description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.short_description}</p>}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-gray-900">${parseFloat(product.price).toFixed(2)}</span>
          <Badge variant="outline" className="text-xs gap-1">
            <Download className="w-3 h-3" /> Digital
          </Badge>
        </div>
      </div>
    </Link>
  );
}