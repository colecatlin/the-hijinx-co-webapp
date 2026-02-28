import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';
import { CheckCircle2, Calendar, Users, Trophy } from 'lucide-react';

export default function Registration() {
  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <h1 className="text-5xl font-black mb-4">Register to Race</h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Join thousands of competitors across our racing series and events. Register your driver profile, team, or series participation.
          </p>
        </motion.div>

        {/* Registration Options Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {[
            {
              icon: Users,
              title: 'Driver Registration',
              description: 'Create your driver profile and claim your racing history',
              items: ['Personal information', 'Racing background', 'Career tracking', 'Media library']
            },
            {
              icon: Trophy,
              title: 'Series Participation',
              description: 'Register to compete in a racing series',
              items: ['Series selection', 'Class registration', 'Team assignment', 'Points tracking']
            },
            {
              icon: Calendar,
              title: 'Event Entry',
              description: 'Register for individual race events',
              items: ['Event selection', 'Vehicle setup', 'Entry fees', 'Session participation']
            }
          ].map((option, idx) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg transition-shadow"
              >
                <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="text-xl font-bold mb-2">{option.title}</h3>
                <p className="text-gray-600 mb-6">{option.description}</p>
                <ul className="space-y-2">
                  {option.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Registration Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-50 rounded-lg p-8 mb-8"
        >
          <h2 className="text-2xl font-bold mb-6">Registration Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold mb-3">For Drivers</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Valid age for competition (varies by series)</li>
                <li>✓ Contact information</li>
                <li>✓ Racing experience summary</li>
                <li>✓ Equipment/vehicle details</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3">For Teams</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Team organization details</li>
                <li>✓ Authorized representatives</li>
                <li>✓ Vehicle specifications</li>
                <li>✓ Insurance and liability coverage</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-8"
        >
          <p className="text-gray-600 mb-4">Ready to get started?</p>
          <p className="text-sm text-gray-500">
            Contact a series organizer or check the Events section for current registration opportunities.
          </p>
        </motion.div>
      </div>
    </PageShell>
  );
}