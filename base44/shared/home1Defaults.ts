/**
 * home1Defaults.ts
 *
 * Default Home1 configuration — seeded from the CURRENT visible Home1
 * implementation. These values guarantee that when Home1 is wired to
 * published settings in Phase 2B, the public page remains visually and
 * content-identical to today.
 *
 * Shared by getHome1Settings, saveHome1Draft, and publishHome1.
 */

export function getDefaultHome1Config() {
  return {
    hero: {
      enabled: true,
      eyebrow: 'MOTORSPORTS // PEOPLE // CULTURE // COMMUNITY',
      headline_line1: 'HIJINX',
      headline_line2: 'A BIGGER',
      headline_line3: 'TOMORROW.',
      accent_line: 'TOMORROW.',
      supporting_copy:
        'Connecting people, products, stories and technology to keep the culture moving forward.',
      desktop_media_url:
        'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/15d41358e_generated_image.png',
      mobile_media_url: '',
      desktop_image_position: '68% center',
      mobile_image_position: 'center center',
      cta1: {
        enabled: true,
        label: 'EXPLORE THE HIJINX WORLD',
        destination: { type: 'none', internal_page: '', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
        style: 'solid',
      },
      cta2: {
        enabled: true,
        label: 'WATCH THE FILM',
        destination: { type: 'none', internal_page: '', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
        style: 'outline',
      },
      right_side_phrase: 'Different Terrain.\nSame People.',
      show_right_side_phrase: true,
      bottom_editorial: 'RACE WEEKENDS // NEW DROPS // REAL STORIES // OPPORTUNITY // ALL IN MOTION',
      show_bottom_editorial: true,
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
    next_up: {
      enabled: true,
      eyebrow: 'WHERE MOTORSPORTS HAPPENS.',
      headline: 'NEXT UP',
      supporting_copy: '',
      view_calendar_cta: {
        enabled: true,
        label: 'VIEW FULL CALENDAR',
        destination: { type: 'internal_page', internal_page: '/Directory?cat=events', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
      },
      mode: 'auto',
      pinned_event_ids: [],
      display_limit: 10,
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
    one_brand: {
      enabled: true,
      eyebrow: 'A Connected Motorsports Community',
      headline: 'One Brand.\nA Bigger Movement.',
      body_copy_1:
        'HIJINX connects the pieces of motorsports that usually live separately.',
      body_copy_2:
        'Apparel, media, information, racing, commerce, tools and community — brought together to create more ways for people to participate, discover, build and keep moving forward.',
      pillars: [
        { name: 'PEOPLE', desc: 'The reason.' },
        { name: 'CULTURE', desc: 'The connection.' },
        { name: 'OPPORTUNITY', desc: 'The goal.' },
        { name: 'MOTION', desc: 'The mindset.' },
      ],
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
    ecosystem: {
      enabled: true,
      eyebrow_badge: 'Built For What Moves You',
      headline: 'Explore The Hijinx Ecosystem',
      supporting_phrase: 'Different Paths.\nSame Direction.',
      tiles: [
        {
          key: 'SHOP', enabled: true, title: 'SHOP HIJINX', descriptor: 'APPAREL + COLLECTIONS',
          support: 'Gear for the ones who keep it moving.', cta_label: 'SHOP NOW',
          image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1200&q=80',
          alt: 'HIJINX apparel — hoodie and cap laid out race weekend',
          accent_word: null, cta_style: 'solid',
          destination: { type: 'internal_page', internal_page: '/ApparelHome', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
          large: true, sort_order: 0,
        },
        {
          key: 'OUTLET', enabled: true, title: 'THE OUTLET', descriptor: 'STORIES + MEDIA + CULTURE',
          support: 'The pulse of motorsports.', cta_label: 'READ STORIES',
          image: 'https://images.unsplash.com/photo-1502920917128-1aa1c652f298?auto=format&fit=crop&w=1200&q=80',
          alt: 'Photographer with camera covering a race event in the paddock',
          accent_word: null, cta_style: 'outline',
          destination: { type: 'internal_page', internal_page: '/OutletHome', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
          large: true, sort_order: 1,
        },
        {
          key: 'INDEX46', enabled: true, title: 'INDEX46', descriptor: 'MOTORSPORTS INFORMATION',
          support: 'Drivers. Teams. Tracks. Series. Events.', cta_label: 'EXPLORE',
          image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab8b7?auto=format&fit=crop&w=900&q=80',
          alt: 'Off-road truck mid-air at a desert race',
          accent_word: null, cta_style: 'ghost',
          destination: { type: 'internal_page', internal_page: '/MotorsportsHome', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
          large: false, sort_order: 2,
        },
        {
          key: 'MARKETPLACE', enabled: true, title: 'MARKETPLACE', descriptor: 'BUY // SELL // BUILD',
          support: 'Parts. Builds. Equipment. Opportunity.', cta_label: 'BROWSE',
          image: 'https://images.unsplash.com/photo-1601362840410-2f0b3a4a7e76?auto=format&fit=crop&w=900&q=80',
          alt: 'Race trailer interior with tires and parts',
          accent_word: null, cta_style: 'ghost',
          destination: { type: 'internal_page', internal_page: '/MarketplaceHome', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
          large: false, sort_order: 3,
        },
        {
          key: 'RACECORE', enabled: true, title: 'RACE CORE', descriptor: 'RACER TOOLS + OPERATIONS',
          support: 'Built for competitors.', cta_label: 'GET STARTED',
          image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
          alt: 'Laptop displaying race timing and operations data',
          accent_word: 'CORE', cta_style: 'ghost',
          destination: { type: 'internal_page', internal_page: '/racecore', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
          large: false, sort_order: 4,
        },
        {
          key: 'COMMUNITY', enabled: true, title: 'COMMUNITY', descriptor: 'PEOPLE + OPPORTUNITY',
          support: 'Racers. Creators. Fans. All in motion.', cta_label: 'JOIN IN',
          image: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=900&q=80',
          alt: 'Group of racers and crew gathered together in the paddock',
          accent_word: null, cta_style: 'ghost',
          destination: { type: 'internal_page', internal_page: '/join', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
          large: false, sort_order: 5,
        },
      ],
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
    whats_happening: {
      enabled: true,
      eyebrow: 'Across The Ecosystem',
      headline: "What's Happening At HIJINX",
      supporting_copy: 'The Latest From Across The HIJINX World.',
      display_limit: 5,
      sources: [
        { key: 'INDEX46', enabled: true, priority: 1 },
        { key: 'RACECORE', enabled: true, priority: 2 },
        { key: 'HIJINX', enabled: true, priority: 3 },
        { key: 'OUTLET', enabled: true, priority: 4 },
        { key: 'MARKETPLACE', enabled: true, priority: 5 },
        { key: 'COMMUNITY', enabled: true, priority: 6 },
      ],
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
    from_the_outlet: {
      enabled: true,
      eyebrow: 'Media // Stories // Motorsports',
      headline: 'From The Outlet',
      supporting_tagline: 'The Pulse Of Motorsports.',
      view_all_cta: {
        enabled: true,
        label: 'View All Stories',
        destination: { type: 'internal_page', internal_page: '/OutletHome', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
      },
      lead_mode: 'auto',
      pinned_lead_story_id: '',
      secondary_story_count: 3,
      category_rail_enabled: true,
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
    featured_apparel: {
      enabled: true,
      section_label: 'Hijinx Apparel',
      eyebrow: 'Current Drop',
      headline: 'Featured Products',
      supporting_copy: 'Tees. Hoodies. Headwear. More.',
      lifestyle_image: 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/627c0f160_generated_image.png',
      desktop_image_position: 'center center',
      mobile_image_position: 'center center',
      product_mode: 'newest',
      shopify_collection_handle: '',
      product_display_count: 6,
      shop_all_cta: {
        enabled: true,
        label: 'Shop the Collection',
        destination: { type: 'external', internal_page: '', entity_type: '', entity_id: '', external_url: 'https://hijinx.com', open_in_new_tab: true },
      },
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
    closing_cta: {
      enabled: true,
      eyebrow: 'BE PART OF',
      headline: 'SOMETHING BIGGER.',
      accent_text: '',
      supporting_line_1: 'Racers. Builders. Fans. Creators.',
      supporting_line_2: 'Everyone has a place here.',
      background_image: 'https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/c7e783970_generated_image.png',
      desktop_image_position: 'center center',
      mobile_image_position: 'center center',
      cta: {
        enabled: true,
        label: 'Join the Movement',
        destination: { type: 'internal_page', internal_page: '/join', entity_type: '', entity_id: '', entity_slug: '', entity_name: '', external_url: '', open_in_new_tab: false },
      },
      right_side_words: ['PEOPLE', 'PLACES', 'PROGRESS', 'NO LIMITS'],
      show_right_side_words: true,
      schedule: { enabled: false, start_at: '', end_at: '' },
    },
  };
}

const ECOSYSTEM_KEYS = ['SHOP', 'OUTLET', 'INDEX46', 'MARKETPLACE', 'RACECORE', 'COMMUNITY'];
const VALID_CTA_TYPES = ['internal_page', 'entity', 'external', 'none'];

function validateCta(cta, path) {
  if (!cta) return null;
  if (cta.enabled) {
    if (!cta.label || !cta.label.trim()) return `${path}: enabled CTA requires a label`;
  }
  if (cta.destination) {
    const d = cta.destination;
    if (!VALID_CTA_TYPES.includes(d.type)) return `${path}: invalid destination type`;
    if (d.type === 'internal_page' && !d.internal_page) return `${path}: internal page destination required`;
    if (d.type === 'entity' && !d.entity_id) return `${path}: entity destination required`;
    if (d.type === 'external') {
      if (!d.external_url || !d.external_url.trim()) return `${path}: external URL required`;
      try { new URL(d.external_url); } catch { return `${path}: invalid external URL`; }
    }
  }
  return null;
}

function validateSchedule(sched, path) {
  if (!sched) return null;
  if (sched.enabled && sched.start_at && sched.end_at) {
    if (new Date(sched.end_at) < new Date(sched.start_at)) return `${path}: schedule end cannot be before start`;
  }
  return null;
}

export function validateHome1Config(config) {
  const errors = [];
  const warnings = [];

  if (!config || typeof config !== 'object') return { valid: false, error: 'Invalid config', warnings };

  const c = config;

  // Hero
  if (c.hero?.enabled) {
    for (const f of ['headline_line1', 'headline_line2', 'headline_line3']) {
      if (c.hero[f] && c.hero[f].length > 200) errors.push(`hero.${f}: headline too long (max 200 chars)`);
    }
    errors.push(validateCta(c.hero.cta1, 'hero.cta1'));
    errors.push(validateCta(c.hero.cta2, 'hero.cta2'));
  }
  errors.push(validateSchedule(c.hero?.schedule, 'hero.schedule'));

  // Next Up
  if (c.next_up?.enabled) {
    if (c.next_up.mode === 'pinned' && (!c.next_up.pinned_event_ids || c.next_up.pinned_event_ids.length === 0)) {
      warnings.push('Next Up is in PINNED mode but no events are selected');
    }
    if (c.next_up.display_limit != null && (c.next_up.display_limit < 1 || c.next_up.display_limit > 20)) {
      errors.push('next_up.display_limit must be between 1 and 20');
    }
    errors.push(validateCta(c.next_up.view_calendar_cta, 'next_up.view_calendar_cta'));
  }
  errors.push(validateSchedule(c.next_up?.schedule, 'next_up.schedule'));

  // One Brand
  if (c.one_brand?.enabled) {
    if (c.one_brand.headline && c.one_brand.headline.length > 200) errors.push('one_brand.headline too long');
  }
  errors.push(validateSchedule(c.one_brand?.schedule, 'one_brand.schedule'));

  // Ecosystem — structural keys are protected
  if (c.ecosystem?.enabled) {
    const tiles = c.ecosystem.tiles || [];
    const keys = tiles.map((t) => t.key);
    for (const required of ECOSYSTEM_KEYS) {
      if (!keys.includes(required)) errors.push(`ecosystem: missing required destination key ${required}`);
    }
    for (const t of tiles) {
      if (!ECOSYSTEM_KEYS.includes(t.key)) errors.push(`ecosystem: invalid destination key ${t.key}`);
      errors.push(validateCta({ enabled: true, label: t.cta_label, destination: t.destination }, `ecosystem.${t.key}.cta`));
    }
  }
  errors.push(validateSchedule(c.ecosystem?.schedule, 'ecosystem.schedule'));

  // What's Happening
  if (c.whats_happening?.enabled) {
    if (c.whats_happening.display_limit != null && (c.whats_happening.display_limit < 1 || c.whats_happening.display_limit > 12)) {
      errors.push('whats_happening.display_limit must be between 1 and 12');
    }
  }
  errors.push(validateSchedule(c.whats_happening?.schedule, 'whats_happening.schedule'));

  // From The Outlet
  if (c.from_the_outlet?.enabled) {
    if (c.from_the_outlet.lead_mode === 'pinned' && !c.from_the_outlet.pinned_lead_story_id) {
      warnings.push('From The Outlet is in PINNED mode but no lead story is selected');
    }
    errors.push(validateCta(c.from_the_outlet.view_all_cta, 'from_the_outlet.view_all_cta'));
  }
  errors.push(validateSchedule(c.from_the_outlet?.schedule, 'from_the_outlet.schedule'));

  // Featured Apparel
  if (c.featured_apparel?.enabled) {
    const count = c.featured_apparel.product_display_count;
    if (count != null && (count < 1 || count > 12)) errors.push('featured_apparel.product_display_count must be between 1 and 12');
    errors.push(validateCta(c.featured_apparel.shop_all_cta, 'featured_apparel.shop_all_cta'));
  }
  errors.push(validateSchedule(c.featured_apparel?.schedule, 'featured_apparel.schedule'));

  // Closing CTA
  if (c.closing_cta?.enabled) {
    errors.push(validateCta(c.closing_cta.cta, 'closing_cta.cta'));
  }
  errors.push(validateSchedule(c.closing_cta?.schedule, 'closing_cta.schedule'));

  const filtered = errors.filter(Boolean);
  if (filtered.length > 0) return { valid: false, error: filtered.join('; '), warnings };
  return { valid: true, warnings };
}