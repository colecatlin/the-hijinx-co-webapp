import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FlaskConical, Paperclip, ExternalLink, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const STATUS_COLORS = {
  generated:         'bg-blue-100 text-blue-700',
  reviewed:          'bg-green-100 text-green-700',
  attached_to_draft: 'bg-teal-100 text-teal-700',
};

const SOURCE_COLORS = {
  recommendation: 'bg-violet-100 text-violet-700',
  narrative_arc:  'bg-yellow-100 text-yellow-700',
  trend_cluster:  'bg-orange-100 text-orange-700',
  driver:         'bg-blue-100 text-blue-700',
  team:           'bg-indigo-100 text-indigo-700',
  story:          'bg-teal-100 text-teal-700',
};

export default function AssignedPackets({ packets, onUpdated }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});
  const [attachInputs, setAttachInputs] = useState({});

  const markReviewed = async (packetId) => {
    setLoading(l => ({ ...l, [packetId]: 'review' }));
    await base44.entities.StoryResearchPacket.update(packetId, { status: 'reviewed' });
    toast.success('Marked reviewed');
    onUpdated?.();
    setLoading(l => ({ ...l, [packetId]: null }));
  };

  const attachToDraft = async (packetId) => {
    const storyId = attachInputs[packetId]?.trim();
    if (!storyId) return;
    setLoading(l => ({ ...l, [packetId]: 'attach' }));
    try {
      const res = await base44.functions.invoke('generateStoryResearchPacket', {
        action: 'attach_to_draft',
        packet_id: packetId,
        story_id: storyId,
      });
      if (res.data?.success) {
        toast.success('Attached to draft');
        setAttachInputs(v => ({ ...v, [packetId]: '' }));
        onUpdated?.();
      } else {
        toast.error(res.data?.error ?? 'Failed to attach');
      }
    } catch {
      toast.error('Failed to attach');
    }
    setLoading(l => ({ ...l, [packetId]: null }));
  };

  if (!packets.length) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
        <FlaskConical className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-400">No research packets assigned to you.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {packets.map(packet => (
        <div key={packet.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 text-xs rounded capitalize ${SOURCE_COLORS[packet.source_type] ?? 'bg-gray-100 text-gray-500'}`}>
                {packet.source_type?.replace(/_/g, ' ')}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[packet.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {packet.status?.replace(/_/g, ' ')}
              </span>
            </div>
            {packet.generated_at && (
              <span className="text-[11px] text-gray-400 shrink-0">
                {formatDistanceToNow(new Date(packet.generated_at), { addSuffix: true })}
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1">{packet.title}</h3>
          {packet.source_title && packet.source_title !== packet.title && (
            <p className="text-xs text-gray-500 mb-1">Source: {packet.source_title}</p>
          )}
          {packet.summary && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{packet.summary}</p>
          )}

          {packet.linked_draft_story_id && (
            <p className="text-xs text-teal-600 font-mono mb-2">📎 Draft: {packet.linked_draft_story_id}</p>
          )}

          {/* Key talking points preview */}
          {packet.key_talking_points?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-2.5 mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Key Talking Points</p>
              <ul className="space-y-1">
                {packet.key_talking_points.slice(0, 3).map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="text-gray-400 shrink-0">•</span>
                    <span className="line-clamp-1">{pt}</span>
                  </li>
                ))}
                {packet.key_talking_points.length > 3 && (
                  <li className="text-[10px] text-gray-400">+{packet.key_talking_points.length - 3} more…</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={() => navigate('/management/editorial/research-packets')}>
              <ExternalLink className="w-3 h-3" /> Open Packet
            </Button>
            {packet.status !== 'reviewed' && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                disabled={!!loading[packet.id]}
                onClick={() => markReviewed(packet.id)}>
                {loading[packet.id] === 'review' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Mark Reviewed
              </Button>
            )}
            {!packet.linked_draft_story_id && (
              <div className="flex gap-1.5 w-full mt-1">
                <Input
                  value={attachInputs[packet.id] ?? ''}
                  onChange={e => setAttachInputs(v => ({ ...v, [packet.id]: e.target.value }))}
                  placeholder="Paste draft Story ID to attach…"
                  className="h-7 text-xs font-mono flex-1"
                />
                <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700"
                  disabled={!attachInputs[packet.id] || !!loading[packet.id]}
                  onClick={() => attachToDraft(packet.id)}>
                  {loading[packet.id] === 'attach' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                  Attach
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}