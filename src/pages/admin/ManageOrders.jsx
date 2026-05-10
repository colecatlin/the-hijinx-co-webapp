import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';

function OrderLineItems({ orderId }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: orderId }),
    staleTime: 60000,
  });

  if (isLoading) return <p className="text-xs text-[#555] mt-3">Loading items…</p>;
  if (!items.length) return <p className="text-xs text-[#555] mt-3">No items found.</p>;

  return (
    <div className="mt-3 border border-[#222]">
      <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-[#555] px-3 py-2 border-b border-[#222]">Line Items</p>
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-3 py-2 border-b border-[#1a1a1a] last:border-0">
          {item.image_url && <img src={item.image_url} alt="" className="w-8 h-8 object-cover border border-[#262626] flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#F5F5F5] font-medium truncate">{item.product_name}</p>
            {item.variant_label && <p className="text-[10px] text-[#555]">{item.variant_label}</p>}
          </div>
          <span className="text-[10px] text-[#A1A1A1] font-mono">×{item.quantity}</span>
          <span className="text-xs text-[#F5F5F5] font-mono">${(item.line_total || 0).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_COLORS = {
  pending: '#F59E0B', confirmed: '#00FFDA', processing: '#3B82F6',
  shipped: '#8B5CF6', delivered: '#10B981', cancelled: '#EF4444', refunded: '#6B7280'
};

export default function ManageOrders() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: orders = [] } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: () => base44.entities.Order.list('-created_date', 100),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => qc.invalidateQueries(['adminOrders']),
  });

  const filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span>
            <h1 className="text-2xl font-black text-[#F5F5F5]">Orders</h1>
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#111] border border-[#262626] px-3 py-2 text-xs text-[#A1A1A1] focus:border-[#00FFDA] outline-none">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orders', val: orders.length },
            { label: 'Pending', val: orders.filter(o => o.status === 'pending').length },
            { label: 'Processing', val: orders.filter(o => o.status === 'processing').length },
            { label: 'Revenue', val: `$${orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}` },
          ].map(stat => (
            <div key={stat.label} className="border border-[#262626] bg-[#0D0D0D] p-4">
              <p className="text-xs font-mono text-[#555] uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-[#F5F5F5] mt-1">{stat.val}</p>
            </div>
          ))}
        </div>

        <div className="border border-[#262626] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] bg-[#0D0D0D]">
                {['','Order','Customer','Date','Total','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className="border-b border-[#1a1a1a] hover:bg-[#0D0D0D]">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className="text-[#555] hover:text-[#00FFDA]">
                        {expanded === order.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[#F5F5F5] font-mono text-xs">{order.order_number || order.id.slice(-8)}</td>
                    <td className="px-4 py-3">
                      <p className="text-[#F5F5F5] text-xs">{order.customer_name || '—'}</p>
                      <p className="text-[#555] text-[10px]">{order.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#555]">
                      {order.created_date ? format(new Date(order.created_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#F5F5F5] font-mono text-xs">${(order.total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={e => update.mutate({ id: order.id, data: { status: e.target.value } })}
                        className="bg-transparent text-[10px] font-mono uppercase border px-2 py-1 outline-none cursor-pointer"
                        style={{ color: STATUS_COLORS[order.status], borderColor: STATUS_COLORS[order.status] + '44' }}
                      >
                        {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s} style={{ color: '#F5F5F5', background: '#111' }}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!order.tracking_number && (
                          <button
                            onClick={() => {
                              const tn = prompt('Enter tracking number:');
                              if (tn) update.mutate({ id: order.id, data: { tracking_number: tn, status: 'shipped' } });
                            }}
                            className="text-[10px] font-mono text-[#555] hover:text-[#00FFDA] uppercase tracking-wider"
                          >Add Tracking</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr className="border-b border-[#1a1a1a]">
                      <td colSpan={7} className="px-8 py-4 bg-[#0D0D0D]">
                        <div className="grid grid-cols-2 gap-6 text-xs">
                        <div className="space-y-1 text-[#A1A1A1]">
                          <p className="font-mono text-[#555] uppercase tracking-wider mb-2">Shipping</p>
                          <p>{order.shipping_name}</p>
                          <p>{order.shipping_address_line1}</p>
                          {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                          <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
                        </div>
                        <div className="space-y-1 text-[#A1A1A1]">
                          <p className="font-mono text-[#555] uppercase tracking-wider mb-2">Order Summary</p>
                          <p>Subtotal: ${(order.subtotal || 0).toFixed(2)}</p>
                          <p>Shipping: ${(order.shipping_amount || 0).toFixed(2)}</p>
                          <p>Tax: ${(order.tax_amount || 0).toFixed(2)}</p>
                          {order.discount_amount > 0 && <p>Discount: -${order.discount_amount.toFixed(2)}</p>}
                          <p className="text-[#F5F5F5] font-bold pt-1 border-t border-[#262626]">Total: ${(order.total || 0).toFixed(2)}</p>
                          {order.tracking_number && <p className="text-[#00FFDA]">Tracking: {order.tracking_number}</p>}
                        </div>
                        </div>
                        <OrderLineItems orderId={order.id} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-[#555] text-sm">No orders found.</div>}
        </div>
      </div>
    </PageShell>
  );
}