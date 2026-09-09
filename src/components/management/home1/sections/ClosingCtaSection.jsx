import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import CTAEditor from '../../shared/CTAEditor';
import MediaSelector from '../../shared/MediaSelector';
import ScheduleControl from '../../shared/ScheduleControl';

export default function ClosingCtaSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  const updateWord = (idx, val) => {
    const words = [...(v.right_side_words || [])];
    words[idx] = val;
    set('right_side_words', words);
  };

  return (
    <SectionPanel
      title="8. Be Part of Something Bigger"
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
          <Label className="text-xs text-foreground-quiet mb-1 block">Accent text (optional)</Label>
          <Input value={v.accent_text || ''} onChange={(e) => set('accent_text', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Supporting line 1</Label>
          <Input value={v.supporting_line_1 || ''} onChange={(e) => set('supporting_line_1', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Supporting line 2</Label>
          <Input value={v.supporting_line_2 || ''} onChange={(e) => set('supporting_line_2', e.target.value)} className="h-8 text-xs" />
        </div>
      </SubSection>

      <SubSection label="Media">
        <MediaSelector
          label="Background image"
          value={{ url: v.background_image || '', desktop_position: v.desktop_image_position || 'center center', mobile_position: v.mobile_image_position || 'center center' }}
          onChange={(m) => onChange({ ...v, background_image: m.url, desktop_image_position: m.desktop_position, mobile_image_position: m.mobile_position })}
        />
      </SubSection>

      <SubSection label="CTA">
        <CTAEditor ctaLabel="CTA" value={v.cta} onChange={(val) => set('cta', val)} />
      </SubSection>

      <SubSection label="Editorial">
        <div className="flex items-center gap-2 mb-2">
          <Switch checked={v.show_right_side_words ?? true} onCheckedChange={(val) => set('show_right_side_words', val)} />
          <span className="text-xs text-foreground-quiet">Show right-side editorial words</span>
        </div>
        {v.show_right_side_words && (
          <div className="grid grid-cols-2 gap-2">
            {(v.right_side_words || []).map((word, idx) => (
              <Input key={idx} value={word} onChange={(e) => updateWord(idx, e.target.value)} className="h-8 text-xs" placeholder={`Word ${idx + 1}`} />
            ))}
          </div>
        )}
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}