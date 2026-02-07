import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '../components/shared/PageShell';
import SectionHeader from '../components/shared/SectionHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Megaphone, LayoutGrid, Mail } from 'lucide-react';

const placements = [
  { icon: LayoutGrid, title: 'Homepage Feature', desc: 'Prime placement on the Hijinx homepage grid.' },
  { icon: Megaphone, title: 'Outlet Sponsorship', desc: 'Category or issue-level sponsorship in The Outlet.' },
  { icon: Mail, title: 'Newsletter Placement', desc: 'Reach our subscriber base directly.' },
];

export default function OutletAdvertising() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Advertising Inquiry', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
            <div key={p.title} className="border border-gray-200 p-6 hover:border-[#0A0A0A] transition-colors">
              <p.icon className="w-5 h-5 text-gray-400 mb-4" />
              <h3 className="font-bold text-sm">{p.title}</h3>
              <p className="text-xs text-gray-500 mt-2">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Contact form */}
        <div className="max-w-xl">
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