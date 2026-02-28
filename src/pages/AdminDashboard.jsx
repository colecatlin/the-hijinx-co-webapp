import React, { useState } from 'react';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { Plus, Upload, Zap, Check, Download, AlertTriangle, Clock, Users, Trophy, TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-blue-100 text-blue-800',
    live: 'bg-green-100 text-green-800',
    completed: 'bg-slate-100 text-slate-800',
    pending: 'bg-yellow-100 text-yellow-800',
    official: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[status] || colors.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function AdminDashboard() {
  const [organization, setOrganization] = useState('');
  const [season, setSeason] = useState('');
  const [event, setEvent] = useState('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <PageShell>
      <div className="bg-slate-900 text-white min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">RaceDay Engine</h1>
            <p className="text-slate-400">Central Command Center for Race Operations</p>
          </div>

          {/* Top Controls */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-2 block">Organization</label>
                <Select value={organization} onValueChange={setOrganization}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select track or series" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="track1">Thunder Valley Speedway</SelectItem>
                    <SelectItem value="series1">Pro Series 2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-2 block">Season</label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-2 block">Event</label>
                <Select value={event} onValueChange={setEvent}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event1">Round 1 - Championship</SelectItem>
                    <SelectItem value="event2">Round 2 - Open Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="text-xs text-slate-500">
                  Last updated: 2 minutes ago
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2 bg-slate-600 hover:bg-slate-700">
                <Plus className="w-4 h-4" />
                Create Event
              </Button>
              <Button className="gap-2 bg-slate-600 hover:bg-slate-700">
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
              <Button className="gap-2 bg-slate-600 hover:bg-slate-700">
                <Zap className="w-4 h-4" />
                Sync Timing
              </Button>
              <Button className="gap-2 bg-slate-600 hover:bg-slate-700">
                <Check className="w-4 h-4" />
                Publish Official
              </Button>
              <Button className="gap-2 bg-slate-600 hover:bg-slate-700">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </motion.div>

          {/* Dashboard Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          >
            {/* Event Status Card */}
            <motion.div variants={itemVariants}>
              <Card className="bg-slate-800 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Event Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400">Round 1 - Championship</p>
                    <p className="text-slate-300 text-xs mt-1">Thunder Valley Speedway</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs">Start</p>
                      <p className="font-mono">Mar 15, 2026</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">End</p>
                      <p className="font-mono">Mar 15, 2026</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <span className="text-sm">Status</span>
                    <StatusBadge status="draft" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-orange-400">
                    <Clock className="w-4 h-4" />
                    <span>19 days until event</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Entries Summary Card */}
            <motion.div variants={itemVariants}>
              <Card className="bg-slate-800 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Entries Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-black text-blue-400">—</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Entries by class</span>
                      <span>—</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Paid vs unpaid</span>
                      <span>—</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Checked in</span>
                      <span>—</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Teched</span>
                      <span>—</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Compliance Alerts Card */}
            <motion.div variants={itemVariants}>
              <Card className="bg-slate-800 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Compliance Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Missing waivers</span>
                    <span className="bg-red-900 text-red-200 px-2 py-1 rounded text-xs font-semibold">0</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Expired licenses</span>
                    <span className="bg-yellow-900 text-yellow-200 px-2 py-1 rounded text-xs font-semibold">0</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Duplicate car #s</span>
                    <span className="bg-yellow-900 text-yellow-200 px-2 py-1 rounded text-xs font-semibold">0</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Missing transponders</span>
                    <span className="bg-red-900 text-red-200 px-2 py-1 rounded text-xs font-semibold">0</span>
                  </div>
                  <div className="text-xs text-green-400 pt-2 border-t border-slate-700">
                    ✓ All systems green
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Results Status Card */}
            <motion.div variants={itemVariants}>
              <Card className="bg-slate-800 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Results Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">In Draft</span>
                      <span className="font-mono">—</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Provisional</span>
                      <span className="font-mono">—</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Official</span>
                      <span className="font-mono">—</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Locked</span>
                      <span className="font-mono">—</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Standings Status Card */}
            <motion.div variants={itemVariants}>
              <Card className="bg-slate-800 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Standings Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400">Last Updated</p>
                    <p className="font-mono text-sm">—</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400">Status Indicators</div>
                    <div className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Current</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* System Alerts Feed */}
            <motion.div variants={itemVariants} className="lg:col-span-1">
              <Card className="bg-slate-800 border-slate-700 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-slate-400 text-center py-8">
                    No active alerts
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Activity Log */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className="bg-slate-800 border-slate-700 text-white">
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription className="text-slate-400">Recent admin activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-400">
                  No recent activity
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}