import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import ScheduleControl from '../../shared/ScheduleControl';

export default function OneBrandSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  const updatePillar = (idx, field, val) => {
    const pillars = [...(v.pillars || [])];
    pillars[idx] = { ...pillars[idx], [field]: val };
    set('pillars', pillars);
  };

  return (
    <SectionPanel
      title="3. One Brand"
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
          <Textarea value={v.headline || ''} onChange={(e) => set('headline', e.target.value)} className="text-xs" rows={2} />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Body copy (line 1)</Label>
          <Textarea value={v.body_copy_1 || ''} onChange={(e) => set('body_copy_1', e.target.value)} className="text-xs" rows={2} />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Body copy (line 2)</Label>
          <Textarea value={v.body_copy_2 || ''} onChange={(e) => set('body_copy_2', e.target.value)} className="text-xs" rows={3} />
        </div>
      </SubSection>

      <SubSection label="Pillars">
        <div className="space-y-2">
          {(v.pillars || []).map((pillar, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end p-2 rounded-lg border border-divider">
              <div>
                <Label className="text-xs text-foreground-quiet mb-1 block">Name</Label>
                <Input value={pillar.name || ''} onChange={(e) => updatePillar(idx, 'name', e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-foreground-quiet mb-1 block">Supporting line</Label>
                <Input value={pillar.desc || ''} onChange={(e) => updatePillar(idx, 'desc', e.target.value)} className="h-8 text-xs" />
              </div>
              <button onClick={() => set('pillars', (v.pillars || []).filter((_, i) => i !== idx))} className="text-foreground-quiet hover:text-danger pb-2">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set('pillars', [...(v.pillars || []), { name: '', desc: '' }])}>
            <Plus className="w-3 h-3 mr-1" /> Add pillar
          </Button>
        </div>
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}