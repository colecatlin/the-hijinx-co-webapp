import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const currentYear = new Date().getFullYear().toString();

  // Fetch all data in parallel
  const [drivers, allPrograms, allEvents, allResults] = await Promise.all([
    base44.asServiceRole.entities.Driver.list(),
    base44.asServiceRole.entities.DriverProgram.list(),
    base44.asServiceRole.entities.Event.list(),
    base44.asServiceRole.entities.Results.list(),
  ]);

  const updated = [];
  const skipped = [];

  for (const driver of drivers) {
    const driverPrograms = allPrograms.filter(p => p.driver_id === driver.id);

    if (driverPrograms.length === 0) {
      // No programs — leave status as-is
      skipped.push(driver.id);
      continue;
    }

    // Split programs into current season and past
    const currentPrograms = driverPrograms.filter(p => p.season === currentYear || p.status === 'active');
    const pastPrograms = driverPrograms.filter(p => p.season !== currentYear && p.status !== 'active');

    let newStatus = 'Inactive';

    if (currentPrograms.length > 0) {
      // Check participation % across all current programs
      let totalEvents = 0;
      let participatedEvents = 0;

      for (const program of currentPrograms) {
        // Events for this series/season
        const seriesEvents = allEvents.filter(e => {
          const eventYear = e.event_date ? new Date(e.event_date).getFullYear().toString() : null;
          return eventYear === currentYear && (
            e.series === program.series_name ||
            (program.series_id && e.series_id === program.series_id)
          );
        });

        const programResults = allResults.filter(r => r.program_id === program.id);
        const participatedEventIds = new Set(programResults.map(r => r.event_id));

        totalEvents += seriesEvents.length;
        participatedEvents += seriesEvents.filter(e => participatedEventIds.has(e.id)).length;
      }

      if (totalEvents === 0) {
        // No events on record yet — default to Active (planning stage)
        newStatus = 'Active';
      } else {
        const participationRate = participatedEvents / totalEvents;
        newStatus = participationRate >= 0.7 ? 'Active' : 'Part Time';
      }
    } else if (pastPrograms.length > 0) {
      newStatus = 'Inactive';
    }

    if (driver.status !== newStatus) {
      await base44.asServiceRole.entities.Driver.update(driver.id, { status: newStatus });
      updated.push({ id: driver.id, name: `${driver.first_name} ${driver.last_name}`, status: newStatus });
    } else {
      skipped.push(driver.id);
    }
  }

  return Response.json({ updated: updated.length, skipped: skipped.length, details: updated });
});