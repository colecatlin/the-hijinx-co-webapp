import React from 'react';
import { Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils';

export default function CheckoutCancel() {
  return (
    <PageShell>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-9 h-9 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Checkout cancelled</h1>
        <p className="text-gray-500 mb-8">No payment was taken. You can go back and try again whenever you're ready.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to={createPageUrl('ApparelHome')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Store
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}