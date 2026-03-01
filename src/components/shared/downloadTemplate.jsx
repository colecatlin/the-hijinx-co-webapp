export const downloadTemplate = (entityType) => {
  const templates = {
    driver: [
      {
        numeric_id: "",
        first_name: "John",
        last_name: "Doe",
        hometown_city: "Detroit",
        hometown_state: "MI",
        country: "USA",
        date_of_birth: "1990-01-15",
        status: "Active",
        primary_discipline: "Off Road",
        series_name: "",
        class_name: "",
        team_name: ""
      }
    ],
    team: [
      {
        name: "Example Racing Team",
        headquarters_city: "Charlotte",
        headquarters_state: "NC",
        country: "USA",
        status: "Active",
        founded_year: 2015,
        primary_discipline: "Asphalt Oval",
        team_level: "National"
      }
    ],
    track: [
      {
        name: "Example Speedway",
        city: "Las Vegas",
        state: "NV",
        country: "USA",
        status: "Active",
        founded_year: 1996,
        track_type: "Oval",
        length_miles: 1.5
      }
    ],
    series: [
      {
        name: "Example Racing Series",
        discipline: "Road Racing",
        founded_year: 2000,
        status: "Active",
        region: "North America"
      }
    ]
  };

  const template = templates[entityType] || [];
  
  // Ensure template is not empty to get keys, otherwise return without downloading
  if (template.length === 0) {
    console.warn(`No template found for entityType: ${entityType}`);
    return;
  }

  const csv = [Object.keys(template[0]).join(','), ...template.map(row => Object.values(row).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${entityType}-template.csv`;
  document.body.appendChild(link); // Append to body to ensure it works in all browsers
  link.click();
  document.body.removeChild(link); // Clean up
  URL.revokeObjectURL(url);
};