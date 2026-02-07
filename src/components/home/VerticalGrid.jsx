import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { 
  Newspaper, Flag, Shirt, Palette, 
  Monitor, GraduationCap, Hotel, Coffee 
} from 'lucide-react';

const verticals = [
  { name: 'The Outlet', desc: 'Editorial & Publishing', icon: Newspaper, page: 'OutletHome' },
  { name: 'Motorsports', desc: 'Racing & Competition', icon: Flag, page: 'MotorsportsHome' },
  { name: 'Apparel', desc: 'Lifestyle & Goods', icon: Shirt, page: 'ApparelHome' },
  { name: 'Creative', desc: 'Design & Production', icon: Palette, page: 'CreativeServices' },
  { name: 'Tech', desc: 'Products & Tools', icon: Monitor, page: 'TechHome' },
  { name: 'Learning', desc: 'Education & Growth', icon: GraduationCap, page: 'Learning' },
  { name: 'Hospitality', desc: 'Service & Staffing', icon: Hotel, page: 'Hospitality' },
  { name: 'Food & Bev', desc: 'Coffee & Pizza', icon: Coffee, page: 'FoodBeverage' },
];

export default function VerticalGrid() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <span className="font-mono text-xs tracking-[0.2em] text-gray-400 uppercase">Verticals</span>
      <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-2 mb-10">Explore the Platform</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {verticals.map((v, i) => (
          <motion.div
            key={v.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
          >
            <Link
              to={createPageUrl(v.page)}
              className="group flex flex-col justify-between p-6 h-40 md:h-48 border border-gray-200 hover:border-[#0A0A0A] transition-all duration-300 hover:bg-[#0A0A0A] hover:text-white"
            >
              <v.icon className="w-5 h-5 text-gray-400 group-hover:text-[#E5FF00] transition-colors" />
              <div>
                <p className="font-bold text-sm tracking-tight">{v.name}</p>
                <p className="text-xs text-gray-400 group-hover:text-gray-500 mt-1">{v.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}