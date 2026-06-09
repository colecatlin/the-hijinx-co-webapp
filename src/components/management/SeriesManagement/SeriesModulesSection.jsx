/**
 * R9BX — Series Module Settings
 * Allows admins to configure which optional RaceCore modules are enabled per series.
 * Only Governance affects live behavior. All others stored for future use.
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DEFAULT_ENABLED_MODULES, ALL_MODULE_KEYS } from '@/components/racecore/modules/moduleUtils';

const MODULE_LABELS = {
  governance:   { label: 'Governance',   description: 'Race Control, Officials, Incidents, Penalties, Protests, Tech Holds, Grid Approval, Steward Rulings, Session Notes' },
  media:        { label: 'Media',        description: 'Media credentials, assignments, deliverables, and uploads' },
  registration: { label: 'Registration', description: 'Entry registration, check-in, compliance workflows' },
  licensing:    { label: 'Licensing',    description: 'Driver license management (future)' },
  membership:   { label: 'Membership',   description: 'Series membership and subscriptions (future)' },
  commerce:     { label: 'Commerce',     description: 'Entry fees and payments (future)' },
  hospitality:  { label: 'Hospitality',  description: 'Pit passes, hospitality packages (future)' },
  crm:          { label: 'CRM',          description: 'Competitor relationship management (future)' },
  analytics:    { label: 'Analytics',    description: 'Advanced race data analytics (future)' },
};

export default function SeriesModulesSection({ seriesId, isReadOnly = false }) {
  const queryClient = useQueryClient();
  const [enabledModules, setEnabledModules] = useState(DEFAULT_ENABLED_MODULES);

  const { data: seriesRecord } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId,
  });

  useEffect(() => {
    if (seriesRecord) {
      // If field missing, default to DEFAULT_ENABLED_MODULES (backward compat)
      const modules = Array.isArray(seriesRecord.enabled_modules)
        ? seriesRecord.enabled_modules
        : DEFAULT_ENABLED_MODULES;
      setEnabledModules(modules);
    }
  }, [seriesRecord]);

  const updateMutation = useMutation({
    mutationFn: (modules) =>
      base44.entities.Series.update(seriesId, { enabled_modules: modules }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
      toast.success('Module settings saved');
    },
    onError: () => toast.error('Failed to save module settings'),
  });

  const toggleModule = (key) => {
    if (isReadOnly) return;
    setEnabledModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    updateMutation.mutate(enabledModules);
  };

  return (
    <Card className="p-6">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Modules</h3>
          <p className="text-xs text-gray-500 mt-1">
            Enable or disable optional RaceCore modules for this series.
            Core features (Events, Entries, Sessions, Results, Standings, Media records) are always available.
            Only <strong>Governance</strong> currently affects live behavior.
          </p>
        </div>

        <div className="space-y-3">
          {ALL_MODULE_KEYS.map((key) => {
            const { label, description } = MODULE_LABELS[key] || { label: key, description: '' };
            const isActive = enabledModules.includes(key);
            const isGovernance = key === 'governance';

            return (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isActive
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => toggleModule(key)}
                  disabled={isReadOnly}
                  className="mt-0.5 accent-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{label}</span>
                    {isGovernance && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium uppercase tracking-wide">
                        Active
                      </span>
                    )}
                    {!isGovernance && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium uppercase tracking-wide">
                        Future
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
              </label>
            );
          })}
        </div>

        {!Array.isArray(seriesRecord?.enabled_modules) && seriesRecord && (
          <p className="text-xs text-amber-600">
            ⚠ This series has no module configuration. Default modules (Governance, Media, Registration) are active.
            Save to lock in the current selection.
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || isReadOnly}
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Module Settings'}
        </Button>
      </div>
    </Card>
  );
}