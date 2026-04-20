import React, { useState, useMemo, useCallback } from 'react';
import { useCRMData, useAuth } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { Client, LeadCategory, LeadInterest, LeadSource, LeadStage, Branch, isAdmin, ClientId, UserId, LeadClient } from './types';
import { Phone, Calendar, MessageSquare, Plus, Download, UserCheck, ArrowRight, Trash2, ChevronLeft, ChevronRight, Target, Zap, Globe, Info, Clock, UserPlus, Search } from 'lucide-react';
import ImportData from './ImportData';
import ImportHistory from './ImportHistory';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from './components/ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';

// Memoized Table Row for better performance
const LeadTableRow = React.memo(({ 
  lead, 
  isSelected, 
  onSelect, 
  onDelete, 
  onUpdate,
  onLogActivity,
  currentUser, 
  users, 
  isSuperUser,
  onStageChange
}: { 
  lead: LeadClient, 
  isSelected: boolean, 
  onSelect: (id: ClientId, checked: boolean) => void,
  onDelete: (id: ClientId) => void,
  onUpdate: (id: ClientId, updates: Partial<LeadClient>) => void,
  onLogActivity: (lead: LeadClient) => void,
  onStageChange?: (lead: LeadClient, stage: LeadStage) => void,
  currentUser: any,
  users: any[],
  isSuperUser: boolean
}) => {
  const isReminderOverdue = lead.nextReminderDate ? isBefore(parseISO(lead.nextReminderDate), new Date()) : false;
  const isReminderSoon = lead.nextReminderDate ? isBefore(parseISO(lead.nextReminderDate), addDays(new Date(), 3)) : false;
  const isReminderDue = lead.nextReminderDate ? isBefore(parseISO(lead.nextReminderDate), addDays(new Date(), 3)) : false;

  const getInterestBadge = (interest?: LeadInterest) => {
    switch (interest) {
      case 'Interested': return <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] uppercase tracking-widest">Interested</Badge>;
      case 'Not Interested': return <Badge variant="destructive" className="font-black text-[10px] uppercase tracking-widest">Not Interested</Badge>;
      case 'Pending': return <Badge variant="secondary" className="font-black text-[10px] uppercase tracking-widest">Pending</Badge>;
      default: return <Badge variant="outline" className="font-black text-[10px] uppercase tracking-widest">Unknown</Badge>;
    }
  };

  const rowBg = isReminderDue 
    ? (isReminderOverdue ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-amber-500/5 hover:bg-amber-500/10') 
    : 'hover:bg-white/5';

  return (
    <TableRow className={`border-white/5 transition-colors group ${rowBg}`}>
      <TableCell>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(lead.id, !!checked)}
          className="border-white/20 data-[state=checked]:bg-primary"
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-black text-sm tracking-tight uppercase">{lead.name}</span>
          <span className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase">{(lead as any).category || 'NO CATEGORY'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center font-bold text-xs opacity-80 letter-spacing-tight">
          <Phone className="h-3 w-3 mr-2 opacity-40" />
          {lead.phone}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline" className="font-black text-[10px] uppercase border-white/10 bg-white/5">{lead.branch || 'UNASSIGNED'}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="outline" className="font-black text-[10px] uppercase border-white/10">{(lead as any).source || 'UNKNOWN'}</Badge>
      </TableCell>
      <TableCell>
        <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest">
          {(lead as any).stage || 'NEW'}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell">{getInterestBadge((lead as any).interest)}</TableCell>
      <TableCell className="hidden xl:table-cell">
        {(lead as any).trialDate || (lead as any).expectedVisitDate ? (
          <div className="flex items-center font-bold text-xs">
            <Calendar className="h-3 w-3 mr-2 text-primary opacity-60" />
            {format(parseISO(((lead as any).trialDate || (lead as any).expectedVisitDate)!), 'MMM d, yyyy')}
          </div>
        ) : (
          <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">TBD</span>
        )}
      </TableCell>
      <TableCell>
        {lead.nextReminderDate ? (
          <div className="flex flex-col space-y-1">
            <span className="text-xs font-bold">
              {format(parseISO(lead.nextReminderDate), 'MMM d, yyyy')}
            </span>
            {isReminderOverdue ? (
              <Badge variant="destructive" className="w-fit text-[9px] h-4 px-1 font-black uppercase letter-spacing-widest">OVERDUE</Badge>
            ) : isReminderSoon ? (
              <Badge className="bg-amber-500 hover:bg-amber-600 w-fit text-[9px] h-4 px-1 font-black uppercase letter-spacing-widest">URGENT</Badge>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30">—</span>
        )}
      </TableCell>
      {isAdmin(currentUser?.role) && (
        <TableCell className="hidden lg:table-cell">
          <Select 
            defaultValue={(lead.assignedTo as string) || 'unassigned'}
            onValueChange={(v) => onUpdate(lead.id, { assignedTo: v === 'unassigned' ? undefined : v as UserId })}
          >
            <SelectTrigger className="w-[120px] h-8 text-[10px] font-black uppercase tracking-tight bg-white/5 border-white/10">
              <SelectValue placeholder="REP" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/20">
              <SelectItem value="unassigned" className="text-[10px] font-black uppercase">UNASSIGNED</SelectItem>
              {users.filter(u => u.role === 'rep').map(rep => (
                <SelectItem key={rep.id} value={rep.id} className="text-[10px] font-black uppercase">{rep.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onLogActivity(lead)} className="h-9 font-black text-[10px] uppercase opacity-60 hover:opacity-100 hover:bg-white/5">
            <MessageSquare className="h-4 w-4 mr-1" />
            LOG
          </Button>
          {isSuperUser && (
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/5" onClick={() => onDelete(lead.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

export default function Leads() {
  const { clients, addClient, updateClient, deleteMultipleClients, deleteClient, addComment } = useCRMData();
  const { isSuperUser, currentUser, users } = useAuth();
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadClient | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<Branch | 'All'>('All');
  const [filterStage, setFilterStage] = useState<LeadStage | 'All'>('All');
  const [filterInterest, setFilterInterest] = useState<LeadInterest | 'All'>('All');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string | 'All'>('All');
  
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState<LeadSource>('Instagram');
  const [newLeadBranch, setNewLeadBranch] = useState<Branch | ''>('');
  
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<LeadClient | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleteAllLeadsDialogOpen, setIsDeleteAllLeadsDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const allLeads = useMemo(() => clients.filter((c): c is LeadClient => c.status === 'Lead'), [clients]);
  
  const filteredLeads = useMemo(() => {
    let filtered = allLeads;
    
    // Tab filtering
    switch (activeTab) {
      case 'instagram': filtered = filtered.filter(l => l.source === 'Instagram'); break;
      case 'whatsapp': filtered = filtered.filter(l => l.source === 'WhatsApp'); break;
      case 'walkin': filtered = filtered.filter(l => l.source === 'Walk-in'); break;
      case 'trials': filtered = filtered.filter(l => l.stage === 'Trial'); break;
      case 'followup': filtered = filtered.filter(l => l.stage === 'Follow Up'); break;
    }

    // Search filtering
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(term) || 
        l.phone.includes(term)
      );
    }

    // Quick filters
    if (filterBranch !== 'All') {
      filtered = filtered.filter(l => l.branch === filterBranch);
    }
    if (filterStage !== 'All') {
      filtered = filtered.filter(l => l.stage === filterStage);
    }
    if (filterInterest !== 'All') {
      filtered = filtered.filter(l => l.interest === filterInterest);
    }
    if (filterAssignedTo !== 'All') {
      filtered = filtered.filter(l => l.assignedTo === (filterAssignedTo === 'unassigned' ? undefined : filterAssignedTo));
    }

    return filtered;
  }, [allLeads, activeTab, searchTerm, filterBranch, filterStage, filterInterest, filterAssignedTo]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    return {
        total: allLeads.length,
        new: allLeads.filter(l => l.stage === 'New').length,
        trials: allLeads.filter(l => l.stage === 'Trial').length,
        interested: allLeads.filter(l => l.interest === 'Interested').length
    };
  }, [allLeads]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(paginatedLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  }, [paginatedLeads]);

  const handleSelectLead = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, id]);
    } else {
      setSelectedLeadIds(prev => prev.filter(i => i !== id));
    }
  }, []);

  const handleBulkStageUpdate = async (stage: LeadStage) => {
    for (const id of selectedLeadIds) {
      await updateClient(id as ClientId, { stage });
    }
    setSelectedLeadIds([]);
  };

  const handleBulkAssign = async (userId: string | null) => {
    for (const id of selectedLeadIds) {
      await updateClient(id as ClientId, { assignedTo: (userId === 'unassigned' || !userId) ? undefined : userId as UserId });
    }
    setSelectedLeadIds([]);
  };

  const handleBulkDelete = () => setIsBulkDeleteDialogOpen(true);

  const confirmBulkDelete = async () => {
    await deleteMultipleClients(selectedLeadIds as ClientId[]);
    setSelectedLeadIds([]);
  };

  const handleDeleteLead = useCallback((id: string) => {
    setLeadToDelete(id as any);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteLead = async () => {
    if (leadToDelete) {
      await deleteClient(leadToDelete as ClientId);
      setLeadToDelete(null);
    }
  };

  const handleDeleteAllLeads = () => setIsDeleteAllLeadsDialogOpen(true);

  const confirmDeleteAllLeads = async () => {
    const allLeadIds = allLeads.map(l => l.id);
    if (allLeadIds.length > 0) {
      await deleteMultipleClients(allLeadIds as ClientId[]);
      setSelectedLeadIds([]);
    }
    setIsDeleteAllLeadsDialogOpen(false);
  };

  const handleAddComment = () => {
    if (selectedLead && newComment && currentUser) {
      addComment(selectedLead.id, newComment, currentUser.name);
      setNewComment('');
    }
  };

  const handleAddLead = () => {
    if (newLeadName && newLeadPhone) {
      const newLead: Client = {
        id: Math.random().toString(36).substr(2, 9) as any,
        name: newLeadName,
        phone: newLeadPhone,
        status: 'Lead',
        source: newLeadSource,
        branch: newLeadBranch || undefined,
        stage: 'New',
        comments: [],
        assignedTo: (currentUser?.role === 'rep' ? currentUser.id : undefined) as any,
        lastContactDate: new Date().toISOString().split('T')[0],
        nextReminderDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      } as any;
      addClient(newLead);
      setIsNewLeadOpen(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadSource('Instagram');
      setNewLeadBranch('');
    }
  };

  const handleStageChange = useCallback((lead: LeadClient, newStage: LeadStage) => {
    if (newStage === 'Converted') {
      setLeadToConvert(lead);
      setIsConvertDialogOpen(true);
    } else {
      updateClient(lead.id, { stage: newStage });
    }
  }, [updateClient]);

  const confirmConversion = () => {
    if (leadToConvert) {
      updateClient(leadToConvert.id, { 
        stage: 'Converted', 
        status: 'Active',
        startDate: new Date().toISOString()
      });
      setIsConvertDialogOpen(false);
      setLeadToConvert(null);
    }
  };

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedLeadIds([]);
  }, [activeTab, searchTerm, filterBranch, filterStage, filterInterest, filterAssignedTo]);

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Branch', 'Source', 'Stage', 'Interest', 'Category', 'Trial Date', 'Last Contact', 'Next Reminder', 'Assigned To'];
    const csvRows = [
      headers.join(','),
      ...filteredLeads.map(l => {
        const assignedUser = users.find(u => u.id === l.assignedTo)?.name || 'Unassigned';
        return [
          `"${l.name}"`,
          `"${l.phone}"`,
          `"${l.branch || ''}"`,
          `"${l.source || ''}"`,
          `"${l.stage || ''}"`,
          `"${l.interest || ''}"`,
          `"${l.category || ''}"`,
          `"${l.trialDate ? format(parseISO(l.trialDate), 'yyyy-MM-dd') : ''}"`,
          `"${l.lastContactDate ? format(parseISO(l.lastContactDate), 'yyyy-MM-dd') : ''}"`,
          `"${l.nextReminderDate ? format(parseISO(l.nextReminderDate), 'yyyy-MM-dd') : ''}"`,
          `"${assignedUser}"`
        ].join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Leads Management</h2>
            <div className="flex items-center gap-4">
                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-3 py-1">ACTIVE</Badge>
                <div className="flex items-center gap-1.5 opacity-40">
                    <Target className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{filteredLeads.length} Leads Found</span>
                </div>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <Button variant="outline" onClick={exportToCSV} className="h-12 px-6 rounded-2xl border-none bg-white dark:bg-zinc-900 font-black text-[10px] uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all">
            <Download className="mr-3 h-4 w-4" /> Export Leads
          </Button>
          <div className="flex bg-white dark:bg-zinc-900 rounded-2xl p-1 shadow-xl">
            <ImportData type="Lead" />
            <div className="w-[1px] bg-zinc-100 dark:bg-zinc-800 my-2 mx-1" />
            <ImportHistory />
          </div>
          {isSuperUser && (
            <Button variant="ghost" onClick={handleDeleteAllLeads} className="h-12 px-6 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black text-[10px] uppercase tracking-widest">
              <Trash2 className="mr-3 h-4 w-4" /> Clear Database
            </Button>
          )}
          <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
            <DialogTrigger render={
                <Button className="h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  <Plus className="mr-3 h-4 w-4" /> Add New Lead
                </Button>
            } />
            <DialogContent className="rounded-[40px] border-none shadow-[0_40px_100px_rgba(0,0,0,0.5)] p-0 overflow-hidden bg-white dark:bg-zinc-950">
              <div className="p-10 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <UserPlus className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-3xl font-black tracking-tighter uppercase">New Intel</DialogTitle>
                        <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Initialize Target Identity</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                         <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Alias/Name</Label>
                         <Input className="h-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-sm" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} />
                    </div>
                    <div className="space-y-3">
                         <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Communication Line</Label>
                         <Input className="h-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-sm" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Inbound Vector</Label>
                    <Select value={newLeadSource} onValueChange={(v) => setNewLeadSource(v as LeadSource)}>
                        <SelectTrigger className="h-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6">
                            <SelectValue placeholder="Protocol Source" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            {['Instagram', 'WhatsApp', 'Walk-in', 'Social Media', 'Other'].map(s => (
                                <SelectItem key={s} value={s} className="font-black text-sm uppercase p-4 italic">{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-3">
                   <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Assigned Outpost</Label>
                   <Select value={newLeadBranch} onValueChange={(v) => setNewLeadBranch(v as Branch)}>
                       <SelectTrigger className="h-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6">
                           <SelectValue placeholder="Select Branch" />
                       </SelectTrigger>
                       <SelectContent className="rounded-2xl border-none shadow-2xl">
                           {['COMPLEX', 'MIVIDA'].map(b => (
                               <SelectItem key={b} value={b} className="font-black text-sm uppercase p-4 italic">{b}</SelectItem>
                           ))}
                       </SelectContent>
                   </Select>
                 </div>
                 <Button onClick={handleAddLead} className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[4px] shadow-2xl shadow-primary/30">Secure & Register</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: 'Total Intel', value: stats.total, icon: Target, color: 'text-zinc-500' },
                { label: 'New Targets', value: stats.new, icon: Zap, color: 'text-zinc-900 dark:text-white' },
                { label: 'Tactical Trials', value: stats.trials, icon: Calendar, color: 'text-blue-500' },
                { label: 'Confirmed Interest', value: stats.interested, icon: Target, color: 'text-emerald-500' },
            ].map((stat, i) => (
                <Card key={i} className="rounded-[30px] border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 ${stat.color}`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl font-black tracking-tighter mb-1">{stat.value}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{stat.label}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
      </div>

      <Card className="rounded-[40px] border-none bg-white dark:bg-zinc-900 shadow-[0_30px_100px_rgba(0,0,0,0.05)] dark:shadow-none p-8 space-y-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-3">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 pl-4">Search Leads</Label>
            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search by name or phone..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-16 pl-14 bg-zinc-50 dark:bg-zinc-950 border-none rounded-[20px] font-black text-sm shadow-inner"
                />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
                {[
                    { label: 'Branch', value: filterBranch, setter: setFilterBranch, options: ['All', 'COMPLEX', 'MIVIDA'] },
                    { label: 'Stage', value: filterStage, setter: setFilterStage, options: ['All', 'New', 'Follow Up', 'Trial', 'Interested', 'Not Interested'] },
                    { label: 'Interest Level', value: filterInterest, setter: setFilterInterest, options: ['All', 'Interested', 'Pending', 'Not Interested'] },
                ].map((filter, i) => (
                    <div key={i} className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 pl-2">{filter.label}</Label>
                        <Select value={filter.value} onValueChange={(v) => filter.setter(v as any)}>
                            <SelectTrigger className="h-14 w-[180px] bg-zinc-50 dark:bg-zinc-950 border-none rounded-[18px] font-black text-[10px] uppercase tracking-widest px-6 shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                {filter.options.map(opt => (
                                    <SelectItem key={opt} value={opt} className="font-black text-[10px] uppercase tracking-widest p-4">{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-start border-b border-zinc-100 dark:border-zinc-800 pb-1">
              <TabsList className="bg-transparent h-auto p-0 gap-8">
                {['all', 'instagram', 'whatsapp', 'walkin', 'trials', 'followup'].map(tab => (
                    <TabsTrigger key={tab} value={tab} className="h-12 bg-transparent border-b-4 border-transparent rounded-none px-0 font-black text-[10px] uppercase tracking-widest data-[state=active]:border-primary data-[state=active]:text-primary transition-all">
                        {tab}
                    </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <div className="rounded-[28px] overflow-hidden border border-zinc-100 dark:border-zinc-800">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow className="border-none h-16">
                    <TableHead className="w-[80px] pl-8">
                      <Checkbox 
                        checked={selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Phone</TableHead>
                    <TableHead className="hidden md:table-cell font-black text-[10px] uppercase tracking-widest">Branch</TableHead>
                    <TableHead className="hidden md:table-cell font-black text-[10px] uppercase tracking-widest">Source</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Stage</TableHead>
                    <TabsTrigger value="none" className="hidden" /> {/* Tab Trigger placeholder if needed */}
                    <TableHead className="hidden lg:table-cell font-black text-[10px] uppercase tracking-widest">Priority</TableHead>
                    <TableHead className="hidden lg:table-cell font-black text-[10px] uppercase tracking-widest">Details</TableHead>
                    <TableHead className="hidden xl:table-cell font-black text-[10px] uppercase tracking-widest">Trial Date</TableHead>
                    <TableHead className="hidden md:table-cell font-black text-[10px] uppercase tracking-widest">Last Contact</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Next Step</TableHead>
                    {isAdmin(currentUser?.role) && <TableHead className="hidden lg:table-cell font-black text-[10px] uppercase tracking-widest">Assigned To</TableHead>}
                    <TableHead className="pr-8 text-right font-black text-[10px] uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {paginatedLeads.map(lead => (
                        <LeadTableRow 
                          key={lead.id}
                          lead={lead}
                          isSelected={selectedLeadIds.includes(lead.id)}
                          onSelect={handleSelectLead}
                          onDelete={handleDeleteLead}
                          onUpdate={updateClient}
                          onLogActivity={setSelectedLead}
                          onStageChange={handleStageChange}
                          currentUser={currentUser}
                          users={users}
                          isSuperUser={isSuperUser}
                        />
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
            <div className="flex items-center justify-between pb-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Showing {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
                </p>
                <div className="flex items-center gap-4">
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl border-none bg-zinc-100 dark:bg-zinc-800"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[10px] font-black uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl border-none bg-zinc-100 dark:bg-zinc-800"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                </div>
            </div>
            )}
        </Tabs>
      </Card>

      <ConfirmDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Destroy Target Record"
        description="This will permanently nullify the target identity from the intelligence database. Continue with elimination?"
        onConfirm={confirmDeleteLead}
        variant="destructive"
        confirmText="Confirm Purge"
      />

      <ConfirmDialog 
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title="Mass Target Removal"
        description={`Confirm mass purge of ${selectedLeadIds.length} target records? This neural trace cannot be recovered.`}
        onConfirm={confirmBulkDelete}
        variant="destructive"
        confirmText="Execute Purge"
      />

      <ConfirmDialog 
        isOpen={isDeleteAllLeadsDialogOpen}
        onOpenChange={setIsDeleteAllLeadsDialogOpen}
        title="PROTOCOL ZERO: DATABASE PURGE"
        description="You are about to initiate Protocol Zero. ALL target records will be vaporized. This action is irreversible."
        onConfirm={confirmDeleteAllLeads}
        variant="destructive"
        confirmText="INITIATE PROTOCOL ZERO"
      />

      {selectedLead && (
         <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
          <DialogContent className="max-w-6xl w-[95vw] rounded-[48px] border-none shadow-[0_50px_150px_rgba(0,0,0,0.6)] p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            <div className="flex flex-col lg:flex-row h-full min-h-[700px]">
                {/* Left Panel: Details & Status */}
                <div className="flex-1 p-10 lg:p-14 space-y-12">
                   <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-black italic">
                            {selectedLead.name.slice(0, 1)}
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tighter uppercase">{selectedLead.name}</h2>
                            <div className="flex items-center gap-3">
                                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-3">LEAD ID: {selectedLead.id.slice(0, 8)}</Badge>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocol: {selectedLead.source}</span>
                            </div>
                        </div>
                   </div>

                   <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Tactical Sector</Label>
                            <Select defaultValue={selectedLead.branch || ''} onValueChange={(v) => updateClient(selectedLead.id, { branch: v as Branch })}>
                                <SelectTrigger className="h-16 bg-white dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6 shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {['COMPLEX', 'MIVIDA'].map(b => (
                                        <SelectItem key={b} value={b} className="font-black text-sm uppercase p-4 italic">{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Interest Level</Label>
                            <Select defaultValue={selectedLead.interest} onValueChange={(v) => updateClient(selectedLead.id, { interest: v as LeadInterest })}>
                                <SelectTrigger className="h-16 bg-white dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6 shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {['Interested', 'Pending', 'Not Interested'].map(i => (
                                        <SelectItem key={i} value={i} className="font-black text-sm uppercase p-4 italic">{i}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Pipeline Stage</Label>
                            <Select defaultValue={selectedLead.stage} onValueChange={(v) => handleStageChange(selectedLead, v as LeadStage)}>
                                <SelectTrigger className="h-16 bg-white dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6 shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {['New', 'Trial', 'Follow Up', 'Converted', 'Lost'].map(s => (
                                        <SelectItem key={s} value={s} className="font-black text-sm uppercase p-4 italic">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Rejection Reason</Label>
                            <Select defaultValue={selectedLead.category} onValueChange={(v) => updateClient(selectedLead.id, { category: v as LeadCategory })}>
                                <SelectTrigger className="h-16 bg-white dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6 shadow-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {['Out of area zone', 'Social class', 'Price', 'No answer', 'Other', 'None'].map(c => (
                                        <SelectItem key={c} value={c} className="font-black text-sm uppercase p-4 italic">{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                   </div>

                   <div className="p-8 rounded-[32px] bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
                        <div className="flex items-center gap-3">
                             <Phone className="h-5 w-5 text-primary" />
                             <span className="text-xl font-black tracking-tight">{selectedLead.phone}</span>
                        </div>
                        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Active Line: Intelligence secured via {selectedLead.source}</p>
                   </div>
                </div>

                {/* Right Panel: Feed */}
                <div className="w-full lg:w-[450px] bg-white dark:bg-zinc-900 p-10 lg:p-14 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-primary" /> Activity Intel
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto pr-4 mb-8 space-y-6 no-scrollbar">
                        {selectedLead.comments && selectedLead.comments.length > 0 ? (
                            selectedLead.comments.map((comment, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={idx} 
                                    className="space-y-2 p-5 rounded-[22px] bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800"
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{comment.author}</span>
                                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{format(parseISO(comment.date), 'MMM d, HH:mm')}</span>
                                    </div>
                                    <p className="text-sm font-bold opacity-80 italic">"{comment.text}"</p>
                                </motion.div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                                <MessageSquare className="h-10 w-10 mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-[4px]">Silent Feed</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Textarea 
                            placeholder="Initialize strategic log..." 
                            className="min-h-[120px] rounded-[24px] bg-zinc-100 dark:bg-zinc-950 border-none font-bold p-6 focus-visible:ring-primary shadow-inner"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <Button 
                            onClick={handleAddComment} 
                            disabled={!newComment}
                            className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[4px] shadow-lg shadow-primary/20"
                        >
                            Log Transmission
                        </Button>
                    </div>
                </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Action Menu for Selections */}
      <AnimatePresence>
        {selectedLeadIds.length > 0 && (
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-8 py-4 bg-zinc-950 text-white rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 flex items-center gap-10 min-w-[600px]"
            >
                <div className="flex items-center gap-4 border-r border-white/10 pr-10">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-black text-sm italic">
                        {selectedLeadIds.length}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Targets Engaged</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="group flex items-center gap-3">
                        <ArrowRight className="h-4 w-4 text-primary group-hover:scale-125 transition-all" />
                        <Select onValueChange={(v) => handleBulkStageUpdate(v as LeadStage)}>
                          <SelectTrigger className="h-10 min-w-[140px] bg-transparent border-none text-[10px] font-black uppercase tracking-widest ring-0 focus:ring-0">
                            <SelectValue placeholder="Advance Pipeline" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl bg-zinc-950 text-white border-white/10 shadow-2xl">
                             {['New', 'Trial', 'Follow Up', 'Lost'].map(s => (
                                <SelectItem key={s} value={s} className="font-black text-[10px] uppercase tracking-widest p-4">{s}</SelectItem>
                             ))}
                          </SelectContent>
                        </Select>
                    </div>

                    {isAdmin(currentUser?.role) && (
                        <div className="group flex items-center gap-3">
                            <UserCheck className="h-4 w-4 text-primary group-hover:scale-125 transition-all" />
                            <Select onValueChange={handleBulkAssign}>
                              <SelectTrigger className="h-10 min-w-[140px] bg-transparent border-none text-[10px] font-black uppercase tracking-widest ring-0 focus:ring-0">
                                <SelectValue placeholder="Delegate Handler" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl bg-zinc-950 text-white border-white/10 shadow-2xl">
                                <SelectItem value="unassigned" className="font-black text-[10px] uppercase tracking-widest p-4">Unassigned</SelectItem>
                                {users.filter(u => u.role === 'rep').map(rep => (
                                  <SelectItem key={rep.id} value={rep.id} className="font-black text-[10px] uppercase tracking-widest p-4">{rep.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-10 border-l border-white/10">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLeadIds([])} className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5">
                        Cancel
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="h-10 px-4 rounded-xl text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/10 transition-colors">
                        Purge
                    </Button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isConvertDialogOpen}
        onOpenChange={setIsConvertDialogOpen}
        title="Personnel Induction"
        description="This target has reached Peak conversion potential. Confirm transition to Active Personnel database?"
        onConfirm={confirmConversion}
        confirmText="Induct Personnel"
      />
    </div>
  );
}
