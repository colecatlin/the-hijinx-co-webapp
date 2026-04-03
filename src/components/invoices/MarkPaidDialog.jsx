import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

export default function MarkPaidDialog({ open, onClose, onConfirm, isPending }) {
  const [ref, setRef] = useState('');
  const [stripeId, setStripeId] = useState('');
  const [method, setMethod] = useState('manual');

  const handleConfirm = () => {
    onConfirm({ payment_reference: ref, stripe_invoice_id: stripeId, payment_method: method });
    setRef(''); setStripeId(''); setMethod('manual');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Mark Invoice Paid</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual / Cash / Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Reference <span className="text-gray-400">(optional)</span></Label>
            <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="Check #, transfer ID, etc." />
          </div>
          {method === 'stripe' && (
            <div>
              <Label>Stripe Invoice ID <span className="text-gray-400">(optional)</span></Label>
              <Input value={stripeId} onChange={e => setStripeId(e.target.value)} placeholder="in_xxxxx" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={isPending} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="w-4 h-4" />{isPending ? 'Saving…' : 'Confirm Paid'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}