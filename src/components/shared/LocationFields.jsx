import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { COUNTRIES, COUNTRIES_WITH_REGIONS } from './countriesData';

export default function LocationFields({ cityValue, stateValue, countryValue, onCityChange, onStateChange, onCountryChange, cityLabel = 'City', stateLabel = 'State', countryLabel = 'Country', errors = {} }) {
  const isUSA = countryValue === 'USA';

  const handleCountryChange = (val) => {
    onCountryChange(val);
    if (val !== 'USA') onStateChange('');
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">{cityLabel}</label>
        <Input 
          value={cityValue || ''} 
          onChange={(e) => onCityChange(e.target.value)} 
          className={errors.headquarters_city ? 'border-red-500' : ''}
        />
        {errors.headquarters_city && <p className="text-xs text-red-500 mt-1">{errors.headquarters_city}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">{stateLabel}</label>
        {isUSA ? (
          <Select value={stateValue || ''} onValueChange={onStateChange}>
            <SelectTrigger className={errors.headquarters_state ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input 
            value={stateValue || ''} 
            onChange={(e) => onStateChange(e.target.value)} 
            placeholder="State / Region" 
            className={errors.headquarters_state ? 'border-red-500' : ''}
          />
        )}
        {errors.headquarters_state && <p className="text-xs text-red-500 mt-1">{errors.headquarters_state}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">{countryLabel}</label>
        <Select value={countryValue || 'USA'} onValueChange={handleCountryChange}>
          <SelectTrigger className={errors.country ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country}</p>}
      </div>
    </div>
  );
}