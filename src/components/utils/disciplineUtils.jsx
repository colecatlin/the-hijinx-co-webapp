// Maps racing series/categories to disciplines
const seriesDisciplineMap = {
  // NASCAR series — Stock Car
  'NASCAR Cup Series': 'Stock Car',
  "NASCAR O'Reilly Auto Parts Series": 'Stock Car',
  'NASCAR Xfinity Series': 'Stock Car',
  'NASCAR Craftsman Truck Series': 'Stock Car',
  'ARCA': 'Stock Car',
  // Open Wheel
  'IndyCar': 'Open Wheel',
  'Indy Pro 2000': 'Open Wheel',
  'Indy Lights': 'Open Wheel',
  'Formula 1': 'Open Wheel',
  'Formula E': 'Open Wheel',
  // Sports Car
  'World Endurance Championship': 'Sports Car',
  'IMSA': 'Sports Car',
  // Motorcycle
  'MotoGP': 'Motorcycle',
  // Rally / Rallycross
  'WRC': 'Rally',
  'Rally': 'Rally',
  // Drag Racing
  'NHRA': 'Drag Racing',
  'Drag': 'Drag Racing',
  // Off Road
  'Motocross': 'Off Road',
  'ATV': 'Off Road',
  'UTV': 'Off Road',
  'Desert Off-Road': 'Off Road',
  // Snowmobile
  'Snowmobile': 'Snowmobile',
  'Sled': 'Snowmobile',
  // Drift
  'Drift': 'Drift',
  'Formula Drift': 'Drift',
  // Karting
  'Karting': 'Karting',
  'Rotax Max': 'Karting',
  // Watercraft
  'Water': 'Watercraft',
  'P1': 'Watercraft',
  // Aviation
  'Air Race': 'Aviation',
  'Red Bull Air Race': 'Aviation',
  // Touring Car
  'BTCC': 'Touring Car',
  'WTCC': 'Touring Car',
  'TCR': 'Touring Car',
  // Dirt Oval
  'Dirt Track': 'Dirt Oval',
  // Rallycross
  'Rallycross': 'Rallycross',
  'FIA World Rallycross': 'Rallycross',
};

/**
 * Derives secondary disciplines from active driver programs
 * @param {Array} programs - Array of DriverProgram records
 * @param {Array} allSeries - Array of Series records for lookup
 * @param {String} primaryDiscipline - The driver's primary discipline
 * @returns {Array} Array of unique secondary disciplines (excluding primary)
 */
export function getSecondaryDisciplines(programs, allSeries = [], primaryDiscipline = '') {
  if (!programs || programs.length === 0) return [];

  // Filter to active programs only
  const activePrograms = programs.filter(p => p.status?.toLowerCase() === 'active');
  const programsToUse = activePrograms.length > 0 ? activePrograms : programs;

  const disciplines = new Set();

  programsToUse.forEach(program => {
    let discipline = null;

    // Try to match via series_id first
    if (program.series_id) {
      const series = allSeries.find(s => s.id === program.series_id);
      if (series) {
        discipline = seriesDisciplineMap[series.name];
      }
    }

    // Fallback to program's series_name
    if (!discipline && program.series_name) {
      discipline = seriesDisciplineMap[program.series_name];
    }

    // Add to set if found and different from primary
    if (discipline && discipline !== primaryDiscipline) {
      disciplines.add(discipline);
    }
  });

  return Array.from(disciplines).sort();
}

export default { getSecondaryDisciplines };