import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GeneralTab({ user, formData, setFormData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 p-6 rounded-lg space-y-6"
    >
      <h2 className="text-xl font-bold text-[#232323] flex items-center gap-2">
        <User className="w-5 h-5" />
        Basic Information
      </h2>

      <div className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input value={user.email} disabled className="bg-gray-100" />
        </div>

        <div>
          <Label>Full Name</Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>


      </div>
    </motion.div>
  );
}