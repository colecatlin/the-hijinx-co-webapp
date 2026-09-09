import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import MediaSelector from '../../shared/MediaSelector';
import ScheduleControl from '../../shared/ScheduleControl';

const PROTECTED_KEYS = ['SHOP', 'OUTLET', 'INDEX46', 'MARKETPLACE', 'RACECORE', 'COMMUNITY'];

export default function EcosystemSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  const updateTile = (idx, field, val) => {
    const tiles = [...(v.tiles || [])];
    tiles[idx] = { ...tiles[idx], [field]: val };
    set('tiles', tiles);
  };

  return (
    <SectionPanel
      title="4. Explore the HIJINX Ecosystem"
      enabled={v.enabled ?? true}
      onEnabledChange={(val) => set('enabled', val)}
    >
      <SubSection label="Content">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Eyebrow badge</Label>
          <Input value={v.eyebrow_badge || ''} onChange={(e) => set('eyebrow_badge', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Headline</Label>
          <Input value={v.headline || ''} onChange={(e) => set('headline', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Supporting phrase</Label>
          <Textarea value={v.supporting_phrase || ''} onChange={(e) => set('supporting_phrase', e.target.value)} className="text-xs" rows={2} />
        </div>
      </SubSection>

      <SubSection label="Destination tiles (structural keys are protected)">
        <div className="space-y-3">
          {(v.tiles || []).map((tile, idx) => (
            <div key={tile.key} className="p-3 rounded-lg border border-divider space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-mono">{tile.key}</Badge>
                  <span className="text-[10px] text-foreground-quiet">Protected destination</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground-quiet">Enabled</span>
                  <Switch checked={tile.enabled ?? true} onCheckedChange={(val) => updateTile(idx, 'enabled', val)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-foreground-quiet mb-1 block">Title</Label>
                  <Input value={tile.title || ''} onChange={(e) => updateTile(idx, 'title', e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-foreground-quiet mb-1 block">Descriptor (eyebrow)</Label>
                  <Input value={tile.descriptor || ''} onChange={(e) => updateTile(idx, 'descriptor', e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-foreground-quiet mb-1 block">Supporting copy</Label>
                <Input value={tile.support || ''} onChange={(e) => updateTile(idx, 'support', e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-foreground-quiet mb-1 block">CTA label</Label>
                  <Input value={tile.cta_label || ''} onChange={(e) => updateTile(idx, 'cta_label', e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-foreground-quiet mb-1 block">Sort order</Label>
                  <Input type="number" value={tile.sort_order ?? idx} onChange={(e) => updateTile(idx, 'sort_order', parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
              </div>
              <MediaSelector
                label="Tile image"
                value={{ url: tile.image || '' }}
                onChange={(m) => updateTile(idx, 'image', m.url)}
                showPosition={false}
              />
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}