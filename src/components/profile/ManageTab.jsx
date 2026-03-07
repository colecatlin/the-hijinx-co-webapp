import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

function OwnerCodeCell({ collaborator }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState(collaborator.access_code || '');

  const ensureCode = async () => {
    if (code) return code;
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('ensureEntityOwnerAccessCode', {
      entity_type: collaborator.entity_type,
      entity_id: collaborator.entity_id,
    });
    const data = res?.data;
    if (data?.error || res?.status >= 400) {
      setError(data?.error || 'Failed to generate code');
      setLoading(false);
      return null;
    }
    const newCode = data?.collaborator?.access_code || '';
    setCode(newCode);
    queryClient.invalidateQueries({ queryKey: ['entityCollaborators'] });
    setLoading(false);
    return newCode;
  };

  const handleCopy = async () => {
    const c = await ensureCode();
    if (!c) return;
    navigator.clipboard.writeText(c);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;

  if (error) return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="w-3 h-3" /> {error}
    </span>
  );

  return (
    <div className="flex items-center gap-2">
      {code ? (
        <>
          <span className="font-mono text-sm tracking-widest text-gray-700">{code}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={ensureCode}
        >
          <RefreshCw className="w-3 h-3" /> Generate Code
        </Button>
      )}
    </div>
  );
}

export default function ManageTab({ user }) {
  const navigate = useNavigate();

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ['entityCollaborators', user?.email],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const ownerCollabs = collaborators.filter(c => c.role === 'owner');

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (ownerCollabs.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        You don't own any entities yet. Owner access codes appear here once you have owner-level access to a Driver, Team, Track, or Series.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ownerCollabs.map((collaborator) => (
        <div
          key={collaborator.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm truncate">{collaborator.entity_name}</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">{collaborator.entity_type}</Badge>
              <Badge className="text-xs bg-[#232323] text-white flex-shrink-0">owner</Badge>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Share this code with editors:</p>
              <OwnerCodeCell collaborator={collaborator} />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 text-xs"
            onClick={() => navigate(createPageUrl('MyDashboard'))}
          >
            Open Dashboard
          </Button>
        </div>
      ))}
    </div>
  );
}