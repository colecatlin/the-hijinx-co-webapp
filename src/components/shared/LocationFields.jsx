import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming'
];

const COUNTRIES = [
  'USA','Canada','Mexico','United Kingdom','Australia','Brazil','France','Germany',
  'Italy','Spain','Japan','China','India','Russia','Sweden','Norway','Finland',
  'Netherlands','Belgium','Austria','Switzerland','Denmark','Poland','Argentina',
  'Chile','New Zealand','South Africa'
];

export default function LocationFields({ cityValue, stateValue, countryValue, onCityChange, onStateChange, onCountryChange, cityLabel = 'City', stateLabel = 'State', countryLabel = 'Country' }) {
  const isUSA = countryValue === 'USA';

  const handleCountryChange = (val) => {
    onCountryChange(val);
    if (val !== 'USA') onStateChange('');
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">{cityLabel}</label>
        <Input value={cityValue || ''} onChange={(e) => onCityChange(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">{stateLabel}</label>
        {isUSA ? (
          <Select value={stateValue || ''} onValueChange={onStateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input value={stateValue || ''} onChange={(e) => onStateChange(e.target.value)} placeholder="State / Region" />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">{countryLabel}</label>
        <Select value={countryValue || 'USA'} onValueChange={handleCountryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}