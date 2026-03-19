import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function logOp(base44, operation_type, metadata = {}) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type,
      entity_name: 'StoryRecommendation',
      entity_id: metadata.recommendation_id ?? metadata.signal_id ?? '',
      metadata,
    });
  } catch (_) { /* fire-and-forget */ }
}

// ─── STATUS TRANSITION RULES ──────────────────────────────────────────────────

// Only allow valid forward transitions
const ALLOWED_TRANSITIONS = {
  approve:        { from: ['suggested'],            to: 'approved' },
  dismiss:        { from: ['suggested', 'saved'],   to: 'dismissed' },
  save:           { from: ['suggested'],            to: 'saved' },
  mark_covered:   { from: ['suggested', 'approved', 'saved', 'drafted'], to: 'covered' },
};

async function applyTransition(base44, action, rec, user, note) {
  const rule = ALLOWED_TRANSITIONS[action];
  if (!rule) return { error: `Unknown action: ${action}` };

  if (!rule.from.includes(rec.status)) {
    return { error: `Cannot ${action} a recommendation with status "${rec.status}". Allowed from: ${rule.from.join(', ')}.` };
  }

  const now = new Date().toISOString();
  const previousStatus = rec.status;
  const newStatus = rule.to;

  const updatePayload = {
    status: newStatus,
    editor_notes: (rec.editor_notes ?? '') + `\n[${action}] by ${user.email} at ${now}${note ? ': ' + note : ''}`,
  };

  // Set approved_by/approved_at when approving
  if (action === 'approve') {
    updatePayload.approved_by = user.email;
    updatePayload.approved_at = now;
  }

  await base44.asServiceRole.entities.StoryRecommendation.update(rec.id, updatePayload);

  const opTypeMap = {
    approve:      'story_radar_recommendation_approved',
    dismiss:      'story_radar_recommendation_dismissed',
    save:         'story_radar_recommendation_saved',
    mark_covered: 'story_radar_recommendation_marked_covered',
  };

  await logOp(base44, opTypeMap[action], {
    recommendation_id: rec.id,
    acted_by_user_id: user.id ?? user.email,
    previous_status: previousStatus,
    new_status: newStatus,
    note: note ?? undefined,
  });

  return { success: true, recommendation_id: rec.id, previous_status: previousStatus, new_status: newStatus };
}

// ─── RETRY ERRORED SIGNAL ─────────────────────────────────────────────────────

async function retrySignal(base44, signalId, user) {
  const signal = await base44.asServiceRole.entities.ContentSignal.get(signalId);
  if (!signal) return { error: `Signal ${signalId} not found` };

  if (signal.status !== 'errored') {
    return { error: `Signal status is "${signal.status}". Only errored signals can be retried.` };
  }

  const now = new Date().toISOString();
  await base44.asServiceRole.entities.ContentSignal.update(signalId, {
    status: 'new',
    ai_processed: false,
    error_message: null,
    processing_notes: (signal.processing_notes ?? '') + `\n[retry] by ${user.email} at ${now}`,
  });

  await logOp(base44, 'story_radar_signal_retried', {
    signal_id: signalId,
    acted_by_user_id: user.id ?? user.email,
    previous_status: 'errored',
    new_status: 'new',
  });

  return { success: true, signal_id: signalId, new_status: 'new' };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, recommendation_id, signal_id, note } = body;

    if (!action) {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }

    // ── Retry signal ──────────────────────────────────────────────────────────
    if (action === 'retry_signal') {
      if (!signal_id) return Response.json({ error: 'signal_id is required for retry_signal' }, { status: 400 });
      const result = await retrySignal(base44, signal_id, user);
      if (result.error) return Response.json({ error: result.error }, { status: 409 });
      return Response.json(result);
    }

    // ── Recommendation actions ────────────────────────────────────────────────
    if (!recommendation_id) {
      return Response.json({ error: 'recommendation_id is required' }, { status: 400 });
    }

    const rec = await base44.asServiceRole.entities.StoryRecommendation.get(recommendation_id);
    if (!rec) return Response.json({ error: 'Recommendation not found' }, { status: 404 });

    const actionMap = {
      approve:      () => applyTransition(base44, 'approve', rec, user, note),
      dismiss:      () => applyTransition(base44, 'dismiss', rec, user, note),
      save:         () => applyTransition(base44, 'save', rec, user, note),
      mark_covered: () => applyTransition(base44, 'mark_covered', rec, user, note),
    };

    const handler = actionMap[action];
    if (!handler) {
      return Response.json({
        error: `Unknown action "${action}". Valid: approve, dismiss, save, mark_covered, retry_signal`,
      }, { status: 400 });
    }

    const result = await handler();
    if (result.error) return Response.json({ error: result.error }, { status: 409 });
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});