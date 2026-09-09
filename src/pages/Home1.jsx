import React from 'react';
import Home1Hero from '@/components/home1/Home1Hero';
import Home1NextUp from '@/components/home1/Home1NextUp';
import Home1OneBrand from '@/components/home1/Home1OneBrand';
import Home1Ecosystem from '@/components/home1/Home1Ecosystem';
import Home1WhatsHappening from '@/components/home1/Home1WhatsHappening';
import Home1FromTheOutlet from '@/components/home1/Home1FromTheOutlet';
import Home1FeaturedCollection from '@/components/home1/Home1FeaturedCollection';
import Home1BePartOfSomethingBigger from '@/components/home1/Home1BePartOfSomethingBigger';

export default function Home1() {
  return (
    <>
      <Home1Hero />
      <Home1NextUp />
      <Home1OneBrand />
      <Home1Ecosystem />
      <Home1WhatsHappening />
      <Home1FromTheOutlet />
      <Home1FeaturedCollection />
      <Home1BePartOfSomethingBigger />
    </>
  );
}