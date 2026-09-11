import React, { useEffect } from 'react';
import { useHome1Config } from '@/hooks/useHome1Config';
import { isSectionVisible } from '@/components/home1/home1Helpers';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import Home1Hero from '@/components/home1/Home1Hero';
import Home1NextUp from '@/components/home1/Home1NextUp';
import Home1OneBrand from '@/components/home1/Home1OneBrand';
import Home1Ecosystem from '@/components/home1/Home1Ecosystem';
import Home1WhatsHappening from '@/components/home1/Home1WhatsHappening';
import Home1FromTheOutlet from '@/components/home1/Home1FromTheOutlet';
import Home1FeaturedCollection from '@/components/home1/Home1FeaturedCollection';
import Home1BePartOfSomethingBigger from '@/components/home1/Home1BePartOfSomethingBigger';

export default function Home() {
  const { config } = useHome1Config();

  // Fire homepage analytics once per page view (not on config hydration)
  useEffect(() => { Analytics.pageView('Home'); }, []);

  // While config is null (loading), all sections render with their own
  // hardcoded defaults — no flash. When config arrives, disabled/scheduled-out
  // sections are omitted.
  const show = (section) => !config || isSectionVisible(section);

  return (
    <>
      <SeoMeta
        title="Motorsports, Culture, and Competition"
        description="HIJINX — where motorsports, media, and culture collide."
      />
      {show(config?.hero) && <Home1Hero config={config?.hero} />}
      {show(config?.next_up) && <Home1NextUp config={config?.next_up} />}
      {show(config?.one_brand) && <Home1OneBrand config={config?.one_brand} />}
      {show(config?.ecosystem) && <Home1Ecosystem config={config?.ecosystem} />}
      {show(config?.whats_happening) && <Home1WhatsHappening config={config?.whats_happening} />}
      {show(config?.from_the_outlet) && <Home1FromTheOutlet config={config?.from_the_outlet} />}
      {show(config?.featured_apparel) && <Home1FeaturedCollection config={config?.featured_apparel} />}
      {show(config?.closing_cta) && <Home1BePartOfSomethingBigger config={config?.closing_cta} />}
    </>
  );
}