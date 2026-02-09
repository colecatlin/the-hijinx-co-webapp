import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check } from 'lucide-react';

const specialties = [
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

export default function DriverPerformanceSection({ driverId }) {
  const queryClient = useQueryClient();

  const { data: performanceRecords = [] } = useQuery({
    queryKey: ['driverPerformance', driverId],
    queryFn: () => base44.entities.DriverPerformance.filter({ driver_id: driverId }, '-updated_date', 10),
  });

  const performanceRecord = performanceRecords[0];

  const [data, setData] = useState({
    highlights: performanceRecord?.highlights || '',
    championships: performanceRecord?.championships || '',
    notable_wins: performanceRecord?.notable_wins || '',
    specialties: performanceRecord?.specialties || [],
    recent_form: performanceRecord?.recent_form || 'Unknown',
    career_stats: performanceRecord?.career_stats || '',
    performance_notes: performanceRecord?.performance_notes || '',
  });

  React.useEffect(() => {
    if (performanceRecord) {
      setData({
        highlights: performanceRecord.highlights || '',
        championships: performanceRecord.championships || '',
        notable_wins: performanceRecord.notable_wins || '',
        specialties: performanceRecord.specialties || [],
        recent_form: performanceRecord.recent_form || 'Unknown',
        career_stats: performanceRecord.career_stats || '',
        performance_notes: performanceRecord.performance_notes || '',
      });
    }
  }, [performanceRecord]);

  const [saved, setSaved] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance & Stats</CardTitle>
        <CardDescription>Career statistics, achievements, and recent form</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Highlights</Label>
          <Textarea
            value={data.highlights}
            onChange={(e) => handleChange('highlights', e.target.value)}
            placeholder="Major career highlights..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Championships & Titles</Label>
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
            placeholder="Major race victories..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Career Statistics</Label>
          <Textarea
            value={data.career_stats}
            onChange={(e) => handleChange('career_stats', e.target.value)}
            placeholder="Wins, poles, podiums, etc..."
            rows={4}
          />
        </div>

        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold">Driver Profile</h3>

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

          <div className="space-y-2">
            <Label>Specialties</Label>
            <div className="grid grid-cols-2 gap-3">
              {specialties.map((specialty) => (
                <label key={specialty} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.specialties.includes(specialty)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleChange('specialties', [...data.specialties, specialty]);
                      } else {
                        handleChange('specialties', data.specialties.filter((s) => s !== specialty));
                      }
                    }}
                  />
                  <span className="text-sm">{specialty}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t pt-6 space-y-2">
          <Label>Performance Notes</Label>
          <Textarea
            value={data.performance_notes}
            onChange={(e) => handleChange('performance_notes', e.target.value)}
            placeholder="Analysis and additional notes..."
            rows={4}
          />
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