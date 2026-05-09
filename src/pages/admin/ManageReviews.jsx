import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Star } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import { format } from 'date-fns';

export default function ManageReviews() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data: reviews = [] } = useQuery({ queryKey: ['adminReviews'], queryFn: () => base44.entities.Review.list('-created_date', 200) });
  const { data: products = [] } = useQuery({ queryKey: ['adminProductsSimple2'], queryFn: () => base44.entities.Product.list('name', 100) });
  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Review.update(id, data),
    onSuccess: () => qc.invalidateQueries(['adminReviews']),
  });

  const filtered = statusFilter ? reviews.filter(r => r.status === statusFilter) : reviews;

  return (
    <PageShell style={{ background: '#050505', color: '#F5F5F5' }}>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/storefront"><ArrowLeft className="w-4 h-4 text-[#555] hover:text-[#00FFDA]" /></Link>
          <div className="flex-1"><span className="font-mono text-[10px] tracking-[0.4em] text-[#00FFDA] uppercase block mb-1">Admin</span><h1 className="text-2xl font-black text-[#F5F5F5]">Reviews</h1></div>
          <div className="flex gap-2">
            {['', 'pending', 'approved', 'rejected'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border transition-all ${statusFilter === s ? 'border-[#00FFDA] text-[#00FFDA]' : 'border-[#262626] text-[#555]'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="border border-[#262626] bg-[#0D0D0D] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'text-[#00FFDA] fill-[#00FFDA]' : 'text-[#333]'}`} />)}
                    </div>
                    <span className="text-xs text-[#555]">{productMap[r.product_id] || 'Unknown Product'}</span>
                    <span className="text-[10px] text-[#333] font-mono">
                      {r.created_date ? format(new Date(r.created_date), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                  {r.title && <p className="text-sm font-bold text-[#F5F5F5] mb-1">{r.title}</p>}
                  {r.body && <p className="text-sm text-[#A1A1A1] leading-relaxed">{r.body}</p>}
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs text-[#555]">By: {r.customer_name || r.customer_email || 'Anonymous'}</span>
                    {r.verified_purchase && <span className="text-[10px] font-mono text-[#00FFDA]">✓ Verified</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-mono uppercase px-2 py-1 border ${r.status === 'approved' ? 'text-[#00FFDA] border-[#00FFDA]/30' : r.status === 'rejected' ? 'text-red-400 border-red-400/30' : 'text-yellow-400 border-yellow-400/30'}`}>
                    {r.status}
                  </span>
                  {r.status !== 'approved' && (
                    <button onClick={() => update.mutate({ id: r.id, data: { status: 'approved' } })}
                      className="w-8 h-8 border border-[#00FFDA]/30 flex items-center justify-center text-[#00FFDA] hover:bg-[#00FFDA]/10 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button onClick={() => update.mutate({ id: r.id, data: { status: 'rejected' } })}
                      className="w-8 h-8 border border-red-400/30 flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-[#555] text-sm">No reviews in this category.</div>}
        </div>
      </div>
    </PageShell>
  );
}