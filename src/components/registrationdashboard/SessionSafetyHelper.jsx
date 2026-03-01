// Helper for session status safety checks and override logic
export const checkSessionLocked = (session) => {
  return session?.status === 'Locked';
};

export const checkSessionOfficial = (session) => {
  return session?.status === 'Official';
};

export const logOverrideAttempt = async (base44, actionName, context, reason, success) => {
  try {
    const user = await base44.auth.me();
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'ADMIN_OVERRIDE',
      source_type: 'RegistrationDashboard',
      entity_name: context.entityName || 'Session',
      function_name: actionName,
      status: success ? 'success' : 'failed',
      metadata: {
        eventId: context.eventId,
        sessionId: context.sessionId,
        seriesClassId: context.seriesClassId,
        seriesId: context.seriesId,
        beforeStatus: context.beforeStatus,
        afterStatus: context.afterStatus,
        reason,
        userId: user?.id,
      },
      notes: `Override for ${actionName}: ${reason}`,
    });
  } catch (e) {
    console.error('Failed to log override:', e);
  }
};

export const buildDuplicateKey = (result) => {
  return `${result.driver_id}:${result.session_id}`;
};

export const detectDuplicateResults = (existingResults, newResults) => {
  const existingKeys = new Set(existingResults.map(r => buildDuplicateKey(r)));
  return newResults.map(nr => ({
    ...nr,
    isDuplicate: existingKeys.has(buildDuplicateKey(nr)),
  }));
};