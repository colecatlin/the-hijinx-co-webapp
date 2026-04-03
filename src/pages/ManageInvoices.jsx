import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Send, CheckCircle, XCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   color: 'bg-gray-100 text-gray-600' },
  issued:  { label: 'Issued',  color: 'bg-blue-100 text-blue-700' },
  paid:    { label: 'Paid',    color: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', color: 'bg-orange-100 text-orange-700' },
  void:    { label: 'Void',    color: 'bg-red-100 text-red-600' },
};

const LINE_TYPES = [
  'driver_registration', 'team_registration', 'credential_fee',
  'paddock_fee', 'service_charge', 'operational_fee', 'other',
];

const INVOICE_TYPES = ['registration', 'operational', 'credential', 'service', 'other'];

const EMPTY_INVOICE = {
  invoice_number: '', invoice_status: 'draft', invoice_type: 'registration',
  issuing_entity_type: 'Admin', issuing_entity_id: '', issuing_entity_name: '',
  recipient_entity_type: 'Driver', recipient_entity_id: '',
  recipient_name_snapshot: '', recipient_email: '',
  subtotal: 0, tax_amount: 0, total_amount: 0, currency: 'USD',
  due_date: '', notes: '', event_id: '',
};

const EMPTY_LINE = {
  line_type: 'driver_registration', description: '', quantity: 1, unit_price: 0, line_total: 0,
  linked_entity_type: '', linked_entity_id: '',
};

function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// ─── Line Item Form ───────────────────────────────────────────────────────────

function LineItemRow({ line, onChange, onRemove }) {
  const handleChange = (k, v) => {
    const updated = { ...line, [k]: v };
    if (k === 'quantity' || k === 'unit_price') {
      updated.line_total = parseFloat(updated.quantity || 0) * parseFloat(updated.unit_price || 0);
    }
    onChange(updated);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-100 last:border-0">
      <div className="col-span-3">
        <Select value={line.line_type} onValueChange={v => handleChange('line_type', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LINE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        <Input className="h-8 text-xs" value={line.description} onChange={e => handleChange('description', e.target.value)} placeholder="Description" />
      </div>
      <div className="col-span-1">
        <Input className="h-8 text-xs" type="number" value={line.quantity} onChange={e => handleChange('quantity', e.target.value)} />
      </div>
      <div className="col-span-2">
        <Input className="h-8 text-xs" type="number" step="0.01" value={line.unit_price} onChange={e => handleChange('unit_price', e.target.value)} />
      </div>
      <div className="col-span-1 text-xs font-semibold text-gray-700 text-right">
        ${parseFloat(line.line_total || 0).toFixed(2)}
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Invoice Detail Panel ─────────────────────────────────────────────────────

function InvoiceDetail({ invoice, onClose, onStatusChange }) {
  const queryClient = useQueryClient();

  const { data: lines = [] } = useQuery({
    queryKey: ['invoice_lines', invoice.id],
    queryFn: () => base44.entities.InvoiceLine.filter({ invoice_id: invoice.id }),
  });

  const [newLines, setNewLines] = useState([]);
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

  const allLines = [...lines, ...newLines];
  const subtotal = allLines.reduce((s, l) => s + parseFloat(l.line_total || 0), 0);

  const statusActions = {
    draft:   [{ label: 'Issue Invoice', status: 'issued', icon: Send, color: 'bg-blue-600 hover:bg-blue-700 text-white' }],
    issued:  [
      { label: 'Mark Paid', status: 'paid', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white' },
      { label: 'Mark Overdue', status: 'overdue', icon: null, color: 'bg-orange-500 hover:bg-orange-600 text-white' },
      { label: 'Void', status: 'void', icon: XCircle, color: 'bg-red-500 hover:bg-red-600 text-white' },
    ],
    overdue: [
      { label: 'Mark Paid', status: 'paid', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700 text-white' },
      { label: 'Void', status: 'void', icon: XCircle, color: 'bg-red-500 hover:bg-red-600 text-white' },
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
                onClick={() => onStatusChange(invoice.id, a.status)}>
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

        {/* Column headers */}
        <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium mb-1 px-0.5">
          <div className="col-span-3">Type</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-1">Qty</div>
          <div className="col-span-2">Unit Price</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1" />
        </div>

        {allLines.length === 0 && !addingLine && (
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
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManageInvoices() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState(null);
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

  const updateStatus = (id, status) => {
    const extra = {};
    if (status === 'issued') extra.issued_at = new Date().toISOString();
    if (status === 'paid') extra.paid_at = new Date().toISOString();
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
    totalBilled: invoices.filter(i => ['issued','paid'].includes(i.invoice_status)).reduce((s, i) => s + (i.total_amount || 0), 0),
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
              onClose={() => setDetailInvoice(null)}
              onStatusChange={updateStatus}
            />
          </div>
        )}
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