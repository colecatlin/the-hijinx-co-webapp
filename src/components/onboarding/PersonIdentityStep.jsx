import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function PersonIdentityStep({ user, onComplete }) {
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [saving, setSaving] = useState(false);

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    await base44.auth.updateMe({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    }).catch(() => {});
    setSaving(false);
    onComplete({ first_name: firstName.trim(), last_name: lastName.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">What's your name?</h2>
        <p className="text-sm text-gray-500 mt-1">This is how you'll appear on the platform.</p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">First Name *</label>
            <Input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isValid && handleSubmit()}
              placeholder="First name"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Last Name *</label>
            <Input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isValid && handleSubmit()}
              placeholder="Last name"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || saving}
        className="w-full bg-[#232323] hover:bg-black text-white gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Continue →'}
      </Button>
    </div>
  );
}