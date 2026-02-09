import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Wind } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function DriverTab({ formData, setFormData }) {
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 p-6 rounded-lg space-y-4"
    >
      <h2 className="text-xl font-bold text-[#232323] flex items-center gap-2">
        <Wind className="w-5 h-5" />
        Driver Information
      </h2>

      <div>
        <Label>Link Driver Profile</Label>
        <Select
          value={formData.driver_id || ''}
          onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your driver profile..." />
          </SelectTrigger>
          <SelectContent>
            {drivers.map((driver) => (
              <SelectItem key={driver.id} value={driver.id}>
                {driver.first_name} {driver.last_name} {driver.primary_number && `(#${driver.primary_number})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Car Number</Label>
        <Input
          value={formData.car_number}
          onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
          placeholder="e.g., 44"
        />
      </div>

      <div>
        <Label>Team Affiliation</Label>
        <Input
          value={formData.team_affiliation}
          onChange={(e) => setFormData({ ...formData, team_affiliation: e.target.value })}
          placeholder="Your team name"
        />
      </div>

      <div>
        <Label>Vehicle Type</Label>
        <Input
          value={formData.vehicle_type}
          onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
          placeholder="e.g., Late Model, Sprint Car"
        />
      </div>
    </motion.div>
  );
}