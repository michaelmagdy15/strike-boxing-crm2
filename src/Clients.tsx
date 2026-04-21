import React, { useState, useDeferredValue } from 'react';
import { useAppContext } from './context';
import { usePackages } from './hooks/usePackages';
import { useClients } from './hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Gift, Phone, Calendar, Download, Plus, Search, ArrowUpDown, QrCode, RefreshCw, User, Users, UserPlus, Copy, MessageSquare, Activity } from 'lucide-react';
import { Client, InteractionType, InteractionOutcome } from './types';
import { format, parseISO, isAfter, isBefore, addDays, subDays, differenceInDays } from 'date-fns';
import { SALES_MEMBERS } from './constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import { ConfirmDialog } from './components/ConfirmDialog';
import ImportData from './ImportData';
import ImportHistory from './ImportHistory';
import RenewalPipeline from './components/RenewalPipeline';
import ResyncAssignments from './components/ResyncAssignments';

export default function Clients() {
  const { currentUser, users, payments, canViewGlobalDashboard, canDeleteRecords, recalculateAllPackages, mergeDuplicates, isManagerOrSama, branches } = useAppContext();
  const { clients, addClient, updateClient, deleteMultipleClients, deleteClient, addInteraction, addComment } = useClients(currentUser);
  const { packages } = usePackages();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [isRecalculateConfirmOpen, setIsRecalculateConfirmOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberBranch, setNewMemberBranch] = useState<any>('');
  const [newMemberAssignedTo, setNewMemberAssignedTo] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Interaction Logging State
  const [interactionType, setInteractionType] = useState<InteractionType>('Call');
  const [interactionOutcome, setInteractionOutcome] = useState<InteractionOutcome>('Interested');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [newComment, setNewComment] = useState('');

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredFilterBranch = useDeferredValue(filterBranch);
  const deferredActiveTab = useDeferredValue(activeTab);
  const deferredSortBy = useDeferredValue(sortBy);

  const handleAddMember = () => {
    if (newMemberName && newMemberPhone) {
      addClient({
        id: Math.random().toString(36).substr(2, 9),
        name: newMemberName,
        phone: newMemberPhone,
        status: 'Active',
        branch: newMemberBranch || undefined,
        stage: 'Converted',
        comments: [],
        interactions: [],
        assignedTo: newMemberAssignedTo || (currentUser?.role === 'rep' ? currentUser.id : undefined),
        startDate: new Date().toISOString()
      });
      setIsNewMemberOpen(false);
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberBranch('');
      setNewMemberAssignedTo('');
    }
  };

  const handleAddInteraction = async (clientId: string) => {
    if (!interactionNotes.trim()) return;
    
    await addInteraction(clientId, {
      type: interactionType,
      outcome: interactionOutcome,
      notes: interactionNotes,
      date: new Date().toISOString(),
      nextFollowUp: nextFollowUpDate || undefined
    });

    setInteractionNotes('');
    setNextFollowUpDate('');
  };

  const handleAddComment = async (clientId: string) => {
    if (!newComment.trim()) return;
    await addComment(clientId, newComment);
    setNewComment('');
  };
  const getQRCodeAsBlob = async (memberId: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const svg = document.querySelector(`[data-qr-id="${memberId}"]`);
      if (!svg) {
        reject(new Error('QR Code SVG not found'));
        return;
      }
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  };

  const downloadQRCode = async (memberId: string, name: string) => {
    try {
      const blob = await getQRCodeAsBlob(memberId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${name.replace(/\s+/g, '_')}_${memberId}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code');
    }
  };

  const copyQRCodeToClipboard = async (memberId: string) => {
    try {
      const blob = await getQRCodeAsBlob(memberId);
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      alert('QR code copied to clipboard!');
    } catch (error) {
      console.error('Error copying QR code:', error);
      alert('Failed to copy QR code to clipboard');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const now = new Date();

  // Filter clients
  const members = clients.filter(c => {
    if (c.status === 'Lead') return false;
    if (currentUser?.role === 'rep' && c.assignedTo !== currentUser.id) return false;
    return true;
  });
  
  const activeMembers = members.filter(c => c.status === 'Active');
  const nearlyExpired = members.filter(c => c.status === 'Nearly Expired');
  const expired = members.filter(c => c.status === 'Expired');
  const onHold = members.filter(c => c.status === 'Hold');
  
  const upcomingBirthdays = members.filter(c => {
    if (!c.dateOfBirth) return false;
    const dob = parseISO(c.dateOfBirth);
    const dobThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    return isAfter(dobThisYear, subDays(now, 1)) && isBefore(dobThisYear, addDays(now, 7));
  });

  const getFilteredMembers = () => {
    let base = [];
    switch (deferredActiveTab) {
      case 'active': base = [...activeMembers, ...nearlyExpired]; break;
      case 'hold': base = onHold; break;
      case 'expired': base = expired; break;
      default: base = [...activeMembers, ...nearlyExpired]; break;
    }

    let filtered = base;

    // Search
    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(term) || 
        m.phone.includes(term) ||
        (m.memberId && m.memberId.toString().includes(term))
      );
    }

    // Branch
    if (deferredFilterBranch !== 'All') {
      filtered = filtered.filter(m => m.branch === deferredFilterBranch);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (deferredSortBy === 'id-asc') return (Number(a.memberId) || 0) - (Number(b.memberId) || 0);
      if (deferredSortBy === 'id-desc') return (Number(b.memberId) || 0) - (Number(a.memberId) || 0);
      if (deferredSortBy === 'newest') {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return filtered;
  };

  const filteredMembers = getFilteredMembers();
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClientIds(paginatedMembers.map(c => c.id));
    } else {
      setSelectedClientIds([]);
    }
  };

  const handleSelectClient = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedClientIds(prev => [...prev, id]);
    } else {
      setSelectedClientIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    await deleteMultipleClients(selectedClientIds);
    setSelectedClientIds([]);
  };

  const handleDeleteClient = async (id: string) => {
    setClientToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (clientToDelete) {
      await deleteClient(clientToDelete);
      setClientToDelete(null);
    }
  };

  // Reset page when tab or filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedClientIds([]);
  }, [activeTab, searchTerm, filterBranch, sortBy]);

  const exportToCSV = () => {
    const headers = ['Member ID', 'Name', 'Phone', 'Branch', 'Package', 'Packages Rem.', 'Status', 'Expiry Date', 'Total Paid', 'Assigned To'];
    
    // Pre-calculate payments to O(N) map to avoid O(N*M) performance crash on large datasets
    const paymentTotals = new Map<string, number>();
    for (const p of payments) {
      paymentTotals.set(p.clientId, (paymentTotals.get(p.clientId) || 0) + p.amount);
    }
    
    // Using a map for users for O(N) lookup
    const userMap = new Map<string, string>();
    for (const u of users) {
      userMap.set(u.id, u.name || 'Unassigned');
    }

    const getAssignedName = (id?: string) => {
      if (!id) return 'Unassigned';
      return userMap.get(id) || id; // Return user name or the literal name (for sales members without accounts)
    };

    const csvRows = [
      headers.join(','),
      ...members.map(c => {
        const totalPaid = paymentTotals.get(c.id) || 0;
        const assignedUser = getAssignedName(c.assignedTo);
        return [
          `"${c.memberId || ''}"`,
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


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'Nearly Expired': return <Badge className="bg-amber-500"><AlertTriangle className="w-3 h-3 mr-1" /> Expiring Soon</Badge>;
      case 'Expired': return <Badge variant="destructive">Expired</Badge>;
      case 'Hold': return <Badge className="bg-blue-500 text-white border-blue-500">Hold</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderClientTable = (clientList: Client[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={selectedClientIds.length === clientList.length && clientList.length > 0}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="hidden md:table-cell">Branch</TableHead>
            <TableHead className="hidden md:table-cell">Package</TableHead>
            <TableHead>Sessions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Expiry Date</TableHead>
            {canViewGlobalDashboard && <TableHead className="hidden lg:table-cell">Total Paid</TableHead>}
            {canViewGlobalDashboard && <TableHead className="hidden xl:table-cell">Assigned To</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientList.map(client => {
            const clientPayments = payments.filter(p => p.clientId === client.id);
            const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
            
            return (
            <TableRow key={client.id}>
              <TableCell>
                <Checkbox 
                  checked={selectedClientIds.includes(client.id)}
                  onCheckedChange={(checked) => handleSelectClient(client.id, !!checked)}
                />
              </TableCell>
              <TableCell className="font-medium text-muted-foreground">
                {client.memberId ? `#${client.memberId}` : '-'}
              </TableCell>
              <TableCell className="font-medium">
                {client.name}
                {upcomingBirthdays.some(b => b.id === client.id) && (
                  <Gift className="inline-block ml-2 h-4 w-4 text-pink-500" />
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                  {currentUser?.role === 'rep' && client.assignedTo !== currentUser.id ? '**********' : client.phone}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary">{client.branch || 'Unassigned'}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline">{client.packageType || 'None'}</Badge>
              </TableCell>
              <TableCell>
                {typeof client.sessionsRemaining === 'number' ? (
                  <Badge variant={client.sessionsRemaining < 0 ? 'destructive' : 'secondary'}>
                    {client.sessionsRemaining} left
                  </Badge>
                ) : client.sessionsRemaining === 'no attend' ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">No Attend</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>{getStatusBadge(client.status)}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {client.membershipExpiry ? (
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                    {format(parseISO(client.membershipExpiry), 'MMM d, yyyy')}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not set</span>
                )}
              </TableCell>
              {canViewGlobalDashboard && (
                <TableCell className="font-medium text-green-600 hidden lg:table-cell">
                  {totalPaid.toLocaleString()} LE
                </TableCell>
              )}
              {canViewGlobalDashboard && (
                <TableCell className="hidden xl:table-cell">
                  <select 
                    className="flex h-8 w-[130px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={client.assignedTo || 'unassigned'}
                    onChange={(e) => updateClient(client.id, { assignedTo: e.target.value === 'unassigned' ? '' : e.target.value })}
                  >
                    <option value="unassigned">Unassigned</option>
                    <optgroup label="System Users">
                      {users.filter(u => u.role === 'rep').map(rep => (
                        <option key={rep.id} value={rep.id}>{rep.name || rep.email || 'Unknown User'}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Sales Members">
                      {SALES_MEMBERS.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </optgroup>
                  </select>
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="sm" />}>
                      Manage
                    </DialogTrigger>
                    <DialogContent className="!w-full !max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-2xl bg-background">
                      {/* Compact header */}
                      <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/20 flex-shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <DialogTitle className="text-lg font-bold leading-tight">{client.name}</DialogTitle>
                            <p className="text-xs text-muted-foreground">{client.phone} · {client.branch || 'No branch'} · <span className={client.status === 'Active' ? 'text-green-600 font-semibold' : client.status === 'Nearly Expired' ? 'text-amber-600 font-semibold' : 'text-red-500 font-semibold'}>{client.status}</span></p>
                          </div>
                        </div>
                      </DialogHeader>

                      <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden min-h-0">
                        {/* Sleek tab bar */}
                        <div className="px-6 pt-3 pb-0 border-b flex-shrink-0">
                          <TabsList className="bg-transparent p-0 h-auto gap-0 w-full rounded-none border-none shadow-none flex">
                            {[
                              { value: 'overview', label: 'Overview' },
                              { value: 'activity', label: 'Activity' },
                              { value: 'history', label: 'History' },
                            ].map(tab => (
                              <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all"
                              >
                                {tab.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

                          {/* ── OVERVIEW TAB ── */}
                          <TabsContent value="overview" className="mt-0 outline-none p-5 space-y-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              {/* Left: Editable fields */}
                              <div className="space-y-4 p-4 rounded-xl border bg-muted/20">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Member Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                                    <select
                                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                      defaultValue={client.status}
                                      onChange={(e) => updateClient(client.id, { status: e.target.value as any })}
                                    >
                                      <option value="Active">Active</option>
                                      <option value="Nearly Expired">Nearly Expired</option>
                                      <option value="Expired">Expired</option>
                                      <option value="Hold">Hold</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Branch</Label>
                                    <select
                                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                      defaultValue={client.branch || ''}
                                      onChange={(e) => updateClient(client.id, { branch: e.target.value as any })}
                                    >
                                      <option value="" disabled>Select Branch</option>
                                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points</Label>
                                    <Input type="number" className="h-9 rounded-lg bg-background text-sm px-3" defaultValue={client.points} placeholder="0" onChange={(e) => updateClient(client.id, { points: parseInt(e.target.value) || 0 })} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                                    <Input type="date" className="h-9 rounded-lg bg-background text-sm px-3" defaultValue={client.dateOfBirth ? format(parseISO(client.dateOfBirth), 'yyyy-MM-dd') : ''} onChange={(e) => updateClient(client.id, { dateOfBirth: new Date(e.target.value).toISOString() })} />
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Sales Rep</Label>
                                    <select
                                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                      value={client.assignedTo || 'unassigned'}
                                      onChange={(e) => updateClient(client.id, { assignedTo: e.target.value === 'unassigned' ? '' : e.target.value })}
                                    >
                                      <option value="unassigned">Unassigned</option>
                                      <optgroup label="System Users">
                                        {users.filter(u => u.role === 'rep').map(rep => (
                                          <option key={rep.id} value={rep.id}>{rep.name || rep.email || 'Unknown'}</option>
                                        ))}
                                      </optgroup>
                                      <optgroup label="Sales Members">
                                        {SALES_MEMBERS.map(name => (
                                          <option key={name} value={name}>{name}</option>
                                        ))}
                                      </optgroup>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Package card */}
                              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Package</p>
                                  <Button variant="outline" size="sm" className="h-7 text-[10px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200" onClick={() => { const newPkg = { id: Math.random().toString(36).substring(7), packageName: '', status: 'Active' as const }; updateClient(client.id, { packages: [...(client.packages || []), newPkg] }); }}>
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                  </Button>
                                </div>
                                {(client.packages || []).length > 0 ? (
                                  <div className="space-y-2">
                                    {(client.packages || []).map((pkg, idx) => (
                                      <div key={pkg.id} className="p-3 bg-background rounded-lg border text-xs space-y-2">
                                        <Select value={pkg.packageName} onValueChange={(val) => { if (!val) return; const sysPkg = packages.find(p => p.name === val); const updated = [...(client.packages || [])]; const cur = updated[idx]; if (!cur) return; updated[idx] = { ...cur, packageName: val, sessionsTotal: sysPkg?.sessions, sessionsRemaining: sysPkg?.sessions, endDate: sysPkg && cur.startDate ? addDays(parseISO(cur.startDate), sysPkg.expiryDays).toISOString() : cur.endDate }; updateClient(client.id, { packages: updated }); }}>
                                          <SelectTrigger className="h-7 text-xs bg-muted/30"><SelectValue placeholder="Select package" /></SelectTrigger>
                                          <SelectContent>{packages.map(p => <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}</SelectItem>)}<SelectItem value="Custom" className="text-xs">Custom</SelectItem></SelectContent>
                                        </Select>
                                        <div className="grid grid-cols-3 gap-2">
                                          <div><p className="text-[9px] text-muted-foreground uppercase mb-0.5">Start</p><Input type="date" className="h-7 text-xs bg-background" value={pkg.startDate ? format(parseISO(pkg.startDate), 'yyyy-MM-dd') : ''} onChange={e => { const updated = [...(client.packages || [])]; const cur = updated[idx]; if (!cur) return; const sysPkg = packages.find(p => p.name === cur.packageName); const ns = new Date(e.target.value).toISOString(); updated[idx] = { ...cur, startDate: ns, endDate: sysPkg ? addDays(parseISO(ns), sysPkg.expiryDays).toISOString() : cur.endDate }; updateClient(client.id, { packages: updated }); }} /></div>
                                          <div><p className="text-[9px] text-muted-foreground uppercase mb-0.5">Expiry</p><Input type="date" className="h-7 text-xs bg-background" value={pkg.endDate ? format(parseISO(pkg.endDate), 'yyyy-MM-dd') : ''} onChange={e => { const updated = [...(client.packages || [])]; const cur = updated[idx]; if (!cur) return; updated[idx] = { ...cur, endDate: new Date(e.target.value).toISOString() }; updateClient(client.id, { packages: updated }); }} /></div>
                                          <div><p className="text-[9px] text-muted-foreground uppercase mb-0.5">Remaining</p><Input type="number" className="h-7 text-xs bg-background" value={pkg.sessionsRemaining ?? ''} onChange={e => { const updated = [...(client.packages || [])]; const cur = updated[idx]; if (!cur) return; updated[idx] = { ...cur, sessionsRemaining: parseInt(e.target.value) || 0 }; updateClient(client.id, { packages: updated }); }} /></div>
                                        </div>
                                        <div className="flex gap-1">
                                          <Select value={pkg.status} onValueChange={(val: any) => { if (!val) return; const updated = [...(client.packages || [])]; const cur = updated[idx]; if (!cur) return; updated[idx] = { ...cur, status: val }; updateClient(client.id, { packages: updated }); }}>
                                            <SelectTrigger className="h-7 text-xs flex-1 bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="Active" className="text-xs">Active</SelectItem><SelectItem value="Expired" className="text-xs">Expired</SelectItem><SelectItem value="Cancelled" className="text-xs">Cancelled</SelectItem></SelectContent>
                                          </Select>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => updateClient(client.id, { packages: (client.packages || []).filter((_, i) => i !== idx) })}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  client.packageType && client.packageType !== 'Unknown' ? (
                                    <div className="p-3 bg-primary/5 rounded-lg border text-xs space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div><span className="text-[9px] uppercase text-muted-foreground block">Package</span><span className="font-semibold">{client.packageType}</span></div>
                                        {typeof client.sessionsRemaining !== 'undefined' && <div><span className="text-[9px] uppercase text-muted-foreground block">Sessions Left</span><span className="font-semibold">{client.sessionsRemaining}</span></div>}
                                        {client.startDate && <div><span className="text-[9px] uppercase text-muted-foreground block">Start</span><span className="font-semibold">{format(parseISO(client.startDate), 'dd MMM yyyy')}</span></div>}
                                        {client.membershipExpiry && <div><span className="text-[9px] uppercase text-muted-foreground block">Expires</span><span className="font-semibold">{format(parseISO(client.membershipExpiry), 'dd MMM yyyy')}</span></div>}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground">Click "+ Add" to create a formal entry.</p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">No package found. Click "+ Add" to assign one.</p>
                                  )
                                )}
                              </div>
                            </div>
                          </TabsContent>

                          {/* ── ACTIVITY TAB ── */}
                          <TabsContent value="activity" className="mt-0 outline-none p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                              {/* Interactions column */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Interactions</p>
                                <div className="h-48 overflow-y-auto space-y-2 custom-scrollbar">
                                  {client.interactions && client.interactions.length > 0 ? (
                                    [...client.interactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(interaction => (
                                      <div key={interaction.id} className="bg-muted/20 p-3 rounded-lg border text-xs space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <div className="flex gap-1.5">
                                            <Badge className={`text-[9px] px-1.5 py-0 h-5 ${interaction.type === 'Call' ? 'bg-blue-500' : interaction.type === 'WhatsApp' ? 'bg-green-500' : interaction.type === 'Email' ? 'bg-amber-500' : 'bg-purple-500'}`}>{interaction.type}</Badge>
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5">{interaction.outcome}</Badge>
                                          </div>
                                          <span className="text-[9px] text-muted-foreground">{format(parseISO(interaction.date), 'MMM d, h:mm a')}</span>
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed italic">"{interaction.notes}"</p>
                                        {interaction.nextFollowUp && <p className="text-amber-600 text-[9px] flex items-center gap-1"><Calendar className="h-3 w-3" />Follow-up: {format(parseISO(interaction.nextFollowUp), 'MMM d')}</p>}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">No interactions yet.</div>
                                  )}
                                </div>
                                <div className="p-3 rounded-xl border bg-muted/10 space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Type</Label>
                                      <Select value={interactionType} onValueChange={(v) => setInteractionType(v as InteractionType)}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="Call">Call</SelectItem><SelectItem value="WhatsApp">WhatsApp</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="Visit">Visit</SelectItem></SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[9px] uppercase font-bold text-muted-foreground">Outcome</Label>
                                      <Select value={interactionOutcome} onValueChange={(v) => setInteractionOutcome(v as InteractionOutcome)}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="Interested">Interested</SelectItem><SelectItem value="Not Answered">Not Answered</SelectItem><SelectItem value="Scheduled Trial">Scheduled Trial</SelectItem><SelectItem value="Rejected">Rejected</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[9px] uppercase font-bold text-muted-foreground">Follow-up Date (optional)</Label>
                                    <Input type="date" className="h-8 text-xs" value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} />
                                  </div>
                                  <Textarea placeholder="Notes..." className="min-h-[70px] text-xs resize-none rounded-lg" value={interactionNotes} onChange={(e) => setInteractionNotes(e.target.value)} />
                                  <Button className="w-full h-9 text-xs font-bold" onClick={() => handleAddInteraction(client.id)}>Log Interaction</Button>
                                </div>
                              </div>

                              {/* Comments column */}
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Internal Notes</p>
                                <div className="h-48 overflow-y-auto space-y-2 custom-scrollbar">
                                  {(client.comments || []).length > 0 ? (
                                    [...(client.comments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(comment => (
                                      <div key={comment.id} className="bg-muted/20 p-3 rounded-lg border text-xs space-y-1">
                                        <p className="leading-relaxed text-foreground/90">{comment.text}</p>
                                        <div className="flex justify-between text-[9px] text-muted-foreground">
                                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{comment.author}</span>
                                          <span>{format(parseISO(comment.date), 'MMM d, h:mm a')}</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">No notes yet.</div>
                                  )}
                                </div>
                                <div className="p-3 rounded-xl border bg-muted/10 space-y-2.5">
                                  <Label className="text-[9px] uppercase font-bold text-muted-foreground">Add Note</Label>
                                  <Textarea placeholder="Type internal notes here..." className="min-h-[100px] text-xs resize-none rounded-lg" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                                  <Button className="w-full h-9 text-xs font-bold" onClick={() => handleAddComment(client.id)}>Save Note</Button>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          {/* ── HISTORY TAB ── */}
                          <TabsContent value="history" className="mt-0 outline-none p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                              {/* Payments (2/3 width) */}
                              <div className="lg:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment History</p>
                                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-none">{payments.filter(p => p.clientId === client.id).length} entries</Badge>
                                </div>
                                <div className="rounded-xl border bg-background overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-muted/30">
                                      <TableRow>
                                        <TableHead className="text-[10px] uppercase py-2.5 px-3">Date</TableHead>
                                        <TableHead className="text-[10px] uppercase py-2.5 px-3 text-right">Amount</TableHead>
                                        <TableHead className="text-[10px] uppercase py-2.5 px-3">Package</TableHead>
                                        <TableHead className="text-[10px] uppercase py-2.5 px-3 text-center">Method</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {payments.filter(p => p.clientId === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                                        <TableRow key={payment.id} className="hover:bg-muted/20 border-b transition-colors">
                                          <TableCell className="py-2.5 px-3 text-xs">{format(parseISO(payment.date), 'MMM d, yyyy')}</TableCell>
                                          <TableCell className="py-2.5 px-3 text-right"><span className="text-xs font-bold text-green-600">{payment.amount.toLocaleString()} LE</span></TableCell>
                                          <TableCell className="py-2.5 px-3 text-xs max-w-[120px] truncate">{payment.packageType}</TableCell>
                                          <TableCell className="py-2.5 px-3 text-center"><Badge variant="outline" className="text-[9px] px-1.5 py-0">{payment.method}</Badge></TableCell>
                                        </TableRow>
                                      ))}
                                      {payments.filter(p => p.clientId === client.id).length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-xs text-muted-foreground italic">No payments recorded.</TableCell></TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              {/* QR Code (1/3 width) */}
                              <div className="flex flex-col items-center gap-4 p-4 rounded-xl border bg-muted/10">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground self-start">Member QR</p>
                                <div className="bg-white p-4 rounded-xl shadow-md">
                                  <QRCodeSVG id={`qr-svg-${client.id}`} value={client.memberId || client.id} size={140} level="H" includeMargin={true} data-qr-id={client.memberId || client.id} />
                                </div>
                                <p className="text-xs font-mono font-bold text-center">#{client.memberId || client.id.slice(0, 8).toUpperCase()}</p>
                                <div className="flex gap-2 w-full">
                                  <Button variant="outline" size="sm" className="flex-1 text-[10px] gap-1" onClick={() => downloadQRCode(client.memberId || client.id, client.name)}><Download className="h-3 w-3" />Save</Button>
                                  <Button variant="outline" size="sm" className="flex-1 text-[10px] gap-1" onClick={() => copyQRCodeToClipboard(client.memberId || client.id)}><Copy className="h-3 w-3" />Copy</Button>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                        </div>
                      </Tabs>
                    </DialogContent>
                  </Dialog>


                {canDeleteRecords && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClient(client.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                </div>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Members Database</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsRecalculateConfirmOpen(true)}
            disabled={isRecalculating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalculate All Expiry
          </Button>
          {isManagerOrSama && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              onClick={mergeDuplicates}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Merge Duplicates
            </Button>
          )}
          <ImportData type="Active" />
          <ImportHistory />
          {isManagerOrSama && (
            <ResyncAssignments clients={clients} users={users} currentUser={currentUser} />
          )}
          <Dialog open={isNewMemberOpen} onOpenChange={setIsNewMemberOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </DialogTrigger>
          <DialogContent className="!w-full !max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-3xl bg-background/95 backdrop-blur-xl">
            <DialogHeader className="p-10 pb-6 bg-muted/30 border-b">
              <DialogTitle className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                <UserPlus className="h-8 w-8 text-primary" />
                Add New Member
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-10 pt-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <Input 
                    placeholder="Enter member's full name" 
                    className="h-14 rounded-2xl bg-background/50 focus-visible:ring-primary border-white/10 transition-all px-5 text-lg"
                    value={newMemberName} 
                    onChange={(e) => setNewMemberName(e.target.value)} 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                  <Input 
                    placeholder="+20 1xx xxxx xxx" 
                    className="h-14 rounded-2xl bg-background/50 focus-visible:ring-primary border-white/10 transition-all px-5 text-lg"
                    value={newMemberPhone} 
                    onChange={(e) => setNewMemberPhone(e.target.value)} 
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Branch</Label>
                  <Select value={newMemberBranch} onValueChange={(v) => setNewMemberBranch(v || '')}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-white/10 px-5 text-lg">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {branches.map(b => (
                        <SelectItem key={b} value={b} className="rounded-xl py-3 px-4">{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Initial Assignment</Label>
                  <Select value={newMemberAssignedTo} onValueChange={(v) => setNewMemberAssignedTo(v || '')}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-white/10 px-5 text-lg">
                      <SelectValue placeholder="Select assignment" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      <SelectItem value="unassigned" className="rounded-xl py-3 px-4">Unassigned</SelectItem>
                      <SelectGroup>
                        <SelectLabel className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-tighter">System Users</SelectLabel>
                        {users.filter(u => u.role === 'rep').map(rep => (
                          <SelectItem key={rep.id} value={rep.id} className="rounded-xl py-3 px-4">{rep.name || rep.email}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-tighter">Sales Members</SelectLabel>
                        {SALES_MEMBERS.map(name => (
                          <SelectItem key={name} value={name} className="rounded-xl py-3 px-4">{name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-12">
                <Button onClick={handleAddMember} className="w-full h-16 rounded-2xl text-xl font-extrabold shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-[1.01] active:scale-[0.99]">
                  Create Member Profile
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active" onValueChange={setActiveTab}>
        <div className="flex flex-col md:flex-row items-end gap-4 mb-6 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex-1 w-full space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground ml-1">Search Name/Phone/ID</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-11 bg-muted/30 border-none focus-visible:ring-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="w-full md:w-[180px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground ml-1">Branch</Label>
            <select 
              className="flex h-11 w-full items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 border-none"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-[180px] space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground ml-1">Sort By</Label>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select 
                className="flex h-11 w-full items-center justify-between rounded-md bg-muted/30 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 border-none appearance-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="id-asc">Member ID (Low-High)</option>
                <option value="id-desc">Member ID (High-Low)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="flex w-max sm:w-full bg-muted/50 rounded-lg p-1 justify-start sm:justify-center">
            <TabsTrigger value="active" className="px-4 text-xs sm:text-sm">Active ({activeMembers.length + nearlyExpired.length})</TabsTrigger>
            <TabsTrigger value="hold" className="px-4 text-xs sm:text-sm">Hold ({onHold.length})</TabsTrigger>
            <TabsTrigger value="expired" className="px-4 text-xs sm:text-sm">Expired ({expired.length})</TabsTrigger>
            <TabsTrigger value="renewal" className="px-4 text-xs sm:text-sm bg-blue-500/10 text-blue-700 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">Renewal Pipeline</TabsTrigger>
          </TabsList>
        </div>

         {activeTab !== 'renewal' ? (
          <>
            {selectedClientIds.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-lg flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary text-primary-foreground">
                    {selectedClientIds.length} selected
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedClientIds([])}>
                    Cancel
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {canDeleteRecords && (
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <Card className="mt-4">
              <CardContent className="p-0">
                {renderClientTable(paginatedMembers)}
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">Page {currentPage} of {totalPages}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <RenewalPipeline />
        )}
      </Tabs>

      <ConfirmDialog
        isOpen={isRecalculateConfirmOpen}
        onOpenChange={setIsRecalculateConfirmOpen}
        title="Recalculate All Expiry Dates?"
        description="This will update the expiry dates for ALL records based on their package type and start date. This action cannot be undone."
        confirmText={isRecalculating ? 'Recalculating...' : 'Recalculate All'}
        onConfirm={async () => {
          setIsRecalculating(true);
          try {
            await recalculateAllPackages();
          } finally {
            setIsRecalculating(false);
          }
        }}
      />

      <ConfirmDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Member"
        description="Are you sure you want to delete this member? This action cannot be undone."
        onConfirm={confirmDeleteClient}
        variant="destructive"
        confirmText="Delete"
      />

      <ConfirmDialog 
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title="Delete Multiple Members"
        description={`Are you sure you want to delete ${selectedClientIds.length} members? This action cannot be undone.`}
        onConfirm={confirmBulkDelete}
        variant="destructive"
        confirmText="Delete All Selected"
      />
      
      {upcomingBirthdays.length > 0 && (
        <Card className="border-pink-200 dark:border-pink-900">
          <CardHeader className="bg-pink-50 dark:bg-pink-900/20 pb-4">
            <CardTitle className="flex items-center text-pink-600 dark:text-pink-400">
              <Gift className="mr-2 h-5 w-5" />
              Upcoming Birthdays (Give Discounts/Points!)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBirthdays.map(client => (
                <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.dateOfBirth ? format(parseISO(client.dateOfBirth), 'MMMM do') : ''}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="text-pink-600 border-pink-200 hover:bg-pink-50">
                    Send Offer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
