import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Client, PTPackageRecord } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Phone } from 'lucide-react';

export default function CoachClients() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetch = async () => {
      // Get all PT sessions where this coach is the trainer
      const sessionsQ = query(collection(db, 'ptPackageRecords'), where('trainerId', '==', currentUser.id));
      const sessionsSnap = await getDocs(sessionsQ);
      const clientIds = [...new Set(sessionsSnap.docs.map(d => d.data().clientId as string))];
      if (clientIds.length === 0) { setLoading(false); return; }

      // Fetch in batches of 30 (Firestore 'in' limit)
      const allClients: Client[] = [];
      for (let i = 0; i < clientIds.length; i += 30) {
        const batch = clientIds.slice(i, i + 30);
        const clientsQ = query(collection(db, 'clients'), where('__name__', 'in', batch));
        const snap = await getDocs(clientsQ);
        snap.docs.forEach(d => allClients.push({ ...d.data(), id: d.id } as Client));
      }
      setClients(allClients);
      setLoading(false);
    };
    fetch();
  }, [currentUser?.id]);

  const statusColor: Record<string, string> = {
    Active: 'bg-green-500/10 text-green-600',
    'Nearly Expired': 'bg-amber-500/10 text-amber-600',
    Expired: 'bg-red-500/10 text-red-600',
    Lead: 'bg-blue-500/10 text-blue-600',
    Hold: 'bg-purple-500/10 text-purple-600',
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> My Members
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Members who have trained with you.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users className="h-12 w-12 opacity-20" />
            <p>{search ? 'No members match your search.' : 'No PT sessions recorded yet.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(client => (
            <Card key={client.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{client.name}</p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{client.phone}</span>
                      {client.memberId && <span className="font-mono text-xs">· {client.memberId}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge className={`text-xs ${statusColor[client.status] || ''}`}>{client.status}</Badge>
                  {client.sessionsRemaining !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {client.sessionsRemaining} sessions left
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
