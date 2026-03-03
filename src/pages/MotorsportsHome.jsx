import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, Building2, MapPin, Zap, Trophy, Flag,
  Zap as ZapIcon, Shield, Gauge, CheckCircle2, LogIn, LayoutDashboard,
  ArrowRight
} from 'lucide-react';

const quickActionCards = [
  { title: 'Drivers', subtitle: 'Build your portfolio', icon: Users, page: 'Profile', color: 'purple' },
  { title: 'Teams', subtitle: 'Showcase your program', icon: Building2, page: 'TeamDirectory', color: 'rose' },
  { title: 'Tracks', subtitle: 'Own your event data', icon: MapPin, page: 'TrackDirectory', color: 'teal' },
  { title: 'Series', subtitle: 'Run a season', icon: ZapIcon, page: 'SeriesHome', color: 'orange' },
  { title: 'Results', subtitle: 'See the truth', icon: Flag, page: 'StandingsHome', color: 'green' },
  { title: 'Registration', subtitle: 'Register and race', icon: CheckCircle2, page: 'Registration', color: 'blue' },
];

const colorMap = {
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', hover: 'hover:bg-purple-500/20', accent: 'text-purple-400' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', hover: 'hover:bg-rose-500/20', accent: 'text-rose-400' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', hover: 'hover:bg-teal-500/20', accent: 'text-teal-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', hover: 'hover:bg-orange-500/20', accent: 'text-orange-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', hover: 'hover:bg-green-500/20', accent: 'text-green-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', hover: 'hover:bg-blue-500/20', accent: 'text-blue-400' },
};

export default function MotorsportsHome() {
  const { data: isAuthenticated } = useQuery({
    queryKey: ['auth-status'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  // Fetch counts for stats (lightweight)
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-count'],
    queryFn: () => base44.entities.Driver.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-count'],
    queryFn: () => base44.entities.Event.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results-count'],
    queryFn: () => base44.entities.Results.list(),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] to-[#0F0F0F] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_#1a1a2e_0%,_#0A0A0A_70%)]" />
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Text */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <span className="font-mono text-xs tracking-widest text-gray-400 uppercase">Motorsports Platform</span>
                <h1 className="text-5xl sm:text-6xl font-black tracking-tight mt-3 leading-tight">Index46</h1>
              </div>
              <p className="text-lg text-gray-300 leading-relaxed">
                The motorsports portfolio, registration, results, and operations engine.
              </p>
              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
                  <span>Drivers build a portfolio and compete across series</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
                  <span>Tracks and series run events through Race Core</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-gray-500 mt-2 flex-shrink-0" />
                  <span>Public pages show published and verified truth</span>
                </div>
              </div>

              {/* Hero CTAs */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button asChild className="bg-white text-black hover:bg-gray-200">
                  <Link to={createPageUrl('DriverDirectory')}>
                    Explore Drivers <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-900">
                  <Link to={createPageUrl('EventDirectory')}>
                    Explore Events
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-900">
                  <Link to={createPageUrl('SeriesHome')}>
                    Explore Series
                  </Link>
                </Button>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link to={createPageUrl('Registration')}>
                    Race Core
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Right: Visual Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative h-80 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.1)_0%,_transparent_70%)]" />
              <div className="relative text-center space-y-6">
                <div className="grid grid-cols-3 gap-4 w-full px-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center">
                    <div className="text-3xl font-black text-blue-400">{drivers.length}</div>
                    <div className="text-xs text-gray-400 mt-1">Drivers</div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
                    <div className="text-3xl font-black text-purple-400">{events.length}</div>
                    <div className="text-xs text-gray-400 mt-1">Events</div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
                    <div className="text-3xl font-black text-green-400">{results.length}</div>
                    <div className="text-xs text-gray-400 mt-1">Results</div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16 border-b border-white/5">
        <div className="mb-8">
          <h2 className="text-2xl font-black tracking-tight">Get Started</h2>
          <p className="text-gray-400 text-sm mt-1">Everything you need to compete and manage</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActionCards.map((card, i) => {
            const color = colorMap[card.color];
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={createPageUrl(card.page)}>
                  <Card className={`${color.bg} border ${color.border} ${color.hover} transition-all cursor-pointer h-full`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg ${color.bg} border ${color.border}`}>
                          <Icon className={`w-5 h-5 ${color.accent}`} />
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-white">{card.title}</h3>
                      <p className="text-sm text-gray-400 mt-2">{card.subtitle}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 border-b border-white/5">
        <h2 className="text-2xl font-black tracking-tight mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-lg">Create</h3>
              <p className="text-sm text-gray-400">Build your profile and establish your racing programs</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg">Operate</h3>
              <p className="text-sm text-gray-400">Run events in Race Core with full operational control</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-bold text-lg">Publish</h3>
              <p className="text-sm text-gray-400">The public site displays verified published results</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trust and Integrity Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 border-b border-white/5">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-8">
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold">Verified Results & Integrity</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Results are the source of truth. Every result comes from track or series operations. Discrepancies are flagged for review. Your competition data is verified, auditable, and trusted.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer CTA */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-white/10">
          <CardContent className="pt-8 space-y-4">
            <h3 className="text-2xl font-bold">Ready to Get on the Grid</h3>
            <p className="text-gray-300 text-sm">Start building your racing portfolio or managing your events today.</p>
            <div className="flex flex-wrap gap-3 pt-4">
              {!isAuthenticated ? (
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <LogIn className="w-4 h-4 mr-2" /> Create Account
                </Button>
              ) : (
                <Button asChild className="bg-white text-black hover:bg-gray-200">
                  <Link to={createPageUrl('MyDashboard')}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Go to My Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}