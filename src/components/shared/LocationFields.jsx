import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { US_STATES } from '@/constants/usStates';
import { COUNTRIES, COUNTRIES_WITH_REGIONS } from '@/components/shared/countriesData';

// Normalize country values so 'USA' and 'United States' both resolve to the
// canonical COUNTRIES key 'USA'. This fixes the existing mismatch where forms
// default to 'USA' but Google Places returns 'United States'.
const COUNTRY_ALIASES = { 'United States': 'USA', 'United States of America': 'USA' };
function normalizeCountry(value) {
  if (!value) return value;
  if (COUNTRIES.includes(value)) return value;
  return COUNTRY_ALIASES[value] || value;
}

// US_STATES uses {value, label} objects; COUNTRIES_WITH_REGIONS stores plain
// string arrays. Normalize both to [{value, label}] for Select rendering.
function getRegionOptions(country) {
  const normalized = normalizeCountry(country);
  if (normalized === 'USA') return US_STATES;
  const regions = COUNTRIES_WITH_REGIONS[normalized];
  if (!regions) return null;
  return regions.map(r => ({ value: r, label: r }));
}

let googleScriptLoaded = false;
let googleScriptLoading = false;
const scriptCallbacks = [];

function loadGoogleScript(callback) {
  if (window.google?.maps?.places) {
    callback();
    return;
  }
  scriptCallbacks.push(callback);
  if (googleScriptLoading) return;
  googleScriptLoading = true;

  base44.functions.invoke('initGooglePlaces').then(({ data }) => {
    if (!data?.scriptUrl) {
      scriptCallbacks.forEach(cb => cb());
      scriptCallbacks.length = 0;
      return;
    }
    const script = document.createElement('script');
    script.src = data.scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleScriptLoaded = true;
      scriptCallbacks.forEach(cb => cb());
      scriptCallbacks.length = 0;
    };
    document.head.appendChild(script);
  }).catch(() => {
    scriptCallbacks.forEach(cb => cb());
    scriptCallbacks.length = 0;
  });
}

export default function LocationFields({
  cityValue,
  stateValue,
  countryValue,
  onCityChange,
  onStateChange,
  onCountryChange,
  cityLabel = 'City',
  stateLabel = 'State / Region',
  countryLabel = 'Country',
  errors = {},
  label = 'Location',
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [apiReady, setApiReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    loadGoogleScript(() => {
      setApiReady(!!(window.google?.maps?.places));
    });
  }, []);

  useEffect(() => {
    if (!apiReady || !inputRef.current || autocompleteRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode'],
    });
    autocompleteRef.current = ac;

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place?.address_components) return;

      let city = '', state = '', country = '';
      place.address_components.forEach(c => {
        if (c.types.includes('locality')) city = c.long_name;
        else if (c.types.includes('sublocality_level_1') && !city) city = c.long_name;
        if (c.types.includes('administrative_area_level_1')) state = c.short_name;
        if (c.types.includes('country')) country = c.long_name;
      });

      // Use setTimeout to defer state updates so Google's own DOM manipulation
      // (which can blur/focus and trigger re-renders) finishes first
      setTimeout(() => {
        onCityChange(city);
        onStateChange(state);
        onCountryChange(normalizeCountry(country));
        setSearchValue(place.formatted_address || `${city}, ${state}, ${country}`);
        setConfirmed(true);
      }, 0);
    });
  }, [apiReady]);

  // Reset confirmed state if values are manually cleared
  useEffect(() => {
    if (!cityValue && !stateValue && !countryValue) setConfirmed(false);
  }, [cityValue, stateValue, countryValue]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-gray-700">{label}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => { setSearchValue(e.target.value); setConfirmed(false); }}
            placeholder="Search city, address or place..."
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            disabled={!apiReady}
          />
          {confirmed && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          )}
        </div>
        {!apiReady && (
          <p className="text-xs text-gray-400 mt-1">Location search loading…</p>
        )}
      </div>

      {/* Confirmed/editable fields */}
      {(cityValue || stateValue || countryValue) && (
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{cityLabel}</label>
            <Input
              value={cityValue || ''}
              onChange={(e) => { onCityChange(e.target.value); setConfirmed(false); }}
              className={`h-8 text-sm ${errors.city || errors.headquarters_city ? 'border-red-500' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{stateLabel}</label>
            {(() => {
              const regionOptions = getRegionOptions(countryValue);
              if (regionOptions) {
                // Preserve a stored state value that is not in the list (legacy data)
                const hasStored = stateValue && !regionOptions.some(o => o.value === stateValue);
                return (
                  <Select value={stateValue || ''} onValueChange={(v) => { onStateChange(v); setConfirmed(false); }}>
                    <SelectTrigger className={`h-8 text-sm ${errors.state || errors.headquarters_state ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder={countryValue === 'USA' ? 'State' : 'Region'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {hasStored && <SelectItem value={stateValue}>{stateValue}</SelectItem>}
                      {regionOptions.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }
              return (
                <Input
                  value={stateValue || ''}
                  onChange={(e) => { onStateChange(e.target.value); setConfirmed(false); }}
                  className={`h-8 text-sm ${errors.state || errors.headquarters_state ? 'border-red-500' : ''}`}
                />
              );
            })()}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{countryLabel}</label>
            <Select value={normalizeCountry(countryValue) || ''} onValueChange={(v) => { onCountryChange(v); setConfirmed(false); }}>
              <SelectTrigger className={`h-8 text-sm ${errors.country ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {(() => {
                  const normalized = normalizeCountry(countryValue);
                  if (normalized && !COUNTRIES.includes(normalized)) {
                    return <SelectItem value={normalized}>{normalized}</SelectItem>;
                  }
                  return null;
                })()}
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}