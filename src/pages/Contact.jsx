import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
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
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="Get in Touch"
          title="Contact"
          subtitle="Questions, partnerships, press — reach out."
        />

        {submitted ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center mb-4">
              <Check className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Message Sent</h3>
            <p className="text-sm text-gray-400 mt-2">We'll get back to you as soon as we can.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none border-gray-200 focus:border-[#0A0A0A]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-none border-gray-200 focus:border-[#0A0A0A]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-none border-gray-200 focus:border-[#0A0A0A]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Message</Label>
              <Textarea required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="rounded-none border-gray-200 focus:border-[#0A0A0A]" />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-none bg-[#0A0A0A] hover:bg-[#262626] h-12 text-xs tracking-wider uppercase font-medium">
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        )}
      </div>
    </PageShell>
  );
}