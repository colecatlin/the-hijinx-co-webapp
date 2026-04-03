import { useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useCheckout — initiates a Stripe Checkout session.
 *
 * Usage:
 *   const { startCheckout, loading, error } = useCheckout();
 *   await startCheckout([{ product_id: 'abc', quantity: 1 }]);
 *
 * Redirects the browser to Stripe Checkout on success.
 */
export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startCheckout = async (items) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('createCheckoutSession', {
        items,
        success_url: `${window.location.origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/checkout-cancel`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error(res.data?.error || 'No checkout URL returned');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return { startCheckout, loading, error };
}