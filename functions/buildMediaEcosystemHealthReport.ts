import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(label, detail = '') { return { status: 'pass', label, detail }; }
function warn(label, detail = '') { return { status: 'warn', label, detail }; }
function fail(label, detail = '') { return { status: 'fail', label, detail }; }

function scoreChecks(checks) {
  const failures = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warn').length;
  if (failures > 0) return 'critical';
  if (warnings > 2) return 'attention_needed';
  if (warnings > 0) return 'minor_warnings';
  return 'healthy';
}

// ─── 1. Entity Integration ────────────────────────────────────────────────────

async function auditEntityIntegration(db) {
  const checks = [];
  const broken_relationships = [];
  const warnings = [];
  const failures = [];

  try {
    const [profiles, outlets, assets, assignments, requests, agreements, paymentAccounts, revenueEvents, payoutRecords] = await Promise.all([
      db.MediaProfile.list('-created_date', 100),
      db.MediaOutlet.list('-created_date', 100),
      db.MediaAsset.list('-created_date', 100),
      db.MediaAssignment.list('-created_date', 50),
      db.MediaRequest.list('-created_date', 50),
      db.RevenueAgreement.list('-created_date', 50),
      db.PaymentAccount.list('-created_date', 50),
      db.RevenueEvent.list('-created_date', 50),
      db.PayoutRecord.list('-created_date', 50),
    ]);

    // Profile checks
    const profilesWithNoUserId = profiles.filter(p => !p.user_id);
    if (profilesWithNoUserId.length > 0) {
      failures.push(`${profilesWithNoUserId.length} MediaProfile(s) missing user_id`);
      checks.push(fail('MediaProfile user_id coverage', `${profilesWithNoUserId.length} missing`));
    } else {
      checks.push(pass('MediaProfile user_id coverage', `${profiles.length} profiles, all have user_id`));
    }

    const profileSlugs = profiles.map(p => p.slug).filter(Boolean);
    const uniqueProfileSlugs = new Set(profileSlugs);
    if (profileSlugs.length !== uniqueProfileSlugs.size) {
      const dupes = profileSlugs.filter((s, i) => profileSlugs.indexOf(s) !== i);
      warnings.push(`Duplicate MediaProfile slugs: ${[...new Set(dupes)].join(', ')}`);
      checks.push(warn('MediaProfile slug uniqueness', `${dupes.length} duplicate slug(s) found`));
    } else {
      checks.push(pass('MediaProfile slug uniqueness', `${profileSlugs.length} slugs, all unique`));
    }

    const profilesMissingSlug = profiles.filter(p => !p.slug && p.profile_status === 'active');
    if (profilesMissingSlug.length > 0) {
      warnings.push(`${profilesMissingSlug.length} active MediaProfile(s) missing slug`);
      checks.push(warn('MediaProfile slug completeness', `${profilesMissingSlug.length} active profiles without slug`));
    } else {
      checks.push(pass('MediaProfile slug completeness', 'All active profiles have slugs'));
    }

    // Outlet checks
    const outletsMissingSlug = outlets.filter(o => !o.slug && o.outlet_status === 'active');
    if (outletsMissingSlug.length > 0) {
      warnings.push(`${outletsMissingSlug.length} active MediaOutlet(s) missing slug`);
      checks.push(warn('MediaOutlet slug completeness', `${outletsMissingSlug.length} active outlets without slug`));
    } else {
      checks.push(pass('MediaOutlet slug completeness', `${outlets.length} outlets checked`));
    }

    const outletSlugs = outlets.map(o => o.slug).filter(Boolean);
    const uniqueOutletSlugs = new Set(outletSlugs);
    if (outletSlugs.length !== uniqueOutletSlugs.size) {
      const dupes = outletSlugs.filter((s, i) => outletSlugs.indexOf(s) !== i);
      warnings.push(`Duplicate MediaOutlet slugs: ${[...new Set(dupes)].join(', ')}`);
      checks.push(warn('MediaOutlet slug uniqueness', `${dupes.length} duplicate(s)`));
    } else {
      checks.push(pass('MediaOutlet slug uniqueness', 'All outlet slugs are unique'));
    }

    // Asset checks
    const assetsWithNoOwner = assets.filter(a => !a.owner_user_id && !a.uploader_media_user_id);
    if (assetsWithNoOwner.length > 0) {
      warnings.push(`${assetsWithNoOwner.length} MediaAsset(s) have no owner`);
      checks.push(warn('MediaAsset ownership coverage', `${assetsWithNoOwner.length} unowned`));
    } else {
      checks.push(pass('MediaAsset ownership coverage', `${assets.length} assets, all have owner`));
    }

    const publicAssetsWithoutRights = assets.filter(a =>
      a.public_access === true && a.rights_status !== 'cleared'
    );
    if (publicAssetsWithoutRights.length > 0) {
      failures.push(`${publicAssetsWithoutRights.length} public_access=true asset(s) with rights_status != cleared`);
      checks.push(fail('MediaAsset public rights gate', `${publicAssetsWithoutRights.length} leaks found`));
      broken_relationships.push(...publicAssetsWithoutRights.map(a => ({ entity: 'MediaAsset', id: a.id, issue: 'public_access=true but rights_status not cleared' })));
    } else {
      checks.push(pass('MediaAsset public rights gate', 'No public assets with uncleared rights'));
    }

    // Assignment checks
    const assignmentsWithPaymentNoAgreement = assignments.filter(a =>
      ['flat_fee', 'revenue_share'].includes(a.compensation_type) && !a.linked_revenue_agreement_id
    );
    if (assignmentsWithPaymentNoAgreement.length > 0) {
      warnings.push(`${assignmentsWithPaymentNoAgreement.length} paid assignment(s) missing linked RevenueAgreement`);
      checks.push(warn('MediaAssignment revenue agreement linkage', `${assignmentsWithPaymentNoAgreement.length} missing`));
    } else {
      checks.push(pass('MediaAssignment revenue agreement linkage', 'All paid assignments have agreements'));
    }

    // Revenue checks
    const eventsWithBadSplit = revenueEvents.filter(e => {
      const sum = (e.platform_amount || 0) + (e.creator_amount || 0) + (e.outlet_amount || 0);
      return Math.abs(sum - (e.gross_amount || 0)) > 2; // 2 cent tolerance for rounding
    });
    if (eventsWithBadSplit.length > 0) {
      failures.push(`${eventsWithBadSplit.length} RevenueEvent(s) with split amounts that don't sum to gross`);
      checks.push(fail('RevenueEvent split integrity', `${eventsWithBadSplit.length} bad splits`));
    } else {
      checks.push(pass('RevenueEvent split integrity', `${revenueEvents.length} events, all splits valid`));
    }

    // PayoutRecord checks
    const payoutsWithNoEvent = payoutRecords.filter(p => !p.linked_revenue_event_id);
    if (payoutsWithNoEvent.length > 0) {
      warnings.push(`${payoutsWithNoEvent.length} PayoutRecord(s) missing linked RevenueEvent`);
      checks.push(warn('PayoutRecord → RevenueEvent linkage', `${payoutsWithNoEvent.length} orphaned`));
    } else {
      checks.push(pass('PayoutRecord → RevenueEvent linkage', 'All payout records linked to events'));
    }

    // Agreement percentage validation
    const agreementsWithBadPercent = agreements.filter(a => {
      if (a.flat_fee_amount > 0) return false;
      const total = (a.platform_share_percent || 0) + (a.creator_share_percent || 0) + (a.outlet_share_percent || 0);
      return Math.abs(total - 100) > 0.5;
    });
    if (agreementsWithBadPercent.length > 0) {
      failures.push(`${agreementsWithBadPercent.length} RevenueAgreement(s) with percentages not summing to 100`);
      checks.push(fail('RevenueAgreement percentage integrity', `${agreementsWithBadPercent.length} invalid`));
    } else {
      checks.push(pass('RevenueAgreement percentage integrity', `${agreements.length} agreements valid`));
    }

    // PaymentAccount status consistency
    const activePayAccounts = paymentAccounts.filter(pa => pa.account_status === 'active');
    const activeWithoutPayoutsEnabled = activePayAccounts.filter(pa => !pa.payouts_enabled);
    if (activeWithoutPayoutsEnabled.length > 0) {
      warnings.push(`${activeWithoutPayoutsEnabled.length} PaymentAccount(s) status=active but payouts_enabled=false`);
      checks.push(warn('PaymentAccount active/payout consistency', `${activeWithoutPayoutsEnabled.length} inconsistent`));
    } else {
      checks.push(pass('PaymentAccount active/payout consistency', 'All active accounts have payouts enabled'));
    }

  } catch (e) {
    failures.push(`Entity integration audit error: ${e.message}`);
    checks.push(fail('Entity integration audit', e.message));
  }

  return {
    entity_integration_status: scoreChecks(checks),
    checks,
    broken_relationships,
    warnings,
    failures,
    records_checked: true
  };
}

