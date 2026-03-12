import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function CodeInputTab({ user }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!code || code.length !== 8) {
      setError('Please enter an 8-digit access code');
      return;
    }

    if (!user?.id || !user?.email) {
      setError('You must be signed in to redeem a code');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess(null);

    const result = await base44.functions.invoke('redeemEntityAccessCode', {
      user_id: user.id,
      user_email: user.email,
      code,
    });

    const data = result?.data;

    if (!data?.ok) {
      setError(data?.error || 'Invalid or expired access code');
      setIsVerifying(false);
      return;
    }

    setSuccess({
      entity_name: data.entity_name || data.entity_type,
      entity_type: data.entity_type,
      role: data.role,
      message: data.message,
    });

    setCode('');

    // Invalidate affected queries so Profile and Dashboard reflect the new access
    queryClient.invalidateQueries({ queryKey: ['myCollaborations', user.id] });
    queryClient.invalidateQueries({ queryKey: ['myInvitations', user.email] });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    queryClient.invalidateQueries({ queryKey: ['resolvedEntities', user.id] });
    queryClient.invalidateQueries({ queryKey: ['entityCollaborators', user.email] });
    queryClient.invalidateQueries({ queryKey: ['myOperationLogs', user.email] });

    setIsVerifying(false);
    setTimeout(() => setSuccess(null), 8000);
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="code" className="text-sm font-medium">8-Digit Access Code</Label>
        <Input
          id="code"
          type="text"
          maxLength="8"
          placeholder="00000000"
          value={code}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
            setCode(val);
            setError('');
          }}
          className="mt-2 text-center text-2xl tracking-widest font-mono"
        />
      </div>

      {error && (
        <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium">{success.message || 'Access granted!'}</p>
            <p>{success.entity_name} linked as <span className="font-semibold">{success.role}</span></p>
          </div>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isVerifying || code.length !== 8}
        className="w-full bg-[#232323] hover:bg-black"
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          'Redeem Code'
        )}
      </Button>
    </div>
  );
}