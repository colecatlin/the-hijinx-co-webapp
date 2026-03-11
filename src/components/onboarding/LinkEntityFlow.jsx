import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2, KeyRound, AlertCircle } from 'lucide-react';

export default function LinkEntityFlow({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    const res = await base44.functions.invoke('redeemEntityAccessCode', {
      user_id: user.id,
      user_email: user.email,
      code: code.trim(),
    }).catch(err => {
      setError(err?.response?.data?.error || err.message || 'Invalid or expired access code.');
      return null;
    });

    if (!res) { setLoading(false); return; }

    if (res.data?.error) {
      setError(res.data.error);
      setLoading(false);
      return;
    }

    // Set as primary entity if user has none and entity type is a known source entity
    const entityType = res.data?.entity_type;
    const entityId = res.data?.entity_id;
    if (entityType && entityId && !user?.primary_entity_type) {
      await base44.auth.updateMe({
        primary_entity_type: entityType,
        primary_entity_id: entityId,
      }).catch(() => {});
    }

    await queryClient.invalidateQueries();
    setResult(res.data);
    setLoading(false);
  };

  if (result) {
    return (
      <div className="text-center py-10 px-4 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Access Granted!</h3>
          <p className="text-gray-500 text-sm mt-1">
            {result.message || `You now have access to ${result.entity_name || 'this entity'}.`}
          </p>
          {result.role && (
            <p className="text-xs text-gray-400 mt-1">Role: <span className="capitalize font-medium">{result.role}</span></p>
          )}
        </div>
        <Button onClick={() => navigate(createPageUrl('MyDashboard') + '?access_updated=1')} className="bg-[#232323] hover:bg-black text-white">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Enter Access Code</h3>
        <p className="text-sm text-gray-500">
          Enter the 8-digit access code shared by an existing entity owner to gain access.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
          <KeyRound className="w-7 h-7 text-gray-400" />
        </div>
        <Input
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="8-digit code"
          className="text-center text-lg font-mono tracking-widest max-w-xs"
          maxLength={8}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={code.length !== 8 || loading}
        className="w-full bg-[#232323] hover:bg-black text-white"
      >
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Link Entity'}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Access codes are 8 digits and are shared by entity owners from their profile settings.
      </p>
    </div>
  );
}