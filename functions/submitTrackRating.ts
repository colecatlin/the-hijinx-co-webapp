import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { track_id, rating_value } = await req.json();

    if (!track_id || !rating_value || rating_value < 1 || rating_value > 10) {
      return Response.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Get track details
    const track = await base44.entities.Track.get(track_id);
    if (!track) {
      return Response.json({ error: 'Track not found' }, { status: 404 });
    }

    // Check for existing rating by this user
    const existingRatings = await base44.asServiceRole.entities.TrackRating.filter({
      track_id,
      user_id: user.id,
    });

    if (existingRatings.length > 0) {
      // Update existing rating
      await base44.asServiceRole.entities.TrackRating.update(existingRatings[0].id, {
        rating_value,
        user_display: user.full_name,
        track_name: track.name,
      });
    } else {
      // Create new rating
      await base44.asServiceRole.entities.TrackRating.create({
        user_id: user.id,
        user_display: user.full_name,
        track_id,
        track_name: track.name,
        rating_value,
      });
    }

    // Recalculate aggregates
    const allRatings = await base44.asServiceRole.entities.TrackRating.filter({ track_id });
    
    const rating_count = allRatings.length;
    const rating_sum = allRatings.reduce((sum, r) => sum + r.rating_value, 0);
    const rating_average = rating_count > 0 ? rating_sum / rating_count : 0;

    // Get settings for weighted rating calculation
    const settings = await base44.asServiceRole.entities.Settings.filter({ key: 'track_ratings' });
    const tracks_global_average_C = settings[0]?.tracks_global_average_C || 7.0;
    const tracks_min_votes_m = settings[0]?.tracks_min_votes_m || 50;

    // Calculate weighted rating using Bayesian average
    let weighted_rating;
    if (rating_count === 0) {
      weighted_rating = tracks_global_average_C;
    } else {
      weighted_rating =
        (rating_count / (rating_count + tracks_min_votes_m)) * rating_average +
        (tracks_min_votes_m / (rating_count + tracks_min_votes_m)) * tracks_global_average_C;
    }

    // Update track with new aggregates
    await base44.asServiceRole.entities.Track.update(track_id, {
      rating_count,
      rating_sum,
      rating_average,
      weighted_rating,
    });

    return Response.json({
      success: true,
      rating_count,
      rating_average,
      weighted_rating,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});