import React, { useState, useMemo } from 'react';
import { useCRMData, useAuth } from './context';
import { ClientId, PrivateSession, SessionId } from './types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format, isSameDay, parseISO, isPast } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, History, Plus, User, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PrivateSessions() {
  const { clients, privateSessions, addPrivateSession, recordSessionAttendance } = useCRMData();
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newSessionClientId, setNewSessionClientId] = useState<ClientId | ''>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyClientId, setHistoryClientId] = useState<ClientId | ''>('');

  const handleAddSession = () => {
    if (newSessionClientId && selectedDate) {
      addPrivateSession({
        clientId: newSessionClientId,
        date: selectedDate.toISOString(),
        status: 'Scheduled',
      });
      setIsNewSessionOpen(false);
      setNewSessionClientId('');
    }
  };

  const handleUpdateStatus = async (session: PrivateSession, status: PrivateSession['status']) => {
    const client = clients.find(c => c.id === session.clientId);
    if (!client) return;

    try {
      await recordSessionAttendance(
        session.clientId,
        session.id,
        status,
        client,
        currentUser?.name || 'System'
      );
    } catch (error) {
      console.error("Error updating session status:", error);
    }
  };

  const sessionsForSelectedDate = useMemo(() => 
    privateSessions.filter(session => selectedDate && isSameDay(parseISO(session.date), selectedDate))
  , [privateSessions, selectedDate]);

  const historySessions = useMemo(() => 
    privateSessions
      .filter(s => s.clientId === historyClientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [privateSessions, historyClientId]);

  const getStatusBadge = (status: PrivateSession['status']) => {
    switch (status) {
      case 'Attended': return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-sm shadow-emerald-500/10">Attended</Badge>;
      case 'No Show': return <Badge variant="destructive" className="border-none shadow-sm shadow-rose-500/10">No Show</Badge>;
      case 'Cancelled': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20">Cancelled</Badge>;
      case 'Scheduled': return <Badge className="bg-blue-500 hover:bg-blue-600 border-none shadow-sm shadow-blue-500/10">Scheduled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <CalendarIcon className="h-10 w-10 text-primary" />
            Private Coaching
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">Schedule and track personalized training sessions.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogTrigger render={
              <Button variant="outline" size="lg" className="bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:translate-y-[-2px] transition-all">
                <History className="mr-2 h-5 w-5" />
                Session Logs
              </Button>
            } />
            <DialogContent className="max-w-3xl border-none shadow-2xl p-0 overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <DialogTitle className="text-2xl font-black">Attendance Archive</DialogTitle>
                <DialogDescription>Review individual client attendance records and status history.</DialogDescription>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold">Select Practitioner</Label>
                  <Select value={historyClientId} onValueChange={(val) => setHistoryClientId(val as ClientId)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Begin typing name..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {historyClientId && (
                  <ScrollArea className="h-[400px] rounded-2xl border bg-muted/20">
                    <Table>
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead className="font-bold">Session Date</TableHead>
                          <TableHead className="font-bold">Outcome</TableHead>
                          <TableHead className="font-bold">Internal Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historySessions.length > 0 ? (
                          historySessions.map(session => (
                            <TableRow key={session.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="font-mono text-sm">
                                {format(parseISO(session.date), 'EEEE, MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(session.status)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs italic">
                                {session.notes || 'No notes provided'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-12">
                              <div className="flex flex-col items-center gap-2 opacity-30">
                                <History className="h-12 w-12" />
                                <p className="font-bold">No historical data found</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger render={
              <Button size="lg" className="shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                <Plus className="mr-2 h-5 w-5" />
                Book Session
              </Button>
            } />
            <DialogContent className="border-none shadow-2xl p-0 overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <DialogTitle className="text-2xl font-black">Reservation System</DialogTitle>
                <DialogDescription>Reserve a time slot for personal training on {format(selectedDate || new Date(), 'PPP')}.</DialogDescription>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Active Client</Label>
                    <Select value={newSessionClientId} onValueChange={(val) => setNewSessionClientId(val as ClientId)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Locate client profile..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.filter(c => c.status === 'Active').map(client => {
                          const sessionsRemaining = 'sessionsRemaining' in client ? client.sessionsRemaining : 0;
                          return (
                            <SelectItem key={client.id} value={client.id}>
                              <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {client.name} 
                                  <span className="text-[10px] text-muted-foreground font-bold lowercase opacity-60">
                                      (Bal: {sessionsRemaining})
                                  </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 border-dashed">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center">Confirming for</p>
                    <p className="text-xl font-black text-center mt-1">{selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'No date selected'}</p>
                  </div>
                </div>
                <Button onClick={handleAddSession} className="w-full h-14 text-xl font-black shadow-xl" disabled={!newSessionClientId || !selectedDate}>
                  Confirm Booking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="border-none shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-primary/5 p-6 border-b border-primary/10">
              <CardTitle className="text-xl font-black tracking-tight">Focus Calendar</CardTitle>
              <CardDescription>Select a date to manage schedule.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-2xl border-none p-0 mx-auto"
                classNames={{
                    head_cell: "text-muted-foreground font-bold text-[10px] uppercase tracking-widest",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl shadow-lg shadow-primary/30 font-black",
                    day_today: "bg-primary/10 text-primary font-black rounded-xl",
                    day: "h-11 w-11 p-0 font-bold aria-selected:opacity-100 hover:bg-muted rounded-xl transition-all",
                }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
                <h3 className="text-2xl font-black tracking-tight">{format(selectedDate || new Date(), 'MMMM d')}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{sessionsForSelectedDate.length} Sessions Planned</p>
            </div>
          </div>

          <div className="grid gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {sessionsForSelectedDate.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-24 border-2 border-dashed rounded-[32px] bg-muted/20"
                >
                  <div className="bg-primary/5 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CalendarIcon className="h-10 w-10 text-primary/30" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight opacity-40">Open Workspace</h3>
                  <p className="text-muted-foreground font-medium mt-2">No active sessions for this timestamp.</p>
                </motion.div>
              ) : (
                sessionsForSelectedDate.map((session, index) => {
                  const client = clients.find(c => c.id === session.clientId);
                  const isSessionPast = isPast(parseISO(session.date)) && !isSameDay(parseISO(session.date), new Date());
                  
                  return (
                    <motion.div
                      key={session.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className={`group relative border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                        session.status === 'Attended' ? 'bg-emerald-50/50 dark:bg-emerald-950/10 grayscale-[30%]' : 
                        session.status === 'No Show' ? 'bg-rose-50/50 dark:bg-rose-950/10' :
                        'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md'
                      }`}>
                        {/* Status Accent Line */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all ${
                          session.status === 'Attended' ? 'bg-emerald-500' :
                          session.status === 'No Show' ? 'bg-rose-500' :
                          session.status === 'Scheduled' ? 'bg-blue-500' : 'bg-zinc-400'
                        }`} />

                        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                                <User className={`h-7 w-7 ${session.status === 'Attended' ? 'text-emerald-600' : 'text-primary'}`} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black tracking-tight">{client?.name || 'Unidentified Client'}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                    {getStatusBadge(session.status)}
                                    {isSessionPast && session.status === 'Scheduled' && (
                                        <Badge variant="outline" className="border-rose-200 text-rose-600 bg-rose-50 animate-pulse">
                                            Needs Resolution
                                        </Badge>
                                    )}
                                </div>
                            </div>
                          </div>
                          
                          {session.status === 'Scheduled' && (
                            <div className="flex flex-wrap gap-2 sm:self-center">
                              <Button 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                onClick={() => handleUpdateStatus(session, 'Attended')}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Attended
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                className="font-bold px-6 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                                onClick={() => handleUpdateStatus(session, 'No Show')}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                No Show
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-muted-foreground font-bold px-6 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                                onClick={() => handleUpdateStatus(session, 'Cancelled')}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Reschedule
                              </Button>
                            </div>
                          )}
                          
                          {session.status !== 'Scheduled' && (
                            <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                Record Locked
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
