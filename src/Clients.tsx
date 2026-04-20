import React, { useState, useMemo, useCallback } from 'react';
import { useCRMData, useAuth } from './context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, isAfter, isBefore, addDays, subDays } from 'date-fns';
import { Client, isAdmin, ClientId, User, Payment } from './types';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Gift, Phone, Calendar, Download, Search, Filter, MoreHorizontal, User as UserIcon, MapPin, Package, Clock, CreditCard, Shield } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import ImportData from './ImportData';
import ImportHistory from './ImportHistory';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

// Memoized Table Row for better performance
const ClientTableRow = React.memo(({ 
  client, 
  isSelected, 
  onSelect, 
  onDelete, 
  onUpdate, 
  currentUser, 
  users, 
  payments,
  isSuperUser,
  isBirthday
}: { 
  client: Client, 
  isSelected: boolean, 
  onSelect: (id: ClientId, checked: boolean) => void,
  onDelete: (id: ClientId) => void,
  onUpdate: (id: ClientId, updates: Partial<Client>) => void,
  currentUser: User | null,
  users: User[],
  payments: Payment[],
  isSuperUser: boolean,
  isBirthday: boolean
}) => {
  const clientPayments = useMemo(() => payments.filter(p => p.clientId === client.id), [payments, client.id]);
  const totalPaid = useMemo(() => clientPayments.reduce((sum, p) => sum + p.amount, 0), [clientPayments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': 
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] uppercase tracking-wider px-2 py-0.5"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'Nearly Expired': 
        return <Badge className="bg-amber-500/10 text-amber-500 border-none font-black text-[10px] uppercase tracking-wider px-2 py-0.5"><AlertTriangle className="w-3 h-3 mr-1" /> Expiring Soon</Badge>;
      case 'Expired': 
        return <Badge className="bg-rose-500/10 text-rose-500 border-none font-black text-[10px] uppercase tracking-wider px-2 py-0.5">Expired</Badge>;
      default: 
        return <Badge variant="outline" className="font-black text-[10px] uppercase tracking-wider px-2 py-0.5">{status}</Badge>;
    }
  };

  return (
    <motion.tr 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="group border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
    >
      <TableCell className="py-5">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(client.id, !!checked)}
          className="border-zinc-300 dark:border-zinc-700 data-[state=checked]:bg-primary rounded-md"
        />
      </TableCell>
      <TableCell className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">
        {'memberId' in client && client.memberId ? `#${client.memberId}` : '-'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-xs text-muted-foreground border border-zinc-200 dark:border-zinc-700">
            {client.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight flex items-center gap-2">
                {client.name}
                {isBirthday && <Gift className="h-3.5 w-3.5 text-rose-500 animate-bounce" />}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{client.phone}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-[10px] uppercase tracking-widest">{client.branch || 'Base'}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{client.packageType || 'None'}</span>
      </TableCell>
      <TableCell>
        {typeof client.sessionsRemaining === 'number' ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <span className={cn("text-sm font-black tracking-tighter", client.sessionsRemaining < 3 ? "text-rose-500" : "text-foreground")}>
                    {client.sessionsRemaining}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase italic px-1">Units</span>
            </div>
            <div className="h-1 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className={cn("h-full transition-all", client.sessionsRemaining < 3 ? "bg-rose-500" : "bg-primary")} 
                    style={{ width: `${Math.min(100, (client.sessionsRemaining / 12) * 100)}%` }} 
                />
            </div>
          </div>
        ) : (
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-zinc-200 dark:border-zinc-800">No Attend</Badge>
        )}
      </TableCell>
      <TableCell>{getStatusBadge(client.status)}</TableCell>
      <TableCell className="hidden sm:table-cell">
        {client.membershipExpiry ? (
          <div className="flex flex-col">
            <span className="font-black text-xs tracking-tight">{format(parseISO(client.membershipExpiry), 'MMM d, yyyy')}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 italic">Terminal Date</span>
          </div>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-700 text-xs font-black uppercase tracking-widest italic">Open Access</span>
        )}
      </TableCell>
      {isAdmin(currentUser?.role) && (
        <TableCell className="hidden lg:table-cell">
          <span className="font-black text-sm tracking-tighter text-emerald-600 dark:text-emerald-400">
            {totalPaid.toLocaleString()}
            <span className="text-[10px] ml-1 uppercase opacity-60">L.E</span>
          </span>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DialogContent className="w-[95vw] max-w-2xl border-none shadow-2xl p-0 overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[40px]">
                <div className="bg-primary/5 p-10 border-b border-primary/10">
                    <DialogHeader>
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 rounded-[28px] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                                <UserIcon className="h-10 w-10 text-primary-foreground" />
                            </div>
                            <div className="flex flex-col">
                                <DialogTitle className="text-4xl font-black tracking-tight">{client.name}</DialogTitle>
                                <DialogDescription className="text-lg font-bold text-muted-foreground italic flex items-center gap-2 mt-1">
                                    Member Profile · <span className="uppercase text-primary tracking-[2px] text-xs font-black not-italic">{getStatusBadge(client.status)}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>
                
                <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-8">
                        {/* Vital Stats Card */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Clock className="h-3 w-3" /> Core Logistics
                                </h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Assignment State</Label>
                                        <select 
                                            className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none px-4 font-black text-sm transition-all focus:ring-2 focus:ring-primary"
                                            defaultValue={client.status}
                                            onChange={(e) => onUpdate(client.id, { status: e.target.value as any })}
                                        >
                                            <option value="Active">Active Duty</option>
                                            <option value="Nearly Expired">Warning: Expiring</option>
                                            <option value="Expired">Dormant: Expired</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Tactical Branch</Label>
                                        <select 
                                            className="w-full h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none px-4 font-black text-sm transition-all focus:ring-2 focus:ring-primary"
                                            defaultValue={client.branch || ''}
                                            onChange={(e) => onUpdate(client.id, { branch: e.target.value as any })}
                                        >
                                            <option value="" disabled>Select HQ</option>
                                            <option value="COMPLEX">THE COMPLEX (HQ)</option>
                                            <option value="MIVIDA">MIVIDA OUTPOST</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Package className="h-3 w-3" /> Unit Configuration
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Units Left</Label>
                                        <Input 
                                            className="h-12 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl font-black text-center text-lg"
                                            defaultValue={client.sessionsRemaining} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const numVal = Number(val);
                                                onUpdate(client.id, { sessionsRemaining: isNaN(numVal) ? val : numVal });
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Loyalty Points</Label>
                                        <Input 
                                            type="number" 
                                            className="h-12 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl font-black text-center text-lg"
                                            defaultValue={client.points} 
                                            onChange={(e) => onUpdate(client.id, { points: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chronology Card */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="font-black uppercase text-[10px] tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Event Horizon
                                </h4>
                                <div className="space-y-4 bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Activation Date</Label>
                                        <Input 
                                            type="date" 
                                            className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl font-black"
                                            defaultValue={client.startDate ? format(parseISO(client.startDate), 'yyyy-MM-dd') : ''}
                                            onChange={(e) => onUpdate(client.id, { startDate: new Date(e.target.value).toISOString() })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Terminal Expiry</Label>
                                        <Input 
                                            type="date" 
                                            className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl font-black border-red-200 dark:border-red-900/30"
                                            defaultValue={client.membershipExpiry ? format(parseISO(client.membershipExpiry), 'yyyy-MM-dd') : ''}
                                            onChange={(e) => onUpdate(client.id, { membershipExpiry: new Date(e.target.value).toISOString() })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground px-1">Birth Cycle</Label>
                                        <Input 
                                            type="date" 
                                            className="h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl font-black"
                                            defaultValue={client.dateOfBirth ? format(parseISO(client.dateOfBirth), 'yyyy-MM-dd') : ''}
                                            onChange={(e) => onUpdate(client.id, { dateOfBirth: new Date(e.target.value).toISOString() })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-10 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex justify-between items-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Strike CRM Intelligence Node v2.0</p>
                    <div className="flex gap-3">
                        <Button variant="outline" className="h-12 rounded-2xl font-black px-6 border-zinc-200 dark:border-zinc-800" onClick={() => (document.activeElement as HTMLElement)?.blur()}>
                            Close Profile
                        </Button>
                        <Button className="h-12 rounded-2xl font-black px-10 shadow-xl shadow-primary/20">
                            Apply Adjustments
                        </Button>
                    </div>
                </div>
            </DialogContent>
          </Dialog>
          {isSuperUser && (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all opacity-0 group-hover:opacity-100" onClick={() => onDelete(client.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </motion.tr>
  );
});

export default function Clients() {
  const { clients, updateClient, deleteMultipleClients, deleteClient } = useCRMData();
  const { isSuperUser } = useAuth();
  const { currentUser, users } = useAuth();
  const { payments } = useCRMData();
  
  const [activeTab, setActiveTab] = useState('all');
  const [selectedClientIds, setSelectedClientIds] = useState<ClientId[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientId | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12;

  const now = useMemo(() => new Date(), []);

  // Memoized lists
  const members = useMemo(() => clients.filter(c => c.status !== 'Lead'), [clients]);
  
  const stats = useMemo(() => {
    const active = members.filter(c => c.status === 'Active');
    const expiring = members.filter(c => c.status === 'Nearly Expired');
    const expired = members.filter(c => c.status === 'Expired');
    const birthdays = members.filter(c => {
      if (!c.dateOfBirth) return false;
      const dob = parseISO(c.dateOfBirth);
      const dobThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
      return isAfter(dobThisYear, subDays(now, 1)) && isBefore(dobThisYear, addDays(now, 7));
    });
    return { active, expiring, expired, birthdays };
  }, [members, now]);

  const filteredMembers = useMemo(() => {
    let base = members;
    switch (activeTab) {
      case 'active': base = stats.active; break;
      case 'expiring': base = stats.expiring; break;
      case 'expired': base = stats.expired; break;
    }
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        base = base.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.phone.includes(query) || 
            (c as any).memberId?.toString().includes(query)
        );
    }
    
    return base;
  }, [activeTab, members, stats, searchQuery]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedClientIds(paginatedMembers.map(c => c.id));
    } else {
      setSelectedClientIds([]);
    }
  }, [paginatedMembers]);

  const handleSelectClient = useCallback((id: ClientId, checked: boolean) => {
    if (checked) {
      setSelectedClientIds(prev => [...prev, id]);
    } else {
      setSelectedClientIds(prev => prev.filter(i => i !== id));
    }
  }, []);

  const confirmBulkDelete = async () => {
    await deleteMultipleClients(selectedClientIds as unknown as ClientId[]);
    setSelectedClientIds([]);
  };

  const handleDeleteClient = useCallback((id: ClientId) => {
    setClientToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
      await deleteClient(clientToDelete as ClientId);
      setClientToDelete(null);
    }
  };

  // Reset page when tab or search changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedClientIds([]);
  }, [activeTab, searchQuery]);

  const exportToCSV = () => {
    const headers = ['Member ID', 'Name', 'Phone', 'Branch', 'Package', 'Sessions', 'Status', 'Expiry Date', 'Total Paid', 'Assigned To'];
    const csvRows = [
      headers.join(','),
      ...members.map(c => {
        const clientPayments = payments.filter(p => p.clientId === c.id);
        const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
        const assignedUser = users.find(u => u.id === c.assignedTo)?.name || 'Unassigned';
        return [
          `"${('memberId' in c ? c.memberId : '') || ''}"`,
          `"${c.name}"`,
          `"${c.phone}"`,
          `"${c.branch || ''}"`,
          `"${c.packageType || ''}"`,
          `"${c.sessionsRemaining || ''}"`,
          `"${c.status}"`,
          `"${c.membershipExpiry ? format(parseISO(c.membershipExpiry), 'yyyy-MM-dd') : ''}"`,
          `"${totalPaid}"`,
          `"${assignedUser}"`
        ].join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `members_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
            <h2 className="text-5xl font-black tracking-tighter">Personnel Intelligence</h2>
            <p className="text-lg font-bold text-muted-foreground italic">Unified Member Identity & Tactical Database</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="lg" className="h-12 px-6 rounded-2xl font-black border-zinc-200 dark:border-zinc-800 shadow-xl" onClick={exportToCSV}>
            <Download className="mr-3 h-5 w-5" /> Data Export (CSV)
          </Button>
          <ImportData type="Active" />
          <ImportHistory />
        </div>
      </div>

      {stats.birthdays.length > 0 && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative p-8 rounded-[40px] bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-2xl overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-1000" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-[28px] bg-white/20 backdrop-blur-xl flex items-center justify-center animate-pulse">
                        <Gift className="h-10 w-10 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black tracking-tight uppercase">Strategic Anniversaries</h3>
                        <p className="font-bold opacity-80 italic italic">Combatants celebrating identity cycle this week.</p>
                    </div>
                </div>
                <div className="flex -space-x-4 overflow-hidden">
                    {stats.birthdays.slice(0, 5).map((b, i) => (
                        <div key={b.id} className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md border-4 border-rose-500 flex items-center justify-center font-black text-lg shadow-xl" style={{ zIndex: 10 - i }}>
                            {b.name.charAt(0)}
                        </div>
                    ))}
                    {stats.birthdays.length > 5 && (
                         <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md border-4 border-rose-500 flex items-center justify-center font-black text-xs shadow-xl z-0">
                            +{stats.birthdays.length - 5}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-8">
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search Identity Database..." 
                        className="pl-12 h-14 bg-white dark:bg-zinc-900 border-none shadow-xl rounded-2xl font-bold text-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList className="h-14 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl grid grid-cols-4 gap-1 min-w-[400px]">
                        <TabsTrigger value="all" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-700">Total</TabsTrigger>
                        <TabsTrigger value="active" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-700">Active</TabsTrigger>
                        <TabsTrigger value="expiring" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-700">Critical</TabsTrigger>
                        <TabsTrigger value="expired" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-700">Dormant</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Card className="border-none shadow-3xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-[40px] overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-800/20">
                            <TableRow className="border-zinc-100 dark:border-zinc-800">
                                <TableHead className="w-[60px] py-6 pl-6">
                                    <Checkbox 
                                        checked={selectedClientIds.length === paginatedMembers.length && paginatedMembers.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        className="border-zinc-300 dark:border-zinc-700 data-[state=checked]:bg-primary rounded-md"
                                    />
                                </TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Member ID</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Name</TableHead>
                                <TableHead className="hidden md:table-cell font-black uppercase text-[10px] tracking-widest text-muted-foreground">Branch</TableHead>
                                <TableHead className="hidden md:table-cell font-black uppercase text-[10px] tracking-widest text-muted-foreground">Package</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Sessions</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                                <TableHead className="hidden sm:table-cell font-black uppercase text-[10px] tracking-widest text-muted-foreground">Expiry</TableHead>
                                {isAdmin(currentUser?.role) && <TableHead className="hidden lg:table-cell font-black uppercase text-[10px] tracking-widest text-muted-foreground">Total Paid</TableHead>}
                                <TableHead className="text-right pr-6 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {paginatedMembers.map(client => (
                                <ClientTableRow 
                                    key={client.id}
                                    client={client}
                                    isSelected={selectedClientIds.includes(client.id)}
                                    onSelect={handleSelectClient}
                                    onDelete={handleDeleteClient}
                                    onUpdate={updateClient}
                                    currentUser={currentUser}
                                    users={users}
                                    payments={payments}
                                    isSuperUser={isSuperUser}
                                    isBirthday={stats.birthdays.some(b => b.id === client.id)}
                                />
                            ))}
                            {paginatedMembers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <Search className="h-16 w-16" />
                                            <h3 className="text-2xl font-black uppercase tracking-[4px]">No Member Found</h3>
                                            <p className="font-bold italic">Refine search query to locate members.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-zinc-100 dark:bg-zinc-800/50 rounded-[28px]">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}—{Math.min(currentPage * itemsPerPage, filteredMembers.length)}</span> of <span className="text-foreground">{filteredMembers.length}</span> members
                </p>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center justify-center h-12 px-6 px-6 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-xl shadow-primary/20">
                        {currentPage} / {totalPages || 1}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>

        {/* Tactical Overview Sidebar */}
        <div className="space-y-6">
            <Card className="border-none shadow-2xl bg-zinc-900 text-white rounded-[32px] overflow-hidden">
                <CardHeader className="p-8 pb-0">
                    <div className="flex items-center gap-3 opacity-60">
                        <Package className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[4px]">Analytics</span>
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight mt-2">Member Stats</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[2px]">Activation Ratio</span>
                            <span className="text-2xl font-black">{Math.round((stats.active.length / members.length) * 100) || 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(stats.active.length / members.length) * 100 || 0}%` }}
                                className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/10">
                        {[
                            { label: 'Total Units', value: members.length, color: 'text-white' },
                            { label: 'Active Status', value: stats.active.length, color: 'text-emerald-400' },
                            { label: 'Expiring Now', value: stats.expiring.length, color: 'text-amber-400' },
                            { label: 'Total Expired', value: stats.expired.length, color: 'text-rose-400' }
                        ].map((stat, i) => (
                            <div key={i} className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-[2px]">{stat.label.replace('Units', 'Members').replace('Status', '').replace('Now', 'Soon')}</span>
                                <span className={cn("text-xl font-black", stat.color)}>{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="p-6 rounded-[32px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex flex-col gap-4">
                <h4 className="font-black uppercase text-[10px] tracking-[4px] text-muted-foreground text-center">Actions</h4>
                <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
                    Add Member
                </Button>
                {selectedClientIds.length > 0 && isSuperUser && (
                   <Button variant="destructive" className="w-full h-14 rounded-2xl font-black text-lg shadow-xl" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                       Delete {selectedClientIds.length} Members
                   </Button>
                )}
            </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Member"
        description="Are you sure you want to delete this member? This action will permanently remove all their associated logs and payments."
        onConfirm={confirmDeleteClient}
        variant="destructive"
        confirmText="Confirm Delete"
      />

      <ConfirmDialog 
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title="Bulk Delete"
        description={`Are you sure you want to delete ${selectedClientIds.length} members? This action will permanently remove their data from the system.`}
        onConfirm={confirmBulkDelete}
        variant="destructive"
        confirmText="Execute Deletion"
      />
    </div>
  );
}
