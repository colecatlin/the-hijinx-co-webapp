import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GooglePlacesLocationPicker from './GooglePlacesLocationPicker';
import CountryFlag from './CountryFlag';
import { base44 } from '@/api/base44Client';
import { US_STATES } from '@/constants/usStates';
import { COUNTRIES, canonicalCountryName, regionsFor } from '@/components/shared/countriesData';

// Every accepted spelling — 'USA', 'US', 'United States' — settles on the one
// spelling the platform stores, so a place picked here and a country typed into
// the workbook end up as the same country.
function normalizeCountry(value) {
  return canonicalCountryName(value) || value || '';
}

// US states keep the two-letter code the app's forms store; every other country
// offers the regions the platform holds for it. A country we hold no regions for
// stays free text rather than showing an empty list.
function getRegionOptions(country) {
  const name = normalizeCountry(country);
  if (name === 'United States') return US_STATES;
  const regions = regionsFor(name);
  if (!regions) return null;
  return regions.map((region) => ({ value: region.name, label: region.name }));
}

export default function LocationFieldsWithPicker({
  values = { city: '', state: '', country: '', latitude: '', longitude: '' },
  onFieldChange,
  showCoordinates = true
}) {
  useEffect(() => {
    // Load Google Places API on mount
    loadGooglePlacesScript();
  }, []);

  const loadGooglePlacesScript = async () => {
    try {
      const { data } = await base44.functions.invoke('initGooglePlaces');

      if (data.scriptUrl && !window.google) {
        const script = document.createElement('script');
        script.src = data.scriptUrl;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    } catch (error) {
      console.error('Failed to load Google Places API:', error);
    }
  };

  const handleLocationSelect = (locationData) => {
    onFieldChange('city', locationData.city);
    onFieldChange('state', locationData.state);
    onFieldChange('country', normalizeCountry(locationData.country));
    onFieldChange('latitude', locationData.latitude);
    onFieldChange('longitude', locationData.longitude);
  };

  const regionOptions = getRegionOptions(values.country);
  const storedRegionOutsideList = regionOptions && values.state
    && !regionOptions.some((option) => option.value === values.state);

  return (
    <div className="space-y-4">
      <div>
        <Label>Search Location</Label>
        <GooglePlacesLocationPicker
          onLocationSelect={handleLocationSelect}
          placeholder="Search for a city, address, or location..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={values.city}
            onChange={(e) => onFieldChange('city', e.target.value)}
            placeholder="City"
          />
        </div>
        <div>
          <Label htmlFor="state">State/Region</Label>
          {regionOptions ? (
            <Select value={values.state || ''} onValueChange={(v) => onFieldChange('state', v)}>
              <SelectTrigger id="state">
                <SelectValue placeholder="State / Region" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {storedRegionOutsideList && (
                  <SelectItem value={values.state}>{values.state}</SelectItem>
                )}
                {regionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="state"
              value={values.state}
              onChange={(e) => onFieldChange('state', e.target.value)}
              placeholder="State or region"
            />
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="country">Country</Label>
        <div className="flex items-center gap-3">
          <Select
            value={normalizeCountry(values.country)}
            onValueChange={(v) => onFieldChange('country', v)}
          >
            <SelectTrigger id="country" className="flex-1">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {values.country && !COUNTRIES.includes(normalizeCountry(values.country)) && (
                <SelectItem value={normalizeCountry(values.country)}>{normalizeCountry(values.country)}</SelectItem>
              )}
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {values.country && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded border border-gray-200">
              <CountryFlag country={values.country} className="w-6 h-5" />
              <span className="text-sm text-gray-600">{normalizeCountry(values.country)}</span>
            </div>
          )}
        </div>
      </div>

      {showCoordinates && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              value={values.latitude}
              onChange={(e) => onFieldChange('latitude', e.target.value)}
              placeholder="Latitude"
              type="number"
              step="any"
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              value={values.longitude}
              onChange={(e) => onFieldChange('longitude', e.target.value)}
              placeholder="Longitude"
              type="number"
              step="any"
            />
          </div>
        </div>
      )}
    </div>
  );
}