/**
 * Roster Helper
 * Build and manage entry rosters for results validation
 */

/**
 * Build roster from entries filtered by class
 * @param {Object} params
 * @param {Array} params.entries - Entry records
 * @param {Array} params.drivers - Driver records
 * @param {Array} params.seriesClasses - SeriesClass records
 * @param {string} params.selectedClassId - SeriesClass ID to filter by
 * @returns {Object} Roster data structure
 */
export function buildRoster({
  entries = [],
  drivers = [],
  seriesClasses = [],
  selectedClassId = null,
}) {
  // Filter entries by class
  const rosterEntries = selectedClassId
    ? entries.filter((e) => e.series_class_id === selectedClassId)
    : entries;

  // Build maps
  const rosterByCarNumber = new Map();
  const rosterByDriverId = new Map();

  // Driver lookup
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const classMap = new Map(seriesClasses.map((c) => [c.id, c]));

  // Display rows
  const rosterDisplayRows = rosterEntries.map((entry) => {
    const driver = driverMap.get(entry.driver_id);
    const seriesClass = classMap.get(entry.series_class_id);

    const carNumber = entry.car_number || driver?.primary_number || '';
    const driverName = driver
      ? `${driver.first_name} ${driver.last_name}`
      : '';
    const className = seriesClass?.class_name || '';

    // Index by car number
    if (carNumber) {
      rosterByCarNumber.set(carNumber, entry);
    }

    // Index by driver id
    if (entry.driver_id) {
      rosterByDriverId.set(entry.driver_id, entry);
    }

    return {
      entry_id: entry.id,
      driver_id: entry.driver_id || '',
      driver_name: driverName,
      car_number: carNumber,
      transponder_id: entry.transponder_id || '',
      team_id: entry.team_id || '',
      series_class_id: entry.series_class_id || '',
      class_name: className,
    };
  });

  return {
    rosterEntries,
    rosterByCarNumber,
    rosterByDriverId,
    rosterDisplayRows,
  };
}

/**
 * Compute roster summary stats
 * @param {Array} rosterEntries - Entry records
 * @returns {Object} Summary statistics
 */
export function getRosterStats(rosterEntries = []) {
  const total = rosterEntries.length;
  const paid = rosterEntries.filter(
    (e) => e.payment_status === 'Paid'
  ).length;
  const checkedIn = rosterEntries.filter(
    (e) => e.entry_status === 'Checked In'
  ).length;
  const techPassed = rosterEntries.filter(
    (e) => e.tech_status === 'Passed'
  ).length;

  return { total, paid, checkedIn, techPassed };
}