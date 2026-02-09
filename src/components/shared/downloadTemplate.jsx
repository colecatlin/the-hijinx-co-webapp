import * as XLSX from 'xlsx';

export const downloadTemplate = (entityType) => {
  const templates = {
    driver: [
      {
        first_name: "John",
        last_name: "Doe",
        display_name: "John Doe",
        hometown_city: "Detroit",
        hometown_state: "MI",
        country: "USA",
        date_of_birth: "1990-01-15",
        status: "Active",
        description_summary: "Professional driver with 10+ years of racing experience.",
        primary_discipline: "Off Road",
        content_value: "High"
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
        description_summary: "Elite racing team competing at the highest levels of motorsport.",
        primary_discipline: "Asphalt Oval",
        team_level: "National",
        ownership_type: "Private",
        owner_name: "Jane Smith",
        team_principal: "John Smith",
        content_value: "High"
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
        description_summary: "World-class racing facility hosting multiple series events annually.",
        track_type: "Oval",
        surfaces: "Asphalt",
        length_miles: 1.5,
        turns_count: 14,
        elevation_profile: "Flat",
        content_value: "High"
      }
    ],
    series: [
      {
        name: "Example Racing Series",
        governing_body: "Example Governing Body",
        discipline: "Road Racing",
        founded_year: 2000,
        status: "Active",
        description_summary: "Premier motorsports series featuring elite competition.",
        region: "North America",
        competition_level: "Professional",
        content_value: "High"
      }
    ]
  };

  const template = templates[entityType] || [];
  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entityType.charAt(0).toUpperCase() + entityType.slice(1));
  XLSX.writeFile(wb, `${entityType}-template.xlsx`);
};