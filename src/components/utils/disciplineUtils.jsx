// Maps racing series/categories to disciplines
const seriesDisciplineMap = {
  // NASCAR series - Asphalt Oval
  'NASCAR Cup Series': 'Asphalt Oval',
  "NASCAR O'Reilly Auto Parts Series": 'Asphalt Oval',
  'NASCAR Xfinity Series': 'Asphalt Oval',
  'NASCAR Craftsman Truck Series': 'Asphalt Oval',
  'ARCA': 'Asphalt Oval',
  'IndyCar': 'Asphalt Oval',
  'Formula 1': 'Road Racing',
  'Indy Pro 2000': 'Asphalt Oval',
  'Indy Lights': 'Asphalt Oval',
  'Formula E': 'Road Racing',
  'World Endurance Championship': 'Road Racing',
  'IMSA': 'Road Racing',
  'MotoGP': 'Road Racing',
  'WRC': 'Rallycross',
  'Rally': 'Rallycross',
  'NHRA': 'Drag Racing',
  'Drag': 'Drag Racing',
  'Motocross': 'Off Road',
  'ATV': 'Off Road',
  'UTV': 'Off Road',
  'Desert Off-Road': 'Off Road',
  'Snowmobile': 'Snowmobile',
  'Sled': 'Snowmobile',
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