/**
 * Shared filter helpers for the Entries tab.
 * Converts between URL params and filter state, and applies filters client-side.
 */

/** Default filter state */
export const DEFAULT_FILTERS = {
  classId: 'all',
  status: 'all',
  payment: 'all',
  search: '',
};

/** Read URLSearchParams → filter state */
export function filtersFromParams(params) {
  return {
    classId: params.get('classId') || 'all',
    status: params.get('status') || 'all',
    payment: params.get('payment') || 'all',
    search: params.get('search') || '',
  };
}

/** Write filter state → URLSearchParams (mutates a copy) */
export function applyFiltersToParams(params, filters) {
  const next = new URLSearchParams(params);
  if (filters.classId && filters.classId !== 'all') next.set('classId', filters.classId); else next.delete('classId');
  if (filters.status && filters.status !== 'all') next.set('status', filters.status); else next.delete('status');
  if (filters.payment && filters.payment !== 'all') next.set('payment', filters.payment); else next.delete('payment');
  if (filters.search) next.set('search', filters.search); else next.delete('search');
  return next;
}

/** Apply filters to an entries array. Drivers map is { [id]: driver } for fast lookup. */
export function applyFilters(entries, filters, driversMap) {
  return entries.filter((entry) => {
    // Class
    if (filters.classId !== 'all') {
      if (filters.classId === 'unassigned') {
        if (entry.series_class_id) return false;
      } else {
        if (entry.series_class_id !== filters.classId) return false;
      }
    }

    // Status
    if (filters.status !== 'all') {
      if (filters.status === 'registered' && entry.entry_status !== 'Registered') return false;
      if (filters.status === 'checkedin' && entry.entry_status !== 'Checked In') return false;
      if (filters.status === 'teched' && entry.tech_status !== 'Passed' && entry.tech_status !== 'Teched') return false;
      if (filters.status === 'withdrawn' && entry.entry_status !== 'Withdrawn') return false;
    }

    // Payment
    if (filters.payment !== 'all') {
      if (filters.payment === 'paid' && entry.payment_status !== 'Paid') return false;
      if (filters.payment === 'unpaid' && entry.payment_status === 'Paid') return false;
      if (filters.payment === 'refunded' && entry.payment_status !== 'Refunded') return false;
    }

    // Search
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const driver = driversMap[entry.driver_id];
      const driverMatch = driver
        ? `${driver.first_name} ${driver.last_name} ${driver.primary_number || ''}`.toLowerCase().includes(s)
        : false;
      const carMatch = (entry.car_number || '').toLowerCase().includes(s);
      const transponderMatch = (entry.transponder_id || '').toLowerCase().includes(s);
      if (!driverMatch && !carMatch && !transponderMatch) return false;
    }

    return true;
  });
}

/** Returns true if a row should show a warning highlight */
export function rowNeedsAttention(entry) {
  return (
    entry.payment_status !== 'Paid' ||
    (entry.tech_status !== 'Passed' && entry.tech_status !== 'Teched') ||
    !entry.transponder_id
  );
}