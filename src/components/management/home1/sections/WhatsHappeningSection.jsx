import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import ScheduleControl from '../../shared/ScheduleControl';

const SOURCE_KEYS = ['INDEX46', 'RACECORE', 'HIJINX', 'OUTLET', 'MARKETPLACE', 'COMMUNITY'];

export default function WhatsHappeningSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  const updateSource = (idx, field, val) => {
    const sources = [...(v.sources || [])];
    sources[idx] = { ...sources[idx], [field]: val };
    set('sources', sources);
  };

  return (
    <SectionPanel
      title="5. What's Happening at HIJINX"
      enabled={v.enabled ?? true}
      onEnabledChange={(val) => set('enabled', val)}
    >
      <SubSection label="Content">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Eyebrow</Label>
          <Input value={v.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Headline</Label>
          <Input value={v.headline || ''} onChange={(e) => set('headline', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Supporting copy</Label>
          <Input value={v.supporting_copy || ''} onChange={(e) => set('supporting_copy', e.target.value)} className="h-8 text-xs" />
        </div>
      </SubSection>

      <SubSection label="Display">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Display limit</Label>
          <Input type="number" min={1} max={12} value={v.display_limit ?? 5} onChange={(e) => set('display_limit', parseInt(e.target.value) || 5)} className="h-8 text-xs w-24" />
        </div>
      </SubSection>

      <SubSection label="Sources (enable / priority order)">
        <div className="space-y-1.5">
          {(v.sources || []).map((source, idx) => (
            <div key={source.key} className="flex items-center gap-3 p-2 rounded-lg border border-divider">
              <Switch checked={source.enabled ?? true} onCheckedChange={(val) => updateSource(idx, 'enabled', val)} />
              <span className="text-xs font-mono font-bold text-foreground w-28">{source.key}</span>
              <Label className="text-xs text-foreground-quiet">Priority</Label>
              <Input
                type="number"
                min={1}
                value={source.priority ?? idx + 1}
                onChange={(e) => updateSource(idx, 'priority', parseInt(e.target.value) || 1)}
                className="h-8 text-xs w-20"
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-foreground-quiet italic">RaceCore appears as a content source consuming existing ActivityFeed data only — no RaceCore management controls.</p>
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}