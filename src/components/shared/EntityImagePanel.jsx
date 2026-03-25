import React, { useState } from 'react';
import { Image, Check } from 'lucide-react';
import MediaPicker from '@/components/shared/MediaPicker';

/**
 * EntityImagePanel — admin image manager using MediaPicker
 *
 * Props:
 *   entity        - the entity object
 *   entityType    - e.g. 'Driver', 'Team', 'Track', 'Series', 'Event'
 *   onSave        - async fn({ hero_image_url, card_image_url }) => void
 *   heroLabel     - optional label for hero field
 *   cardLabel     - optional label for card field
 */
export default function EntityImagePanel({ entity, entityType, onSave, heroLabel = 'Hero / Banner Image', cardLabel = 'Card / Featured Image' }) {
  const [heroUrl, setHeroUrl] = useState(entity?.hero_image_url || '');
  const [cardUrl, setCardUrl] = useState(entity?.card_image_url || '');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await onSave({ hero_image_url: heroUrl || null, card_image_url: cardUrl || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center gap-2 mb-1">
        <Image className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-700">Image Management</span>
      </div>

      <MediaPicker
        value={heroUrl}
        onChange={setHeroUrl}
        entityType={entityType}
        entityId={entity?.id}
        contextType="hero"
        label={heroLabel}
      />

      <MediaPicker
        value={cardUrl}
        onChange={setCardUrl}
        entityType={entityType}
        entityId={entity?.id}
        contextType="card"
        label={cardLabel}
      />

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
      >
        {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Images'}
      </button>
    </div>
  );
}