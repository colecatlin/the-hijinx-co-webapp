/**
 * Central publish guard for media assets.
 * Checks usage rights before allowing a PublishTarget to be created/updated to scheduled or published.
 */

/**
 * @param {object} params
 * @param {object} params.asset - MediaAsset record
 * @param {array}  params.assetLinks - AssetLink[] for this asset
 * @param {array}  params.usageAgreements - UsageRightsAgreement[] relevant to this asset/holder
 * @param {object} params.publishTarget - existing or proposed PublishTarget record (may be partial)
 * @param {boolean} params.isAdmin
 * @param {boolean} params.isEntityManager
 * @returns {{ allowed: boolean, reason: string }}
 */
export function canPublishAsset({
  asset,
  assetLinks = [],
  usageAgreements = [],
  publishTarget,
  isAdmin = false,
  isEntityManager = false,
}) {
  // 1. Admins always allowed
  if (isAdmin) return { allowed: true, reason: '' };

  // 2. Override already granted on this publish target
  if (publishTarget?.override_allowed === true) return { allowed: true, reason: '' };

  const holderId = asset?.uploader_media_user_id;

  // 3. Determine required agreement
  const eventLink = assetLinks.find((l) => l.subject_type === 'event');
  let agreement = null;

  if (eventLink) {
    const eventId = eventLink.subject_id;
    // Find matching agreements by event_id and holder, pick newest
    const matches = usageAgreements
      .filter((a) => a.event_id === eventId && a.holder_media_user_id === holderId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    agreement = matches[0] || null;
  } else {
    // Entity-scoped
    const targetEntityId = publishTarget?.target_entity_id;
    const matches = usageAgreements
      .filter((a) => a.entity_id === targetEntityId && a.holder_media_user_id === holderId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    agreement = matches[0] || null;
  }

  // 4. No agreement found
  if (!agreement) {
    return {
      allowed: false,
      reason: 'Usage rights agreement required before publishing.',
    };
  }

  // 5. Agreement not fully executed
  if (agreement.status !== 'fully_executed') {
    return {
      allowed: false,
      reason: 'Usage rights not fully executed.',
    };
  }

  return { allowed: true, reason: '' };
}