import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';
import { CheckCircle2, Calendar, Users, Trophy, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Registration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const eventId = searchParams.get('eventId');
  const [selectedEventId, setSelectedEventId] = useState(eventId || '');

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch all events
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('event_date', 100),
  });

  // Fetch driver profile for current user
  const { data: userDriver } = useQuery({
    queryKey: ['userDriver', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const drivers = await base44.entities.Driver.filter({ contact_email: user.email });
      return drivers[0] || null;
    },
    enabled: !!user?.email,
  });

  // Fetch existing entries for user to check duplicates
  const { data: userEntries = [] } = useQuery({
    queryKey: ['userEntries', userDriver?.id],
    queryFn: () => base44.entities.Entry.filter({ driver_id: userDriver.id }),
    enabled: !!userDriver?.id,
  });

  // Get selected event details
  const selectedEvent = useMemo(() => {
    return events.find(e => e.id === selectedEventId);
  }, [events, selectedEventId]);

  // Check if already registered
  const isAlreadyRegistered = useMemo(() => {
    if (!userDriver || !selectedEventId) return false;
    return userEntries.some(entry => entry.event_id === selectedEventId);
  }, [userDriver, selectedEventId, userEntries]);

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: (entryData) => base44.entities.Entry.create(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userEntries'] });
      toast.success('Successfully registered for event!');
      setTimeout(() => {
        navigate(createPageUrl(`RegistrationDashboard?eventId=${selectedEventId}`));
      }, 1500);
    },
    onError: (error) => {
      toast.error('Failed to register: ' + error.message);
    },
  });

  const handleEventSelect = (newEventId) => {
    setSelectedEventId(newEventId);
    setSearchParams({ eventId: newEventId });
  };

  const handleRegisterEvent = () => {
    if (!userDriver) {
      toast.error('No driver profile found. Please create a driver profile first.');
      return;
    }

    if (!selectedEvent) {
      toast.error('Please select an event.');
      return;
    }

    if (isAlreadyRegistered) {
      toast.error('You are already registered for this event.');
      return;
    }

    const entryData = {
      event_id: selectedEvent.id,
      driver_id: userDriver.id,
      series_id: selectedEvent.series_id,
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      tech_status: 'Not Inspected',
    };

    createEntryMutation.mutate(entryData);
  };

  // Show event selector if no eventId in URL
  if (!eventId) {
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
          className="text-center py-12 border-t border-gray-200"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Access your registration dashboard to create and manage your driver profile, teams, and event entries.
          </p>
          <Link to={createPageUrl('RegistrationDashboard')}>
            <Button className="bg-black hover:bg-gray-900 text-white px-8 py-3 h-auto text-base">
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </PageShell>
  );
}