import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import EntityMultiSelect from '@/components/management/EntityMultiSelect';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, Trophy, Users, User, MapPin, Calendar, Newspaper, Save } from 'lucide-react';

// ── Championship Leader Entry ───────────────────────────────────────────────────

function ChampionshipLeadersSection({ entries = [], onChange }) {
  const addEntry = () => {
    onChange([...entries, { class_name: '', driver_name: '', driver_id: '', points: 0, image_url: '' }]);
  };

  const updateEntry = (idx, field, value) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeEntry = (idx) => {
    const updated = [...entries];
    updated.splice(idx, 1);
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold">Championship Leaders</h3>
      </div>
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={idx} className="border rounded-lg p-3 grid grid-cols-2 gap-2 relative">
            <button onClick={() => removeEntry(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
              <X className="w-3.5 h-3.5" />
            </button>
            <div>
              <label className="text-xs text-gray-500">Class Name</label>
              <Input value={entry.class_name || ''} onChange={e => updateEntry(idx, 'class_name', e.target.value)} className="h-7 text-xs mt-0.5" placeholder="e.g. Pro 4" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Driver Name</label>
              <Input value={entry.driver_name || ''} onChange={e => updateEntry(idx, 'driver_name', e.target.value)} className="h-7 text-xs mt-0.5" placeholder="Display name" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Driver ID (optional)</label>
              <Input value={entry.driver_id || ''} onChange={e => updateEntry(idx, 'driver_id', e.target.value)} className="h-7 text-xs mt-0.5 font-mono" placeholder="Driver entity ID" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Points</label>
              <Input type="number" value={entry.points || ''} onChange={e => updateEntry(idx, 'points', Number(e.target.value))} className="h-7 text-xs mt-0.5" placeholder="412" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Background Image URL (optional)</label>
              <Input value={entry.image_url || ''} onChange={e => updateEntry(idx, 'image_url', e.target.value)} className="h-7 text-xs mt-0.5" placeholder="https://..." />
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addEntry}>
          <Plus className="w-3 h-3 mr-1" /> Add Leader Entry
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ManageMotorsportsHome() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['motorsports_home_settings'],
    queryFn: () => base44.entities.MotorsportsHomeSettings.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['live_drivers_mgmt'],
    queryFn: () => base44.entities.Driver.filter({ visibility_status: 'live' }, '-updated_date', 200),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ['live_teams_mgmt'],
    queryFn: () => base44.entities.Team.filter({ visibility_status: 'live' }, '-updated_date', 200),
  });
  const { data: tracks = [] } = useQuery({
    queryKey: ['live_tracks_mgmt'],
    queryFn: () => base44.entities.Track.filter({ visibility_status: 'live' }, '-updated_date', 200),
  });
  const { data: events = [] } = useQuery({
    queryKey: ['upcoming_events_mgmt'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
  });
  const { data: stories = [] } = useQuery({
    queryKey: ['published_stories_mgmt'],
    queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 200),
  });

  const record = settings[0];

  useEffect(() => {
    if (record && !formData) {
      setFormData(record);
    } else if (!record && !formData) {
      setFormData({ name: 'Primary Motorsports Home Settings', is_active: true });
    }
  }, [record]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { id, created_date, updated_date, created_by, ...payload } = data;
      if (id) {
        return base44.entities.MotorsportsHomeSettings.update(id, payload);
      } else {
        return base44.entities.MotorsportsHomeSettings.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motorsports_home_settings'] });
      toast.success('Motorsports Home settings saved');
    },
  });

  if (!formData) return (
    <ManagementLayout currentPage="ManageMotorsportsHome">
      <ManagementShell title="Motorsports Home Settings">
        <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
      </ManagementShell>
    </ManagementLayout>
  );

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const sections = [
    {
      key: 'trending_drivers',
      title: 'Trending Drivers',
      icon: User,
      idsField: 'trending_driver_ids',
      autoField: 'trending_drivers_use_auto',
      autoLabel: 'Auto-sort by competition level',
      entities: drivers,
      placeholder: 'Search live drivers...',
    },
    {
      key: 'top_teams',
      title: 'Top Teams',
      icon: Users,
      idsField: 'top_team_ids',
      autoField: 'top_teams_use_auto',
      autoLabel: 'Auto-sort by trending score',
      entities: teams,
      placeholder: 'Search live teams...',
    },
    {
      key: 'tracks',
      title: 'Tracks Around the World',
      icon: MapPin,
      idsField: 'featured_track_ids',
      autoField: 'tracks_use_auto',
      autoLabel: 'Auto-pull live tracks',
      entities: tracks,
      placeholder: 'Search live tracks...',
    },
    {
      key: 'events',
      title: 'Upcoming Events',
      icon: Calendar,
      idsField: 'featured_event_ids',
      autoField: 'events_use_auto',
      autoLabel: 'Auto-pull upcoming events',
      entities: events,
      placeholder: 'Search events...',
    },
    {
      key: 'from_the_pits',
      title: 'From the Pits',
      icon: Newspaper,
      idsField: 'from_the_pits_story_ids',
      autoField: 'from_the_pits_use_auto',
      autoLabel: 'Auto-pull latest published stories',
      entities: stories,
      placeholder: 'Search published stories...',
    },
  ];

  return (
    <ManagementLayout currentPage="ManageMotorsportsHome">
      <ManagementShell
        title="Motorsports Home Settings"
        subtitle="Control what appears in each section of the Motorsports Home page"
        actions={
          <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save All'}
          </Button>
        }
      >
        <div className="space-y-6">
          {sections.map(({ key, title, icon: Icon, idsField, autoField, autoLabel, entities: sectionEntities, placeholder }) => (
            <Card key={key} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <h2 className="font-semibold text-sm">{title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{autoLabel}</span>
                  <Switch
                    checked={formData[autoField] ?? true}
                    onCheckedChange={(val) => set(autoField, val)}
                  />
                  <Badge variant={formData[autoField] ? 'default' : 'secondary'} className="text-[10px]">
                    {formData[autoField] ? 'Auto' : 'Pinned'}
                  </Badge>
                </div>
              </div>

              {formData[autoField] ? (
                <p className="text-xs text-gray-400 italic">
                  Content is pulled automatically. Toggle off to pin specific entries.
                </p>
              ) : (
                <EntityMultiSelect
                  entities={sectionEntities}
                  selectedIds={formData[idsField] || []}
                  onChange={(ids) => set(idsField, ids)}
                  placeholder={placeholder}
                />
              )}
            </Card>
          ))}

          {/* Championship Leaders */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gray-500" />
                <h2 className="font-semibold text-sm">Championship Leaders</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Auto-pull from synced standings</span>
                <Switch
                  checked={formData.championship_leaders_use_auto ?? false}
                  onCheckedChange={(val) => set('championship_leaders_use_auto', val)}
                />
                <Badge variant={formData.championship_leaders_use_auto ? 'default' : 'secondary'} className="text-[10px]">
                  {formData.championship_leaders_use_auto ? 'Auto' : 'Pinned'}
                </Badge>
              </div>
            </div>
            {formData.championship_leaders_use_auto ? (
              <p className="text-xs text-gray-400 italic">
                Will automatically show the #1 driver from each series that has synced standings data.
              </p>
            ) : (
              <ChampionshipLeadersSection
                entries={formData.championship_leader_entries || []}
                onChange={(val) => set('championship_leader_entries', val)}
              />
            )}
          </Card>
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}