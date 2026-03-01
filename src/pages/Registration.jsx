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
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-black mb-4">Register for an Event</h1>
            <p className="text-lg text-gray-600">
              Select an event to begin registration.
            </p>
          </motion.div>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle>Select Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
                <Select value={selectedEventId} onValueChange={handleEventSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((evt) => (
                      <SelectItem key={evt.id} value={evt.id}>
                        {evt.name} - {evt.event_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEventId && !isAlreadyRegistered && (
                <Button 
                  onClick={handleRegisterEvent}
                  disabled={createEntryMutation.isPending}
                  className="w-full bg-black hover:bg-gray-900 text-white"
                >
                  {createEntryMutation.isPending ? 'Registering...' : 'Continue to Registration'}
                </Button>
              )}

              {isAlreadyRegistered && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Already Registered</p>
                    <p className="text-sm text-blue-700 mt-1">You are already registered for this event.</p>
                    <Link to={createPageUrl(`RegistrationDashboard?eventId=${selectedEventId}`)}>
                      <Button variant="outline" size="sm" className="mt-3">
                        View Your Registration
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Link to={createPageUrl('RegistrationDashboard')}>
              <Button variant="outline">
                Back to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // If eventId is provided in URL, show event registration form
  if (!user) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-red-600">Authentication Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">Please log in to register for an event.</p>
              <Button
                onClick={() => base44.auth.redirectToLogin(window.location.href)}
                className="w-full bg-black hover:bg-gray-900 text-white"
              >
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black mb-4">Event Registration</h1>
          <p className="text-lg text-gray-600">
            {selectedEvent ? selectedEvent.name : 'Loading...'}
          </p>
        </motion.div>

        {selectedEvent && (
          <Card className="bg-white border-gray-200 mb-8">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">{selectedEvent.event_date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-semibold capitalize">{selectedEvent.status || 'upcoming'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userDriver ? (
          <Card className="bg-white border-gray-200 mb-8">
            <CardHeader>
              <CardTitle>Confirm Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Driver</p>
                  <p className="font-semibold">{userDriver.first_name} {userDriver.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Entry Status</p>
                  <p className="font-semibold">Registered</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className="font-semibold text-orange-600">Unpaid</p>
                </div>
              </div>

              {isAlreadyRegistered ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">You are already registered for this event.</p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleRegisterEvent}
                  disabled={createEntryMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {createEntryMutation.isPending ? 'Registering...' : 'Complete Registration'}
                </Button>
              )}

              {isAlreadyRegistered && (
                <Link to={createPageUrl(`RegistrationDashboard?eventId=${selectedEventId}`)}>
                  <Button variant="outline" className="w-full">
                    View Dashboard
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-gray-200 mb-8">
            <CardHeader>
              <CardTitle className="text-orange-600">Driver Profile Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">You need to create a driver profile before registering for events.</p>
              <Link to={createPageUrl('MyDashboard')}>
                <Button className="w-full bg-black hover:bg-gray-900 text-white">
                  Create Driver Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link to={createPageUrl('RegistrationDashboard')}>
            <Button variant="outline" className="mt-6">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}