import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image, Upload, X, Check } from 'lucide-react';

/**
 * EntityImagePanel — lightweight admin image manager
 * 
 * Props:
 *   entity        - the entity object
 *   onSave        - async fn({ hero_image_url, card_image_url }) => void
 *   heroLabel     - optional label for hero field (default "Hero / Banner Image")
 *   cardLabel     - optional label for card field (default "Card / Featured Image")
 */
export default function EntityImagePanel({ entity, onSave, heroLabel = 'Hero / Banner Image', cardLabel = 'Card / Featured Image' }) {
  const [heroUrl, setHeroUrl] = useState(entity?.hero_image_url || '');
  const [cardUrl, setCardUrl] = useState(entity?.card_image_url || '');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleUpload(field, file) {
    const setter = field === 'hero' ? setUploadingHero : setUploadingCard;
    setter(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    if (field === 'hero') setHeroUrl(file_url);
    else setCardUrl(file_url);
    setter(false);
  }

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

      {[
        { field: 'hero', label: heroLabel, url: heroUrl, setUrl: setHeroUrl, uploading: uploadingHero },
        { field: 'card', label: cardLabel, url: cardUrl, setUrl: setCardUrl, uploading: uploadingCard },
      ].map(({ field, label, url, setUrl, uploading }) => (
        <div key={field} className="space-y-2">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>

          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Paste image URL..."
              className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <label className="cursor-pointer flex items-center gap-1 px-3 py-2 text-xs font-medium border border-gray-300 rounded bg-white hover:bg-gray-100 transition-colors whitespace-nowrap">
              {uploading ? (
                <span className="text-gray-400">Uploading...</span>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </>
              )}
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={e => e.target.files?.[0] && handleUpload(field, e.target.files[0])} />
            </label>
            {url && (
              <button onClick={() => setUrl('')} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {url && (
            <div className="relative rounded overflow-hidden border border-gray-200 bg-gray-100" style={{ height: field === 'hero' ? 160 : 100 }}>
              <img src={url} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-black/60 text-white rounded">
                {field === 'hero' ? 'Hero' : 'Card'}
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
      >
        {saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Images'}
      </button>
    </div>
  );
}