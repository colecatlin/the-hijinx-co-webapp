import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { formData } = await req.json();

    // Update user profile
    await base44.auth.updateMe({
      full_name: formData.full_name,
      bio: formData.bio,
      account_type: formData.account_type,
      association: formData.association,
      company_name: formData.company_name,
      driver_id: formData.driver_id,
      team_id: formData.team_id,
      series_id: formData.series_id,
      track_id: formData.track_id,
      car_number: formData.car_number,
      team_affiliation: formData.team_affiliation,
      vehicle_type: formData.vehicle_type,
      role_on_team: formData.role_on_team,
      owned_team_name: formData.owned_team_name,
      owned_series_name: formData.owned_series_name,
      owned_track_name: formData.owned_track_name,
      sponsorship_interests: formData.sponsorship_interests,
      media_outlet: formData.media_outlet,
      media_role: formData.media_role,
      track_name: formData.track_name,
      favorite_drivers: formData.favorite_drivers,
      favorite_teams: formData.favorite_teams,
      favorite_series: formData.favorite_series,
      favorite_tracks: formData.favorite_tracks,
    });

    // Handle bi-directional linking for entities
    const entityMappings = [
      { field: 'driver_id', entityName: 'Driver' },
      { field: 'team_id', entityName: 'Team' },
      { field: 'series_id', entityName: 'Series' },
      { field: 'track_id', entityName: 'Track' },
    ];

    for (const { field, entityName } of entityMappings) {
      if (formData[field]) {
        await base44.asServiceRole.entities[entityName].update(formData[field], {
          owner_user_id: user.id
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});