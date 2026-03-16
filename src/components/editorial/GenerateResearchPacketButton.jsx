/**
 * GenerateResearchPacketButton
 *
 * Reusable quick-action button that generates or opens a research packet
 * from any editorial source (recommendation, arc, cluster, etc.).
 *
 * Props:
 *   sourceType  - 'recommendation' | 'narrative_arc' | 'trend_cluster' | etc.
 *   sourceId    - ID of the source record
 *   sourceTitle - Display title of the source
 *   size        - 'sm' | 'xs' (default 'sm')
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FlaskConical, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function GenerateResearchPacketButton({ sourceType, sourceId, sourceTitle, size = 'sm' }) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const fingerprint = `${sourceType}::${sourceId}`;

  // Check if a recent packet exists
  const { data: existingPackets = [], isLoading: checking } = useQuery({
    queryKey: ['research-packet-check', fingerprint],
    queryFn: () => base44.entities.StoryResearchPacket.filter(
      { research_fingerprint: fingerprint }, '-generated_at', 3
    ),
    enabled: !!sourceId,
    staleTime: 30_000,
  });

  const recentPacket = existingPackets.find(p => p.status !== 'archived');
  const hasPacket = !!recentPacket;

  const generate = async (regenerate = false) => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateStoryResearchPacket', {
        source_type: sourceType,
        source_id: sourceId,
        regenerate,
      });
      if (res.data?.success) {
        if (res.data.reused) {
          toast.info('Existing packet found — opening Research Packets');
        } else {
          toast.success('Research packet generated');
        }
        navigate('/management/editorial/research-packets');
      } else {
        toast.error(res.data?.error ?? 'Generation failed');
      }
    } catch {
      toast.error('Failed to generate research packet');
    }
    setGenerating(false);
  };

  const btnClass = size === 'xs'
    ? 'h-7 text-[11px] px-2.5 gap-1'
    : 'h-8 text-xs gap-1.5';

  if (checking) {
    return (
      <Button size="sm" variant="outline" className={`${btnClass} text-gray-400`} disabled>
        <Loader2 className="w-3 h-3 animate-spin" />
      </Button>
    );
  }

  if (generating) {
    return (
      <Button size="sm" variant="outline" className={`${btnClass} text-blue-600 border-blue-200`} disabled>
        <Loader2 className="w-3 h-3 animate-spin" /> Generating…
      </Button>
    );
  }

  if (hasPacket) {
    return (
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline"
          className={`${btnClass} text-teal-700 border-teal-200 hover:bg-teal-50`}
          onClick={() => navigate('/management/editorial/research-packets')}>
          <ExternalLink className="w-3 h-3" /> Open Packet
        </Button>
        <Button size="sm" variant="outline"
          className={`${btnClass} text-gray-500 hover:bg-gray-50`}
          onClick={() => generate(true)}
          title="Regenerate research packet">
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline"
      className={`${btnClass} text-blue-700 border-blue-200 hover:bg-blue-50`}
      onClick={() => generate(false)}>
      <FlaskConical className="w-3 h-3" /> Generate Research Packet
    </Button>
  );
}