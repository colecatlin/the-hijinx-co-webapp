import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import SearchBar from '@/components/shared/SearchBar';
import Footer from '@/components/shared/Footer';

const navItems = [
  { name: 'Home', page: 'Home' },
  { name: 'The Outlet', page: 'OutletHome', sub: [
    { name: 'Stories', page: 'OutletHome' },
    { name: 'Issue Archive', page: 'OutletIssues' },
    { name: 'Submit a Story', page: 'OutletSubmit' },
    { name: 'Advertise', page: 'OutletAdvertising' },
  ]},
  { name: 'Motorsports', page: 'MotorsportsHome', sub: [
    { name: 'Standings', page: 'StandingsHome' },
    { name: 'Schedule', page: 'ScheduleHome' },
    { name: 'Results', page: 'ResultsHome' },
    { name: 'Drivers', page: 'DriverDirectory' },
    { name: 'Teams', page: 'TeamDirectory' },
    { name: 'Tracks', page: 'TrackDirectory' },
  ]},
  { name: 'Apparel', page: 'ApparelHome' },
  { name: 'Creative', page: 'CreativeServices' },
  { name: 'Tech', page: 'TechHome' },
  { name: 'Learning', page: 'Learning' },
  { name: 'Hospitality', page: 'Hospitality' },
  { name: 'Food & Bev', page: 'FoodBeverage' },
  { name: 'About', page: 'About' },
  { name: 'Contact', page: 'Contact' },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isActive = (page) => currentPageName === page;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
        }`}
      >
        {/* Upper nav - logo + search */}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-center relative">
          <Link to={createPageUrl('Home')} className="flex items-center">
            <span className="text-xl font-black tracking-tighter">HIJINX</span>
          </Link>

          <div className="absolute right-6 flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:block border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <ul className="flex items-center gap-0">
              {navItems.map((item) => (
                <li
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-1 px-3 py-3 text-xs font-medium tracking-wide uppercase transition-colors ${
                      isActive(item.page)
                        ? 'text-[#0A0A0A] border-b-2 border-[#0A0A0A]'
                        : 'text-gray-500 hover:text-[#0A0A0A]'
                    }`}
                  >
                    {item.name}
                    {item.sub && <ChevronDown className="w-3 h-3" />}
                  </Link>

                  {/* Dropdown */}
                  {item.sub && hoveredItem === item.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute top-full left-0 bg-white border border-gray-100 shadow-lg min-w-[180px] py-2 z-50"
                    >
                      {item.sub.map((sub) => (
                        <Link
                          key={sub.name}
                          to={createPageUrl(sub.page)}
                          className="block px-4 py-2 text-xs font-medium text-gray-500 hover:text-[#0A0A0A] hover:bg-gray-50 transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-[55] bg-white pt-16 overflow-y-auto lg:hidden"
          >
            <nav className="px-6 py-8">
              {navItems.map((item) => (
                <div key={item.name} className="mb-1">
                  <Link
                    to={createPageUrl(item.page)}
                    className={`block py-3 text-lg font-semibold tracking-tight ${
                      isActive(item.page) ? 'text-[#0A0A0A]' : 'text-gray-400'
                    }`}
                  >
                    {item.name}
                  </Link>
                  {item.sub && (
                    <div className="pl-4 mb-2">
                      {item.sub.map((sub) => (
                        <Link
                          key={sub.name}
                          to={createPageUrl(sub.page)}
                          className="block py-2 text-sm text-gray-400 hover:text-[#0A0A0A] transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Page content */}
      <main className="flex-1 pt-16 lg:pt-[calc(4rem+41px)]">
        {children}
      </main>

      <Footer />
    </div>
  );
}