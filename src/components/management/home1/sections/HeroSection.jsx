import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import CTAEditor from '../../shared/CTAEditor';
import MediaSelector from '../../shared/MediaSelector';
import ScheduleControl from '../../shared/ScheduleControl';

export default function HeroSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  return (
    <SectionPanel
      title="1. Hero"
      enabled={v.enabled ?? true}
      onEnabledChange={(val) => set('enabled', val)}
    >
      <SubSection label="Content">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Eyebrow</Label>
          <Input value={v.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Headline line 1</Label>
            <Input value={v.headline_line1 || ''} onChange={(e) => set('headline_line1', e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Headline line 2</Label>
            <Input value={v.headline_line2 || ''} onChange={(e) => set('headline_line2', e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Headline line 3</Label>
            <Input value={v.headline_line3 || ''} onChange={(e) => set('headline_line3', e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Accent line (teal treatment)</Label>
          <Input value={v.accent_line || ''} onChange={(e) => set('accent_line', e.target.value)} className="h-8 text-xs" placeholder="TOMORROW." />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Supporting copy</Label>
          <Textarea value={v.supporting_copy || ''} onChange={(e) => set('supporting_copy', e.target.value)} className="text-xs" rows={2} />
        </div>
      </SubSection>

      <SubSection label="Media">
        <MediaSelector
          label="Desktop background"
          value={{ url: v.desktop_media_url || '', desktop_position: v.desktop_image_position || 'center center' }}
          onChange={(m) => onChange({ ...v, desktop_media_url: m.url, desktop_image_position: m.desktop_position })}
        />
        <MediaSelector
          label="Mobile background (optional — falls back to desktop)"
          value={{ url: v.mobile_media_url || '', mobile_position: v.mobile_image_position || 'center center' }}
          onChange={(m) => onChange({ ...v, mobile_media_url: m.url, mobile_image_position: m.mobile_position })}
        />
      </SubSection>

      <SubSection label="CTAs">
        <CTAEditor ctaLabel="Primary CTA" value={v.cta1} onChange={(val) => set('cta1', val)} />
        <CTAEditor ctaLabel="Secondary CTA" value={v.cta2} onChange={(val) => set('cta2', val)} />
      </SubSection>

      <SubSection label="Editorial">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Right-side phrase</Label>
          <Textarea value={v.right_side_phrase || ''} onChange={(e) => set('right_side_phrase', e.target.value)} className="text-xs" rows={2} />
          <div className="flex items-center gap-2 mt-1">
            <Switch checked={v.show_right_side_phrase ?? true} onCheckedChange={(val) => set('show_right_side_phrase', val)} />
            <span className="text-xs text-foreground-quiet">Show right-side phrase</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Bottom editorial text</Label>
          <Input value={v.bottom_editorial || ''} onChange={(e) => set('bottom_editorial', e.target.value)} className="h-8 text-xs" />
          <div className="flex items-center gap-2 mt-1">
            <Switch checked={v.show_bottom_editorial ?? true} onCheckedChange={(val) => set('show_bottom_editorial', val)} />
            <span className="text-xs text-foreground-quiet">Show bottom editorial</span>
          </div>
        </div>
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}