/**
 * Results Validation Engine
 * Validate result rows against roster
 */

/**
 * Validate results against roster
 * @param {Object} params
 * @param {Array} params.rows - Result rows
 * @param {Map} params.rosterByCarNumber - Map of car_number -> entry
 * @param {Map} params.rosterByDriverId - Map of driver_id -> entry
 * @returns {Object} Validation result with errors and warnings
 */
export function validateResults({
  rows = [],
  rosterByCarNumber = new Map(),
  rosterByDriverId = new Map(),
}) {
  const errors = [];
  const warnings = [];

  if (!rows || rows.length === 0) {
    return { errors, warnings };
  }

  // Check for empty roster (no validation needed if roster is empty)
  const hasRoster = rosterByCarNumber.size > 0 || rosterByDriverId.size > 0;

  // Track seen positions and drivers
  const seenPositions = new Set();
  const seenCarNumbers = new Set();
  const seenDriverIds = new Set();
  const rosterDriverIds = new Set(rosterByDriverId.keys());
  const rosterCarNumbers = new Set(rosterByCarNumber.keys());
  const resultDriverIds = new Set();
  const resultCarNumbers = new Set();

  rows.forEach((row, idx) => {
    const rowIndex = idx;
    const isRunning = row.status === 'Running';
    const position = row.position;
    const carNumber = row.car_number?.toString().trim();
    const driverId = row.driver_id;

    // ERROR: Missing position for Running status
    if (isRunning && !position) {
      errors.push({
        code: 'missing_position',
        message: `Row ${rowIndex + 1}: Missing position for Running status`,
        rowIndex,
      });
    }

    // ERROR: Duplicate position for Running status
    if (isRunning && position) {
      const posStr = position.toString();
      if (seenPositions.has(posStr)) {
        errors.push({
          code: 'duplicate_position',
          message: `Row ${rowIndex + 1}: Duplicate position ${position}`,
          rowIndex,
        });
      }
      seenPositions.add(posStr);
    }

    // ERROR: Duplicate car_number across rows
    if (carNumber) {
      if (seenCarNumbers.has(carNumber)) {
        errors.push({
          code: 'duplicate_car_number',
          message: `Row ${rowIndex + 1}: Duplicate car number ${carNumber}`,
          rowIndex,
        });
      }
      seenCarNumbers.add(carNumber);
      resultCarNumbers.add(carNumber);
    }

    // ERROR: Duplicate driver_id across rows
    if (driverId) {
      if (seenDriverIds.has(driverId)) {
        errors.push({
          code: 'duplicate_driver_id',
          message: `Row ${rowIndex + 1}: Duplicate driver`,
          rowIndex,
        });
      }
      seenDriverIds.add(driverId);
      resultDriverIds.add(driverId);
    }

    // ERROR: Driver not in roster (if roster exists)
    if (hasRoster) {
      if (carNumber && !rosterByCarNumber.has(carNumber)) {
        errors.push({
          code: 'car_number_not_in_roster',
          message: `Row ${rowIndex + 1}: Car number ${carNumber} not in roster`,
          rowIndex,
        });
      }
      if (driverId && !rosterByDriverId.has(driverId)) {
        errors.push({
          code: 'driver_not_in_roster',
          message: `Row ${rowIndex + 1}: Driver not in roster`,
          rowIndex,
        });
      }
    }

    // WARNING: Car number but no driver_id
    if (carNumber && !driverId) {
      warnings.push({
        code: 'car_without_driver',
        message: `Row ${rowIndex + 1}: Car number ${carNumber} has no driver`,
        rowIndex,
      });
    }

    // WARNING: Driver_id but no car_number
    if (driverId && !carNumber) {
      warnings.push({
        code: 'driver_without_car',
        message: `Row ${rowIndex + 1}: Driver has no car number`,
        rowIndex,
      });
    }
  });

  // WARNING: Roster drivers missing from results (if roster exists)
  if (hasRoster) {
    rosterDriverIds.forEach((driverId) => {
      if (!resultDriverIds.has(driverId)) {
        warnings.push({
          code: 'roster_driver_missing',
          message: `Roster driver missing from results`,
        });
      }
    });

    rosterCarNumbers.forEach((carNumber) => {
      if (!resultCarNumbers.has(carNumber)) {
        warnings.push({
          code: 'roster_car_missing',
          message: `Roster car #${carNumber} missing from results`,
        });
      }
    });
  }

  return { errors, warnings };
}