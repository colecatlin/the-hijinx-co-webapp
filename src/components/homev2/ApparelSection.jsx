import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

// ApparelSection — featured products / apparel
// Props: products (featured_products from hp)
export default function ApparelSection({ products = [] }) {
  return (
    <section data-section="apparel">
      <div data-block="header">
        <span>Apparel</span>
        <Link to={createPageUrl('ApparelHome')}>Shop All</Link>
      </div>

      {products.length > 0 ? (
        <div data-block="product-grid">
          {products.slice(0, 4).map((product) => (
            <div key={product.id} data-item="product">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} data-field="image" />
              )}
              <span data-field="name">{product.name}</span>
              {product.price != null && <span data-field="price">${product.price}</span>}
            </div>
          ))}
        </div>
      ) : (
        <div data-block="empty">No products available.</div>
      )}
    </section>
  );
}