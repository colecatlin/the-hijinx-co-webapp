import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { CheckCircle, Download, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/components/utils';

export default function CheckoutSuccess() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Poll for order briefly — webhook may take a moment
  const { data: orders = [] } = useQuery({
    queryKey: ['recent_order', user?.id],
    queryFn: () => base44.entities.Order.filter({ user_id: user.id, payment_provider: 'stripe' }, '-created_date', 1),
    enabled: !!user?.id,
    refetchInterval: (data) => (!data?.length ? 2000 : false),
    refetchIntervalInBackground: true,
  });

  const order = orders[0];
  const hasDigital = order?.order_type === 'digital' || order?.order_type === 'mixed';
  const hasPhysical = order?.order_type === 'physical' || order?.order_type === 'mixed';

  return (
    <PageShell>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment confirmed!</h1>
        <p className="text-gray-500 mb-8">
          {order
            ? `Order #${order.id.slice(-6).toUpperCase()} has been placed.`
            : 'Your order is being processed…'}
        </p>

        <div className="bg-white border border-gray-100 rounded-xl p-5 text-left space-y-3 mb-8">
          {hasDigital && (
            <div className="flex items-center gap-3 text-sm">
              <Download className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-gray-700">Your digital downloads are now available in your account.</span>
            </div>
          )}
          {hasPhysical && (
            <div className="flex items-center gap-3 text-sm">
              <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-gray-700">Your physical item(s) will be processed and shipped.</span>
            </div>
          )}
          {!order && (
            <p className="text-xs text-gray-400 animate-pulse">Confirming your order…</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {hasDigital && (
            <Button asChild className="gap-2 bg-[#232323] hover:bg-black text-white">
              <Link to="/digital-downloads">
                <Download className="w-4 h-4" /> My Downloads
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to={createPageUrl('Home')}>
              Back to Home <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}