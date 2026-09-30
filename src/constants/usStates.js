/**
 * US_STATES — the app's US state options, derived from the platform's one
 * country list (@/lib/countryReference) rather than kept as a second copy.
 * Shape is unchanged: value is the two-letter code the forms store, label is
 * the state's name.
 */
import { REGIONS_BY_COUNTRY } from '@/lib/countryReference';

export const US_STATES = (REGIONS_BY_COUNTRY['United States'] || []).map((region) => ({
  value: region.code || region.name,
  label: region.name,
}));