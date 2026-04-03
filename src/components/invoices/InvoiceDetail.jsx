import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Send, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import LineItemRow from './LineItemRow';
import { STATUS_CONFIG, EMPTY_LINE } from '@/constants/invoiceConstants';

export default function InvoiceDetail({ invoice, onStatusChange, onMarkPaid }) {
  const queryClient = useQueryClient();

  const { data: lines = [] } = useQuery({
    queryKey: ['invoice_lines', invoice.id],
    queryFn: () => base44.entities.InvoiceLine.filter({ invoice_id: invoice.id }),
  });

  const [addingLine, setAddingLine] = useState(false);
  const [draftLine, setDraftLine] = useState(EMPTY_LINE);

  const saveLine = useMutation({
    mutationFn: (line) => base44.entities.InvoiceLine.create({ ...line, invoice_id: invoice.id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice_lines', invoice.id]);
      queryClient.invalidateQueries(['invoices']);
      setDraftLine(EMPTY_LINE);
      setAddingLine(false);
      toast.success('Line item added');
    },
  });

  const deleteLine = useMutation({
    mutationFn: (id) => base44.entities.InvoiceLine.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice_lines', invoice.id]);
      toast.success('Line removed');
    },
  });

  const subtotal = lines.reduce((s, l) => s + parseFloat(l.line_total || 0), 0);

  const statusActions = {
    draft:   [{ label: 'Issue Invoice', status: 'issued', icon: Send, color: 'bg-blue-600 hover:bg-blue-700 text-white', isPaid: false }],
    issued:  [
      { label: 'Mark Paid', status: 'paid', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white', isPaid: true },
      { label: 'Mark Overdue', status: 'overdue', icon: null, color: 'bg-orange-500 hover:bg-orange-600 text-white', isPaid: false },
      { label: 'Void', status: 'void', icon: XCircle, color: 'bg-red-500 hover:bg-red-600 text-white', isPaid: false },
    ],
    overdue: [
      { label: 'Mark Paid', status: 'paid', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white', isPaid: true },
      { label: 'Void', status: 'void', icon: XCircle, color: 'bg-red-500 hover:bg-red-600 text-white', isPaid: false },
    ],
    paid: [], void: [],
  };

  const actions = statusActions[invoice.invoice_status] || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Invoice</p>
          <h2 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-xs px-2 py-0.5 ${STATUS_CONFIG[invoice.invoice_status]?.color}`}>
              {STATUS_CONFIG[invoice.invoice_status]?.label}
            </Badge>
            <span className="text-xs text-gray-400 capitalize">{invoice.invoice_type}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Button key={a.status} size="sm" className={`gap-1.5 text-xs ${a.color}`}
                onClick={() => a.isPaid ? onMarkPaid(invoice) : onStatusChange(invoice.id, a.status)}>
                {Icon && <Icon className="w-3.5 h-3.5" />} {a.label}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Recipient */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-1">Recipient</p>
          <p className="font-semibold text-gray-900">{invoice.recipient_name_snapshot}</p>
          <p className="text-gray-500">{invoice.recipient_email}</p>
          <p className="text-gray-400 text-xs">{invoice.recipient_entity_type}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Issuer</p>
          <p className="font-semibold text-gray-900">{invoice.issuing_entity_name || invoice.issuing_entity_type}</p>
          {invoice.due_date && <p className="text-xs text-gray-400 mt-2">Due: {invoice.due_date}</p>}
        </div>
      </div>

      <Separator />

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Line Items</p>
          {invoice.invoice_status === 'draft' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddingLine(true)}>
              <Plus className="w-3 h-3" /> Add Line
            </Button>
          )}
        </div>

        <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium mb-1 px-0.5">
          <div className="col-span-3">Type</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-1">Qty</div>
          <div className="col-span-2">Unit Price</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1" />
        </div>

        {lines.length === 0 && !addingLine && (
          <p className="text-xs text-gray-400 py-3">No line items yet.</p>
        )}

        {lines.map(line => (
          invoice.invoice_status === 'draft'
            ? <LineItemRow key={line.id} line={line} onChange={() => {}} onRemove={() => deleteLine.mutate(line.id)} />
            : (
              <div key={line.id} className="grid grid-cols-12 gap-2 py-2 border-b border-gray-100 last:border-0 text-sm">
                <div className="col-span-3 text-xs text-gray-500">{line.line_type?.replace(/_/g, ' ')}</div>
                <div className="col-span-4 text-xs">{line.description}</div>
                <div className="col-span-1 text-xs">{line.quantity}</div>
                <div className="col-span-2 text-xs">${parseFloat(line.unit_price).toFixed(2)}</div>
                <div className="col-span-1 text-xs font-semibold text-right">${parseFloat(line.line_total).toFixed(2)}</div>
                <div className="col-span-1" />
              </div>
            )
        ))}

        {addingLine && (
          <>
            <LineItemRow line={draftLine} onChange={setDraftLine} onRemove={() => setAddingLine(false)} />
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="text-xs h-7 bg-[#232323] hover:bg-black text-white"
                onClick={() => saveLine.mutate({ ...draftLine, line_total: draftLine.quantity * draftLine.unit_price })}>
                Save Line
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setAddingLine(false)}>Cancel</Button>
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Tax</span><span>${parseFloat(invoice.tax_amount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
          <span>Total</span><span>${parseFloat(invoice.total_amount || 0).toFixed(2)} {invoice.currency}</span>
        </div>
      </div>

      {invoice.notes && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500">
          <p className="font-semibold text-gray-600 mb-1">Notes</p>
          {invoice.notes}
        </div>
      )}

      {/* Payment record — visible when paid */}
      {invoice.invoice_status === 'paid' && (
        <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold text-green-700 mb-1">
            <CreditCard className="w-3.5 h-3.5" /> Payment Record
          </div>
          {invoice.paid_at && <p className="text-green-600">Paid: {new Date(invoice.paid_at).toLocaleString()}</p>}
          {invoice.payment_provider && <p className="text-gray-500">Method: {invoice.payment_provider}</p>}
          {invoice.external_payment_reference && <p className="text-gray-500">Ref: {invoice.external_payment_reference}</p>}
          {invoice.stripe_invoice_id && <p className="text-gray-400">Stripe ID: {invoice.stripe_invoice_id}</p>}
        </div>
      )}
    </div>
  );
}