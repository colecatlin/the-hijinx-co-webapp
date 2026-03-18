import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * updateMediaCompliance
 * Recalculates compliance profile for a media user.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { holder_media_user_id } = await req.json();
    if (!holder_media_user_id) {
      return Response.json({ error: 'holder_media_user_id required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Load all submissions for this user
    const submissions = await base44.entities.DeliverableSubmission.filter({ holder_media_user_id });

    // Load all agreements (acknowledged obligations)
    const agreements = await base44.entities.DeliverableAgreement.filter({ holder_media_user_id });
    const acceptedAgreements = agreements.filter(a => a.status === 'accepted');

    // Count submitted requirement_ids
    const submittedReqIds = new Set(submissions.map(s => s.requirement_id));

    // Outstanding = accepted agreements with no submission
    const outstanding = acceptedAgreements.filter(a => !submittedReqIds.has(a.requirement_id));
    const outstandingCount = outstanding.length;

    // On-time rate: accepted submissions / total submissions
    const acceptedSubmissions = submissions.filter(s => s.review_status === 'accepted');
    const onTimeRate = submissions.length > 0
      ? Math.round((acceptedSubmissions.length / submissions.length) * 100) / 100
      : null;

    // Determine status
    const OUTSTANDING_WATCHLIST_THRESHOLD = 2;
    const OUTSTANDING_RESTRICTED_THRESHOLD = 5;
    let status = 'good';
    if (outstandingCount >= OUTSTANDING_RESTRICTED_THRESHOLD) {
      status = 'restricted';
    } else if (outstandingCount >= OUTSTANDING_WATCHLIST_THRESHOLD) {
      status = 'watchlist';
    }

    const lastSubmission = submissions.sort((a, b) =>
      new Date(b.submitted_at) - new Date(a.submitted_at)
    )[0];

    const complianceData = {
      holder_media_user_id,
      on_time_rate: onTimeRate,
      outstanding_requirements_count: outstandingCount,
      ...(lastSubmission?.submitted_at && { last_submission_at: lastSubmission.submitted_at }),
      status,
      updated_at: now,
    };

    const existing = await base44.entities.MediaCompliance.filter({ holder_media_user_id });
    let compliance;
    if (existing.length > 0) {
      compliance = await base44.entities.MediaCompliance.update(existing[0].id, complianceData);
    } else {
      compliance = await base44.entities.MediaCompliance.create(complianceData);
    }

    return Response.json({ compliance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});