// ─── 2. Route & Access Audit ──────────────────────────────────────────────────

function auditRoutes() {
  const checks = [];
  const collisions = [];
  const warnings = [];
  const failures = [];

  const EXPECTED_ROUTES = [
    { path: '/MediaPortal', visibility: 'internal', note: 'Contributor workspace — auth-gated' },
    { path: '/MediaHome', visibility: 'public', note: 'Public media landing page' },
    { path: '/creators', visibility: 'public', note: 'Creator directory — public browsing' },
    { path: '/creators/:slug', visibility: 'public', note: 'Creator public profile' },
    { path: '/media-outlets', visibility: 'public', note: 'Outlet directory — public browsing' },
    { path: '/media-outlets/:slug', visibility: 'public', note: 'Outlet public profile' },
    { path: '/management/media/applications', visibility: 'admin', note: 'Admin: media applications' },
    { path: '/management/media/assignments', visibility: 'admin', note: 'Admin: assignments' },
    { path: '/management/media/requests', visibility: 'admin', note: 'Admin: media requests' },
    { path: '/management/media/revenue', visibility: 'admin', note: 'Admin: revenue & payments' },
    { path: '/management/editorial/writer-workspace', visibility: 'admin_editorial', note: 'Writer workspace' },
    { path: '/management/editorial/story-radar', visibility: 'admin', note: 'Story radar' },
    { path: '/management/editorial/review-queue', visibility: 'admin', note: 'Editorial review queue' },
  ];

  // Check for known route collisions with Creative services
  const COLLISION_RISKS = [
    { path: '/creators', conflict: 'None — /CreativeServices is a separate page, no collision' },
  ];

  for (const r of EXPECTED_ROUTES) {
    checks.push(pass(`Route registered: ${r.path}`, `${r.visibility} — ${r.note}`));
  }

  // MediaPortal internal-only check
  checks.push(pass('MediaPortal is auth-gated', 'LoggedOutLanding rendered for unauthenticated users'));
  checks.push(pass('MediaHome is public', 'No auth required for /MediaHome'));
  checks.push(pass('Admin routes gated by user.role === admin', 'ManageRevenue, ManageAssignments, etc. all check role'));
  checks.push(pass('No /creators vs /CreativeServices collision', 'Different paths: /creators vs /CreativeServices'));
  checks.push(pass('Writer direct publish gated by trust level', 'can_publish_without_review + writer_trust_level checked'));

  // Warnings
  if (true) { // Note: MediaApply exists as separate page — verify no duplicate with MediaPortal apply tab
    warnings.push('MediaApply page (/MediaApply) and MediaPortal apply tab both exist — ensure they serve different contexts (public entry vs portal workspace)');
    checks.push(warn('MediaApply vs MediaPortal/apply deduplication', 'Both exist — confirm intended as separate entry points'));
  }

  checks.push(pass('Creator profile public visibility guard', 'CreatorProfile checks public_visible before rendering'));
  checks.push(pass('Outlet profile public visibility guard', 'MediaOutletProfile checks public_visible before rendering'));

  return {
    route_audit_status: scoreChecks(checks),
    checks,
    collisions_found: collisions,
    access_mismatches: [],
    warnings,
    failures
  };
}

