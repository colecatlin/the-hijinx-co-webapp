import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, PenTool, Palette, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const services = [
  { icon: PenTool, name: 'Writing', desc: 'Editorial, copywriting, brand voice, and content strategy.' },
  { icon: Palette, name: 'Design', desc: 'Brand identity, print, digital, and environmental design.' },
  { icon: Camera, name: 'Photo & Video', desc: 'Production, post-production, motion graphics, and documentation.' },
];

const budgetRanges = ['Under $1,000', '$1,000 - $5,000', '$5,000 - $15,000', '$15,000+'];

export default function CreativeServices() {
  const [form, setForm] = useState({ name: '', email: '', company: '', service_type: '', budget_range: '', description: '', timeline: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.CreativeInquiry.create(form);
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <PageShell>
      {/* Hero */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase">Creative Services</span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mt-3 max-w-3xl">We make things.</h1>
          <p className="text-gray-400 mt-4 max-w-lg">Writing, design, and production from the Hijinx creative team.</p>
        </div>
        <div className="h-1 bg-gradient-to-r from-[#E5FF00] via-white to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-20">
          {services.map((s, i) => (
            <motion.div key={s.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="border border-gray-200 p-8 hover:border-[#0A0A0A] transition-colors">
              <s.icon className="w-5 h-5 text-gray-400 mb-6" />
              <h3 className="font-bold text-lg">{s.name}</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Inquiry form */}
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight mb-2">Start a Project</h2>
          <p className="text-sm text-gray-400 mb-8">Tell us what you're working on.</p>

          {submitted ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center mb-4"><Check className="w-5 h-5 text-white" /></div>
              <h3 className="text-xl font-bold">Inquiry Submitted</h3>
              <p className="text-sm text-gray-400 mt-2">We'll review and get back to you shortly.</p>
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
                <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Company</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded-none border-gray-200" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Service</Label>
                  <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                    <SelectTrigger className="rounded-none"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Writing">Writing</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Photo and Video">Photo & Video</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Budget</Label>
                  <Select value={form.budget_range} onValueChange={(v) => setForm({ ...form, budget_range: v })}>
                    <SelectTrigger className="rounded-none"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {budgetRanges.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Project Description</Label>
                <Textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-none border-gray-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Timeline</Label>
                <Input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder="e.g., 4 weeks" className="rounded-none border-gray-200" />
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-none bg-[#0A0A0A] hover:bg-[#262626] h-12 text-xs tracking-wider uppercase font-medium">
                {loading ? 'Submitting...' : 'Send Inquiry'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}