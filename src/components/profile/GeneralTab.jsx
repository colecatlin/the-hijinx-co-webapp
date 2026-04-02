import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLE_INTEREST_OPTIONS = [
  'Competitor',
  'Team / Organization',
  'Venue / Series Operator',
  'Media / Creator',
  'Crew / Industry',
  'Fan / Supporter',
];

export default function GeneralTab({ user, formData, setFormData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name || ''}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name || ''}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user?.email || ''} disabled className="bg-gray-100 mt-1" />
        <p className="text-xs text-gray-400 mt-1">Email address is managed by the platform and cannot be changed here.</p>
      </div>
      <div>
        <Label htmlFor="role_interest_category">I am here as a...</Label>
        <Select
          value={formData.role_interest_category || ''}
          onValueChange={(val) => setFormData({ ...formData, role_interest_category: val })}
        >
          <SelectTrigger id="role_interest_category" className="mt-1">
            <SelectValue placeholder="Choose your role..." />
          </SelectTrigger>
          <SelectContent>
            {ROLE_INTEREST_OPTIONS.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400 mt-1">This affects your dashboard experience and account mode.</p>
      </div>
    </div>
  );
}