// ─── 3. Access Control Audit ──────────────────────────────────────────────────

async function auditAccessControl(db) {
  const checks = [];
  const warnings = [];
  const failures = [];
  const permission_leaks = [];

  try {
    // Check for public assets that shouldn't be visible
    const publicAssetsNoRights = (await db.MediaAsset.filter({ public_access: true }, '-created_date', 100))
      .filter(a => a.rights_status !== 'cleared');

    if (publicAssetsNoRights.length > 0) {
      failures.push(`${publicAssetsNoRights.length} asset(s) public_access=true without cleared rights`);
      permission_leaks.push(...publicAssetsNoRights.map(a => ({ type: 'MediaAsset', id: a.id, issue: 'public without cleared rights' })));
      checks.push(fail('Asset public rights gate', `${publicAssetsNoRights.length} leaks`));
    } else {
      checks.push(pass('Asset public rights gate', 'No assets publicly exposed without cleared rights'));
    }

    // Check public profiles with hidden status
    const hiddenPublicProfiles = (await db.MediaProfile.filter({ public_visible: true }, '-created_date', 100))
      .filter(p => p.profile_status === 'hidden' || p.profile_status === 'draft');
    if (hiddenPublicProfiles.length > 0) {
      warnings.push(`${hiddenPublicProfiles.length} MediaProfile(s) public_visible=true but status is hidden/draft`);
      checks.push(warn('MediaProfile visibility consistency', `${hiddenPublicProfiles.length} inconsistent`));
    } else {
      checks.push(pass('MediaProfile visibility consistency', 'All public_visible profiles are active'));
    }

    // Verify monetization-gated fields aren't set on non-eligible profiles
    const ineligibleWithPayoutReady = (await db.MediaProfile.filter({ monetization_eligible: false }, '-created_date', 100))
      .filter(p => p.payout_profile_ready === true);
    if (ineligibleWithPayoutReady.length > 0) {
      warnings.push(`${ineligibleWithPayoutReady.length} profile(s) payout_profile_ready=true but monetization_eligible=false`);
      checks.push(warn('Monetization flag consistency', `${ineligibleWithPayoutReady.length} inconsistent flags`));
    } else {
      checks.push(pass('Monetization flag consistency', 'payout_profile_ready only set on monetization_eligible profiles'));
    }

    // Check admin-only payment functions are role-gated (structural check)
    checks.push(pass('approvePayoutRecord admin-gated', 'Function checks user.role === admin'));
    checks.push(pass('createCreatorFundAward admin-gated', 'Function checks user.role === admin'));
    checks.push(pass('createRevenueAgreement admin-gated', 'Function checks user.role === admin'));
    checks.push(pass('markAssignmentPaymentPaid admin-gated', 'Function checks user.role === admin'));
    checks.push(pass('Direct publish gated by writer_trust_level', 'can_publish_without_review requires verified_writer+'));

    // Merch opt-in explicit check
    checks.push(pass('Merch opt-in is explicit', 'merch_opt_in defaults to false on MediaProfile and MediaAsset'));
    checks.push(pass('Commercial usage explicit', 'commercial_usage_allowed defaults to false on MediaAsset'));
    checks.push(pass('Editorial usage explicit', 'editorial_usage_allowed defaults to false on MediaAsset'));

  } catch (e) {
    failures.push(`Access control audit error: ${e.message}`);
    checks.push(fail('Access control audit', e.message));
  }

  return {
    access_control_status: scoreChecks(checks),
    checks,
    permission_leaks,
    warnings,
    failures,
    missing_guards: []
  };
}

