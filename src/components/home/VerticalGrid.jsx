import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { 
  Newspaper, Flag, Shirt, Palette, 
  Monitor, GraduationCap, Hotel, Coffee,
  ArrowRight
} from 'lucide-react';

const verticals = [
  {
    name: 'The Outlet',
    desc: 'Editorial & Publishing',
    detail: 'Original stories, features, and coverage at the edge of motorsports and culture.',
    icon: Newspaper,
    page: 'OutletHome',
    accent: '#00FFDA',
  },
  {
    name: 'Motorsports',
    desc: 'Racing & Competition',
    detail: 'Driver profiles, team pages, race schedules, results, and everything on four wheels.',
    icon: Flag,
    page: 'MotorsportsHome',
    accent: '#00FFDA',
  },
  {
    name: 'Apparel',
    desc: 'Lifestyle & Goods',
    detail: 'Purpose-built gear and lifestyle goods designed for people who live in the garage.',
    icon: Shirt,
    page: 'ApparelHome',
    accent: '#00FFDA',
  },
  {
    name: 'Creative',
    desc: 'Design & Production',
    detail: 'Full-service creative — writing, design, photo, and video for brands that move fast.',
    icon: Palette,
    page: 'CreativeServices',
    accent: '#00FFDA',
  },
  {
    name: 'Tech',
    desc: 'Products & Tools',
    detail: 'Software, apps, and digital tools built for the motorsports industry.',
    icon: Monitor,
    page: 'TechHome',
    accent: '#00FFDA',
  },
  {
    name: 'Learning',
    desc: 'Education & Growth',
    detail: 'Courses, guides, and resources for drivers, teams, and industry professionals.',
    icon: GraduationCap,
    page: 'Learning',
    accent: '#00FFDA',
  },
  {
    name: 'Hospitality',
    desc: 'Service & Staffing',
    detail: 'Event staffing, hospitality management, and VIP experiences at the track.',
    icon: Hotel,
    page: 'Hospitality',
    accent: '#00FFDA',
  },
  {
    name: 'Food & Bev',
    desc: 'Coffee & Concepts',
    detail: 'A curated food and beverage concept rooted in racing culture and community.',
    icon: Coffee,
    page: 'FoodBeverage',
    accent: '#00FFDA',
  },
];

export default function VerticalGrid() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <span className="font-mono text-xs tracking-[0.2em] text-gray-500 uppercase">Verticals</span>
      <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#232323] mt-2 mb-10">Explore the Platform</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {verticals.map((v, i) => (
          <motion.div
            key={v.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <Link
              to={createPageUrl(v.page)}
              className="group flex flex-col justify-between p-6 h-52 border border-gray-200 hover:border-[#232323] transition-all duration-300 hover:shadow-md bg-white"
            >
              <div>
                <v.icon className="w-5 h-5 text-[#232323] mb-3 group-hover:text-[#00FFDA] transition-colors" />
                <p className="font-bold text-sm tracking-tight text-[#232323]">{v.name}</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{v.desc}</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{v.detail}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-[#232323] transition-colors mt-3">
                Explore <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}