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
  'Portugal': 'pt',
  'Greece': 'gr',
  'Czech Republic': 'cz',
  'Hungary': 'hu',
  'Romania': 'ro',
  'Bulgaria': 'bg',
  'Croatia': 'hr',
  'Serbia': 'rs',
  'Ukraine': 'ua',
  'Turkey': 'tr',
  'Israel': 'il',
  'UAE': 'ae',
  'Saudi Arabia': 'sa',
  'Egypt': 'eg',
  'South Korea': 'kr',
  'Thailand': 'th',
  'Vietnam': 'vn',
  'Indonesia': 'id',
  'Philippines': 'ph',
  'Singapore': 'sg',
  'Malaysia': 'my',
  'Pakistan': 'pk',
  'Bangladesh': 'bd',
  'Colombia': 'co',
  'Peru': 'pe',
  'Venezuela': 've',
  'Uruguay': 'uy',
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