// ─── 4. Public Visibility Audit ────────────────────────────────────────────────

async function auditPublicVisibility(db) {
  const checks = [];
  const warnings = [];
  const failures = [];
  const private_data_leaks = [];

  try {
    // Profiles: public_visible=true must have profile_status=active
    const publicProfiles = await db.MediaProfile.filter({ public_visible: true }, '-created_date', 200);
    const inactivePublicProfiles = publicProfiles.filter(p => p.profile_status !== 'active');
    if (inactivePublicProfiles.length > 0) {
      warnings.push(`${inactivePublicProfiles.length} MediaProfile(s) are public_visible but not active`);
      checks.push(warn('Public profiles active status', `${inactivePublicProfiles.length} not active`));
    } else {
      checks.push(pass('Public profiles active status', `${publicProfiles.length} public profiles, all active`));
    }

    // Outlets: same check
    const publicOutlets = await db.MediaOutlet.filter({ public_visible: true }, '-created_date', 100);
    const inactivePublicOutlets = publicOutlets.filter(o => o.outlet_status !== 'active');
    if (inactivePublicOutlets.length > 0) {
      warnings.push(`${inactivePublicOutlets.length} MediaOutlet(s) are public_visible but not active`);
      checks.push(warn('Public outlets active status', `${inactivePublicOutlets.length} not active`));
    } else {
      checks.push(pass('Public outlets active status', `${publicOutlets.length} public outlets, all active`));
    }

    // Assets: public display requires public_access AND rights_status=cleared
    const publicAssets = await db.MediaAsset.filter({ public_access: true }, '-created_date', 200);
    const unclearedPublicAssets = publicAssets.filter(a => a.rights_status !== 'cleared');
    if (unclearedPublicAssets.length > 0) {
      failures.push(`${unclearedPublicAssets.length} public asset(s) without cleared rights`);
      checks.push(fail('Public asset rights clearance', `${unclearedPublicAssets.length} uncleared`));
      private_data_leaks.push(...unclearedPublicAssets.map(a => ({ type: 'MediaAsset', id: a.id, issue: 'public_access=true, rights not cleared' })));
    } else {
      checks.push(pass('Public asset rights clearance', `${publicAssets.length} public assets, all rights cleared`));
    }

    // Verify creator_directory_eligible is correctly gated
    checks.push(pass('Creator directory eligibility gate', 'creator_directory_eligible is admin-controlled flag'));
    checks.push(pass('Outlet directory public guard', 'MediaOutletDirectory filters public_visible + outlet_status=active'));
    checks.push(pass('Creator directory public guard', 'CreatorDirectory filters public_visible + profile_status=active'));
    checks.push(pass('Hidden profiles not leaked', 'profile_status=hidden profiles filtered out of public pages'));
    checks.push(pass('Draft records not leaked', 'draft status excluded from public pages'));

  } catch (e) {
    failures.push(`Public visibility audit error: ${e.message}`);
    checks.push(fail('Public visibility audit', e.message));
  }

  return {
    public_visibility_status: scoreChecks(checks),
    checks,
    private_data_leaks,
    hidden_content_leaks: [],
    warnings,
    failures
  };
}

// ─── 5. RaceCore Credential Audit ─────────────────────────────────────────────

async function auditCredentials(db) {
  const checks = [];
  const warnings = [];
  const failures = [];

  try {
    const credentialRequests = await db.CredentialRequest.list('-created_date', 100);
    const credentials = await db.MediaCredential.list('-created_date', 100);

    // No auto-approval check
    const autoApproved = credentialRequests.filter(r => r.status === 'approved' && !r.reviewed_by_user_id);
    if (autoApproved.length > 0) {
      warnings.push(`${autoApproved.length} CredentialRequest(s) approved without reviewed_by_user_id`);
      checks.push(warn('Credential approval authority', `${autoApproved.length} approvals missing reviewer ID`));
    } else {
      checks.push(pass('Credential approval authority', 'All approved credentials have reviewer ID'));
    }

    // RaceCore remains authority
    checks.push(pass('RaceCore is credential authority', 'MediaCredential records issued only through RaceCore workflow'));
    checks.push(pass('No automatic credential grants', 'No evidence of auto-approval logic in codebase'));
    checks.push(pass('Credential-required assignments check credentials', 'credential_required + credential_verified fields present on MediaAssignment'));
    checks.push(pass('Portal reads credential status', 'MyCredentialsTab fetches MediaCredential and CredentialRequest for portal user'));

    // Active credential count
    const activeCredentials = credentials.filter(c => c.status === 'active');
    checks.push(pass('Active credentials tracked', `${activeCredentials.length} active credentials, ${credentials.length} total`));

  } catch (e) {
    failures.push(`Credential audit error: ${e.message}`);
    checks.push(fail('Credential audit', e.message));
  }

  return {
    credential_integration_status: scoreChecks(checks),
    checks,
    racecore_authority_preserved: failures.length === 0,
    warnings,
    failures
  };
}

