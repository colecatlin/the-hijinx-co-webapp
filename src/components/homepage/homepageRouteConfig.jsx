/**
 * homepageRouteConfig
 * Returns route card config for the Choose Your Lane homepage section.
 * Adapts Race Core CTA based on user auth and entity access.
 */

import { createPageUrl } from '@/components/utils';

export function getHomepageRouteCards({ user, hasRaceCoreAccess } = {}) {
  return [
    {
      key: 'racecore',
      title: 'Race Core',
      description: 'Run events, manage entries, results, compliance, tech, and media.',
      ctaLabel: hasRaceCoreAccess ? 'Open Race Core' : 'Link an Entity',
      href: hasRaceCoreAccess
        ? createPageUrl('RegistrationDashboard')
        : createPageUrl('Profile') + '?tab=entities',
      accent: 'racecore',
    },
    {
      key: 'drivers',
      title: 'Drivers',
      description: 'Discover the racers, underdogs, builders, and names driving the sport.',
      ctaLabel: 'Browse Drivers',
      href: createPageUrl('DriverDirectory'),
      accent: 'drivers',
    },
    {
      key: 'tracks',
      title: 'Tracks',
      description: 'Explore the facilities and venues where the action happens.',
      ctaLabel: 'Browse Tracks',
      href: createPageUrl('TrackDirectory'),
      accent: 'tracks',
    },
    {
      key: 'series',
      title: 'Series',
      description: 'Follow the championships, schedules, and movements shaping motorsports.',
      ctaLabel: 'Browse Series',
      href: createPageUrl('SeriesHome'),
      accent: 'series',
    },
    {
      key: 'stories',
      title: 'Stories & Media',
      description: 'Read the culture, news, media, and momentum behind the sport.',
      ctaLabel: 'Explore Stories',
      href: createPageUrl('OutletHome'),
      accent: 'stories',
    },
    {
      key: 'apparel',
      title: 'HIJINX Apparel',
      description: 'Wear the identity. Apparel built for the ones chasing more.',
      ctaLabel: 'Shop Apparel',
      href: createPageUrl('ApparelHome'),
      accent: 'apparel',
    },
  ];
}