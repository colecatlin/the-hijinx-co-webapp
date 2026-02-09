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

    // Handle bi-directional linking for Driver
    if (formData.driver_id) {
      await base44.asServiceRole.entities.Driver.update(formData.driver_id, {
        owner_user_id: user.id
      });
    }

    // Handle bi-directional linking for Team
    if (formData.team_id) {
      await base44.asServiceRole.entities.Team.update(formData.team_id, {
        owner_user_id: user.id
      });
    }

    // Handle bi-directional linking for Series
    if (formData.series_id) {
      await base44.asServiceRole.entities.Series.update(formData.series_id, {
        owner_user_id: user.id
      });
    }

    // Handle bi-directional linking for Track
    if (formData.track_id) {
      await base44.asServiceRole.entities.Track.update(formData.track_id, {
        owner_user_id: user.id
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});