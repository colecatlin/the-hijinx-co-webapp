import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Flag, CheckCircle2, UserPlus, LogIn, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Public self-registration button + drawer.
 * Lets a logged-in driver with a Driver profile declare entry into an event
 * without going through the paid registration flow. Creates an Entry record
 * with payment_status = 'Pending Registration'.
 */
export default function EventSelfRegister({ event, classes = [], seriesId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ class_id: '', car_number: '', team_id: '' });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });
  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    retry: false,
  });

  const { data: myDriver, isLoading: driverLoading } = useQuery({
    queryKey: ['myDriver', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const drivers = await base44.entities.Driver.filter({ owner_user_id: user.id });
      return drivers[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: myEntry, isLoading: entryLoading } = useQuery({
    queryKey: ['myEventEntry', myDriver?.id, event?.id],
    queryFn: async () => {
      if (!myDriver?.id || !event?.id) return null;
      const entries = await base44.entities.Entry.filter({
        event_id: event.id, driver_id: myDriver.id,
      });
      return entries.find((e) => !e.is_archived) || null;
    },
    enabled: !!myDriver?.id && !!event?.id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['allTeams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { mutateAsync: createDriver, isPending: creatingDriver } = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDriver'] });
      toast.success('Driver profile created');
    },
    onError: (e) => toast.error(`Failed to create profile: ${e.message}`),
  });

  const invalidateEntryQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['myEventEntry'] });
    queryClient.invalidateQueries({ queryKey: ['eventEntries'] });
    queryClient.invalidateQueries({ queryKey: ['eventDrivers'] });
  };

  const { mutateAsync: createEntry, isPending: creatingEntry } = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      invalidateEntryQueries();
      toast.success("Entry submitted — pending admin approval.");
    },
    onError: (e) => toast.error(`Failed to register: ${e.message}`),
  });

  const { mutateAsync: updateEntry, isPending: updatingEntry } = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    onSuccess: () => {
      invalidateEntryQueries();
      toast.success('Registration updated');
    },
    onError: (e) => toast.error(`Failed to update: ${e.message}`),
  });

  const { mutateAsync: withdraw, isPending: withdrawing } = useMutation({
    mutationFn: (id) => base44.entities.Entry.update(id, { entry_status: 'Withdrawn' }),
    onSuccess: () => {
      invalidateEntryQueries();
      toast.success('Withdrawn from event');
      setOpen(false);
    },
    onError: (e) => toast.error(`Failed to withdraw: ${e.message}`),
  });

  useEffect(() => {
    if (myEntry) {
      setForm({
        class_id: myEntry.event_class_id || myEntry.series_class_id || '',
        car_number: myEntry.car_number || '',
        team_id: myEntry.team_id || '',
      });
    }
  }, [myEntry]);

  const isRegistered = !!myEntry && myEntry.entry_status !== 'Withdrawn';
  const isPending = isRegistered && myEntry?.entry_status === 'Pending Approval';

  const handleCreateDriver = async () => {
    if (!user) { toast.error('Not authenticated'); return; }
    const [first, ...rest] = (user.full_name || '').split(' ');
    await createDriver({
      first_name: first || 'Driver',
      last_name: rest.join(' ') || 'User',
      owner_user_id: user.id,
      racing_status: 'Active',
      visibility_status: 'draft',
    });
  };

  const classLabel = (cls) => cls.class_name || cls.name || '—';

  const buildPayload = () => {
    const cls = classes.find((c) => c.id === form.class_id);
    const payload = {
      event_id: event.id,
      driver_id: myDriver.id,
      series_id: seriesId || event.series_id,
      car_number: form.car_number.trim(),
      team_id: form.team_id || undefined,
      entry_status: 'Pending Approval',
      tech_status: 'Not Inspected',
      created_by_user_id: user.id,
    };
    if (cls?.event_id) payload.event_class_id = cls.id;
    else if (cls?.series_id) payload.series_class_id = cls.id;
    else payload.series_class_id = form.class_id || undefined;
    return payload;
  };

  const handleSubmit = async () => {
    if (!form.class_id) { toast.error('Select a class'); return; }
    if (!form.car_number.trim()) { toast.error('Enter your car number'); return; }
    const payload = buildPayload();
    if (myEntry) {
      await updateEntry({
        id: myEntry.id,
        data: { ...payload, payment_status: myEntry.payment_status },
      });
    } else {
      await createEntry({ ...payload, payment_status: 'Pending Registration' });
    }
  };

  const renderClassField = () => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">Racing Class</label>
      <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
        <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-9 text-sm">
          <SelectValue placeholder="Select your class…" />
        </SelectTrigger>
        <SelectContent className="bg-[#262626] border-gray-700">
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>{classLabel(c)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderTeamField = () => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">Team (optional)</label>
      <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v || '' })}>
        <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-9 text-sm">
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent className="bg-[#262626] border-gray-700">
          <SelectItem value={null}>None</SelectItem>
          {teams.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderCarNumberField = () => (
    <div>
      <label className="text-xs text-gray-400 block mb-1">Car Number</label>
      <Input
        value={form.car_number}
        onChange={(e) => setForm({ ...form, car_number: e.target.value })}
        placeholder="e.g. 46"
        className="bg-[#1A1A1A] border-gray-600 text-white h-9 text-sm"
      />
    </div>
  );

  const showLoginForm = !isAuthenticated;
  const showDriverLoading = isAuthenticated && driverLoading;
  const showNoDriver = isAuthenticated && !driverLoading && !myDriver;
  const showEntryLoading = isAuthenticated && !driverLoading && myDriver && entryLoading;
  const showRegistered = isAuthenticated && !driverLoading && myDriver && !entryLoading && isRegistered;
  const showRegisterForm = isAuthenticated && !driverLoading && myDriver && !entryLoading && !isRegistered;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className={
          isPending
            ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold'
            : isRegistered
              ? 'bg-green-600 hover:bg-green-700 text-white font-semibold'
              : 'bg-[#00FFDA] text-[#0A0A0A] hover:bg-[#00E6CC] font-semibold'
        }
      >
        {isPending ? (
          <><Clock className="w-3.5 h-3.5 mr-1.5" /> Pending</>
        ) : isRegistered ? (
          <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Entered</>
        ) : (
          <><Flag className="w-3.5 h-3.5 mr-1.5" /> I'm Going</>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[#0A0A0A] border-gray-800 w-full sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">
              {isRegistered ? 'Your Entry' : 'Enter This Event'}
            </SheetTitle>
            <SheetClose />
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {showLoginForm && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm mb-4">
                  Log in to declare your entry for {event?.name}.
                </p>
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-[#00FFDA] text-[#0A0A0A] hover:bg-[#00E6CC]"
                >
                  <LogIn className="w-4 h-4 mr-1.5" /> Log In
                </Button>
              </div>
            )}

            {showDriverLoading && (
              <p className="text-gray-400 text-sm text-center py-8">Loading…</p>
            )}

            {showNoDriver && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  You need a driver profile to register for events. We'll create one from your account.
                </p>
                <Button
                  onClick={handleCreateDriver}
                  disabled={creatingDriver}
                  className="w-full bg-[#00FFDA] text-[#0A0A0A] hover:bg-[#00E6CC] font-semibold"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  {creatingDriver ? 'Creating…' : 'Create My Driver Profile'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  You can fill in your full profile details later from your dashboard.
                </p>
              </div>
            )}

            {showEntryLoading && (
              <p className="text-gray-400 text-sm text-center py-8">Checking registration…</p>
            )}

            {showRegistered && (
              <div className="space-y-4">
                {isPending ? (
                  <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-bold">Entry submitted — pending approval</span>
                    </div>
                    <p className="text-xs text-amber-300/70 mt-1.5">
                      A series or event admin must approve your entry before you appear on the official roster.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-amber-500/20 text-amber-400">{myEntry.entry_status}</Badge>
                      <Badge className="bg-amber-500/20 text-amber-400">{myEntry.payment_status}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {myDriver.first_name} {myDriver.last_name} · #{myEntry.car_number}
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-bold">You're entered!</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-blue-500/20 text-blue-400">{myEntry.entry_status}</Badge>
                      <Badge className="bg-amber-500/20 text-amber-400">{myEntry.payment_status}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {myDriver.first_name} {myDriver.last_name} · #{myEntry.car_number}
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500">Update your entry details:</p>
                {renderClassField()}
                {renderCarNumberField()}
                {renderTeamField()}

                <Button
                  onClick={handleSubmit}
                  disabled={updatingEntry}
                  className="w-full bg-[#00FFDA] text-[#0A0A0A] hover:bg-[#00E6CC] font-semibold"
                >
                  {updatingEntry ? 'Saving…' : 'Save Changes'}
                </Button>

                <Button
                  onClick={() => withdraw(myEntry.id)}
                  disabled={withdrawing}
                  variant="outline"
                  className="w-full border-red-800/60 text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  {withdrawing ? 'Withdrawing…' : 'Withdraw from Event'}
                </Button>
              </div>
            )}

            {showRegisterForm && (
              <div className="space-y-4">
                {classes.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    No classes are configured for this event yet. Check back soon!
                  </p>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm">
                      Declare your entry — just pick your class and car number. No payment needed.
                    </p>
                    {renderClassField()}
                    {renderCarNumberField()}
                    {renderTeamField()}

                    <Button
                      onClick={handleSubmit}
                      disabled={creatingEntry}
                      className="w-full bg-[#00FFDA] text-[#0A0A0A] hover:bg-[#00E6CC] font-bold"
                    >
                      <Flag className="w-4 h-4 mr-1.5" />
                      {creatingEntry ? 'Entering…' : "I'm Going — Enter Me"}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      Your entry will appear on the event roster once an admin approves it.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="mt-6" />
        </SheetContent>
      </Sheet>
    </>
  );
}