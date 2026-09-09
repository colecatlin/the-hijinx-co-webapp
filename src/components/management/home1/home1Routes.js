/**
 * Safe internal route registry for CTAEditor.
 *
 * Admins pick from these labels instead of typing route strings.
 * Only public, stable routes are included — no admin/management routes.
 */
export const HOME1_INTERNAL_ROUTES = [
  { label: 'Home', path: '/Home1' },
  { label: 'The Outlet', path: '/OutletHome' },
  { label: 'INDEX46 (Motorsports)', path: '/MotorsportsHome' },
  { label: 'Apparel', path: '/ApparelHome' },
  { label: 'Marketplace', path: '/MarketplaceHome' },
  { label: 'Store', path: '/StorefrontHome' },
  { label: 'Directory — All', path: '/Directory' },
  { label: 'Directory — Events', path: '/Directory?cat=events' },
  { label: 'Directory — Racers', path: '/Directory?cat=drivers' },
  { label: 'Directory — Teams', path: '/Directory?cat=teams' },
  { label: 'Directory — Tracks', path: '/Directory?cat=tracks' },
  { label: 'Directory — Series', path: '/Directory?cat=series' },
  { label: 'Directory — Vehicles', path: '/Directory?cat=vehicles' },
  { label: 'Directory — Sponsors', path: '/Directory?cat=sponsors' },
  { label: 'Directory — Creators', path: '/Directory?cat=creators' },
  { label: 'Directory — Media Outlets', path: '/Directory?cat=outlets' },
  { label: 'Join / Claim Profile', path: '/join' },
  { label: 'RaceCore', path: '/racecore' },
  { label: 'Membership', path: '/membership' },
  { label: 'Hashtag Library', path: '/hashtag-library' },
];

export function routeLabel(path) {
  const match = HOME1_INTERNAL_ROUTES.find((r) => r.path === path);
  return match ? match.label : path;
}