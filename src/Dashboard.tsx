import React, { useState } from 'react';
import ConversionFunnel from './components/ConversionFunnel';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from './context';
import { SALES_NAME_MAPPING } from './constants';
import { differenceInDays, isSameDay, parseISO, isAfter, isBefore, addDays, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { Target, Users, CalendarDays, AlertTriangle, Gift, Settings, ChevronLeft, ChevronRight, Trophy, Download, ArrowUpDown } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function PaginatedList({ items, renderItem, itemsPerPage = 5 }: { items: any[], renderItem: (item: any) => React.ReactNode, itemsPerPage?: number }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil((items || []).length / itemsPerPage);
  const paginatedItems = (items || []).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

export default function Dashboard() {
  const { clients: allClients, salesTarget, updateSalesTarget, updateUserTarget, currentUser, payments: allPayments, userTargets, users, canViewGlobalDashboard, canAccessSettings, branches } = useAppContext();
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [newTarget, setNewTarget] = useState(salesTarget.targetAmount.toString());
  const [selectedRepId, setSelectedRepId] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });

  const clients = React.useMemo(() => {
    return selectedBranch === 'all' ? allClients : allClients.filter(c => c.branch === selectedBranch);
  }, [allClients, selectedBranch]);

  const payments = React.useMemo(() => {
    if (selectedBranch === 'all') return allPayments;
    const branchClientIds = new Set(clients.map(c => c.id));
    return allPayments.filter(p => branchClientIds.has(p.clientId));
  }, [allPayments, clients, selectedBranch]);

  const now = new Date();
  
  // Stats
  const totalLeads = clients.filter(c => c.status === 'Lead').length;
  const activeMembers = clients.filter(c => c.status === 'Active').length;
  const nearlyExpiredList = clients.filter(c => c.status === 'Nearly Expired');
  const nearlyExpired = nearlyExpiredList.length;
  const expiredList = clients.filter(c => c.status === 'Expired');
  const expired = expiredList.length;
  
  // New workflow specific filters
  const negativeSessions = clients.filter(c => typeof c.sessionsRemaining === 'number' && c.sessionsRemaining < 0);
  const noAttendance = clients.filter(c => c.sessionsRemaining === 'no attend');
  
  // Reminders
  const upcomingVisits = clients.filter(c => 
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

  const attentionLeads = clients.filter(c => {
    if (c.status !== 'Lead' || c.paid) return false;
    if (c.assignedTo !== currentUser?.id) return false;
    if (!c.comments || c.comments.length === 0) return false;
    
    const latestComment = c.comments.reduce((latest, current) => {
      if (!latest || !latest.date) return current;
      if (!current || !current.date) return latest;
      return isAfter(parseISO(current.date), parseISO(latest.date)) ? current : latest;
    }, c.comments[0]);

    if (!latestComment || !latestComment.date) return false;

    const daysSinceComment = differenceInDays(now, parseISO(latestComment.date));
    return daysSinceComment >= 7;
  });

  const handleUpdateTarget = () => {
    const target = parseFloat(newTarget);
    if (!isNaN(target) && target > 0) {
      if (canViewGlobalDashboard && selectedRepId !== 'all') {
        updateUserTarget(selectedRepId, currentMonthStr, target);
      } else {
        updateSalesTarget(target);
      }
      setIsTargetDialogOpen(false);
    }
  };

  // Filtered statistics for rep performance view
  const selectedMonth = subMonths(now, selectedMonthOffset);
  const currentMonthStr = format(selectedMonth, 'yyyy-MM');
  const reps = users.filter(u => u.role === 'rep');

  const clientIdToAssignedRepMap = React.useMemo(() => {
    const map = new Map<string, string>();
    allClients.forEach(c => {
      if (c.assignedTo) map.set(c.id, c.assignedTo);
    });
    return map;
  }, [allClients]);

  const isPaymentAttributedToRep = React.useCallback((payment: any, repId: string, repName: string) => {
    const normalizedRepName = (repName || '').toLowerCase().trim();

    // 1. Direct ID match on sales_rep_id or recordedBy
    if (payment.sales_rep_id === repId || payment.recordedBy === repId) return true;
    
    // 2. Client Assignment match
    // The assignedTo field may be a real userId OR a raw name string imported from sheets
    const assignedValue = clientIdToAssignedRepMap.get(payment.clientId);
    if (assignedValue) {
      // 2a. Direct UUID match
      if (assignedValue === repId) return true;
      // 2b. Name-string match — resolve through mapping then compare to rep name
      const resolvedName = (SALES_NAME_MAPPING[assignedValue] || assignedValue).toLowerCase().trim();
      if (resolvedName === normalizedRepName) return true;
      // 2c. Raw name direct match (in case the stored name already equals the rep name)
      if (assignedValue.toLowerCase().trim() === normalizedRepName) return true;
    }
    
    // 3. salesName field match (for payments that do have this field set)
    const salesName = (payment.salesName || '').trim();
    if (salesName) {
      const mappedName = (SALES_NAME_MAPPING[salesName] || salesName).toLowerCase();
      if (mappedName === normalizedRepName || salesName.toLowerCase() === normalizedRepName) return true;
    }
    
    return false;
  }, [clientIdToAssignedRepMap]);
  
  const filteredSalesData = React.useMemo(() => {
    let targetAmount = salesTarget.targetAmount;
    
    let relevantPayments = payments.filter(p => format(parseISO(p.date), 'yyyy-MM') === currentMonthStr);
    
    if (canViewGlobalDashboard && selectedRepId !== 'all') {
      // Filter for specific rep
      const repTarget = userTargets.find(t => t.userId === selectedRepId && t.month === currentMonthStr);
      if (repTarget) {
        targetAmount = repTarget.targetAmount;
      } else {
        targetAmount = 0; // Or some default
      }
      
      const selectedUser = users.find(u => u.id === selectedRepId);
      const repName = selectedUser?.name || '';
      
      relevantPayments = relevantPayments.filter(p => isPaymentAttributedToRep(p, selectedRepId, repName));
    }

    const currentAmount = relevantPayments.reduce((acc, p) => acc + p.amount, 0);
    const privatePayments = relevantPayments.filter(p => 
      /\bpt\b/i.test(p.packageType) || 
      p.packageType.toLowerCase().includes('private')
    );
    const groupPayments = relevantPayments.filter(p => 
      p.packageType.toLowerCase().includes('group') || 
      p.packageType.toLowerCase().includes('gt')
    );

    const privateSessionsSold = privatePayments.length;
    const groupSessionsSold = groupPayments.length;
    const privateRevenue = privatePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const groupRevenue = groupPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    
    const cash = relevantPayments.filter(p => p.method === 'Cash').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const visa = relevantPayments.filter(p => p.method === 'Credit Card').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const instapay = relevantPayments.filter(p => p.method === 'Instapay').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    return {
      targetAmount,
      currentAmount,
      privateSessionsSold,
      groupSessionsSold,
      privateRevenue,
      groupRevenue,
      cash,
      visa,
      instapay,
      percentage: targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0
    };
  }, [payments, selectedRepId, canViewGlobalDashboard, salesTarget, userTargets, currentMonthStr, clients]);

  const totalCash = canViewGlobalDashboard && selectedRepId !== 'all' ? filteredSalesData.cash : (payments ? payments.filter(p => p.method === 'Cash').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0);
  const totalVisa = canViewGlobalDashboard && selectedRepId !== 'all' ? filteredSalesData.visa : (payments ? payments.filter(p => p.method === 'Credit Card').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0);
  const totalInstapay = canViewGlobalDashboard && selectedRepId !== 'all' ? filteredSalesData.instapay : (payments ? payments.filter(p => p.method === 'Instapay').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) : 0);

  const totalPackagesSold = filteredSalesData.privateSessionsSold + filteredSalesData.groupSessionsSold;
  const privatePercentage = totalPackagesSold > 0 ? Math.round((filteredSalesData.privateSessionsSold / totalPackagesSold) * 100) : 0;
  const groupPercentage = totalPackagesSold > 0 ? Math.round((filteredSalesData.groupSessionsSold / totalPackagesSold) * 100) : 0;

  // Chart Data (personal - for rep view)
  const chartData = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));

    return months.map(date => {
      const monthStr = format(date, 'yyyy-MM');
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      let targetAmount = 0;
      if (currentUser?.role === 'rep') {
        const targetDoc = userTargets.find(t => t.userId === currentUser.id && t.month === monthStr);
        targetAmount = targetDoc ? targetDoc.targetAmount : 0;
      }

      const monthPayments = payments.filter(p => {
        const pDate = parseISO(p.date);
        if (!isWithinInterval(pDate, { start, end })) return false;

        if (currentUser?.role === 'rep') {
          return isPaymentAttributedToRep(p, currentUser.id, currentUser.name || '');
        }

        return true;
      });

      const achievedAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const privateRevenue = monthPayments.filter(p => /private|pt/i.test(p.packageType)).reduce((s, p) => s + p.amount, 0);
      const groupRevenue = monthPayments.filter(p => /group|gt/i.test(p.packageType)).reduce((s, p) => s + p.amount, 0);

      return {
        month: format(date, 'MMM yy'),
        Target: targetAmount,
        Private: privateRevenue,
        Group: groupRevenue,
      };
    });
  }, [userTargets, payments, clients, currentUser]);

  // 6-month team revenue trend (global)
  const teamRevenueData = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));
    return months.map(date => {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const mp = payments.filter(p => isWithinInterval(parseISO(p.date), { start, end }));
      return {
        month: format(date, 'MMM yy'),
        Revenue: mp.reduce((s, p) => s + p.amount, 0),
      };
    });
  }, [payments]);

  // Per-rep revenue vs target for selected month
  const repComparisonData = React.useMemo(() => {
    if (!canViewGlobalDashboard) return [];
    return reps.map(rep => {
      const repTarget = userTargets.find(t => t.userId === rep.id && t.month === currentMonthStr);
      const repPayments = payments.filter(p => {
        if (format(parseISO(p.date), 'yyyy-MM') !== currentMonthStr) return false;
        return isPaymentAttributedToRep(p, rep.id, rep.name || '');
      });
      return {
        name: (rep.name || rep.email || 'Unknown').split(' ')[0],
        Revenue: repPayments.reduce((s, p) => s + p.amount, 0),
        Target: repTarget?.targetAmount || 0,
      };
    });
  }, [reps, payments, userTargets, currentMonthStr, canViewGlobalDashboard]);

  // 6-month payment method breakdown
  const monthlyMethodData = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));
    return months.map(date => {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const mp = payments.filter(p => isWithinInterval(parseISO(p.date), { start, end }));
      return {
        month: format(date, 'MMM yy'),
        Cash: mp.filter(p => p.method === 'Cash').reduce((s, p) => s + p.amount, 0),
        Visa: mp.filter(p => p.method === 'Credit Card').reduce((s, p) => s + p.amount, 0),
        Instapay: mp.filter(p => p.method === 'Instapay').reduce((s, p) => s + p.amount, 0),
      };
    });
  }, [payments]);

  // 6-month session type breakdown
  const monthlySessionData = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));
    return months.map(date => {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const mp = payments.filter(p => isWithinInterval(parseISO(p.date), { start, end }));
      return {
        month: format(date, 'MMM yy'),
        Private: mp.filter(p => /\bpt\b/i.test(p.packageType) || p.packageType.toLowerCase().includes('private')).length,
        Group: mp.filter(p => p.packageType.toLowerCase().includes('group') || p.packageType.toLowerCase().includes('gt')).length,
      };
    });
  }, [payments]);

  // Leaderboard Data Calculation
  const leaderboardData = React.useMemo(() => {
    if (!canViewGlobalDashboard) return [];

    const data = reps.map(rep => {
      const repTarget = userTargets.find(t => t.userId === rep.id && t.month === currentMonthStr);
      const targetAmount = repTarget?.targetAmount || 0;

      const repPayments = payments.filter(p => {
        if (format(parseISO(p.date), 'yyyy-MM') !== currentMonthStr) return false;
        return isPaymentAttributedToRep(p, rep.id, rep.name || '');
      });
      const revenue = repPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

      const convertedThisMonth = clients.filter(c => 
        c.assignedTo === rep.id && 
        c.status !== 'Lead' && 
        c.startDate && (c.startDate.startsWith(currentMonthStr))
      ).length;

      const totalLeads = clients.filter(c => c.assignedTo === rep.id).length;
      const targetAchievement = targetAmount > 0 ? (revenue / targetAmount) * 100 : 0;
      const conversionRate = totalLeads > 0 ? (convertedThisMonth / totalLeads) * 100 : 0;

      return {
        id: rep.id,
        name: rep.name || rep.email || 'Unknown',
        revenue,
        targetAmount,
        targetAchievement: Math.round(targetAchievement),
        converted: convertedThisMonth,
        totalLeads,
        conversionRate: Math.round(conversionRate * 10) / 10
      };
    });

    // Apply sorting
    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key];
      const bValue = (b as any)[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [reps, payments, userTargets, currentMonthStr, clients, canViewGlobalDashboard, sortConfig]);

  const exportRepLeaderboardCSV = () => {
    const headers = ['Rank', 'Rep Name', 'Revenue', 'Target Amount', 'Target Achievement %', 'Converted Leads', 'Total Leads', 'Conversion Rate %'];
    const rows = leaderboardData.map((rep, index) => [
      index + 1,
      `"${rep.name.replace(/"/g, '""')}"`,
      rep.revenue,
      rep.targetAmount,
      rep.targetAchievement,
      rep.converted,
      rep.totalLeads,
      rep.conversionRate
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rep_Leaderboard_${currentMonthStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="space-y-6">
      {canViewGlobalDashboard && (
        <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
          <Users className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium">Representative Performance</h3>
            <p className="text-xs text-muted-foreground">Filter statistics by sales representative</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedMonthOffset(o => o + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-28 text-center">
              {format(selectedMonth, 'MMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedMonthOffset(o => Math.max(0, o - 1))}
              disabled={selectedMonthOffset === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={selectedRepId} onValueChange={(v) => setSelectedRepId(v || 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select representative">
                {selectedRepId === 'all'
                  ? 'All Representatives'
                  : reps.find(r => r.id === selectedRepId)?.name ?? 'Unknown User'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Representatives</SelectItem>
              {reps.map(rep => (
                <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v || 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {currentUser?.role === 'admin' ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSalesData.currentAmount.toLocaleString()} LE</div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Cash:</span>
                  <span className="font-medium text-foreground">{totalCash.toLocaleString()} LE</span>
                </div>
                <div className="flex justify-between">
                  <span>Visa:</span>
                  <span className="font-medium text-foreground">{totalVisa.toLocaleString()} LE</span>
                </div>
                <div className="flex justify-between">
                  <span>Instapay:</span>
                  <span className="font-medium text-foreground">{totalInstapay.toLocaleString()} LE</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Target</CardTitle>
              {canAccessSettings && (
                <CardAction>
                  <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
                    <DialogTrigger
                      render={
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      }
                    />
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Sales Target</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>New Target Amount (LE)</Label>
                          <Input 
                            type="number" 
                            value={newTarget} 
                            onChange={(e) => setNewTarget(e.target.value)} 
                          />
                        </div>
                        <Button onClick={handleUpdateTarget} className="w-full">Save Target</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSalesData.currentAmount.toLocaleString()} LE</div>
              <p className="text-xs text-muted-foreground">
                {filteredSalesData.percentage}% of {filteredSalesData.targetAmount.toLocaleString()} LE target
              </p>
              <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${Math.min(filteredSalesData.percentage, 100)}%` }}
                />
              </div>

              <div className="mt-4 pt-3 border-t">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2">Packages Breakdown</span>
                <div className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-0.5">PT Packages</span>
                        <span className="text-lg font-bold">
                          {filteredSalesData.privateRevenue.toLocaleString()} <span className="text-xs font-normal">LE</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-semibold px-1.5 py-0 h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {filteredSalesData.privateSessionsSold} packages
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-0.5">Group Packages</span>
                        <span className="text-lg font-bold">
                          {filteredSalesData.groupRevenue.toLocaleString()} <span className="text-xs font-normal">LE</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-semibold px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          {filteredSalesData.groupSessionsSold} packages
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              Needs follow-up
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{nearlyExpired}</div>
            <p className="text-xs text-muted-foreground">
              Packages ending in &lt; 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expired}</div>
            <p className="text-xs text-muted-foreground">
              Expired memberships
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
            <Gift className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBirthdays.length}</div>
            <p className="text-xs text-muted-foreground">
              In the next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">

        <Card>
          <CardHeader>
            <CardTitle>Action Required: Packages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {negativeSessions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Negative Packages (Needs Renewal)
                  </h4>
                  <PaginatedList 
                    items={negativeSessions} 
                    renderItem={(client) => (
                      <div key={client.id} className="flex items-center justify-between p-2 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.packageType}</p>
                        </div>
                        <Badge variant="destructive">{client.sessionsRemaining} packages</Badge>
                      </div>
                    )} 
                  />
                </div>
              )}
              
              {noAttendance.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-semibold text-amber-600 flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1" /> No Attendance Yet
                  </h4>
                  <PaginatedList 
                    items={noAttendance} 
                    renderItem={(client) => (
                      <div key={client.id} className="flex items-center justify-between p-2 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.packageType}</p>
                        </div>
                        <Badge variant="outline" className="text-amber-600 border-amber-600">No Attend</Badge>
                      </div>
                    )} 
                  />
                </div>
              )}

              {expiredList.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-semibold text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Expired Packages
                  </h4>
                  <PaginatedList 
                    items={expiredList} 
                    renderItem={(client) => (
                      <div key={client.id} className="flex items-center justify-between p-2 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">Expired: {client.membershipExpiry ? new Date(client.membershipExpiry).toLocaleDateString() : 'Unknown'}</p>
                        </div>
                        <Badge variant="destructive">Expired</Badge>
                      </div>
                    )} 
                  />
                </div>
              )}

              {negativeSessions.length === 0 && noAttendance.length === 0 && expiredList.length === 0 && (
                <p className="text-sm text-muted-foreground">All package tracking is up to date.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urgent Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingVisits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-blue-600 flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1" /> Upcoming Visits
                  </h4>
                  <PaginatedList 
                    items={upcomingVisits} 
                    renderItem={(client) => (
                      <div key={client.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">Expected Visit: {new Date(client.expectedVisitDate!).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )} 
                  />
                </div>
              )}

              {nearlyExpiredList.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-semibold text-amber-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Expiring Soon
                  </h4>
                  <PaginatedList 
                    items={nearlyExpiredList} 
                    renderItem={(client) => (
                      <div key={client.id} className="flex items-center justify-between p-2 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">Expires: {client.membershipExpiry ? new Date(client.membershipExpiry).toLocaleDateString() : 'Unknown'}</p>
                        </div>
                      </div>
                    )} 
                  />
                </div>
              )}

              {attentionLeads.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-semibold text-purple-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Leads Needing Attention
                  </h4>
                  <PaginatedList 
                    items={attentionLeads} 
                    renderItem={(client) => (
                      <div key={client.id} className="flex items-center justify-between p-2 border border-purple-200 bg-purple-50 dark:bg-purple-900/10 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">Last comment {differenceInDays(now, parseISO(client.comments.reduce((latest: any, current: any) => isAfter(parseISO(current.date), parseISO(latest.date)) ? current : latest, client.comments[0]).date))} days ago</p>
                        </div>
                      </div>
                    )} 
                  />
                </div>
              )}

              {upcomingVisits.length === 0 && nearlyExpiredList.length === 0 && attentionLeads.length === 0 && (
                <p className="text-sm text-muted-foreground">No urgent reminders at this time.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Team Charts (managers see global, reps see personal) ── */}
      {canViewGlobalDashboard ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Team Analytics</h2>

          <div className="grid grid-cols-1">
            <ConversionFunnel 
              selectedRepId={selectedRepId} 
              selectedMonthStr={currentMonthStr} 
            />
          </div>

          {/* Row 1: Revenue Trend + Rep Comparison */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">6-Month Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={teamRevenueData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`${v.toLocaleString()} LE`, 'Revenue']} />
                    <Area type="monotone" dataKey="Revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Rep Performance — {format(selectedMonth, 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {repComparisonData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">No reps found.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={repComparisonData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => `${v.toLocaleString()} LE`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Payment Methods + Session Types */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Payment Methods — 6 Months</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyMethodData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => `${v.toLocaleString()} LE`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Cash" stackId="a" fill="#22c55e" />
                    <Bar dataKey="Visa" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Instapay" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Session Types — 6 Months</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlySessionData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Private" stackId="b" fill="#8b5cf6" />
                    <Bar dataKey="Group" stackId="b" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Rep Leaderboard Section */}
          <Card className="mt-4 overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-gray-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Trophy className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 leading-none">Rep Performance Leaderboard</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{format(selectedMonth, 'MMMM yyyy')} statistics</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportRepLeaderboardCSV}
                className="hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <button onClick={() => handleSort('name')} className="flex items-center hover:text-indigo-600 transition-colors">
                          REP NAME <ArrowUpDown className="h-3 w-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <button onClick={() => handleSort('revenue')} className="flex items-center hover:text-indigo-600 transition-colors">
                          REVENUE <ArrowUpDown className="h-3 w-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        <button onClick={() => handleSort('targetAchievement')} className="flex items-center hover:text-indigo-600 transition-colors">
                          TARGET % <ArrowUpDown className="h-3 w-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        <button onClick={() => handleSort('converted')} className="flex items-center hover:text-indigo-600 transition-colors">
                          CONVERTED <ArrowUpDown className="h-3 w-3 ml-1" />
                        </button>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        <button onClick={() => handleSort('conversionRate')} className="flex items-center hover:text-indigo-600 transition-colors">
                          RATE % <ArrowUpDown className="h-3 w-3 ml-1" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground italic">No representative data found for this period.</td>
                      </tr>
                    ) : (
                      leaderboardData.map((rep, index) => (
                        <tr key={rep.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-700 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{rep.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase font-medium">{rep.id?.slice(-6) || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">{rep.revenue.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">LE</span></div>
                            <div className="text-[10px] text-muted-foreground">Goal: {rep.targetAmount.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-[80px] h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${rep.targetAchievement >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${Math.min(rep.targetAchievement, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${rep.targetAchievement >= 100 ? 'text-emerald-600' : 'text-gray-700'}`}>
                                {rep.targetAchievement}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                              {rep.converted} <span className="ml-1 text-[10px] opacity-70 font-medium">leads</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{rep.conversionRate}%</span>
                              <span className="text-[10px] text-muted-foreground">{rep.converted} of {rep.totalLeads} total</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">My Performance</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Revenue vs Target — Last 6 Months</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => `${v.toLocaleString()} LE`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Private" stackId="rev" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Group" stackId="rev" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


