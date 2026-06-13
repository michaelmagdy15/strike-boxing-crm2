import React, { useState, useEffect } from 'react';
import { Client, User } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { format, parseISO, addDays, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Dumbbell, CalendarRange, User as UserIcon, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

const STATUS_STYLES: Record<string, { badge: string; text: string }> = {
  Scheduled:  { badge: 'bg-blue-500/10 text-blue-600 border-blue-200/50',   text: 'Scheduled' },
  Attended:   { badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50', text: 'Attended' },
  'No Show':  { badge: 'bg-red-500/10 text-red-600 border-red-200/50',     text: 'No Show' },
  Cancelled:  { badge: 'bg-zinc-500/10 text-zinc-500 border-zinc-200/50',   text: 'Cancelled' },
};

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function MemberSessions({ client }: { client: Client | null }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking form state
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [coachSchedule, setCoachSchedule] = useState<Record<string, { enabled: boolean; startTime: string; endTime: string }> | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState<string>('10:00');
  const [bookingMessage, setBookingMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (!client?.id) {
      setLoading(false);
      return;
    }

    // 1. Fetch member's personal training sessions
    const sessionsQ = query(
      collection(db, 'sessions'),
      where('clientId', '==', client.id)
    );

    const unsubSessions = onSnapshot(sessionsQ, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in-memory by date descending
      list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(list);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to member sessions:", err);
      setLoading(false);
    });

    // 2. Fetch active coaches
    const coachesQ = query(
      collection(db, 'users'),
      where('role', '==', 'coach')
    );

    const unsubCoaches = onSnapshot(coachesQ, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as User));
      setCoaches(list);
    }, (err) => {
      console.error("Error subscribing to coaches list:", err);
    });

    return () => {
      unsubSessions();
      unsubCoaches();
    };
  }, [client?.id]);

  // Fetch coach schedule when selected coach changes
  useEffect(() => {
    if (!selectedCoachId) {
      setCoachSchedule(null);
      return;
    }

    const fetchCoachSchedule = async () => {
      try {
        const docRef = doc(db, 'coachSchedules', selectedCoachId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().days) {
          setCoachSchedule(docSnap.data().days);
        } else {
          setCoachSchedule(null);
        }
      } catch (err) {
        console.error("Error fetching coach schedule:", err);
        setCoachSchedule(null);
      }
    };

    fetchCoachSchedule();
  }, [selectedCoachId]);

  if (!client) return null;

  const upcomingSessions = sessions.filter(s => s.status === 'Scheduled' && isAfter(parseISO(s.date), new Date()));
  const pastSessions = sessions.filter(s => s.status !== 'Scheduled' || !isAfter(parseISO(s.date), new Date()));

  const selectedCoach = coaches.find(c => c.id === selectedCoachId);

  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId || !bookingDate || !bookingTime || !client.id) return;

    setIsSubmitting(true);
    setBookingSuccess(false);
    setBookingError(null);

    try {
      // Validate booking date is in the future
      const selectedDateTime = new Date(`${bookingDate}T${bookingTime}`);
      if (selectedDateTime <= new Date()) {
        throw new Error("Please select a future date and time.");
      }

      // Check coach schedule if loaded
      if (coachSchedule) {
        const dayOfWeek = format(selectedDateTime, 'eeee').toLowerCase();
        const dayConfig = coachSchedule[dayOfWeek];
        if (!dayConfig || !dayConfig.enabled) {
          throw new Error(`The coach is not available on ${format(selectedDateTime, 'EEEE')}s.`);
        }
        // Verify time range
        const [hours, minutes] = bookingTime.split(':').map(Number);
        const [startHours, startMinutes] = dayConfig.startTime.split(':').map(Number);
        const [endHours, endMinutes] = dayConfig.endTime.split(':').map(Number);
        
        const bookingMinutes = (hours || 0) * 60 + (minutes || 0);
        const startMinutesTotal = (startHours || 0) * 60 + (startMinutes || 0);
        const endMinutesTotal = (endHours || 0) * 60 + (endMinutes || 0);

        if (bookingMinutes < startMinutesTotal || bookingMinutes > endMinutesTotal) {
          throw new Error(`The coach is only available between ${dayConfig.startTime} and ${dayConfig.endTime} on ${format(selectedDateTime, 'EEEE')}s.`);
        }
      }

      // Add a task in firestore as a booking request
      const formattedDate = format(selectedDateTime, 'PPP');
      const formattedTime = format(selectedDateTime, 'p');

      await addDoc(collection(db, 'tasks'), {
        title: `PT Request: ${client.name}`,
        description: `Member requested a PT session with ${selectedCoach?.name || 'Coach'} on ${formattedDate} at ${formattedTime}.${bookingMessage ? ` Message: ${bookingMessage}` : ''}`,
        dueDate: bookingDate,
        status: 'Pending',
        priority: 'Medium',
        assignedTo: selectedCoachId,
        clientId: client.id,
        createdBy: client.portalUserId || client.id,
        createdAt: new Date().toISOString(),
      });

      setBookingSuccess(true);
      setBookingMessage('');
      // Reset values
      setSelectedCoachId('');
    } catch (err: any) {
      console.error("Error submitting booking request:", err);
      setBookingError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrainerName = (trainerId?: string) => {
    if (!trainerId) return 'Unassigned Coach';
    const trainer = coaches.find(c => c.id === trainerId);
    return trainer?.name || 'Trainer';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" /> My Sessions
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">View scheduled personal training sessions and book new workouts.</p>
      </div>

      {/* Book a new session Section */}
      <Card className="border bg-card/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" /> Request PT Session
          </CardTitle>
          <CardDescription className="text-[11px]">Select a coach and request a personalized training session.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestBooking} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="coachSelect" className="text-xs font-bold text-muted-foreground">Select Coach</Label>
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger id="coachSelect" className="bg-background">
                  <SelectValue placeholder="Choose a trainer" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map(coach => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name} {coach.branch ? `(${coach.branch})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coach Availability Preview */}
            {selectedCoachId && (
              <div className="bg-muted/50 border rounded-xl p-3 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                  <Clock className="h-3.5 w-3.5" />
                  Coach Weekly Availability
                </div>
                {coachSchedule ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
                    {DAYS_ORDER.map(dayKey => {
                      const dayConfig = coachSchedule[dayKey];
                      return (
                        <div key={dayKey} className="flex justify-between border-b border-border/40 py-0.5">
                          <span className="capitalize">{dayKey.substring(0, 3)}:</span>
                          <span>
                            {dayConfig?.enabled 
                              ? `${dayConfig.startTime} – ${dayConfig.endTime}` 
                              : <span className="text-destructive/70 font-semibold italic">Off</span>
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No availability schedule set by this coach yet. You can still send a request.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bookDate" className="text-xs font-bold text-muted-foreground">Date</Label>
                <Input
                  id="bookDate"
                  type="date"
                  min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bookTime" className="text-xs font-bold text-muted-foreground">Time</Label>
                <Input
                  id="bookTime"
                  type="time"
                  value={bookingTime}
                  onChange={e => setBookingTime(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bookMessage" className="text-xs font-bold text-muted-foreground">Message / Focus (Optional)</Label>
              <Textarea
                id="bookMessage"
                rows={2}
                value={bookingMessage}
                onChange={e => setBookingMessage(e.target.value)}
                placeholder="e.g. Focus on boxing technique, pad work, cardio..."
                className="bg-background resize-none"
              />
            </div>

            {bookingError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg flex items-center gap-2.5 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-600 p-3 rounded-lg flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Request sent successfully! Your coach will confirm soon.</span>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting || !selectedCoachId} className="w-full font-bold">
              {isSubmitting ? 'Sending Request...' : 'Send Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary animate-pulse" /> Upcoming Sessions
        </h3>
        {upcomingSessions.length > 0 ? (
          upcomingSessions.map(session => {
            const dateObj = parseISO(session.date);
            const style = STATUS_STYLES[session.status] || STATUS_STYLES.Scheduled;
            return (
              <Card key={session.id} className="border bg-card/40 hover:bg-card/75 transition-colors shadow-sm">
                <CardContent className="p-4 flex justify-between items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      <UserIcon className="h-4 w-4 text-primary" />
                      <span>{getTrainerName(session.trainerId)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(dateObj, 'eee, dd MMM yyyy')}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5" />
                        {format(dateObj, 'h:mm a')}
                      </span>
                      {session.branch && (
                        <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] text-primary">
                          <MapPin className="h-3 w-3" />
                          {session.branch}
                        </span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-[11px] text-muted-foreground flex items-start gap-1 bg-muted/40 p-2 rounded-lg mt-2 italic">
                        <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                        "{session.notes}"
                      </p>
                    )}
                  </div>
                  <Badge className={`border text-xs px-2.5 py-0.5 rounded-full ${style.badge}`} variant="outline">
                    {style.text}
                  </Badge>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="py-8 text-center text-muted-foreground text-xs italic">
              No upcoming sessions scheduled. Select a coach above to request a session.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Past Sessions History */}
      {pastSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Session History</h3>
          <div className="space-y-3">
            {pastSessions.slice(0, 10).map(session => {
              const dateObj = parseISO(session.date);
              const style = STATUS_STYLES[session.status] || { badge: 'bg-zinc-500/10 text-zinc-500 border-zinc-200/50', text: session.status };
              return (
                <Card key={session.id} className="border bg-card/40 opacity-75 shadow-sm">
                  <CardContent className="p-4 flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground">{getTrainerName(session.trainerId)}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{format(dateObj, 'dd MMM yyyy')}</span>
                        <span className="font-mono">{format(dateObj, 'h:mm a')}</span>
                        {session.branch && <span className="uppercase text-[9px] font-bold">{session.branch}</span>}
                      </div>
                    </div>
                    <Badge className={`border text-[10px] px-2 py-0.5 rounded-full ${style.badge}`} variant="outline">
                      {style.text}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
