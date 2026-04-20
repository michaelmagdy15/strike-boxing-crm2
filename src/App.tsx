import React, { Suspense, lazy } from 'react';
import { AppProvider, useAuth, useCRMData, useSettings } from './context';
import { isAdmin } from './types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Login from './Login';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  UserPlus, 
  UserCheck,
  CreditCard, 
  LogOut, 
  Calendar as CalendarIcon, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  Eye, 
  CheckSquare, 
  Search,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';

// Lazy load tab components
const Dashboard = lazy(() => import('./Dashboard'));
const Leads = lazy(() => import('./Leads'));
const Clients = lazy(() => import('./Clients'));
const Payments = lazy(() => import('./Payments'));
const PrivateSessions = lazy(() => import('./PrivateSessions'));
const AuditLogs = lazy(() => import('./AuditLogs'));
const Tasks = lazy(() => import('./Tasks'));
const Settings = lazy(() => import('./Settings'));

function AppContent() {
  const { currentUser, logout, isAuthReady, previewRole, setPreviewRole, effectiveRole } = useAuth();
  const { searchQuery, setSearchQuery, branding } = useSettings();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 gap-8">
        <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-primary/10 animate-ping absolute inset-0" />
            <div className="h-24 w-24 rounded-full border-t-4 border-primary animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-2">
            <h2 className="text-zinc-900 dark:text-white font-black uppercase tracking-[4px] text-xl">Strike Boxing CRM</h2>
            <p className="text-zinc-500 font-bold">Initalizing System...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AnimatePresence><Login /></AnimatePresence>;
  }

  const isPreviewing = !!previewRole;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-foreground flex flex-col transition-colors duration-500">
      {isPreviewing && (
        <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-amber-500 text-white text-[10px] font-black py-1.5 px-4 flex items-center justify-center space-x-4 z-[60] sticky top-0 shadow-lg uppercase tracking-widest"
        >
          <ShieldAlert className="h-3 w-3" />
          <span>Viewing as: {effectiveRole?.replace('_', ' ')}</span>
          <button 
            onClick={() => setPreviewRole(null)}
            className="ml-4 px-3 py-0.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            Exit Preview
          </button>
        </motion.div>
      )}

      <header className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between gap-8">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-[14px] flex items-center justify-center shadow-lg shadow-primary/20 relative group overflow-hidden">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <Zap className="h-6 w-6 text-primary-foreground fill-current relative z-10" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
                  Strike<span className="text-primary italic">Boxing</span>
                </h1>
                <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Management Console v4.0</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-2xl hidden md:block group">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Search across CRM: Name, Phone or ID..."
                className="w-full h-11 pl-12 bg-zinc-100/50 dark:bg-zinc-900/50 border-none rounded-xl font-bold transition-all focus:ring-2 focus:ring-primary/50 shadow-inner text-sm"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-black opacity-30">CMD</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px] font-black opacity-30">K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 pr-6 border-r border-zinc-200 dark:border-zinc-800">
               {isAdmin(currentUser.role) && (
                 <Select value={previewRole || 'none'} onValueChange={(v) => setPreviewRole(v === 'none' ? null : v as any)}>
                   <SelectTrigger className="h-9 w-[160px] bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg font-black text-[10px] uppercase tracking-widest ring-0 focus:ring-0">
                     <div className="flex items-center gap-2">
                       <Eye className="h-3 w-3" />
                       <SelectValue placeholder="Access Level" />
                     </div>
                   </SelectTrigger>
                   <SelectContent className="rounded-xl border-none shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                     <SelectItem value="none" className="font-black text-[10px] uppercase tracking-widest">Administrator</SelectItem>
                     <SelectItem value="manager" className="font-black text-[10px] uppercase tracking-widest">Manager</SelectItem>
                     <SelectItem value="rep" className="font-black text-[10px] uppercase tracking-widest">Representative</SelectItem>
                     <SelectItem value="coach" className="font-black text-[10px] uppercase tracking-widest">Coach</SelectItem>
                   </SelectContent>
                 </Select>
               )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="font-black text-xs tracking-tight uppercase">{currentUser.name}</span>
                <Badge className="bg-primary/10 text-primary border-none text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 mt-0.5 h-auto rounded-none">
                    {effectiveRole?.replace('_', ' ')}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={logout} 
                className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-sm"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-8 px-6 max-w-[1800px] mx-auto w-full relative z-10">
        <Tabs defaultValue="dashboard" className="flex-1 flex flex-col space-y-8">
          <div className="flex justify-between items-center sm:sticky sm:top-[100px] z-40">
             <div className="hidden lg:flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">System Online</span>
             </div>

            <TabsList className="h-12 bg-zinc-900/5 dark:bg-zinc-100/5 backdrop-blur-md p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
              <TabsTrigger value="dashboard" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <LayoutDashboard className="h-3 w-3 mr-1.5" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="leads" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <UserCheck className="h-3 w-3 mr-1.5" /> Leads
              </TabsTrigger>
              <TabsTrigger value="clients" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Users className="h-3 w-3 mr-1.5" /> Clients
              </TabsTrigger>
              <TabsTrigger value="tasks" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <CheckSquare className="h-3 w-3 mr-1.5" /> Tasks
              </TabsTrigger>
              
              {isAdmin(currentUser.role) && (
                <>
                  <TabsTrigger value="payments" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                    <CreditCard className="h-3 w-3 mr-1.5" /> Payments
                  </TabsTrigger>
                  <TabsTrigger value="sessions" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                    <CalendarIcon className="h-3 w-3 mr-1.5" /> Private Sessions
                  </TabsTrigger>
                </>
              )}
              
              {isAdmin(currentUser.role) && (
                <>
                  <TabsTrigger value="audit" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                    <ShieldCheck className="h-3 w-3 mr-1.5" /> Audit Logs
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="h-full rounded-lg px-4 font-black text-[9px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                    <SettingsIcon className="h-3 w-3 mr-1.5" /> Settings
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <div className="hidden lg:flex items-center gap-4">
               <div className="flex flex-col items-end opacity-40">
                  <span className="text-[10px] font-black uppercase tracking-widest">Last Updated</span>
                  <span className="text-[9px] font-bold">JUST NOW</span>
               </div>
            </div>
          </div>

          <div className="flex-1">
            <Suspense fallback={<div className="h-[400px] flex items-center justify-center bg-zinc-950/5 rounded-[40px]"><div className="h-12 w-12 border-t-2 border-primary rounded-full animate-spin"></div></div>}>
                <TabsContent value="dashboard" className="m-0 focus-visible:outline-none">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Dashboard />
                    </motion.div>
                </TabsContent>
                <TabsContent value="leads" className="m-0 focus-visible:outline-none">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Leads />
                    </motion.div>
                </TabsContent>
                <TabsContent value="clients" className="m-0 focus-visible:outline-none">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Clients />
                    </motion.div>
                </TabsContent>
                <TabsContent value="tasks" className="m-0 focus-visible:outline-none">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Tasks />
                    </motion.div>
                </TabsContent>
                {isAdmin(currentUser.role) && (
                <>
                    <TabsContent value="payments" className="m-0 focus-visible:outline-none">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <Payments />
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="sessions" className="m-0 focus-visible:outline-none">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <PrivateSessions />
                        </motion.div>
                    </TabsContent>
                </>
                )}
                {isAdmin(currentUser.role) && (
                <>
                    <TabsContent value="audit" className="m-0 focus-visible:outline-none">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <AuditLogs />
                        </motion.div>
                    </TabsContent>
                    <TabsContent value="settings" className="m-0 focus-visible:outline-none">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <Settings />
                        </motion.div>
                    </TabsContent>
                </>
                )}
            </Suspense>
          </div>
        </Tabs>
      </main>

      <footer className="mt-20 py-10 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 opacity-40 grayscale">
                 <h2 className="text-sm font-black uppercase tracking-[4px]">Strike Boxing Egypt</h2>
                 <span className="text-[10px] font-bold">Version 2024.11.08</span>
            </div>
            <div className="flex gap-8 opacity-40">
                {['Protocol', 'Vector', 'Archive', 'Privacy'].map((item) => (
                    <span key={item} className="text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">{item}</span>
                ))}
            </div>
            <div className="text-[10px] font-bold text-muted-foreground italic">
                &copy; {new Date().getFullYear()} Strike Boxing Egypt. All Rights Reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
