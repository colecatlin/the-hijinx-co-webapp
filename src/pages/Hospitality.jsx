import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '../components/shared/PageShell';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Hotel, Users, Check } from 'lucide-react';

export default function Hospitality() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Hospitality Staffing Inquiry', message: '' });
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
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Hijinx Hospitality</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">Service. Staffing. Excellence.</h1>
          <p className="text-gray-400 mt-4 max-w-lg">Hospitality staffing and event services.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          <div className="border border-gray-200 p-8">
            <Hotel className="w-5 h-5 text-gray-400 mb-4" />
            <h3 className="font-bold">Hospitality Services</h3>
            <p className="text-sm text-gray-500 mt-2">End-to-end hospitality management for events and venues.</p>
          </div>
          <div className="border border-gray-200 p-8">
            <Users className="w-5 h-5 text-gray-400 mb-4" />
            <h3 className="font-bold">Staffing</h3>
            <p className="text-sm text-gray-500 mt-2">Trained, reliable staff for events of any size.</p>
          </div>
        </div>

        <div className="max-w-xl">
          <h2 className="text-2xl font-black tracking-tight mb-2">Staffing Inquiry</h2>
          <p className="text-sm text-gray-400 mb-8">Tell us about your event or staffing needs.</p>

          {submitted ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center mb-4"><Check className="w-5 h-5 text-white" /></div>
              <h3 className="text-xl font-bold">Inquiry Sent</h3>
              <p className="text-sm text-gray-400 mt-2">We'll be in touch.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Details</Label>
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