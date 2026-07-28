import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const INTEREST_OPTIONS = [
  { key: 'Marketplace Launch', label: 'Marketplace Launch' },
  { key: 'New Sellers & Vendors', label: 'New Sellers & Vendors' },
  { key: 'Parts & Hardware', label: 'Parts & Hardware' },
  { key: 'Memorabilia Releases', label: 'Memorabilia Releases' },
  { key: 'Team & Builder Gear', label: 'Team & Builder Gear' },
];

export default function MarketplaceStayConnected() {
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const toggleInterest = (key) => {
    setInterests(prev =>
      prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    if (interests.length === 0) {
      setError('Select at least one topic to stay informed about.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the terms and conditions to continue.');
      return;
    }
    setLoading(true);
    try {
      await base44.entities.NewsletterSubscriber.create({
        email,
        source: 'marketplace',
        interests,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-2 py-4">
        <div className="flex items-center gap-2" style={{ color: '#1DA1A1' }}>
          <Check className="w-4 h-4" />
          <span className="font-mono text-sm tracking-wide">You're on the list. We'll be in touch.</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center w-full">
      {/* Email */}
      <div className="w-full max-w-md mb-6">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="rounded-none border-0 border-b-2 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-center placeholder:text-center border-[#333] text-white placeholder:text-[#888] focus:border-[#1DA1A1]"
        />
      </div>

      {/* Interest checklist */}
      <div className="w-full max-w-md mb-6">
        <p className="font-mono text-[9px] tracking-[0.35em] uppercase mb-4 text-center" style={{ color: '#777' }}>
          What do you want to stay informed about?
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {INTEREST_OPTIONS.map(opt => {
            const active = interests.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleInterest(opt.key)}
                className="px-3.5 py-2 text-xs font-medium uppercase tracking-wide transition-all"
                style={{
                  border: `1px solid ${active ? '#1DA1A1' : 'rgba(255,255,255,0.14)'}`,
                  background: active ? 'rgba(29,161,161,0.08)' : 'transparent',
                  color: active ? '#1DA1A1' : 'rgba(255,255,255,0.55)',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Terms */}
      <div className="w-full max-w-md mb-6 flex items-start gap-2.5 justify-center">
        <Checkbox
          id="marketplace-terms"
          checked={termsAccepted}
          onCheckedChange={v => setTermsAccepted(v === true)}
          className="mt-0.5 border-[#444] data-[state=checked]:bg-[#1DA1A1] data-[state=checked]:border-[#1DA1A1] data-[state=checked]:text-[#050505]"
        />
        <label htmlFor="marketplace-terms" className="text-[11px] leading-relaxed text-center" style={{ color: '#888' }}>
          I agree to receive emails from HIJINX and accept the{' '}
          <a
            href="https://www.hijinxco.com/policies/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2" style={{ color: '#1DA1A1' }}
          >
            Terms & Conditions
          </a>
          .
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-4 -mt-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 px-7 py-3.5 text-xs font-black tracking-[0.15em] uppercase transition-all disabled:opacity-50"
        style={{ background: '#1DA1A1', color: '#050505' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#fff'; }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#1DA1A1'; }}
      >
        {loading ? 'Submitting...' : 'Stay Informed'}
        {!loading && <ArrowRight className="w-3.5 h-3.5" />}
      </button>
    </form>
  );
}