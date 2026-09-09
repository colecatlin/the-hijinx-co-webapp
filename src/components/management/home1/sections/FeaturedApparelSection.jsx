import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SectionPanel, { SubSection } from '../../shared/SectionPanel';
import CTAEditor from '../../shared/CTAEditor';
import MediaSelector from '../../shared/MediaSelector';
import ScheduleControl from '../../shared/ScheduleControl';

export default function FeaturedApparelSection({ value = {}, onChange }) {
  const v = value;
  const set = (field, val) => onChange({ ...v, [field]: val });

  return (
    <SectionPanel
      title="7. Featured Apparel"
      enabled={v.enabled ?? true}
      onEnabledChange={(val) => set('enabled', val)}
    >
      <SubSection label="Content">
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Section label</Label>
          <Input value={v.section_label || ''} onChange={(e) => set('section_label', e.target.value)} className="h-8 text-xs" />
        </div>
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

      <SubSection label="Media">
        <MediaSelector
          label="Lifestyle image"
          value={{ url: v.lifestyle_image || '', desktop_position: v.desktop_image_position || 'center center', mobile_position: v.mobile_image_position || 'center center' }}
          onChange={(m) => onChange({ ...v, lifestyle_image: m.url, desktop_image_position: m.desktop_position, mobile_image_position: m.mobile_position })}
        />
      </SubSection>

      <SubSection label="Shopify products (Shopify remains authoritative)">
        <div className="flex items-center gap-2">
          <Select value={v.product_mode || 'newest'} onValueChange={(val) => set('product_mode', val)}>
            <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest products</SelectItem>
              <SelectItem value="collection">By collection</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {v.product_mode === 'collection' && (
          <div>
            <Label className="text-xs text-foreground-quiet mb-1 block">Shopify collection handle</Label>
            <Input value={v.shopify_collection_handle || ''} onChange={(e) => set('shopify_collection_handle', e.target.value)} className="h-8 text-xs" placeholder="e.g. featured-drop" />
          </div>
        )}
        <div>
          <Label className="text-xs text-foreground-quiet mb-1 block">Product display count (desktop: 3 columns × N rows)</Label>
          <Input type="number" min={1} max={12} value={v.product_display_count ?? 6} onChange={(e) => set('product_display_count', parseInt(e.target.value) || 6)} className="h-8 text-xs w-24" />
          <p className="text-[10px] text-foreground-quiet mt-1">Default 6 (3×2). Changing this does not break the frontend grid.</p>
        </div>
      </SubSection>

      <SubSection label="CTA">
        <CTAEditor ctaLabel="Shop All CTA" value={v.shop_all_cta} onChange={(val) => set('shop_all_cta', val)} />
      </SubSection>

      <SubSection label="Schedule">
        <ScheduleControl value={v.schedule} onChange={(val) => set('schedule', val)} />
      </SubSection>
    </SectionPanel>
  );
}