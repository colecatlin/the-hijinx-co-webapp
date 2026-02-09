import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import SeriesCoreDetailsSection from '@/components/management/SeriesManagement/SeriesCoreDetailsSection';
import SeriesFormatSection from '@/components/management/SeriesManagement/SeriesFormatSection';
import SeriesClassesSection from '@/components/management/SeriesManagement/SeriesClassesSection';
import SeriesEventsSection from '@/components/management/SeriesManagement/SeriesEventsSection';
import SeriesMediaSection from '@/components/management/SeriesManagement/SeriesMediaSection';
import SeriesGovernanceSection from '@/components/management/SeriesManagement/SeriesGovernanceSection';

export default function CreateSeriesForm({ onClose, onSeriesCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    discipline: 'Mixed',
    founded_year: new Date().getFullYear(),
    status: 'Active',
    description_summary: '',
    region: 'Global',
    competition_level: 'Professional',
    governing_body: '',
  });

  const [createdSeries, setCreatedSeries] = useState(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data) => {
      const slugValue = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return base44.entities.Series.create({ ...data, slug: slugValue });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setCreatedSeries(data);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  if (createdSeries) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => onSeriesCreated(createdSeries)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2">{createdSeries.name}</h1>
            <p className="text-gray-600">Complete series setup</p>
          </div>
        </div>

        <Tabs defaultValue="core" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="core" className="text-xs">Core</TabsTrigger>
            <TabsTrigger value="format" className="text-xs">Format</TabsTrigger>
            <TabsTrigger value="classes" className="text-xs">Classes</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs">Calendar</TabsTrigger>
            <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
            <TabsTrigger value="governance" className="text-xs">Governance</TabsTrigger>
          </TabsList>
          <TabsContent value="core" className="mt-6">
            <SeriesCoreDetailsSection seriesId={createdSeries.id} />
          </TabsContent>
          <TabsContent value="format" className="mt-6">
            <SeriesFormatSection seriesId={createdSeries.id} />
          </TabsContent>
          <TabsContent value="classes" className="mt-6">
            <SeriesClassesSection seriesId={createdSeries.id} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-6">
            <SeriesEventsSection seriesId={createdSeries.id} />
          </TabsContent>
          <TabsContent value="media" className="mt-6">
            <SeriesMediaSection seriesId={createdSeries.id} />
          </TabsContent>
          <TabsContent value="governance" className="mt-6">
            <SeriesGovernanceSection seriesId={createdSeries.id} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">New Series</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Series name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Discipline *</label>
            <Select value={formData.discipline} onValueChange={(val) => handleChange('discipline', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                <SelectItem value="Road Racing">Road Racing</SelectItem>
                <SelectItem value="Off Road">Off Road</SelectItem>
                <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                <SelectItem value="Rallycross">Rallycross</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Competition Level *</label>
            <Select value={formData.competition_level} onValueChange={(val) => handleChange('competition_level', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Semi Pro">Semi Pro</SelectItem>
                <SelectItem value="Amateur">Amateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Governing Body</label>
            <Input
              value={formData.governing_body}
              onChange={(e) => handleChange('governing_body', e.target.value)}
              placeholder="e.g., NASCAR, FIA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Founded Year</label>
            <Input
              type="number"
              value={formData.founded_year}
              onChange={(e) => handleChange('founded_year', parseInt(e.target.value))}
              placeholder={new Date().getFullYear().toString()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Region</label>
            <Select value={formData.region} onValueChange={(val) => handleChange('region', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Global">Global</SelectItem>
                <SelectItem value="North America">North America</SelectItem>
                <SelectItem value="Europe">Europe</SelectItem>
                <SelectItem value="Regional">Regional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Historic">Historic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Description Summary *</label>
            <Textarea
              value={formData.description_summary}
              onChange={(e) => handleChange('description_summary', e.target.value)}
              placeholder="2-3 sentences, max 360 characters"
              rows={3}
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#232323] hover:bg-[#1A3249]"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Series
          </Button>
        </div>
      </form>
    </div>
  );
}