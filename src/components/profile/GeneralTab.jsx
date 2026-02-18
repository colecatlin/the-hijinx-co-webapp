import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

function parseDateParts(dateStr) {
  if (!dateStr) return { month: '', day: '', year: '' };
  const d = new Date(dateStr);
  if (isNaN(d)) return { month: '', day: '', year: '' };
  return { month: String(d.getUTCMonth() + 1), day: String(d.getUTCDate()), year: String(d.getUTCFullYear()) };
}

function buildDateStr(month, day, year) {
  if (!month || !day || !year) return null;
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name || ''}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name || ''}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            value={formData.display_name || ''}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="e.g., RacingFanatic23"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} disabled className="bg-gray-100" />
        </div>

        <div>
          <Label htmlFor="birth_date">Date of Birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.birth_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.birth_date ? format(new Date(formData.birth_date), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.birth_date ? new Date(formData.birth_date) : undefined}
                onSelect={(date) => setFormData({ ...formData, birth_date: date ? format(date, 'yyyy-MM-dd') : null })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="state">State/Region</Label>
            <Input
              id="state"
              value={formData.state || ''}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country || ''}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="newsletter_subscriber"
            checked={formData.newsletter_subscriber || false}
            onCheckedChange={(checked) => setFormData({ ...formData, newsletter_subscriber: checked })}
          />
          <Label htmlFor="newsletter_subscriber" className="cursor-pointer">Subscribe to newsletter</Label>
        </div>
      </div>
    </motion.div>
  );
}