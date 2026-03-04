import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { series_id, series_class_id, season } = await req.json();

    if (!series_id || !season) {
      return Response.json({ ok: false, error: 'Missing series_id or season' }, { status: 400 });
    }

    const all = await base44.entities.PointsConfig.filter({
      series_id,
      season,
      is_active: true
    });

    const normalizeEmpty = (v) => (v === undefined || v === null || v === '' ? null : v);
    const targetClass = normalizeEmpty(series_class_id);

    const exact = all.filter((c) => normalizeEmpty(c.series_class_id) === targetClass);
    const fallback = all.filter((c) => normalizeEmpty(c.series_class_id) === null);

    const candidates = exact.length > 0 ? exact : fallback;

    if (candidates.length === 0) {
      return Response.json({ ok: false, error: 'No active PointsConfig found' }, { status: 404 });
    }

    const sorted = [...candidates].sort((a, b) => {
      const ap = typeof a.priority === 'number' ? a.priority : 100;
      const bp = typeof b.priority === 'number' ? b.priority : 100;
      if (ap !== bp) return ap - bp;

      const ad = a.created_date ? new Date(a.created_date).getTime() : 0;
      const bd = b.created_date ? new Date(b.created_date).getTime() : 0;
      return bd - ad;
    });

    return Response.json({ ok: true, pointsConfig: sorted[0] });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});