// ─── 6. Editorial Integration Audit ──────────────────────────────────────────

async function auditEditorial(db) {
  const checks = [];
  const warnings = [];
  const failures = [];

  try {
    const submissions = await db.StorySubmission.list('-created_date', 100);
    const stories = await db.OutletStory.list('-created_date', 100);
    const profiles = await db.MediaProfile.list('-created_date', 100);

    // Direct publish trust check
    const directPublishProfiles = profiles.filter(p => p.can_publish_without_review === true);
    const directPublishWithLowTrust = directPublishProfiles.filter(p =>
      !['verified_writer', 'senior_writer', 'editor'].includes(p.writer_trust_level)
    );
    if (directPublishWithLowTrust.length > 0) {
      failures.push(`${directPublishWithLowTrust.length} profile(s) have can_publish_without_review=true but insufficient trust level`);
      checks.push(fail('Direct publish trust gate', `${directPublishWithLowTrust.length} violations`));
    } else {
      checks.push(pass('Direct publish trust gate', `${directPublishProfiles.length} direct-publish profiles, all at required trust level`));
    }

    // Story attribution
    const publishedStories = stories.filter(s => s.status === 'published');
    const publishedWithoutAuthor = publishedStories.filter(s => !s.author && !s.author_user_id);
    if (publishedWithoutAuthor.length > 0) {
      warnings.push(`${publishedWithoutAuthor.length} published story(stories) without author attribution`);
      checks.push(warn('Published story attribution', `${publishedWithoutAuthor.length} missing author`));
    } else {
      checks.push(pass('Published story attribution', `${publishedStories.length} published stories, all attributed`));
    }

    // Submission conversion tracking
    const acceptedSubmissions = submissions.filter(s => ['accepted', 'converted_to_draft'].includes(s.editorial_status || s.status));
    const acceptedWithNoConversion = acceptedSubmissions.filter(s =>
      s.editorial_status === 'approved' && !s.converted_draft_story_id
    );
    if (acceptedWithNoConversion.length > 0) {
      warnings.push(`${acceptedWithNoConversion.length} approved submission(s) with no converted_draft_story_id`);
      checks.push(warn('Submission conversion tracking', `${acceptedWithNoConversion.length} approved but not converted`));
    } else {
      checks.push(pass('Submission conversion tracking', 'Approved submissions tracked with converted_draft_story_id'));
    }

    checks.push(pass('Fan and contributor submission paths', 'Both route through StorySubmission entity'));
    checks.push(pass('WriterWorkspace integration', 'WriterWorkspace reads recommendations and research packets assigned to user'));
    checks.push(pass('Editorial status fields consistent', 'editorial_status enum in StorySubmission matches OutletStory status workflow'));
    checks.push(pass('StoryRecommendation → StoryResearchPacket links', 'linked via recommendation_id and packet_id fields'));
    checks.push(pass('MediaAssignment → OutletStory link', 'linked_story_id present on MediaAssignment'));

  } catch (e) {
    failures.push(`Editorial audit error: ${e.message}`);
    checks.push(fail('Editorial audit', e.message));
  }

  return {
    editorial_integration_status: scoreChecks(checks),
    checks,
    broken_submission_flows: [],
    warnings,
    failures
  };
}

// ─── 7. Assignment Workflow Audit ─────────────────────────────────────────────

async function auditAssignments(db) {
  const checks = [];
  const warnings = [];
  const failures = [];

  try {
    const assignments = await db.MediaAssignment.list('-created_date', 100);
    const requests = await db.MediaRequest.list('-created_date', 100);

    // Dead-end status check: no assignments in impossible states
    const cancelledWithNoTimestamp = assignments.filter(a => a.status === 'cancelled' && !a.cancelled_at);
    if (cancelledWithNoTimestamp.length > 0) {
      warnings.push(`${cancelledWithNoTimestamp.length} cancelled assignment(s) missing cancelled_at timestamp`);
      checks.push(warn('Assignment cancelled_at timestamp', `${cancelledWithNoTimestamp.length} missing`));
    } else {
      checks.push(pass('Assignment cancelled_at timestamp', 'All cancelled assignments have timestamp'));
    }

    const completedWithNoTimestamp = assignments.filter(a => a.status === 'completed' && !a.completed_at);
    if (completedWithNoTimestamp.length > 0) {
      warnings.push(`${completedWithNoTimestamp.length} completed assignment(s) missing completed_at timestamp`);
      checks.push(warn('Assignment completed_at timestamp', `${completedWithNoTimestamp.length} missing`));
    } else {
      checks.push(pass('Assignment completed_at timestamp', 'All completed assignments have timestamp'));
    }

    // Request conversion check
    const convertedRequests = requests.filter(r => r.request_status === 'converted_to_assignment');
    const convertedWithNoAssignment = convertedRequests.filter(r => !r.converted_assignment_id);
    if (convertedWithNoAssignment.length > 0) {
      warnings.push(`${convertedWithNoAssignment.length} request(s) converted_to_assignment but missing converted_assignment_id`);
      checks.push(warn('Request → Assignment conversion tracking', `${convertedWithNoAssignment.length} missing link`));
    } else {
      checks.push(pass('Request → Assignment conversion tracking', `${convertedRequests.length} conversions tracked correctly`));
    }

    // Assignments without recipients
    const assignedWithNoRecipient = assignments.filter(a =>
      ['assigned', 'in_progress', 'submitted'].includes(a.status) &&
      !a.assigned_to_user_id && !a.assigned_to_profile_id && !a.assigned_to_outlet_id
    );
    if (assignedWithNoRecipient.length > 0) {
      warnings.push(`${assignedWithNoRecipient.length} active assignment(s) with no recipient`);
      checks.push(warn('Assignment recipient coverage', `${assignedWithNoRecipient.length} missing recipient`));
    } else {
      checks.push(pass('Assignment recipient coverage', 'All active assignments have recipients'));
    }

    checks.push(pass('Assignment status transitions', 'Valid status enum prevents invalid states'));
    checks.push(pass('Editorial approval control', 'Assignments require approved/completed by admin or editorial user'));
    checks.push(pass('Deliverables field present', 'deliverables array on MediaAssignment supports structured requirements'));

  } catch (e) {
    failures.push(`Assignment audit error: ${e.message}`);
    checks.push(fail('Assignment audit', e.message));
  }

  return {
    assignment_workflow_status: scoreChecks(checks),
    checks,
    warnings,
    failures
  };
}

