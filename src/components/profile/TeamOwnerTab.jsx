import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function TeamOwnerTab({ formData, setFormData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 p-6 rounded-lg space-y-4"
    >
      <h2 className="text-xl font-bold text-[#232323] flex items-center gap-2">
        <Users className="w-5 h-5" />
        Team Information
      </h2>

      <div>
        <Label>Team Name</Label>
        <Input
          value={formData.owned_team_name}
          onChange={(e) => setFormData({ ...formData, owned_team_name: e.target.value })}
          placeholder="Your team name"
        />
      </div>
    </motion.div>
  );
}