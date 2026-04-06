import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { format, isSameDay, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PrivateSession } from './types';

export default function PrivateSessions() {
  const { clients, privateSessions, addPrivateSession, updatePrivateSession, updateClient } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newSessionClientId, setNewSessionClientId] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyClientId, setHistoryClientId] = useState('');

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

  const handleUpdateStatus = (session: PrivateSession, status: PrivateSession['status']) => {
    updatePrivateSession(session.id, { status });
    
    // Deduct session if Attended or No Show
    if (status === 'Attended' || status === 'No Show') {
      const client = clients.find(c => c.id === session.clientId);
      if (client) {
        let currentSessions = client.sessionsRemaining;
        
        if (currentSessions === 'no attend') {
          // Try to extract number of sessions from packageType (e.g., "10 S GT")
          const match = client.packageType?.match(/(\d+)\s*S/i) || client.packageType?.match(/(\d+)\s*Session/i);
          if (match && match[1]) {
            currentSessions = parseInt(match[1], 10);
          } else {
            currentSessions = 0; // Fallback
          }
        }
        
        if (typeof currentSessions === 'number') {
          updateClient(client.id, { sessionsRemaining: currentSessions - 1 });
        }
      }
    }
  };

  const sessionsForSelectedDate = privateSessions.filter(session => 
    selectedDate && isSameDay(parseISO(session.date), selectedDate)
  );

  const historySessions = privateSessions
    .filter(s => s.clientId === historyClientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusBadge = (status: PrivateSession['status']) => {
    switch (status) {
      case 'Attended': 
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">Attended</Badge>;
      case 'No Show': 
        return <Badge variant="destructive">No Show</Badge>;
      case 'Cancelled': 
        return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Cancelled</Badge>;
      case 'Scheduled':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-none">Scheduled</Badge>;
      default: 
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Private Sessions</h2>
        <div className="flex space-x-2">
          <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <DialogTrigger render={<Button variant="outline">Client History</Button>} />
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Client Session History</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Client</Label>
                  <Select value={historyClientId} onValueChange={setHistoryClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client to view history" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {historyClientId && (
                  <div className="mt-4 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historySessions.length > 0 ? (
                          historySessions.map(session => (
                            <TableRow key={session.id}>
                              <TableCell className="font-medium">
                                {format(parseISO(session.date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(session.status)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {session.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                              No session history found for this client.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
            <DialogTrigger render={<Button>Schedule Session</Button>} />
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Private Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="font-medium">{selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}</div>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={newSessionClientId} onValueChange={setNewSessionClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.status === 'Active').map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name} (Remaining: {client.sessionsRemaining})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddSession} className="w-full" disabled={!newSessionClientId || !selectedDate}>
                Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-[350px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Sessions for {selectedDate ? format(selectedDate, 'PPP') : 'Selected Date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsForSelectedDate.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sessions scheduled for this date.
              </div>
            ) : (
              <div className="space-y-4">
                {sessionsForSelectedDate.map(session => {
                  const client = clients.find(c => c.id === session.clientId);
                  return (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                      <div>
                        <div className="font-medium">{client?.name || 'Unknown Client'}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          Status: {getStatusBadge(session.status)}
                        </div>
                      </div>
                      
                      {session.status === 'Scheduled' && (
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="flex-1 sm:flex-none"
                            onClick={() => handleUpdateStatus(session, 'Attended')}
                          >
                            Attended
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="flex-1 sm:flex-none"
                            onClick={() => handleUpdateStatus(session, 'No Show')}
                          >
                            No Show
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            onClick={() => handleUpdateStatus(session, 'Cancelled')}
                          >
                            Cancelled
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