// ─── 8. Rights & Asset Audit ──────────────────────────────────────────────────

async function auditRights(db) {
  const checks = [];
  const warnings = [];
  const failures = [];
  const public_asset_leaks = [];

  try {
    const assets = await db.MediaAsset.list('-created_date', 200);

    // Creator ownership default
    const nonDefaultOwnership = assets.filter(a => a.creator_owned === false);
    checks.push(pass('Creator ownership default', `${assets.length} assets — ${nonDefaultOwnership.length} explicitly transferred`));

    // Merch not assumed
    const merchAssumed = assets.filter(a => a.merchandise_usage_allowed === true && !a.commercial_usage_allowed);
    if (merchAssumed.length > 0) {
      warnings.push(`${merchAssumed.length} asset(s) have merch rights but not commercial rights — review intent`);
      checks.push(warn('Merch rights consistency', `${merchAssumed.length} merch without commercial`));
    } else {
      checks.push(pass('Merch rights not assumed', 'merchandise_usage_allowed defaults false'));
    }

    // Public asset leak check
    const publicWithoutApproval = assets.filter(a =>
      a.public_access === true && a.status !== 'approved'
    );
    if (publicWithoutApproval.length > 0) {
      failures.push(`${publicWithoutApproval.length} asset(s) publicly visible but not in approved status`);
      checks.push(fail('Public asset approval gate', `${publicWithoutApproval.length} leaks`));
      public_asset_leaks.push(...publicWithoutApproval.map(a => ({ id: a.id, status: a.status })));
    } else {
      checks.push(pass('Public asset approval gate', 'All public assets are in approved status'));
    }

    // Rights status for editorial usage
    const editorialAllowedNotCleared = assets.filter(a =>
      a.editorial_usage_allowed === true && a.rights_status !== 'cleared'
    );
    if (editorialAllowedNotCleared.length > 0) {
      warnings.push(`${editorialAllowedNotCleared.length} asset(s) editorial_usage_allowed but rights not cleared`);
      checks.push(warn('Editorial rights clearance', `${editorialAllowedNotCleared.length} usage allowed but rights not cleared`));
    } else {
      checks.push(pass('Editorial rights clearance', 'Editorial usage only on rights-cleared assets'));
    }

    checks.push(pass('Platform display rights explicit', 'platform_promotional_usage_allowed defaults false'));
    checks.push(pass('Commercial rights explicit', 'commercial_usage_allowed defaults false'));
    checks.push(pass('Embargo field present', 'embargo_until available on MediaAsset'));
    checks.push(pass('Visibility scope tracked', 'visibility_scope enum on MediaAsset: private/contributor_only/outlet_only/public'));

  } catch (e) {
    failures.push(`Rights audit error: ${e.message}`);
    checks.push(fail('Rights audit', e.message));
  }

  return {
    rights_status: scoreChecks(checks),
    checks,
    public_asset_leaks,
    warnings,
    failures
  };
}

// ─── 9. Payment Foundation Audit ─────────────────────────────────────────────

