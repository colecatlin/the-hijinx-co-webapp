import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GooglePlacesLocationPicker from './GooglePlacesLocationPicker';
import { base44 } from '@/api/base44Client';

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
    onFieldChange('country', locationData.country);
    onFieldChange('latitude', locationData.latitude);
    onFieldChange('longitude', locationData.longitude);
  };

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
          <Input
            id="state"
            value={values.state}
            onChange={(e) => onFieldChange('state', e.target.value)}
            placeholder="State or region"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="country">Country</Label>
        <Input
          id="country"
          value={values.country}
          onChange={(e) => onFieldChange('country', e.target.value)}
          placeholder="Country"
        />
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