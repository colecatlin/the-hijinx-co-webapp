import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Wind } from 'lucide-react';

export default function DriverTab({ formData, setFormData }) {
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