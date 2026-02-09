import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Building2 } from 'lucide-react';
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

        <div>
          <Label>Account Type</Label>
          <Select
            value={formData.account_type}
            onValueChange={(value) => setFormData({ ...formData, account_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Individual
                </span>
              </SelectItem>
              <SelectItem value="business">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Association</Label>
          <Select
            value={formData.association}
            onValueChange={(value) => setFormData({ ...formData, association: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your role..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fan">Fan</SelectItem>
              <SelectItem value="Driver">Driver</SelectItem>
              <SelectItem value="Team Member">Team Member</SelectItem>
              <SelectItem value="Team Owner">Team Owner</SelectItem>
              <SelectItem value="Series Owner">Series Owner</SelectItem>
              <SelectItem value="Track Owner">Track Owner</SelectItem>
              <SelectItem value="Sponsor">Sponsor</SelectItem>
              <SelectItem value="Media">Media</SelectItem>
              <SelectItem value="Track Official">Track Official</SelectItem>
              <SelectItem value="Crew Chief">Crew Chief</SelectItem>
              <SelectItem value="Mechanic">Mechanic</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.account_type === 'business' && (
          <div>
            <Label>Company Name</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>
        )}

        <div>
          <Label>Bio</Label>
          <Textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>
    </motion.div>
  );
}