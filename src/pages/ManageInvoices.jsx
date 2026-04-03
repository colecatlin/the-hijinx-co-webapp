import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import InvoiceDetail from '@/components/invoices/InvoiceDetail';
import MarkPaidDialog from '@/components/invoices/MarkPaidDialog';
import { STATUS_CONFIG, INVOICE_TYPES, EMPTY_INVOICE } from '@/constants/invoiceConstants';
import { generateInvoiceNumber } from '@/utils/invoiceUtils';

export default function ManageInvoices() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [markPaidTarget, setMarkPaidTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_INVOICE, invoice_number: generateInvoiceNumber() });
  const [filter, setFilter] = useState('all');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date', 200),
  });

  const createInvoice = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      toast.success('Invoice created');
      setCreateOpen(false);
      setForm({ ...EMPTY_INVOICE, invoice_number: generateInvoiceNumber() });
    },
    onError: (e) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: ({ id, payment_reference, stripe_invoice_id, payment_method }) =>
      base44.entities.Invoice.update(id, {
        invoice_status: 'paid',
        paid_at: new Date().toISOString(),
        payment_provider: payment_method,
        external_payment_reference: payment_reference || undefined,
        stripe_invoice_id: stripe_invoice_id || undefined,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries(['invoices']);
      if (detailInvoice?.id === vars.id) {
        setDetailInvoice(inv => ({
          ...inv,
          invoice_status: 'paid',
          paid_at: new Date().toISOString(),
          payment_provider: vars.payment_method,
          external_payment_reference: vars.payment_reference,
          stripe_invoice_id: vars.stripe_invoice_id,
        }));
      }
      setMarkPaidTarget(null);
      toast.success('Invoice marked paid');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = (id, status) => {
    const extra = {};
    if (status === 'issued') extra.issued_at = new Date().toISOString();
    base44.entities.Invoice.update(id, { invoice_status: status, ...extra }).then(() => {
      queryClient.invalidateQueries(['invoices']);
      if (detailInvoice?.id === id) setDetailInvoice(inv => ({ ...inv, invoice_status: status, ...extra }));
      toast.success(`Invoice marked ${status}`);
    });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    createInvoice.mutate({
      ...form,
      subtotal: parseFloat(form.subtotal) || 0,
      tax_amount: parseFloat(form.tax_amount) || 0,
      total_amount: parseFloat(form.total_amount) || 0,
    });
  };

  const displayed = filter === 'all' ? invoices : invoices.filter(i => i.invoice_status === filter);

  const stats = useMemo(() => ({
    total: invoices.length,
    draft: invoices.filter(i => i.invoice_status === 'draft').length,
    issued: invoices.filter(i => i.invoice_status === 'issued').length,
    paid: invoices.filter(i => i.invoice_status === 'paid').length,
    totalBilled: invoices.filter(i => ['issued', 'paid'].includes(i.invoice_status)).reduce((s, i) => s + (i.total_amount || 0), 0),
  }), [invoices]);

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">Race Core operational billing</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-[#232323] hover:bg-black text-white">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', val: stats.total },
            { label: 'Draft', val: stats.draft },
            { label: 'Issued', val: stats.issued },
            { label: 'Paid', val: stats.paid },
            { label: 'Billed', val: `$${stats.totalBilled.toFixed(2)}` },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold text-gray-900">{val}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {['all', 'draft', 'issued', 'paid', 'overdue', 'void'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors capitalize ${filter === f ? 'bg-[#232323] text-white border-[#232323]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : displayed.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No invoices yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {displayed.map((inv, i) => (
              <div key={inv.id}
                className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${i !== displayed.length - 1 ? 'border-b border-gray-100' : ''} ${detailInvoice?.id === inv.id ? 'bg-gray-50' : ''}`}
                onClick={() => setDetailInvoice(detailInvoice?.id === inv.id ? null : inv)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{inv.invoice_number}</p>
                    <Badge className={`text-xs px-1.5 py-0 ${STATUS_CONFIG[inv.invoice_status]?.color}`}>
                      {STATUS_CONFIG[inv.invoice_status]?.label}
                    </Badge>
                    <span className="text-xs text-gray-400 capitalize hidden sm:inline">{inv.invoice_type}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{inv.recipient_name_snapshot} {inv.recipient_email && `· ${inv.recipient_email}`}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {inv.due_date && <span className="text-xs text-gray-400 hidden md:inline">Due {inv.due_date}</span>}
                  <span className="text-sm font-bold text-gray-900">${parseFloat(inv.total_amount || 0).toFixed(2)}</span>
                  {detailInvoice?.id === inv.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inline detail panel */}
        {detailInvoice && (
          <div className="mt-4 bg-white border border-gray-200 rounded-xl p-6">
            <InvoiceDetail
              invoice={detailInvoice}
              onStatusChange={updateStatus}
              onMarkPaid={(inv) => setMarkPaidTarget(inv)}
            />
          </div>
        )}

        <MarkPaidDialog
          open={!!markPaidTarget}
          onClose={() => setMarkPaidTarget(null)}
          isPending={markPaid.isPending}
          onConfirm={({ payment_reference, stripe_invoice_id, payment_method }) =>
            markPaid.mutate({ id: markPaidTarget?.id, payment_reference, stripe_invoice_id, payment_method })
          }
        />
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Invoice Number</Label>
                <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} required />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.invoice_type} onValueChange={v => set('invoice_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INVOICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Issuing Entity Type</Label>
                <Select value={form.issuing_entity_type} onValueChange={v => set('issuing_entity_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Track', 'Series', 'Admin'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issuer Name</Label>
                <Input value={form.issuing_entity_name} onChange={e => set('issuing_entity_name', e.target.value)} placeholder="e.g. Race Core Admin" />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recipient Name *</Label>
                <Input value={form.recipient_name_snapshot} onChange={e => set('recipient_name_snapshot', e.target.value)} required />
              </div>
              <div>
                <Label>Recipient Email</Label>
                <Input type="email" value={form.recipient_email} onChange={e => set('recipient_email', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recipient Type</Label>
                <Select value={form.recipient_entity_type} onValueChange={v => set('recipient_entity_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Driver', 'Team', 'Track', 'Series', 'MediaOrganization', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Subtotal</Label>
                <Input type="number" step="0.01" value={form.subtotal} onChange={e => {
                  const sub = parseFloat(e.target.value) || 0;
                  const tax = parseFloat(form.tax_amount) || 0;
                  setForm(f => ({ ...f, subtotal: sub, total_amount: sub + tax }));
                }} />
              </div>
              <div>
                <Label>Tax</Label>
                <Input type="number" step="0.01" value={form.tax_amount} onChange={e => {
                  const tax = parseFloat(e.target.value) || 0;
                  const sub = parseFloat(form.subtotal) || 0;
                  setForm(f => ({ ...f, tax_amount: tax, total_amount: sub + tax }));
                }} />
              </div>
              <div>
                <Label>Total *</Label>
                <Input type="number" step="0.01" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} required />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createInvoice.isPending} className="bg-[#232323] hover:bg-black text-white">
                {createInvoice.isPending ? 'Creating…' : 'Create Draft Invoice'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}