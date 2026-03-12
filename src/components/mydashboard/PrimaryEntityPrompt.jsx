import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, X } from 'lucide-react';
import { setPrimaryEntityOnUser } from '@/components/entities/entityPrimary';
import { invalidateDataGroups } from '@/components/data/invalidationContract';
import { useQueryClient } from '@tanstack/react-query';

const ENTITY_TYPE_COLORS = {
  Driver: 'bg-blue-50 text-blue-700 border-blue-200',
  Team: 'bg-purple-50 text-purple-700 border-purple-200',
  Track: 'bg-green-50 text-green-700 border-green-200',
  Series: 'bg-orange-50 text-orange-700 border-orange-200',
};

/**
 * Shows a prompt to set a primary entity when the user has entity access
 * but hasn't chosen a primary yet.
 */
export default function PrimaryEntityPrompt({ user, entities, onDismiss }) {
  const queryClient = useQueryClient();
  const [setting, setSetting] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!entities || entities.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
    base44?.analytics?.track?.({ eventName: 'primary_entity_prompt_dismissed' });
  };

  const handleSet = async (entity) => {
    setSetting(entity.entity_id);
    await setPrimaryEntityOnUser({ currentUser: user, entityType: entity.entity_type, entityId: entity.entity_id });
    invalidateDataGroups(queryClient, ['profile', 'collaborators']);
    setSetting(null);
    setDismissed(true);
    try { base44?.analytics?.track?.({ eventName: 'primary_entity_set', properties: { entity_type: entity.entity_type } }); } catch {}
  };

  // Single entity: show quick "Set Primary" prompt
  if (entities.length === 1) {
    const entity = entities[0];
    return (
      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Set your primary entity for faster access</p>
              <p className="text-xs text-amber-700 mt-0.5">
                <span className="font-medium">{entity.entity_name}</span>
                <Badge className={`ml-2 text-xs border px-1.5 py-0 ${ENTITY_TYPE_COLORS[entity.entity_type] || ''}`}>
                  {entity.entity_type}
                </Badge>
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" disabled={!!setting}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => handleSet(entity)}>
            <Star className="w-3 h-3" />
            {setting ? 'Setting...' : 'Set Primary'}
          </Button>
          <Button size="sm" variant="ghost" className="text-xs text-amber-600 hover:text-amber-800"
            onClick={handleDismiss}>
            Maybe Later
          </Button>
        </div>
      </div>
    );
  }

  // Multiple entities: lightweight chooser
  return (
    <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">Choose a primary entity for faster access</p>
        </div>
        <button onClick={handleDismiss} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {entities.map(entity => (
          <div key={entity.entity_id} className="flex items-center justify-between px-3 py-2 bg-white border border-amber-100 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-800 truncate">{entity.entity_name}</span>
              <Badge className={`text-xs border px-1.5 py-0 flex-shrink-0 ${ENTITY_TYPE_COLORS[entity.entity_type] || ''}`}>
                {entity.entity_type}
              </Badge>
            </div>
            <Button size="sm" variant="ghost" disabled={!!setting}
              className="text-xs gap-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 flex-shrink-0"
              onClick={() => handleSet(entity)}>
              <Star className="w-3 h-3" />
              {setting === entity.entity_id ? 'Setting...' : 'Set Primary'}
            </Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="ghost" className="text-xs text-amber-500 hover:text-amber-700 p-0 h-auto"
        onClick={handleDismiss}>
        Maybe Later
      </Button>
    </div>
  );
}