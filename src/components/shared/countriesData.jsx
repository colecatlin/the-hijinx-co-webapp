/**
 * countriesData.jsx — the app's view of the platform's one country list.
 *
 * Nothing is defined here. Every value comes from src/lib/countryReference, the
 * same list the pickers, the regions and the flags read, so a country is spelled
 * the same in a form, in a flag, and in the import workbook.
 */
import {
  COUNTRY_NAMES,
  COUNTRIES as COUNTRY_RECORDS,
  REGIONS_BY_COUNTRY,
  canonicalCountryName,
  resolveCountry,
  regionsFor,
  flagCode,
  flagUrl,
} from '@/lib/countryReference';

/** Every country name, in dropdown order. */
export const COUNTRIES = COUNTRY_NAMES;

/** Regions keyed by country name — countries we hold region data for only. */
export const COUNTRIES_WITH_REGIONS = REGIONS_BY_COUNTRY;

export { COUNTRY_RECORDS, canonicalCountryName, resolveCountry, regionsFor, flagCode, flagUrl };