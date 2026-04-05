import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SEED_DATA = {
  'Circuit': [
    'Road Course', 'Oval', 'Street Circuit', 'Short Course Off Road',
    'Rallycross', 'Motocross', 'Supercross', 'Flat Track', 'Karting Sprint'
  ],
  'Point to Point': [
    'Stage Rally', 'Desert Racing', 'Cross Country Rally', 'Enduro'
  ],
  'Straight Line': [
    'Drag Racing', 'Roll Racing', 'Standing Mile'
  ],
  'Endurance': [
    'Sports Car Endurance', 'Off Road Endurance', 'Karting Endurance',
    'Motorcycle Endurance', 'Offshore Endurance'
  ],
  'Judged': [
    'Drifting', 'Gymkhana', 'Freestyle Motocross', 'Stunt Driving'
  ],
  'Time': [
    'Time Attack', 'Hill Climb', 'Autocross', 'Solo Rally Sprint', 'Land Speed Time Trial'
  ],
};

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Load existing disciplines and formats
    const disciplines = await base44.asServiceRole.entities.Discipline.list();
    const existingFormats = await base44.asServiceRole.entities.Format.list();
    const existingFormatNames = new Set(existingFormats.map(f => f.name.toLowerCase()));

    const disciplineByName = {};
    disciplines.forEach(d => { disciplineByName[d.name.toLowerCase()] = d; });

    const results = {
      disciplines_created: [],
      formats_created: [],
      formats_skipped: [],
    };

    // Determine which discipline names need to be created
    const disciplineColors = {
      'Circuit':        '#E11D48',
      'Point to Point': '#D97706',
      'Straight Line':  '#7C3AED',
      'Endurance':      '#0891B2',
      'Judged':         '#059669',
      'Time':           '#1D4ED8',
    };

    for (const [disciplineName, formatNames] of Object.entries(SEED_DATA)) {
      let disc = disciplineByName[disciplineName.toLowerCase()];
      if (!disc) {
        disc = await base44.asServiceRole.entities.Discipline.create({
          name: disciplineName,
          slug: slugify(disciplineName),
          color_code: disciplineColors[disciplineName] || '#6B7280',
          is_active: true,
          sort_order: 0,
        });
        disciplineByName[disciplineName.toLowerCase()] = disc;
        results.disciplines_created.push(disciplineName);
      }

      for (let i = 0; i < formatNames.length; i++) {
        const fname = formatNames[i];
        if (existingFormatNames.has(fname.toLowerCase())) {
          results.formats_skipped.push(fname);
          continue;
        }
        await base44.asServiceRole.entities.Format.create({
          name: fname,
          slug: slugify(fname),
          discipline_id: disc.id,
          is_active: true,
          sort_order: i,
        });
        results.formats_created.push(fname);
        existingFormatNames.add(fname.toLowerCase());
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});