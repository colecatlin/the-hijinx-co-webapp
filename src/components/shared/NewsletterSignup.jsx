import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

export default function NewsletterSignup({ source = 'website', dark = false }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await base44.entities.NewsletterSubscriber.create({ email, source });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>
        <Check className="w-4 h-4" />
        <span className="font-mono text-sm">You're in. Stay tuned.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={`flex-1 rounded-none border-0 border-b-2 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm ${
          dark 
            ? 'border-gray-600 text-white placeholder:text-gray-500 focus:border-white' 
            : 'border-gray-300 text-[#0A0A0A] placeholder:text-gray-400 focus:border-[#0A0A0A]'
        }`}
      />
      <Button
        type="submit"
        disabled={loading}
        variant="ghost"
        size="icon"
        className={`rounded-none ${dark ? 'text-white hover:bg-white/10' : 'text-[#0A0A0A] hover:bg-black/5'}`}
      >
        <ArrowRight className="w-4 h-4" />
      </Button>
    </form>
  );
}