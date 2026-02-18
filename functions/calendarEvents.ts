import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    const body = await req.json();
    const { action, calendarId, eventId, eventData, timeMin, timeMax } = body;

    const calId = calendarId || 'primary';
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (action === 'list') {
      const params = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime' });
      if (timeMin) params.set('timeMin', timeMin);
      if (timeMax) params.set('timeMax', timeMax);
      const res = await fetch(`${baseUrl}/events?${params}`, { headers });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData),
      });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'update') {
      const res = await fetch(`${baseUrl}/events/${eventId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(eventData),
      });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'delete') {
      await fetch(`${baseUrl}/events/${eventId}`, { method: 'DELETE', headers });
      return Response.json({ success: true });
    }

    if (action === 'createCalendar') {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
        method: 'POST',
        headers,
        body: JSON.stringify({ summary: eventData.summary, description: eventData.description }),
      });
      const data = await res.json();
      return Response.json(data);
    }

    if (action === 'listCalendars') {
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers });
      const data = await res.json();
      return Response.json(data);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});