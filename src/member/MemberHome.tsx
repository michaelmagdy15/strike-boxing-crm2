import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { Sparkles, Calendar, CheckCircle2, Trophy } from 'lucide-react';

export default function MemberHome({ client }: { client: Client | null }) {
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);

  useEffect(() => {
    if (!client?.id) return;

    // Fetch attendance to find the latest check-in
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where('clientId', '==', client.id));

    getDocs(q)
      .then((snapshot) => {
        if (!snapshot.empty) {
          const records = snapshot.docs.map(doc => doc.data());
          // Sort by date descending
          records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setLastCheckIn(records[0].date);
        } else {
          setLastCheckIn(null);
        }
      })
      .catch((err) => {
        console.error("Error fetching last check-in:", err);
      });
  }, [client?.id]);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p className="font-semibold text-lg">No member record found.</p>
        <p className="text-xs">Contact gym administration to link your account.</p>
      </div>
    );
  }

  // Format expiry/start dates safely
  const formatOptionalDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return 'N/A';
    }
  };

  const statusColor = client.status === 'Active' 
    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
    : 'bg-amber-500/10 text-amber-500 border-amber-500/20';

  const memberQrValue = client.memberId || client.id;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Premium Glassmorphism Membership Card */}
      <div className="relative group overflow-hidden rounded-3xl p-0.5 bg-gradient-to-br from-primary via-primary/30 to-background/50 shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/[0.02] rounded-3xl" />
        <div className="absolute -inset-y-12 -inset-x-12 bg-gradient-to-tr from-primary/10 via-transparent to-transparent blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
        
        <Card className="relative border-0 rounded-[22px] overflow-hidden bg-zinc-950 text-white shadow-none">
          {/* Card Header styling */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          
          <CardContent className="p-6 space-y-6">
            {/* Logo and Level */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">STRIKE BOXING CLUB</p>
                <p className="text-xs font-mono text-primary mt-0.5">MEMBER PASS</p>
              </div>
              <Badge className={`px-2 py-0.5 text-[10px] font-semibold border ${statusColor}`} variant="outline">
                {client.status}
              </Badge>
            </div>

            {/* QR Code section */}
            <div className="flex justify-center py-2 relative">
              <div className="bg-white p-3.5 rounded-2xl shadow-lg shadow-black/40 border border-white/10 relative z-10">
                <QRCodeSVG 
                  value={memberQrValue} 
                  size={140} 
                  level="H" 
                  includeMargin={false}
                  fgColor="#09090b" // Zinc-950 match
                />
              </div>
            </div>

            {/* Member Card Details */}
            <div className="flex justify-between items-end pt-2">
              <div className="space-y-1">
                <p className="text-xs text-zinc-400 font-medium">NAME</p>
                <p className="text-lg font-bold tracking-tight leading-none truncate max-w-[180px]">{client.name}</p>
                <p className="text-[10px] font-mono text-zinc-500">ID: {client.memberId || client.id.substring(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-400 font-medium">BRANCH</p>
                <p className="text-sm font-semibold tracking-wide text-primary uppercase">{client.branch || 'COMPLEX'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Metric: Active Package */}
        <Card className="border bg-card/50 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-24">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Package</span>
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-1">
              <p className="text-sm font-bold truncate pr-1" title={client.packageType || 'None'}>
                {client.packageType || 'No active package'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Expires: {formatOptionalDate(client.membershipExpiry)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metric: Sessions Remaining */}
        <Card className="border bg-card/50 shadow-sm">
          <CardContent className="p-4 flex flex-col justify-between h-24">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Remaining</span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-1">
              {client.sessionsRemaining === 'unlimited' ? (
                <p className="text-xl font-extrabold text-emerald-500 leading-none">Unlimited</p>
              ) : (
                <p className={`text-xl font-extrabold leading-none ${
                  Number(client.sessionsRemaining || 0) <= 1 ? 'text-destructive' : 'text-emerald-500'
                }`}>
                  {client.sessionsRemaining ?? 0} <span className="text-xs font-semibold text-muted-foreground">left</span>
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Start: {formatOptionalDate(client.startDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Check-In Detail */}
      <Card className="border bg-card/50 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Check-In</p>
              <p className="text-sm font-semibold mt-0.5">
                {lastCheckIn ? format(parseISO(lastCheckIn), 'EEEE, dd MMM yyyy') : 'No check-in recorded yet'}
              </p>
            </div>
          </div>
          {lastCheckIn && (
            <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold tracking-wider uppercase">Verified</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
