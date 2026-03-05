import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-green-900/60 text-green-300',
  revoked: 'bg-red-900/60 text-red-300',
  expired: 'bg-gray-700 text-gray-400',
  pending: 'bg-yellow-900/60 text-yellow-300',
};

export default function MyCredentialsTab({ mediaUser }) {
  const [activeOnly, setActiveOnly] = useState(false);

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['myMediaCredentials', mediaUser?.id],
    queryFn: () => base44.entities.MediaCredential.filter({ holder_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
    select: (data) => [...data].sort((a, b) => new Date(b.issued_at || b.created_date) - new Date(a.issued_at || a.created_date)),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['eventsForMediaApply'],
    queryFn: () => base44.entities.Event.list(),
    enabled: !!mediaUser,
  });
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracksForMediaApply'],
    queryFn: () => base44.entities.Track.list(),
    enabled: !!mediaUser,
  });
  const { data: seriesList = [] } = useQuery({
    queryKey: ['seriesForMediaApply'],
    queryFn: () => base44.entities.Series.list(),
    enabled: !!mediaUser,
  });

  const now = new Date();
  const getDisplayStatus = (cred) => {
    if (cred.status === 'active' && cred.expires_at && new Date(cred.expires_at) < now) return 'expired';
    return cred.status;
  };

  const getScopeName = (cred) => {
    if (cred.scope_entity_type === 'event') return events.find(e => e.id === cred.scope_entity_id)?.name;
    if (cred.scope_entity_type === 'track') return tracks.find(t => t.id === cred.scope_entity_id)?.name;
    if (cred.scope_entity_type === 'series') return seriesList.find(s => s.id === cred.scope_entity_id)?.name;
    return cred.scope_entity_id?.slice(0, 8);
  };

  const displayed = activeOnly ? credentials.filter(c => getDisplayStatus(c) === 'active') : credentials;

  if (!mediaUser) return (
    <div className="text-center py-16 text-gray-600">
      <p className="text-sm">Complete your profile to view credentials.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">My Credentials</h2>
          <p className="text-gray-500 text-sm">{credentials.length} total</p>
        </div>
        <Button size="sm" variant="outline" className={`h-7 px-3 text-xs border-gray-700 ${activeOnly ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
          onClick={() => setActiveOnly(a => !a)}>
          Active Only
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : displayed.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <Shield className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">{activeOnly ? 'No active credentials.' : 'No credentials issued yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(cred => {
            const displayStatus = getDisplayStatus(cred);
            return (
              <Card key={cred.id} className="bg-[#171717] border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-medium text-sm truncate">{getScopeName(cred)}</p>
                        <Badge className={STATUS_COLORS[displayStatus] || 'bg-gray-700 text-gray-300'}>{displayStatus}</Badge>
                      </div>
                      <p className="text-gray-400 text-xs">{cred.scope_entity_type} • {cred.access_level?.replace(/_/g, ' ')}</p>
                      {cred.roles?.length > 0 && <p className="text-gray-500 text-xs mt-0.5">{cred.roles.join(', ')}</p>}
                    </div>
                    <div className="text-right text-xs shrink-0">
                      {cred.issued_at && <p className="text-gray-500">Issued: {new Date(cred.issued_at).toLocaleDateString()}</p>}
                      {cred.expires_at && <p className={displayStatus === 'expired' ? 'text-red-400' : 'text-gray-500'}>Expires: {new Date(cred.expires_at).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  {cred.notes && <p className="text-gray-600 text-xs mt-2 border-t border-gray-800 pt-2">{cred.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}