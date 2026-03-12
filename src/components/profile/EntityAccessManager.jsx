import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Copy, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  UserPlus, Trash2, ChevronDown, ChevronUp, KeyRound, Users
} from 'lucide-react';

function AccessCodePanel({ collaborator }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(collaborator.access_code || '');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError('');
    const fnName = regenerate ? 'regenerateEntityAccessCode' : 'ensureEntityOwnerAccessCode';
    const res = await base44.functions.invoke(fnName, {
      entity_type: collaborator.entity_type,
      entity_id: collaborator.entity_id,
    });
    const data = res?.data;
    if (data?.error) {
      setError(data.error);
    } else {
      const newCode = data?.access_code || data?.collaborator?.access_code || '';
      setCode(newCode);
      queryClient.invalidateQueries({ queryKey: ['entityCollaborators'] });
      queryClient.invalidateQueries({ queryKey: ['entityCollaboratorsAll', collaborator.entity_id] });
    }
    setLoading(false);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Access Code</span>
        </div>
        <span className="text-xs text-gray-400">Grants editor access when redeemed</span>
      </div>
      {error && (
        <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {code ? (
          <>
            <span className="font-mono text-sm tracking-widest text-gray-800">{code}</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy} title="Copy code">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-gray-500 hover:text-gray-800" onClick={() => handleGenerate(true)} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Regenerate
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleGenerate(false)} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Generate Code
          </Button>
        )}
      </div>
    </div>
  );
}

function InviteForm({ collaborator, onSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const res = await base44.functions.invoke('createEntityInvitation', {
      entity_type: collaborator.entity_type,
      entity_id: collaborator.entity_id,
      entity_name: collaborator.entity_name,
      email: email.trim().toLowerCase(),
      role: 'editor',
    });
    const data = res?.data;
    if (data?.error) {
      setError(data.error);
    } else if (data?.invitation) {
      setSuccess(true);
      setEmail('');
      onSuccess?.();
      setTimeout(() => setSuccess(false), 4000);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <UserPlus className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-semibold text-gray-700">Invite Editor by Email</span>
      </div>
      <form onSubmit={handleInvite} className="flex gap-2">
        <Input
          type="email"
          placeholder="editor@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-8 text-xs flex-1"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || !email.trim()}
          className="h-8 text-xs bg-[#232323] text-white hover:bg-black gap-1 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Invite'}
        </Button>
      </form>
      {success && (
        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Invitation sent! They'll receive a code to redeem.
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

export default function EntityAccessManager({ collaborator, user }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(null);

  const { data: allCollaborators = [], isLoading, refetch } = useQuery({
    queryKey: ['entityCollaboratorsAll', collaborator.entity_id],
    queryFn: () => base44.entities.EntityCollaborator.filter({
      entity_type: collaborator.entity_type,
      entity_id: collaborator.entity_id,
    }),
    enabled: expanded,
    staleTime: 30_000,
  });

  const handleRemove = async (collab) => {
    // Safety: prevent removing the last owner
    const ownerCount = allCollaborators.filter(c => c.role === 'owner').length;
    if (collab.role === 'owner' && ownerCount <= 1) {
      alert('Cannot remove the last owner of this entity.');
      return;
    }
    if (!window.confirm(`Remove ${collab.user_email} from ${collaborator.entity_name}?`)) return;
    setRemoving(collab.id);
    await base44.functions.invoke('removeEntityAccess', {
      collaborator_id: collab.id,
      entity_type: collab.entity_type,
      entity_id: collab.entity_id,
      target_email: collab.user_email,
    });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['resolvedEntities'] });
    queryClient.invalidateQueries({ queryKey: ['entityCollaborators'] });
    setRemoving(null);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{collaborator.entity_name}</span>
          <Badge variant="outline" className="text-xs">{collaborator.entity_type}</Badge>
          <Badge className="text-xs bg-[#232323] text-white">Owner</Badge>
          {collaborator.access_code && !expanded && (
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">{collaborator.access_code}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="p-4 space-y-4 bg-white border-t border-gray-100">
          {/* Access Code */}
          <AccessCodePanel collaborator={collaborator} />

          {/* Current Collaborators */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700">Current Access</span>
              {!isLoading && (
                <span className="text-xs text-gray-400">({allCollaborators.length} {allCollaborators.length === 1 ? 'person' : 'people'})</span>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : allCollaborators.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No collaborators yet.</p>
            ) : (
              <div className="space-y-1.5">
                {allCollaborators.map(collab => {
                  const isMe = collab.user_email === user.email;
                  const isOwnerRole = collab.role === 'owner';
                  return (
                    <div key={collab.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-700 truncate">
                          {collab.user_email}{isMe ? ' (you)' : ''}
                        </span>
                        <Badge className={`text-xs flex-shrink-0 ${isOwnerRole ? 'bg-gray-900 text-white' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                          {collab.role}
                        </Badge>
                      </div>
                      {!isMe && !isOwnerRole && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={removing === collab.id}
                          onClick={() => handleRemove(collab)}
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 ml-2"
                          title="Remove access"
                        >
                          {removing === collab.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invite Form */}
          <InviteForm collaborator={collaborator} onSuccess={() => refetch()} />
        </div>
      )}
    </div>
  );
}