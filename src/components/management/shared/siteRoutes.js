/**
 * siteRoutes — comprehensive public route registry for Footer/Links editors.
 *
 * Admins pick from these labels instead of typing route strings.
 * Only public, stable routes are included — no admin/management routes.
 */
export const SITE_ROUTES = [
  { label: 'Home', path: '/' },
  { label: 'The Outlet', path: '/OutletHome' },
  { label: 'INDEX46 (Motorsports)', path: '/MotorsportsHome' },
  { label: 'Apparel', path: '/ApparelHome' },
  { label: 'Marketplace', path: '/MarketplaceHome' },
  { label: 'Store', path: '/StorefrontHome' },
  { label: 'Creative Services', path: '/CreativeServices' },
  { label: 'Tech', path: '/TechHome' },
  { label: 'Learning', path: '/Learning' },
  { label: 'Hospitality', path: '/Hospitality' },
  { label: 'Food & Beverage', path: '/FoodBeverage' },
  { label: 'About', path: '/About' },
  { label: 'Contact', path: '/Contact' },
  { label: 'Help', path: '/Help' },
  { label: 'Advertise', path: '/OutletAdvertising' },
  { label: 'Submit a Story', path: '/OutletSubmit' },
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
  { label: 'Privacy Policy', path: '/Privacy' },
  { label: 'Terms of Service', path: '/Terms' },
];

export function routeLabel(path) {
  const match = SITE_ROUTES.find((r) => r.path === path);
  return match ? match.label : path;
}