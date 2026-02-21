import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Megaphone, LayoutGrid, Mail } from 'lucide-react';

const placements = [
  { icon: LayoutGrid, title: 'Homepage Feature', desc: 'Prime placement on the Hijinx homepage grid.', value: 'homepage' },
  { icon: Megaphone, title: 'Outlet Sponsorship', desc: 'Category or issue-level sponsorship in The Outlet.', value: 'outlet' },
  { icon: Mail, title: 'Newsletter Placement', desc: 'Reach our subscriber base directly.', value: 'newsletter' },
];

export default function OutletAdvertising() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Advertising Inquiry', message: '', ad_type: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdTypeSelect = (adType) => {
    setForm({ ...form, ad_type: adType });
    document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.ContactMessage.create(form);
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="The Outlet"
          title="Advertise With Us"
          subtitle="Put your brand in front of a dedicated audience across motorsports, culture, and lifestyle."
        />

        {/* Placements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {placements.map((p) => (
            <button
              key={p.title}
              onClick={() => handleAdTypeSelect(p.value)}
              className={`border p-6 transition-all text-left cursor-pointer ${
                form.ad_type === p.value
                  ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                  : 'border-gray-200 hover:border-[#0A0A0A]'
              }`}
            >
              <p.icon className={`w-5 h-5 mb-4 ${form.ad_type === p.value ? 'text-white' : 'text-gray-400'}`} />
              <h3 className="font-bold text-sm">{p.title}</h3>
              <p className={`text-xs mt-2 ${form.ad_type === p.value ? 'text-gray-300' : 'text-gray-500'}`}>{p.desc}</p>
            </button>
          ))}
        </div>

        {/* Contact form */}
        <div className="max-w-xl" id="form-section">
          <h2 className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase mb-6">Get in touch</h2>
          {submitted ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center mb-4">
                <Check className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">Message Sent</h3>
              <p className="text-sm text-gray-400 mt-2">We'll be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Name</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none border-gray-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Email</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-none border-gray-200" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Message</Label>
                <Textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-none border-gray-200" />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-none bg-[#0A0A0A] hover:bg-[#262626] h-12 text-xs tracking-wider uppercase font-medium">
                {loading ? 'Sending...' : 'Send Inquiry'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}