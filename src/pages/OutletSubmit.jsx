import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

const categories = ['Racing', 'Culture', 'Business', 'Gear', 'Travel', 'Opinion', 'Photo'];

export default function OutletSubmit() {
  const [form, setForm] = useState({ name: '', email: '', title: '', category: '', pitch: '', writing_sample_url: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.StorySubmission.create(form);
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader
          label="The Outlet"
          title="Submit a Story"
          subtitle="We're always looking for new voices. Pitch us your story idea below."
        />

        {submitted ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center mb-4">
              <Check className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Submission Received</h3>
            <p className="text-sm text-gray-400 mt-2">We'll review your pitch and get back to you.</p>
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
              <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Story Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-none border-gray-200 focus:border-[#0A0A0A]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Your Pitch</Label>
              <Textarea required rows={6} value={form.pitch} onChange={(e) => setForm({ ...form, pitch: e.target.value })} className="rounded-none border-gray-200 focus:border-[#0A0A0A]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono tracking-wider uppercase text-gray-500">Writing Sample Link (optional)</Label>
              <Input value={form.writing_sample_url} onChange={(e) => setForm({ ...form, writing_sample_url: e.target.value })} className="rounded-none border-gray-200 focus:border-[#0A0A0A]" />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-none bg-[#0A0A0A] hover:bg-[#262626] h-12 text-xs tracking-wider uppercase font-medium">
              {loading ? 'Submitting...' : 'Submit Pitch'}
            </Button>
          </form>
        )}
      </div>
    </PageShell>
  );
}