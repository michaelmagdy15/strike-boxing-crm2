import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCRMData, useSettings, useAuth } from './context';
import { isSameDay, parseISO, isAfter, isBefore, addDays, subDays } from 'date-fns';
import { Target, Users, CalendarDays, AlertTriangle, Gift, Settings, ChevronLeft, ChevronRight, BarChart3, CreditCard, CheckCircle2, Clock } from 'lucide-react';
import { KPICard } from './components/dashboard/KPICard';
import { RevenueChart } from './components/dashboard/RevenueChart';
import { ConversionFunnel } from './components/dashboard/ConversionFunnel';
import { motion } from 'motion/react';
import { Client } from './types';

function PaginatedList({ items, renderItem, itemsPerPage = 5 }: { items: any[], renderItem: (item: any) => React.ReactNode, itemsPerPage?: number }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = useMemo(() => items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [items, currentPage, itemsPerPage]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {paginatedItems.map(renderItem)}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3 w-3 mr-1" /> Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

const SessionBreakdown = React.memo(({ privateSold, groupSold }: { privateSold: number, groupSold: number }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Private Sessions</span>
      <span className="text-sm font-bold">{privateSold}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">Group Sessions</span>
      <span className="text-sm font-bold">{groupSold}</span>
    </div>
  </div>
));

export default function Dashboard() {
  const { clients, analytics } = useCRMData();
  const { salesTarget, updateSalesTarget } = useSettings();
  const { currentUser } = useAuth();
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [newTarget, setNewTarget] = useState(salesTarget.targetAmount.toString());
  
  const now = useMemo(() => new Date(), []);
  
  // Stats - Memoized
  const stats = useMemo(() => {
    const totalLeads = clients.filter(c => c.status === 'Lead').length;
    const activeMembers = clients.filter(c => c.status === 'Active').length;
    const nearlyExpiredList = clients.filter(c => c.status === 'Nearly Expired');
    const expiredList = clients.filter(c => c.status === 'Expired');
    
    const negativeSessions = clients.filter(c => typeof c.sessionsRemaining === 'number' && c.sessionsRemaining < 0);
    const noAttendance = clients.filter(c => c.sessionsRemaining === 'no attend');
    
    const upcomingVisits = (clients as any[]).filter(c => 
      c.expectedVisitDate && 
      isAfter(parseISO(c.expectedVisitDate), now) && 
      isBefore(parseISO(c.expectedVisitDate), addDays(now, 3))
    );
    
    const upcomingBirthdays = clients.filter(c => {
      if (!c.dateOfBirth) return false;
      const dob = parseISO(c.dateOfBirth);
      const dobThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      return isAfter(dobThisYear, subDays(now, 1)) && isBefore(dobThisYear, addDays(now, 7));
    });

    return {
      totalLeads,
      activeMembers,
      nearlyExpiredList,
      expiredList,
      negativeSessions,
      noAttendance,
      upcomingVisits,
      upcomingBirthdays
    };
  }, [clients, now]);

  const targetPercentage = useMemo(() => 
    Math.round((salesTarget.currentAmount / salesTarget.targetAmount) * 100)
  , [salesTarget.currentAmount, salesTarget.targetAmount]);

  const handleUpdateTarget = useCallback(() => {
    const target = parseFloat(newTarget);
    if (!isNaN(target) && target > 0) {
      updateSalesTarget(target);
      setIsTargetDialogOpen(false);
    }
  }, [newTarget, updateSalesTarget]);

  return (
    <div className="space-y-12 pb-24 max-w-[1700px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 px-1">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
           className="relative"
        >
          <div className="flex items-center gap-4 mb-3">
             <Badge variant="outline" className="px-3 py-1 border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
              System Status: Active
            </Badge>
            <div className="h-[1px] w-12 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <h2 className="text-7xl font-black tracking-tighter leading-none mb-4">
            Welcome back, <span className="text-gradient-primary italic">{currentUser?.name?.split(' ')[0] || 'User'}</span>
          </h2>
          <p className="text-lg font-bold text-muted-foreground tracking-tight opacity-60 max-w-2xl leading-relaxed">
            Manage your gym operations, track performance, and stay ahead of your goals. All systems are online.
          </p>
        </motion.div>
        
        <motion.div 
          className="flex items-center gap-3 pt-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
           <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
              <DialogTrigger>
                  <Button variant="outline" className="h-14 px-8 font-black text-[11px] uppercase tracking-widest glass-card glass-card-hover border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-2xl group overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    <Settings className="h-4 w-4 mr-3 opacity-40 group-hover:rotate-90 transition-transform duration-500" />
                    Sales Target
                  </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-3xl p-8 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tighter uppercase leading-none mb-1">
                    Sales <span className="text-primary italic">Target</span>
                  </DialogTitle>
                  <p className="text-xs font-bold text-muted-foreground opacity-50 uppercase tracking-widest">Adjust monthly revenue goals</p>
                </DialogHeader>
                <div className="space-y-8 py-8">
                  <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-[0.3em] opacity-40">Monthly Revenue Goal (LE)</Label>
                    <div className="relative">
                       <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 opacity-20" />
                       <Input 
                        type="number" 
                        className="h-20 pl-16 text-4xl font-black tabular-nums bg-zinc-100/50 dark:bg-zinc-900/50 border-none rounded-2xl focus:ring-2 focus:ring-primary/50 transition-all"
                        value={newTarget} 
                        onChange={(e) => setNewTarget(e.target.value)} 
                       />
                    </div>
                  </div>
                  <Button onClick={handleUpdateTarget} className="w-full h-16 text-xs font-black uppercase tracking-[0.3em] bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 rounded-2xl">Update Target</Button>
                </div>
              </DialogContent>
            </Dialog>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <KPICard 
          title="Total Revenue" 
          value={`${salesTarget.currentAmount.toLocaleString()} LE`}
          icon={CreditCard}
          trend={{ value: 12, isPositive: true }}
          description={`${targetPercentage}% of goal`}
          color="rose-600"
        />
        <KPICard 
          title="New Leads" 
          value={stats.totalLeads}
          icon={Users}
          trend={{ value: 5, isPositive: true }}
          description="Total active leads"
          color="orange-600"
        />
        <KPICard 
          title="Conversion Rate" 
          value={`${analytics.conversionRate}%`}
          icon={BarChart3}
          trend={{ value: 3, isPositive: true }}
          description="Leads to members"
          color="amber-600"
        />
        <KPICard 
          title="Churn Risk" 
          value={stats.nearlyExpiredList.length}
          icon={AlertTriangle}
          trend={{ value: 2, isPositive: false }}
          description="Expiring < 30 days"
          color="red-600"
        />
        <KPICard 
          title="Birthdays" 
          value={stats.upcomingBirthdays.length}
          icon={Gift}
          description="Next 7 days"
          color="pink-600"
        />
      </div>

      <motion.div 
        className="grid gap-6 lg:grid-cols-7"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        <div className="lg:col-span-4">
          <RevenueChart data={analytics.revenueByMonth} />
        </div>
        <div className="lg:col-span-3">
          <ConversionFunnel data={analytics.leadsByStage} />
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="glass-card shadow-2xl border-none overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="bg-zinc-100/50 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-4 pt-6 px-8 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-40 flex items-center gap-2">
                <Target className="h-3 w-3 text-primary animate-pulse" />
                <span>Session Breakdown</span>
            </CardTitle>
            <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-primary/20 text-primary">Live</Badge>
          </CardHeader>
          <CardContent className="p-8">
            <SessionBreakdown 
              privateSold={salesTarget.privateSessionsSold} 
              groupSold={salesTarget.groupSessionsSold} 
            />
          </CardContent>
        </Card>

        <Card className="glass-card shadow-2xl border-none overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="bg-zinc-100/50 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-4 pt-6 px-8 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-red-500/80 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              <span>Action Items</span>
            </CardTitle>
            <span className="text-[10px] font-black tabular-nums opacity-20">URGENT</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-8">
              {(stats.negativeSessions.length > 0 || stats.noAttendance.length > 0 || stats.expiredList.length > 0) ? (
                <>
                  {stats.negativeSessions.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-2 border-l-2 border-red-500/50">Negative Sessions</h4>
                      <PaginatedList 
                        items={stats.negativeSessions} 
                        renderItem={(client: Client) => (
                          <div key={client.id} className="flex items-center justify-between p-4 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-black/20 rounded-2xl group/item hover:bg-white/60 dark:hover:bg-black/30 transition-all duration-300">
                            <div className="space-y-1">
                              <p className="font-black text-sm tracking-tight">{client.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{client.packageType}</span>
                              </div>
                            </div>
                            <Badge variant="destructive" className="h-8 min-w-[32px] font-black rounded-xl text-xs flex justify-center items-center shadow-lg shadow-red-500/20">{client.sessionsRemaining}</Badge>
                          </div>
                        )} 
                      />
                    </div>
                  )}
                  
                  {stats.noAttendance.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-2 border-l-2 border-amber-500/50">No Attendance</h4>
                      <PaginatedList 
                        items={stats.noAttendance} 
                        renderItem={(client: Client) => (
                          <div key={client.id} className="flex items-center justify-between p-4 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-black/20 rounded-2xl group/item hover:bg-white/60 dark:hover:bg-black/30 transition-all duration-300">
                            <div className="space-y-1">
                              <p className="font-black text-sm tracking-tight">{client.name}</p>
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{client.packageType}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl">
                                <div className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">No Attend</span>
                            </div>
                          </div>
                        )} 
                      />
                    </div>
                  )}

                  {stats.expiredList.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-2 border-l-2 border-zinc-500/50">Expired Memberships</h4>
                      <PaginatedList 
                        items={stats.expiredList} 
                        renderItem={(client: Client) => (
                          <div key={client.id} className="flex items-center justify-between p-4 border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-black/20 rounded-2xl opacity-60">
                            <div className="space-y-1">
                              <p className="font-black text-sm tracking-tight line-through">{client.name}</p>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">EXPIRED: {client.membershipExpiry ? new Date(client.membershipExpiry).toLocaleDateString() : '—'}</p>
                            </div>
                            <Badge variant="outline" className="font-black rounded-lg uppercase text-[10px] opacity-40">Status: Expired</Badge>
                          </div>
                        )} 
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-8 w-8 text-primary/40" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest mb-1 opacity-70">All Good</h3>
                    <p className="text-[10px] font-bold text-muted-foreground opacity-30 uppercase tracking-tight">No critical issues detected.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-2xl border-none overflow-hidden group">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <CardHeader className="bg-zinc-100/50 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-4 pt-6 px-8 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-blue-500/80 flex items-center gap-2">
               <CalendarDays className="h-3 w-3" />
               <span>Upcoming Alerts</span>
            </CardTitle>
            <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-blue-500/20 text-blue-500">Live</Badge>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-8">
              {(stats.upcomingVisits.length > 0 || stats.nearlyExpiredList.length > 0) ? (
                <>
                  {stats.upcomingVisits.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-2 border-l-2 border-blue-500/50">Expected Visits</h4>
                      <PaginatedList 
                        items={stats.upcomingVisits} 
                        renderItem={(client: Client) => (
                          <div key={client.id} className="flex items-center justify-between p-4 border border-zinc-200/50 dark:border-zinc-800/50 bg-blue-500/5 rounded-2xl">
                            <div className="space-y-1">
                              <p className="font-black text-sm tracking-tight">{client.name}</p>
                              <div className="flex items-center gap-2">
                                <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[9px] font-black text-blue-600/80 uppercase tracking-widest">ETA: {new Date((client as any).expectedVisitDate!).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        )} 
                      />
                    </div>
                  )}

                  {stats.nearlyExpiredList.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-2 border-l-2 border-amber-500/50">Nearly Expired</h4>
                      <PaginatedList 
                        items={stats.nearlyExpiredList} 
                        renderItem={(client: Client) => (
                          <div key={client.id} className="flex items-center justify-between p-4 border border-zinc-200/50 dark:border-zinc-800/50 bg-amber-500/5 rounded-2xl">
                            <div className="space-y-1">
                              <p className="font-black text-sm tracking-tight">{client.name}</p>
                              <span className="text-[9px] font-black text-amber-600/80 uppercase tracking-widest">EXPIRING: {client.membershipExpiry ? new Date(client.membershipExpiry).toLocaleDateString() : '—'}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-50 hover:opacity-100">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )} 
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center opacity-30">
                    <Clock className="h-12 w-12 mb-6" />
                    <p className="text-xs font-black uppercase tracking-widest">No upcoming alerts</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
