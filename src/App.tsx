/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useAppContext } from './context';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import Leads from './Leads';
import Clients from './Clients';
import Payments from './Payments';
import PTPackages from './PTPackages';
import Attendance from './Attendance';
import AuditLogs from './AuditLogs';
import Tasks from './Tasks';
import Settings from './Settings';
import Login from './Login';
import Reports from './Reports';
import MemberCheckin from './MemberCheckin';
import { Activity, Users, UserPlus, CreditCard, LogOut, Calendar as CalendarIcon, ShieldAlert, Settings as SettingsIcon, Eye, EyeOff, CheckSquare, Package, Search, Scan, History, BarChart3, LayoutDashboard, MoreHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from './components/NotificationCenter';

function AppContent() {
  const { currentUser, logout, isAuthReady, previewRole, setPreviewRole, searchQuery, setSearchQuery, branding, canAccessSettings, canViewGlobalDashboard, canDeletePayments, isManagerOrSama } = useAppContext();
  const [isKioskMode, setIsKioskMode] = React.useState(window.location.pathname === '/kiosk');
  const [isCheckinMode, setIsCheckinMode] = React.useState(window.location.pathname === '/checkin');
  const [kioskAuthenticated, setKioskAuthenticated] = React.useState(false);
  const [pinInput, setPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  // Monitor URL changes for kiosk mode
  React.useEffect(() => {
    const handlePopState = () => {
      setIsKioskMode(window.location.pathname === '/kiosk');
      setIsCheckinMode(window.location.pathname === '/checkin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (branding.kioskPin && pinInput === branding.kioskPin) {
      setKioskAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  if (isKioskMode) {
    if (!kioskAuthenticated) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-white/10 bg-zinc-950 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                ) : (
                  <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center">
                    <Scan className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-white">Kiosk Mode Access</CardTitle>
              <CardDescription className="text-zinc-400">Please enter the security PIN to access the attendance scanner.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-center gap-4">
                     <Input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        placeholder="••••••"
                        className={`text-center text-3xl h-16 tracking-[1em] font-mono bg-zinc-900 border-zinc-800 text-white ${pinError ? 'border-destructive animate-pulse' : 'focus:border-primary'}`}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        maxLength={6}
                      />
                  </div>
                  {pinError && (
                    <p className="text-center text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                      Incorrect PIN. Please try again.
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full h-12 text-lg font-bold bg-white text-black hover:bg-zinc-200">
                  Unlock Kiosk
                </Button>
                <div className="text-center">
                   <Button 
                    variant="link" 
                    className="text-zinc-500 hover:text-white text-xs"
                    onClick={() => {
                        window.history.pushState({}, '', '/');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                   >
                    Return to CRM Login
                   </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <header className="border-b bg-card shadow-sm h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-3">
             {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto" />
              ) : (
                <h1 className="text-lg font-bold tracking-tighter uppercase text-primary">
                  {branding.companyName}
                </h1>
              )}
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">KIOSK MODE</Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setKioskAuthenticated(false)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Lock
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
           <Attendance isKiosk={true} />
        </main>
      </div>
    );
  }

  if (isCheckinMode) {
    return <MemberCheckin />;
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b bg-card shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-2">
              {branding.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={branding.companyName} 
                  className="h-8 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <h1 className="text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-primary font-logo">
                  {branding.companyName}
                </h1>
              )}
            </div>
            <div className="hidden md:flex relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, phone, or ID..."
                className="w-full pl-9 bg-muted/50 border-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {currentUser.email === "michaelmitry13@gmail.com" && (
              <div className="hidden sm:flex items-center space-x-2 h-8">
                <Select 
                  value={previewRole || "none"} 
                  onValueChange={(v) => setPreviewRole(v === "none" ? null : v as any)}
                >
                  <SelectTrigger className={`h-8 w-[150px] text-xs ${previewRole ? 'border-amber-500 text-amber-600 font-medium' : ''}`}>
                    <div className="flex items-center">
                       {previewRole ? <Eye className="h-3.5 w-3.5 mr-2" /> : <EyeOff className="h-3.5 w-3.5 mr-2" />}
                       <SelectValue placeholder="Preview Role" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Exit Preview</SelectItem>
                    <SelectItem value="crm_admin">CRM Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="rep">Sales Rep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => {
                const searchBar = document.getElementById('mobile-search');
                if (searchBar) searchBar.classList.toggle('hidden');
              }}>
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
            <NotificationCenter />
            <div className="text-xs sm:text-sm font-medium text-muted-foreground flex flex-col items-end">
              <span className="font-bold text-foreground truncate max-w-[120px] sm:max-w-none">{currentUser.name}</span>
              <span className={`text-[10px] sm:text-xs uppercase tracking-wider ${previewRole ? 'text-amber-500 font-bold' : ''}`}>
                {previewRole ? `PREVIEW: ${previewRole}` : currentUser.role}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="h-8 w-8 sm:h-10 sm:w-10">
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div id="mobile-search" className="hidden md:hidden bg-card border-b p-2">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, phone, or ID..."
            className="w-full pl-9 bg-muted/50 border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-4 sm:py-8 pb-24 md:pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* ── Desktop tab bar (md and up, unchanged) ── */}
          <div className="hidden md:block overflow-x-auto pb-2 no-scrollbar">
            <TabsList className="flex w-full bg-muted/50 rounded-lg p-1 justify-center">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">Dashboard</TabsTrigger>
              
              {(currentUser.role === 'manager' || currentUser.role === 'rep' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
                <TabsTrigger value="leads" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Leads
                </TabsTrigger>
              )}
              
              <TabsTrigger value="clients" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>

              {currentUser.role !== 'admin' && (
                <TabsTrigger value="tasks" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
              )}
              
              {(canViewGlobalDashboard || canDeletePayments) && (
                <TabsTrigger value="payments" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payments
                </TabsTrigger>
              )}
              <TabsTrigger value="attendance" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                <Scan className="h-4 w-4 mr-2" />
                Attendance
              </TabsTrigger>

              {isManagerOrSama && currentUser.role !== 'admin' && (
                <TabsTrigger value="reports" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </TabsTrigger>
              )}

              {canAccessSettings && currentUser.role !== 'admin' && (
                <>
                  <TabsTrigger value="audit" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                    <History className="h-4 w-4 mr-2" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 text-sm">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Settings
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* ── Tab contents (shared between mobile & desktop) ── */}
          <TabsContent value="dashboard" className="m-0 animate-in fade-in-50 duration-300">
            <Dashboard />
          </TabsContent>

          {(currentUser.role === 'manager' || currentUser.role === 'rep' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
            <TabsContent value="leads" className="m-0 animate-in fade-in-50 duration-300">
              <Leads />
            </TabsContent>
          )}

          <TabsContent value="clients" className="m-0 animate-in fade-in-50 duration-300">
            <Clients />
          </TabsContent>

          {currentUser.role !== 'admin' && (
            <TabsContent value="tasks" className="m-0 animate-in fade-in-50 duration-300">
              <Tasks />
            </TabsContent>
          )}

          {(canViewGlobalDashboard || canDeletePayments) && (
            <TabsContent value="payments" className="m-0 animate-in fade-in-50 duration-300">
              <Payments />
            </TabsContent>
          )}

          <TabsContent value="attendance" className="m-0 animate-in fade-in-50 duration-300">
            <Attendance />
          </TabsContent>

          {isManagerOrSama && (
            <TabsContent value="reports" className="m-0 animate-in fade-in-50 duration-300">
              <Reports />
            </TabsContent>
          )}

          {canAccessSettings && (
            <>
              <TabsContent value="audit" className="m-0 animate-in fade-in-50 duration-300">
                <AuditLogs />
              </TabsContent>
              <TabsContent value="settings" className="m-0 animate-in fade-in-50 duration-300">
                <Settings />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      {/* ── Mobile Bottom Navigation (hidden on md+) ── */}
      <nav className="mobile-nav md:hidden" aria-label="Mobile navigation">
        {/* Dashboard */}
        <button
          onClick={() => { setActiveTab('dashboard'); setShowMoreMenu(false); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px] transition-colors ${
            activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-semibold tracking-wide">Home</span>
        </button>

        {/* Leads (role-gated) */}
        {(currentUser.role === 'manager' || currentUser.role === 'rep' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'crm_admin') && (
          <button
            onClick={() => { setActiveTab('leads'); setShowMoreMenu(false); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px] transition-colors ${
              activeTab === 'leads' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-[10px] font-semibold tracking-wide">Leads</span>
          </button>
        )}

        {/* Members */}
        <button
          onClick={() => { setActiveTab('clients'); setShowMoreMenu(false); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px] transition-colors ${
            activeTab === 'clients' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-semibold tracking-wide">Members</span>
        </button>

        {/* Attendance */}
        <button
          onClick={() => { setActiveTab('attendance'); setShowMoreMenu(false); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px] transition-colors ${
            activeTab === 'attendance' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Scan className="h-5 w-5" />
          <span className="text-[10px] font-semibold tracking-wide">Scan</span>
        </button>

        {/* More menu trigger */}
        <button
          onClick={() => setShowMoreMenu(prev => !prev)}
          className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px] transition-colors ${
            showMoreMenu || ['tasks','payments','reports','audit','settings'].includes(activeTab)
              ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-semibold tracking-wide">More</span>
        </button>

        {/* More drawer */}
        {showMoreMenu && (
          <div className="absolute bottom-full left-0 right-0 bg-card border-t border-border shadow-xl rounded-t-2xl p-4 pb-2 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">More</span>
              <button onClick={() => setShowMoreMenu(false)} className="text-muted-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {currentUser.role !== 'admin' && (
                <button
                  onClick={() => { setActiveTab('tasks'); setShowMoreMenu(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                    activeTab === 'tasks' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  <CheckSquare className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Tasks</span>
                </button>
              )}
              {(canViewGlobalDashboard || canDeletePayments) && (
                <button
                  onClick={() => { setActiveTab('payments'); setShowMoreMenu(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                    activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Payments</span>
                </button>
              )}
              {isManagerOrSama && currentUser.role !== 'admin' && (
                <button
                  onClick={() => { setActiveTab('reports'); setShowMoreMenu(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                    activeTab === 'reports' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Reports</span>
                </button>
              )}
              {canAccessSettings && currentUser.role !== 'admin' && (
                <>
                  <button
                    onClick={() => { setActiveTab('audit'); setShowMoreMenu(false); }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                      activeTab === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    <History className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">History</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('settings'); setShowMoreMenu(false); }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                      activeTab === 'settings' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    <SettingsIcon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">Settings</span>
                  </button>
                </>
              )}
              <button
                onClick={() => { logout(); setShowMoreMenu(false); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-destructive/10 text-destructive transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-[10px] font-semibold">Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
