import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function AccessCodeInput() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('verifyAccessCode', { code });
      return data;
    },
    onSuccess: (data) => {
      if (data.entityType === 'Driver') {
        navigate(createPageUrl('DriverEditor', `?id=${data.entityId}`));
      } else if (data.entityType === 'Series') {
        navigate(createPageUrl('SeriesDetail', `?id=${data.entityId}`));
      } else if (data.entityType === 'Team') {
        navigate(createPageUrl('TeamProfile', `?id=${data.entityId}`));
      } else if (data.entityType === 'Track') {
        navigate(createPageUrl('TrackProfile', `?id=${data.entityId}`));
      }
      toast.success(`Access granted to ${data.entity.name || data.entity.first_name}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Invalid access code');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter an access code');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Access Entity
          </CardTitle>
          <CardDescription>Enter your 8-digit access code to edit an entity</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter 8-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength="8"
                disabled={mutation.isPending}
                className="text-center text-lg tracking-widest font-mono"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="w-full bg-gray-900 hover:bg-gray-800 gap-2"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Access Code'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}