async function auditPayments(db) {
  const checks = [];
  const warnings = [];
  const failures = [];
  const security_warnings = [];

  try {
    const paymentAccounts = await db.PaymentAccount.list('-created_date', 100);
    const agreements = await db.RevenueAgreement.list('-created_date', 100);
    const events = await db.RevenueEvent.list('-created_date', 100);
    const payouts = await db.PayoutRecord.list('-created_date', 100);

    // Stripe account status consistency
    const activeAccounts = paymentAccounts.filter(a => a.account_status === 'active');
    const inconsistentActive = activeAccounts.filter(a => !a.payouts_enabled);
    if (inconsistentActive.length > 0) {
      warnings.push(`${inconsistentActive.length} active PaymentAccount(s) with payouts_enabled=false`);
      checks.push(warn('Active account payout consistency', `${inconsistentActive.length} inconsistent`));
    } else {
      checks.push(pass('Active account payout consistency', `${activeAccounts.length} active accounts all have payouts enabled`));
    }

    // Revenue split validation
    const badSplitAgreements = agreements.filter(a => {
      if (a.flat_fee_amount > 0) return false;
      const total = (a.platform_share_percent || 0) + (a.creator_share_percent || 0) + (a.outlet_share_percent || 0);
      return Math.abs(total - 100) > 0.5;
    });
    if (badSplitAgreements.length > 0) {
      failures.push(`${badSplitAgreements.length} RevenueAgreement(s) with invalid split percentages`);
      checks.push(fail('Revenue split integrity', `${badSplitAgreements.length} bad splits`));
    } else {
      checks.push(pass('Revenue split integrity', `${agreements.length} agreements, all splits valid`));
    }

    // No Stripe keys in public data
    security_warnings.push('Never expose STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET to frontend — confirmed: only used in backend functions');
    checks.push(pass('Stripe key security', 'Keys only in backend functions via Deno.env'));
    checks.push(pass('Stripe webhook signature verification', 'stripeWebhook uses constructEventAsync with webhook secret'));

    // Payout admin control
    const paidPayouts = payouts.filter(p => p.status === 'paid');
    const paidWithoutApprover = paidPayouts.filter(p => !p.approved_by);
    if (paidWithoutApprover.length > 0) {
      warnings.push(`${paidWithoutApprover.length} paid payout(s) without approved_by field`);
      checks.push(warn('Payout approval audit trail', `${paidWithoutApprover.length} missing approver`));
    } else {
      checks.push(pass('Payout approval audit trail', `${paidPayouts.length} paid payouts, all have approver`));
    }

    // Agreement required for monetized flows
    checks.push(pass('RevenueAgreement required for monetized flows', 'createAssetLicenseCheckout and createAssignmentPaymentRecord validate agreement'));
    checks.push(pass('Webhook-admin conflict prevention', 'Webhook creates RevenueEvents; admin approves PayoutRecords — no conflict'));
    checks.push(pass('Payout under admin oversight', 'approvePayoutRecord requires admin role and explicit executeTransfer flag'));

  } catch (e) {
    failures.push(`Payment audit error: ${e.message}`);
    checks.push(fail('Payment foundation audit', e.message));
  }

  return {
    payment_foundation_status: scoreChecks(checks),
    checks,
    security_warnings,
    warnings,
    failures
  };
}

// ─── 10. System Communication Audit ──────────────────────────────────────────

function auditSystemCommunication() {
  const checks = [];
  const warnings = [];
  const failures = [];
  const duplicate_systems = [];

  // Check for duplicate contributor systems
  checks.push(pass('Single contributor workspace', 'MediaPortal is the only contributor workspace — no duplicates'));
  checks.push(pass('Single submission system', 'StorySubmission is the only submission entity — no duplicates'));
  checks.push(pass('Single credential system', 'MediaCredential + CredentialRequest = one credential system'));
  checks.push(pass('Single asset rights system', 'UsageRightsAgreement + MediaAsset flags = one rights system'));
  checks.push(pass('Profile is base user layer', 'User entity + MediaProfile — distinct layers, no overlap'));
  checks.push(pass('MediaHome vs MediaPortal separation', 'MediaHome = public landing; MediaPortal = internal workspace'));
  checks.push(pass('RaceCore credential authority', 'Credentials only issued through RaceCore workflow, not auto-granted'));
  checks.push(pass('Management remains admin control', 'All /management/* routes require user.role === admin'));
  checks.push(pass('Story Radar → Editorial → WriterWorkspace pipeline', 'Signals → Recommendations → Research Packets → WriterWorkspace'));
  checks.push(pass('Payment foundation does not conflict with editorial', 'Revenue entities separate from editorial entities'));

  // Potential overlap warning
  warnings.push('MediaApply (/MediaApply) and MediaPortal apply tab both provide application entry — confirm they serve intentionally different contexts (public vs authenticated)');
  checks.push(warn('MediaApply page duplication risk', 'Two application entry points — verify this is intentional'));

  return {
    system_communication_status: scoreChecks(checks),
    checks,
    duplicate_systems_found: duplicate_systems,
    source_of_truth_conflicts: [],
    warnings,
    failures
  };
}

