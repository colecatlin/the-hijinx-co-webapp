import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';

const specialtiesOptions = [
  'Oval Track',
  'Road Course',
  'Dirt',
  'Street Circuit',
  'Wet Weather',
  'Qualifying',
  'Racecraft',
  'Consistency',
  'Adaptability',
];

export default function DriverPerformanceSection({ driverId, performance }) {
  const performanceRecord = performance;
  const [data, setData] = useState({
    highlights: performanceRecord?.highlights || '',
    championships: performanceRecord?.championships || '',
    notable_wins: performanceRecord?.notable_wins || '',
    specialties: performanceRecord?.specialties || [],
    recent_form: performanceRecord?.recent_form || 'Unknown',
    career_stats: performanceRecord?.career_stats || '',
    performance_notes: performanceRecord?.performance_notes || '',
  });

  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (performanceRecord?.id) {
        return base44.entities.DriverPerformance.update(performanceRecord.id, data);
      } else {
        return base44.entities.DriverPerformance.create({ ...data, driver_id: driverId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverPerformance', driverId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSpecialty = (specialty) => {
    setData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance & Stats</CardTitle>
        <CardDescription>Track career achievements and current form</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Career Highlights</Label>
            <Textarea
              value={data.highlights}
              onChange={(e) => handleChange('highlights', e.target.value)}
              placeholder="Major achievements and highlights..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Championships</Label>
            <Textarea
              value={data.championships}
              onChange={(e) => handleChange('championships', e.target.value)}
              placeholder="Championship wins and titles..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Notable Wins</Label>
            <Textarea
              value={data.notable_wins}
              onChange={(e) => handleChange('notable_wins', e.target.value)}
              placeholder="Significant race victories..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Career Statistics</Label>
            <Textarea
              value={data.career_stats}
              onChange={(e) => handleChange('career_stats', e.target.value)}
              placeholder="Stats, records, and numbers..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Recent Form</Label>
            <Select value={data.recent_form} onValueChange={(value) => handleChange('recent_form', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hot">Hot</SelectItem>
                <SelectItem value="Steady">Steady</SelectItem>
                <SelectItem value="Slump">Slump</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Specialties</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {specialtiesOptions.map((specialty) => (
              <label key={specialty} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.specialties.includes(specialty)}
                  onChange={() => toggleSpecialty(specialty)}
                  className="rounded"
                />
                <span className="text-sm">{specialty}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="space-y-2">
            <Label>Performance Analysis & Notes</Label>
            <Textarea
              value={data.performance_notes}
              onChange={(e) => handleChange('performance_notes', e.target.value)}
              placeholder="Detailed analysis and observations..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}