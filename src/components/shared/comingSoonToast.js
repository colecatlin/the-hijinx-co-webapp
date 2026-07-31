import { toast } from '@/components/ui/use-toast';

const DESCRIPTIONS = {
  driver: 'Driver profiles are launching soon on the Hijinx Co directory. Check back shortly!',
  team: 'Team profiles are launching soon. Check back shortly!',
  track: 'Track profiles are launching soon. Check back shortly!',
  series: 'Series profiles are launching soon. Check back shortly!',
  event: 'Event details are launching soon. Check back shortly!',
  creator: 'Creator profiles are launching soon. Check back shortly!',
  outlet: 'Media outlet profiles are launching soon. Check back shortly!',
  generic: 'Full directory profiles are launching soon. Check back shortly!',
};

export function showComingSoon(entityType = 'generic') {
  toast({
    title: 'Coming Soon',
    description: DESCRIPTIONS[entityType] || DESCRIPTIONS.generic,
    duration: 4500,
  });
}