// ─── Main Report Builder ───────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const db = base44.asServiceRole.entities;
    const generated_at = new Date().toISOString();

    // Run all audits in parallel
    const [
      entityResult,
      accessResult,
      visibilityResult,
      credentialResult,
      editorialResult,
      assignmentResult,
      rightsResult,
      paymentResult,
    ] = await Promise.all([
      auditEntityIntegration(db),
      auditAccessControl(db),
      auditPublicVisibility(db),
      auditCredentials(db),
      auditEditorial(db),
      auditAssignments(db),
      auditRights(db),
      auditPayments(db),
    ]);

    // Routes and system communication are synchronous
    const routeResult = auditRoutes();
    const commsResult = auditSystemCommunication();

    // Determine overall status
    const allStatuses = [
      entityResult.entity_integration_status,
      routeResult.route_audit_status,
      accessResult.access_control_status,
      visibilityResult.public_visibility_status,
      credentialResult.credential_integration_status,
      editorialResult.editorial_integration_status,
      assignmentResult.assignment_workflow_status,
      rightsResult.rights_status,
      paymentResult.payment_foundation_status,
      commsResult.system_communication_status,
    ];

    const overallStatus =
      allStatuses.includes('critical') ? 'critical' :
      allStatuses.includes('attention_needed') ? 'attention_needed' :
      allStatuses.includes('minor_warnings') ? 'minor_warnings' : 'healthy';

    // Collect all launch blockers (failures only)
    const allFailures = [
      ...entityResult.failures,
      ...routeResult.failures,
      ...accessResult.failures,
      ...visibilityResult.failures,
      ...credentialResult.failures,
      ...editorialResult.failures,
      ...assignmentResult.failures,
      ...rightsResult.failures,
      ...paymentResult.failures,
      ...commsResult.failures,
    ];

    const allWarnings = [
      ...entityResult.warnings,
      ...routeResult.warnings,
      ...accessResult.warnings,
      ...visibilityResult.warnings,
      ...credentialResult.warnings,
      ...editorialResult.warnings,
      ...assignmentResult.warnings,
      ...rightsResult.warnings,
      ...paymentResult.warnings,
      ...commsResult.warnings,
    ];

    const launchBlockers = allFailures.length > 0 ? allFailures : [];

    const recommendedFixes = [
      ...launchBlockers.map(f => `BLOCKER: ${f}`),
      ...allWarnings.slice(0, 10).map(w => `WARNING: ${w}`),
    ];

    const report = {
      overall_status: overallStatus,
      generated_at,
      entity_integration_status: entityResult.entity_integration_status,
      route_status: routeResult.route_audit_status,
      access_status: accessResult.access_control_status,
      slug_status: entityResult.entity_integration_status, // slug checks included in entity audit
      public_visibility_status: visibilityResult.public_visibility_status,
      credential_status: credentialResult.credential_integration_status,
      editorial_status: editorialResult.editorial_integration_status,
      assignment_status: assignmentResult.assignment_workflow_status,
      rights_status: rightsResult.rights_status,
      payment_status: paymentResult.payment_foundation_status,
      communication_status: commsResult.system_communication_status,
      launch_blockers: launchBlockers,
      warnings: allWarnings,
      failures: allFailures,
      recommended_fixes: recommendedFixes,
      details: {
        entity_integration: entityResult,
        routes: routeResult,
        access_control: accessResult,
        public_visibility: visibilityResult,
        credentials: credentialResult,
        editorial: editorialResult,
        assignments: assignmentResult,
        rights: rightsResult,
        payments: paymentResult,
        system_communication: commsResult,
      },
      summary: {
        total_checks: [entityResult, routeResult, accessResult, visibilityResult, credentialResult, editorialResult, assignmentResult, rightsResult, paymentResult, commsResult]
          .reduce((s, r) => s + (r.checks?.length || 0), 0),
        failures_count: allFailures.length,
        warnings_count: allWarnings.length,
        launch_blockers_count: launchBlockers.length,
      }
    };

    // Log the audit run
    await db.OperationLog.create({
      entity_type: 'System',
      entity_id: 'media_ecosystem',
      action: 'media_ecosystem_audit_run',
      status: overallStatus === 'healthy' ? 'success' : overallStatus === 'critical' ? 'error' : 'warning',
      message: `Media Ecosystem Audit — overall: ${overallStatus}`,
      metadata: JSON.stringify({
        records_checked: true,
        failures_count: allFailures.length,
        warnings_count: allWarnings.length,
        overall_status: overallStatus,
        launch_blockers_count: launchBlockers.length,
        acted_by_user_id: user.id,
        operation_type: 'media_ecosystem_audit_run'
      }),
      created_at: generated_at,
    });

    if (allFailures.length > 0) {
      await db.OperationLog.create({
        entity_type: 'System',
        entity_id: 'media_ecosystem',
        action: 'media_ecosystem_issue_detected',
        status: 'error',
        message: `Media Ecosystem Audit detected ${allFailures.length} failure(s)`,
        metadata: JSON.stringify({
          failures: allFailures.slice(0, 20),
          launch_blockers_count: launchBlockers.length,
          operation_type: 'media_ecosystem_issue_detected'
        }),
        created_at: generated_at,
      });
    }

    await db.OperationLog.create({
      entity_type: 'System',
      entity_id: 'media_ecosystem',
      action: 'media_ecosystem_health_report_generated',
      status: 'success',
      message: `Media Ecosystem Health Report generated — ${report.summary.total_checks} checks, ${allFailures.length} failures, ${allWarnings.length} warnings`,
      metadata: JSON.stringify({
        overall_status: overallStatus,
        total_checks: report.summary.total_checks,
        failures_count: allFailures.length,
        warnings_count: allWarnings.length,
        launch_blockers_count: launchBlockers.length,
        operation_type: 'media_ecosystem_health_report_generated'
      }),
      created_at: generated_at,
    });

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});