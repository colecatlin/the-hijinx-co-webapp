import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function GoogleMapsInitializer({ children }) {
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        const response = await base44.functions.invoke('initGooglePlaces');
        if (response.data?.scriptUrl && !window.google) {
          const script = document.createElement('script');
          script.src = response.data.scriptUrl;
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('Failed to initialize Google Maps:', error);
      }
    };

    initializeGoogleMaps();
  }, []);

  return children;
}