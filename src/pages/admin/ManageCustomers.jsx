import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';

export default function ManageCustomers() {
  const { data: customers = [] } = useQuery({
    queryKey: ['adminCustomers'],
    queryFn: () => base44.entities.Customer.list('-created_date', 100),
  });

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1">
            <span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span>
            <h1 className="text-2xl font-black text-[#F5F5F5]">Customers</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-[#262626] bg-[#0D0D0D] p-4">
            <p className="text-xs font-mono text-[#555] uppercase tracking-wider">Total Customers</p>
            <p className="text-2xl font-black text-[#F5F5F5] mt-1">{customers.length}</p>
          </div>
          <div className="border border-[#262626] bg-[#0D0D0D] p-4">
            <p className="text-xs font-mono text-[#555] uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-black text-[#F5F5F5] mt-1">${customers.reduce((s, c) => s + (c.total_spent || 0), 0).toFixed(2)}</p>
          </div>
          <div className="border border-[#262626] bg-[#0D0D0D] p-4">
            <p className="text-xs font-mono text-[#555] uppercase tracking-wider">Avg. Order Value</p>
            <p className="text-2xl font-black text-[#F5F5F5] mt-1">
              ${customers.length > 0 ? (customers.reduce((s, c) => s + (c.total_spent || 0), 0) / Math.max(customers.reduce((s, c) => s + (c.total_orders || 0), 0), 1)).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        <div className="border border-[#262626] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#262626] bg-[#0D0D0D]">
                {['Name', 'Email', 'Orders', 'Spent', 'Joined', 'Tags'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-[#555] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-[#1a1a1a] hover:bg-[#0D0D0D]">
                  <td className="px-4 py-3 text-[#F5F5F5] text-xs">{c.first_name} {c.last_name}</td>
                  <td className="px-4 py-3 text-[#A1A1A1] text-xs">{c.email}</td>
                  <td className="px-4 py-3 text-xs text-[#A1A1A1] font-mono">{c.total_orders || 0}</td>
                  <td className="px-4 py-3 text-xs text-[#F5F5F5] font-mono">${(c.total_spent || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-[#555]">
                    {c.created_date ? format(new Date(c.created_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.map(t => (
                        <span key={t} className="text-[9px] font-mono text-[#555] border border-[#262626] px-1.5 py-0.5 uppercase">{t}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <div className="text-center py-12 text-[#555] text-sm">No customers yet.</div>}
        </div>
      </div>
    </PageShell>
  );
}