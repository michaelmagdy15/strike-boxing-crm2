import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, CreditCard, Package, History, User, LogOut, Sun, Moon, Dumbbell } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Client } from '../types';

import MemberHome from './MemberHome';
import MemberSessions from './MemberSessions';
import MemberPackages from './MemberPackages';
import MemberAttendance from './MemberAttendance';
import MemberProfile from './MemberProfile';

type MemberTab = 'home' | 'sessions' | 'packages' | 'attendance' | 'profile';

const NAV_ITEMS: { tab: MemberTab; label: string; icon: React.ReactNode }[] = [
  { tab: 'home',       label: 'Card',        icon: <QrCode className="h-5 w-5" /> },
  { tab: 'sessions',   label: 'Sessions',    icon: <Dumbbell className="h-5 w-5" /> },
  { tab: 'packages',   label: 'Packages',    icon: <Package className="h-5 w-5" /> },
  { tab: 'attendance', label: 'Attendance',  icon: <History className="h-5 w-5" /> },
  { tab: 'profile',    label: 'Profile',     icon: <User className="h-5 w-5" /> },
];

export default function MemberPortal() {
  const { currentUser, logout } = useAuth();
  const { branding } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<MemberTab>('home');
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.clientRecordId) {
      setLoading(false);
      return;
    }

    // Query clients collection where memberId matches the currentUser's clientRecordId
    const q = query(
      collection(db, 'clients'),
      where('memberId', '==', currentUser.clientRecordId.trim())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setClient({ ...docSnap.data(), id: docSnap.id } as Client);
      } else {
        console.warn("No client document found matching member ID:", currentUser.clientRecordId);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to client record:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.clientRecordId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b bg-card shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.companyName} className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
          ) : (
            <h1 className="text-lg font-extralight tracking-[0.2em] uppercase text-primary font-logo">{branding.companyName}</h1>
          )}
          <Badge variant="outline" className="text-[10px] font-bold tracking-widest uppercase text-primary border-primary/30">
            Member Portal
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-tight">{currentUser?.name}</p>
            {currentUser?.clientRecordId && (
              <p className="text-xs font-mono text-primary">ID: {currentUser.clientRecordId}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-md">
        {activeTab === 'home'       && <MemberHome client={client} />}
        {activeTab === 'sessions'   && <MemberSessions client={client} />}
        {activeTab === 'packages'   && <MemberPackages client={client} />}
        {activeTab === 'attendance' && <MemberAttendance client={client} />}
        {activeTab === 'profile'    && <MemberProfile client={client} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 flex justify-around py-1.5 shadow-lg backdrop-blur-md bg-opacity-90">
        {NAV_ITEMS.map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px] transition-colors rounded-xl ${
              activeTab === tab ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {icon}
            <span className="text-[10px] font-bold tracking-wide">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
