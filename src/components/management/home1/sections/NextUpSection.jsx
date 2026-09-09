import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import CTAEditor from '../../shared/CTAEditor';
import EntitySelector from '../../shared/EntitySelector';
import ScheduleControl from '../../shared/ScheduleControl';

export default function NextUpSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  return (
    <SectionPanel
      title="2. Next Up"
      enabled={v.enabled ?? true}
      onEnabledChange={(val) => set('enabled', val)}
    >
      <SubSection label="Content">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Headline</Label>
          <Input value={v.headline || ''} onChange={(e) => set('headline', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Eyebrow</Label>
          <Input value={v.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className="h-8 text-xs" />
        </div>
      </SubSection>

      <SubSection label="CTA">
        <CTAEditor ctaLabel="View Full Calendar CTA" value={v.view_calendar_cta} onChange={(val) => set('view_calendar_cta', val)} />
      </SubSection>

      <SubSection label="Data">
        <div className="flex items-center justify-between p-2 rounded-lg border border-divider">
          <div className="flex items-center gap-2">
            <Select value={v.mode || 'auto'} onValueChange={(val) => set('mode', val)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={v.mode === 'auto' ? 'default' : 'secondary'} className="text-[9px]">{v.mode === 'auto' ? 'Auto' : 'Pinned'}</Badge>
          </div>
          <span className="text-xs text-foreground-quiet">{v.mode === 'auto' ? 'Auto-pull upcoming events' : 'Pin specific events'}</span>
        </div>
        {v.mode === 'pinned' && (
          <EntitySelector entityType="Event" mode="multi" value={v.pinned_event_ids || []} onChange={(ids) => set('pinned_event_ids', ids)} placeholder="Search events to pin..." />
        )}
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Display limit</Label>
          <Input type="number" min={1} max={20} value={v.display_limit ?? 10} onChange={(e) => set('display_limit', parseInt(e.target.value) || 10)} className="h-8 text-xs w-24" />
        </div>
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}