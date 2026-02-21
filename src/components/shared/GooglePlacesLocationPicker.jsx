import React, { useRef, useEffect, useState } from 'react';
import { Search } from 'lucide-react';

export default function GooglePlacesLocationPicker({ 
  onLocationSelect, 
  placeholder = "Search location...",
  className = ""
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [apiLoaded, setApiLoaded] = useState(false);

  useEffect(() => {
    // Load Google Places script
    if (window.google && window.google.maps && window.google.maps.places) {
      setApiLoaded(true);
      initAutocomplete();
    } else {
      console.warn('Google Places API not loaded. Add API key to environment variables.');
    }
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['geocode'],
      componentRestrictions: { country: ['us', 'mx', 'ca'] }, // Adjust as needed
    });

    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry) {
        console.log('No geometry found for place');
        return;
      }

      const addressComponents = place.address_components || [];
      const locationData = parseAddressComponents(addressComponents, place.geometry);
      
      onLocationSelect(locationData);
    });
  };

  const parseAddressComponents = (components, geometry) => {
    let city = '';
    let state = '';
    let country = '';

    components.forEach(component => {
      const types = component.types || [];
      if (types.includes('locality')) {
        city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
      }
    });

    return {
      city,
      state,
      country,
      latitude: geometry.location.lat(),
      longitude: geometry.location.lng(),
    };
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!apiLoaded}
        />
      </div>
      {!apiLoaded && (
        <p className="text-xs text-red-500 mt-1">Google Places API not configured</p>
      )}
    </div>
  );
}