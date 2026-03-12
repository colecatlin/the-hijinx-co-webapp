import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/components/utils';

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [step, setStep] = useState('check'); // 'check', 'login', 'verify', 'success'

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlCode = params.get('code');
    if (urlCode) {
      setInvitationCode(urlCode);
      setCode(urlCode);
    }

    if (userLoading) return;

    if (!isAuthenticated) {
      setStep('login');
      setTimeout(() => {
        base44.auth.redirectToLogin(window.location.href);
      }, 1500);
    } else {
      setStep('verify');
      if (urlCode && user && !isVerifying) {
        handleVerifyCode(urlCode);
      }
    }
  }, [isAuthenticated, userLoading, location, user, isVerifying]);

  const handleVerifyCode = async (codeToVerify = code) => {
    if (!codeToVerify || codeToVerify.length !== 8) {
      setVerificationError('Please enter an 8-digit code');
      return;
    }

    setIsVerifying(true);
    setVerificationError('');

    const result = await base44.functions.invoke('redeemEntityAccessCode', {
      user_id: user.id,
      user_email: user.email,
      code: codeToVerify,
    });

    const data = result?.data;

    if (data?.ok) {
      // Invalidate all collaborator and profile queries before navigating
      queryClient.invalidateQueries({ queryKey: ['myCollaborations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['myInvitations', user.email] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['resolvedEntities', user.id] });
      queryClient.invalidateQueries({ queryKey: ['entityCollaborators', user.email] });
      queryClient.invalidateQueries({ queryKey: ['myOperationLogs', user.email] });
      toast.success('Access granted successfully.');
      setStep('success');
      setTimeout(() => {
        navigate(createPageUrl('MyDashboard') + '?access_updated=1');
      }, 2000);
    } else {
      setVerificationError(data?.error || 'Failed to verify code. Please try again.');
      toast.error('Verification failed');
    }

    setIsVerifying(false);
  };

  if (step === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>Redirecting to login...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify Invitation Code</CardTitle>
            <CardDescription>Enter the 8-digit code from your invitation email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Logged in as: <strong>{user?.email}</strong></p>
            </div>

            <div>
              <Label htmlFor="code">Invitation Code</Label>
              <Input
                id="code"
                type="text"
                maxLength="8"
                placeholder="00000000"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setCode(val);
                  setVerificationError('');
                }}
                className="mt-2 text-center text-2xl tracking-widest font-mono"
              />
            </div>

            {verificationError && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{verificationError}</p>
              </div>
            )}

            <Button
              onClick={handleVerifyCode}
              disabled={isVerifying || code.length !== 8}
              className="w-full bg-gray-900 hover:bg-gray-800"
            >
              {isVerifying ? 'Verifying...' : 'Verify Code'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Success!</CardTitle>
            <CardDescription>Your invitation has been accepted</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <p className="text-center text-gray-600">You now have access to manage this entity. Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}