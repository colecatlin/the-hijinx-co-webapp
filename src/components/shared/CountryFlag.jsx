import React from 'react';

const countryCodeMap = {
  'USA': 'us',
  'Canada': 'ca',
  'Mexico': 'mx',
  'United States': 'us',
  'United Kingdom': 'gb',
  'Australia': 'au',
  'Brazil': 'br',
  'France': 'fr',
  'Germany': 'de',
  'Italy': 'it',
  'Spain': 'es',
  'Japan': 'jp',
  'China': 'cn',
  'India': 'in',
  'Russia': 'ru',
  'Sweden': 'se',
  'Norway': 'no',
  'Finland': 'fi',
  'Netherlands': 'nl',
  'Belgium': 'be',
  'Austria': 'at',
  'Switzerland': 'ch',
  'Denmark': 'dk',
  'Poland': 'pl',
  'Argentina': 'ar',
  'Chile': 'cl',
  'New Zealand': 'nz',
  'South Africa': 'za',
};

export default function CountryFlag({ country, className = "w-4 h-3" }) {
  if (!country) return null;
  
  const countryCode = countryCodeMap[country]?.toLowerCase();
  if (!countryCode) return null;

  return (
    <img
      src={`https://flagcdn.com/w160/${countryCode}.png`}
      alt={`${country} flag`}
      className={className}
    />
  );
}