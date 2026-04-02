import React from 'react';
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

/**
 * roleOnly=true — renders only the role_interest_category dropdown
 * roleOnly=false (default) — renders the full form (legacy use)
 */
export default function GeneralTab({ user, formData, setFormData, roleOnly = false }) {
  return (
    <div className="space-y-4">
      {!roleOnly && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <input
                id="first_name"
                value={formData.first_name || ''}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <input
                id="last_name"
                value={formData.last_name || ''}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              value={user?.email || ''}
              disabled
              className="flex h-9 w-full rounded-md border border-input bg-gray-100 px-3 py-1 text-sm text-gray-500 mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Email is managed by the platform and cannot be changed here.</p>
          </div>
        </>
      )}

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