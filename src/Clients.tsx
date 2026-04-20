import React, { useState, useDeferredValue } from 'react';
import { useAppContext } from './context';
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

export default function Clients() {
  const { clients, addClient, updateClient, deleteMultipleClients, deleteClient, currentUser, users, payments, packages, canViewGlobalDashboard, canDeleteRecords, recalculateAllPackages, mergeDuplicates, isManagerOrSama, addInteraction, addComment, branches } = useAppContext();
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
                    <DialogContent className="!w-full !max-w-[1400px] h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-3xl bg-background/95 backdrop-blur-xl">
                      <DialogHeader className="p-10 pb-6 bg-muted/30 border-b">
                        <DialogTitle className="text-3xl font-extrabold tracking-tight">Manage Member: <span className="text-primary">{client.name}</span></DialogTitle>
                      </DialogHeader>
                      
                      <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-10 py-6 border-b bg-muted/10">
                          <TabsList className="bg-muted/80 p-2 rounded-3xl h-auto inline-flex w-full md:w-auto gap-4 border-2 border-white/10 shadow-inner">
                            <TabsTrigger 
                              value="details" 
                              className="rounded-2xl px-12 py-5 data-[state=active]:bg-background data-[state=active]:shadow-2xl data-[state=active]:text-primary data-[state=active]:border-primary/20 transition-all font-black uppercase tracking-widest text-sm border-2 border-transparent h-auto"
                            >
                              Personal Details
                            </TabsTrigger>
                            <TabsTrigger 
                              value="payments" 
                              className="rounded-2xl px-12 py-5 data-[state=active]:bg-background data-[state=active]:shadow-2xl data-[state=active]:text-primary data-[state=active]:border-primary/20 transition-all font-black uppercase tracking-widest text-sm border-2 border-transparent h-auto"
                            >
                              Payment History
                            </TabsTrigger>
                            <TabsTrigger 
                              value="qr" 
                              className="rounded-2xl px-12 py-5 data-[state=active]:bg-background data-[state=active]:shadow-2xl data-[state=active]:text-primary data-[state=active]:border-primary/20 transition-all font-black uppercase tracking-widest text-sm border-2 border-transparent h-auto"
                            >
                              Check-in QR
                            </TabsTrigger>
                            <TabsTrigger 
                              value="interactions" 
                              className="rounded-2xl px-12 py-5 data-[state=active]:bg-background data-[state=active]:shadow-2xl data-[state=active]:text-primary data-[state=active]:border-primary/20 transition-all font-black uppercase tracking-widest text-sm border-2 border-transparent h-auto"
                            >
                              Interactions
                            </TabsTrigger>
                            <TabsTrigger 
                              value="comments" 
                              className="rounded-2xl px-12 py-5 data-[state=active]:bg-background data-[state=active]:shadow-2xl data-[state=active]:text-primary data-[state=active]:border-primary/20 transition-all font-black uppercase tracking-widest text-sm border-2 border-transparent h-auto"
                            >
                              Comments
                            </TabsTrigger>
                            <TabsTrigger 
                              value="packages" 
                              className="rounded-2xl px-12 py-5 data-[state=active]:bg-background data-[state=active]:shadow-2xl data-[state=active]:text-primary data-[state=active]:border-primary/20 transition-all font-black uppercase tracking-widest text-sm border-2 border-transparent h-auto"
                            >
                              Packages
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                          <TabsContent value="details" className="mt-0 outline-none">
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Status</Label>
                                  <select 
                                    className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
                                    defaultValue={client.status}
                                    onChange={(e) => updateClient(client.id, { status: e.target.value as any })}
                                  >
                                    <option value="Active">Active</option>
                                    <option value="Nearly Expired">Nearly Expired</option>
                                    <option value="Expired">Expired</option>
                                    <option value="Hold">Hold</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Branch</Label>
                                  <select 
                                    className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
                                    defaultValue={client.branch || ''}
                                    onChange={(e) => updateClient(client.id, { branch: e.target.value as any })}
                                  >
                                    <option value="" disabled>Select Branch</option>
                                    {branches.map(b => (
                                      <option key={b} value={b}>{b}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Points</Label>
                                  <Input 
                                    type="number" 
                                    className="h-11 rounded-xl bg-background/50 focus-visible:ring-primary transition-all px-4"
                                    defaultValue={client.points} 
                                    placeholder="0"
                                    onChange={(e) => updateClient(client.id, { points: parseInt(e.target.value) || 0 })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Date of Birth</Label>
                                  <Input 
                                    type="date" 
                                    className="h-11 rounded-xl bg-background/50 focus-visible:ring-primary transition-all px-4"
                                    defaultValue={client.dateOfBirth ? format(parseISO(client.dateOfBirth), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => updateClient(client.id, { dateOfBirth: new Date(e.target.value).toISOString() })}
                                  />
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="payments" className="mt-0 outline-none">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Transaction History
                                </h3>
                                <Badge variant="secondary" className="rounded-full px-4 py-1 font-semibold bg-primary/10 text-primary border-none">
                                  {payments.filter(p => p.clientId === client.id).length} Entries
                                </Badge>
                              </div>
                              <div className="rounded-2xl border bg-background/50 overflow-hidden shadow-sm">
                                <Table>
                                  <TableHeader className="bg-muted/40">
                                    <TableRow className="border-b">
                                      <TableHead className="py-4 px-6 text-xs font-bold uppercase">Date</TableHead>
                                      <TableHead className="py-4 px-6 text-xs font-bold uppercase text-right">Amount</TableHead>
                                      <TableHead className="py-4 px-6 text-xs font-bold uppercase">Package</TableHead>
                                      <TableHead className="py-4 px-6 text-xs font-bold uppercase text-center">Method</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {payments.filter(p => p.clientId === client.id)
                                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                      .map(payment => (
                                        <TableRow key={payment.id} className="hover:bg-muted/20 border-b transition-colors group">
                                          <TableCell className="py-4 px-6">
                                            <div className="text-sm font-medium">{format(parseISO(payment.date), 'MMM d, yyyy')}</div>
                                            <div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                              {format(parseISO(payment.date), 'h:mm a')}
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-4 px-6 text-right">
                                            <span className="text-sm font-bold text-green-600">
                                              {payment.amount.toLocaleString()} <span className="text-[10px]">LE</span>
                                            </span>
                                          </TableCell>
                                          <TableCell className="py-4 px-6 text-sm">
                                            <div className="font-medium text-foreground max-w-[150px] truncate" title={payment.packageType}>
                                              {payment.packageType}
                                            </div>
                                          </TableCell>
                                          <TableCell className="py-4 px-6 text-center">
                                            <Badge variant="outline" className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-muted/30 border-muted-foreground/20">
                                              {payment.method}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    {payments.filter(p => p.clientId === client.id).length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-center py-16 text-muted-foreground italic text-sm">
                                          <div className="flex flex-col items-center gap-2 opacity-40">
                                            <Calendar className="h-10 w-10 mb-2" />
                                            <span>No payments recorded for this member.</span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="interactions" className="mt-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                              <div className="lg:col-span-7 space-y-6">
                                <div className="h-[400px] overflow-y-auto space-y-4 pr-4 custom-scrollbar bg-muted/10 p-6 rounded-[24px] border border-white/5">
                                  {client.interactions && client.interactions.length > 0 ? (
                                    [...client.interactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(interaction => (
                                      <div key={interaction.id} className="bg-background/40 p-5 rounded-2xl border border-white/5 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                          <div className="flex items-center gap-2">
                                            <Badge className={
                                              interaction.type === 'Call' ? 'bg-blue-500' :
                                              interaction.type === 'WhatsApp' ? 'bg-green-500' :
                                              interaction.type === 'Email' ? 'bg-amber-500' :
                                              'bg-purple-500'
                                            }>
                                              {interaction.type}
                                            </Badge>
                                            <Badge variant="outline" className="border-primary/20 text-primary">
                                              {interaction.outcome}
                                            </Badge>
                                          </div>
                                          <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-tighter">
                                            {format(parseISO(interaction.date), 'MMM d, h:mm a')}
                                          </span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-foreground/90 italic">"{interaction.notes}"</p>
                                        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/50 border-t border-white/5 pt-2">
                                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {interaction.author}</span>
                                          {interaction.nextFollowUp && (
                                            <span className="flex items-center gap-1 text-amber-500/80">
                                              <Calendar className="h-3 w-3" /> Follow-up: {format(parseISO(interaction.nextFollowUp), 'MMM d')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic gap-4">
                                      <div className="p-4 bg-muted/20 rounded-full">
                                        <Activity className="h-8 w-8 opacity-20" />
                                      </div>
                                      No interactions logged yet.
                                    </div>
                                  )}
                                </div>
                                
                                <div className="bg-background/80 backdrop-blur-sm p-8 rounded-[32px] border border-white/10 shadow-2xl space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Type</Label>
                                      <Select value={interactionType} onValueChange={(v) => setInteractionType(v as InteractionType)}>
                                        <SelectTrigger className="bg-muted/20 border-white/5 rounded-xl h-10">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Call">Call</SelectItem>
                                          <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                          <SelectItem value="Email">Email</SelectItem>
                                          <SelectItem value="Visit">Visit</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Outcome</Label>
                                      <Select value={interactionOutcome} onValueChange={(v) => setInteractionOutcome(v as InteractionOutcome)}>
                                        <SelectTrigger className="bg-muted/20 border-white/5 rounded-xl h-10">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Interested">Interested</SelectItem>
                                          <SelectItem value="Not Answered">Not Answered</SelectItem>
                                          <SelectItem value="Scheduled Trial">Scheduled Trial</SelectItem>
                                          <SelectItem value="Rejected">Rejected</SelectItem>
                                          <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Follow-up Reminder (Optional)</Label>
                                    <Input 
                                      type="date" 
                                      className="bg-muted/20 border-white/5 rounded-xl h-10" 
                                      value={nextFollowUpDate}
                                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Interaction Notes</Label>
                                    <Textarea 
                                      placeholder="Summary of the conversation..." 
                                      className="min-h-[100px] rounded-2xl bg-muted/20 border-white/5 focus:border-primary/30 transition-all resize-none p-4"
                                      value={interactionNotes}
                                      onChange={(e) => setInteractionNotes(e.target.value)}
                                    />
                                  </div>
                                  <Button className="w-full rounded-2xl py-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-transform" onClick={() => handleAddInteraction(client.id)}>
                                    Log Interaction
                                  </Button>
                                </div>
                              </div>

                              <div className="lg:col-span-5 h-full">
                                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-[32px] p-8 border border-primary/10 h-full flex flex-col items-center text-center space-y-6">
                                  <div className="p-5 bg-background shadow-xl rounded-2xl rotate-3">
                                    <Phone className="h-8 w-8 text-primary" />
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="font-black text-xl tracking-tight">Structured Logging</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                      Log each call, message or visit with specific outcomes to build a detailed history of engagement.
                                    </p>
                                  </div>
                                  <div className="w-full h-px bg-primary/10" />
                                  <div className="grid grid-cols-2 gap-4 w-full">
                                    <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                                      <div className="text-2xl font-black text-primary">{client.interactions?.length || 0}</div>
                                      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Total Logs</div>
                                    </div>
                                    <div className="p-4 bg-background/50 rounded-2xl border border-white/5">
                                      <div className="text-2xl font-black text-primary">
                                        {client.lastContactDate ? differenceInDays(new Date(), parseISO(client.lastContactDate)) : '∞'}
                                      </div>
                                      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Days Since</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="comments" className="mt-0 outline-none">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                              <div className="lg:col-span-7 space-y-6">
                                  <div className="h-[400px] overflow-y-auto space-y-4 pr-4 custom-scrollbar bg-muted/10 p-6 rounded-[24px] border border-white/5">
                                    {(client.comments || []).length > 0 ? (
                                      [...(client.comments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(comment => (
                                        <div key={comment.id} className="bg-background/40 p-4 rounded-2xl text-sm border border-white/5 shadow-sm">
                                          <p className="leading-relaxed text-foreground/90">{comment.text}</p>
                                        <div className="flex justify-between mt-3 text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground/60">
                                          <span className="flex items-center gap-1.5"><User className="h-3 w-3" /> {comment.author}</span>
                                          <span>{format(parseISO(comment.date), 'MMM d, h:mm a')}</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                                      No comments logged yet.
                                    </div>
                                  )}
                                </div>
                                
                                <div className="bg-background/80 backdrop-blur-sm p-6 rounded-[32px] border border-white/10 shadow-2xl space-y-4">
                                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">General Note</Label>
                                  <Textarea 
                                    placeholder="Type any additional internal notes here..." 
                                    className="min-h-[120px] rounded-2xl bg-muted/20 border-white/5 focus:border-primary/30 transition-all resize-none p-4"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                  />
                                  <Button className="w-full rounded-2xl py-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" onClick={() => handleAddComment(client.id)}>
                                    Save Note
                                  </Button>
                                </div>
                              </div>

                              <div className="lg:col-span-5">
                                <div className="bg-primary/5 rounded-[32px] p-8 border border-primary/10 h-full flex flex-col justify-center items-center text-center space-y-4">
                                  <div className="p-4 bg-primary/10 rounded-full">
                                    <MessageSquare className="h-8 w-8 text-primary" />
                                  </div>
                                  <h4 className="font-bold text-lg">Internal Comments</h4>
                                  <p className="text-sm text-muted-foreground px-4">Internal notes for team collaboration and background information.</p>
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="qr" className="mt-0 outline-none">
                            <div className="flex flex-col items-center justify-center space-y-8 py-12">
                              <div className="flex flex-col items-center gap-3">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                  <QrCode className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold tracking-tight">Member Identity</h3>
                                <p className="text-xs text-muted-foreground max-w-[200px] text-center">
                                  Scan this QR code at the reception for instant check-in and attendance recording.
                                </p>
                              </div>
                              <div id="qr-container" className="bg-white p-8 rounded-[32px] shadow-2xl border-4 border-muted/20 relative group">
                                <div className="absolute inset-0 bg-primary/5 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <QRCodeSVG 
                                  id={`qr-svg-${client.id}`}
                                  value={client.memberId || client.id} 
                                  size={220} 
                                  level="H"
                                  includeMargin={true}
                                  data-qr-id={client.memberId || client.id}
                                />
                              </div>
                              <div className="flex flex-wrap justify-center gap-4">
                                <Button 
                                  variant="outline" 
                                  className="rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-bold gap-3 px-8 py-6 h-auto shadow-sm transition-all hover:scale-105"
                                  onClick={() => downloadQRCode(client.memberId || client.id, client.name)}
                                >
                                  <Download className="h-5 w-5" />
                                  Save to Device
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-bold gap-3 px-8 py-6 h-auto shadow-sm transition-all hover:scale-105"
                                  onClick={() => copyQRCodeToClipboard(client.memberId || client.id)}
                                >
                                  <Copy className="h-5 w-5" />
                                  Copy for Sharing
                                </Button>
                              </div>
                              <div className="text-center space-y-1 bg-muted/30 px-6 py-3 rounded-full border border-muted-foreground/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Digital Pass ID</p>
                                <p className="text-xl font-mono font-bold text-foreground tracking-tight">
                                  #{client.memberId || client.id.slice(0, 8).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="packages" className="mt-0 outline-none">
                            <div className="space-y-6 p-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Client Packages</Label>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 border-emerald-200"
                                  onClick={() => {
                                    const newPkg = {
                                      id: Math.random().toString(36).substring(7),
                                      packageName: '',
                                      status: 'Active' as const
                                    };
                                    const updatedPackages = [...(client.packages || []), newPkg];
                                    updateClient(client.id, { packages: updatedPackages });
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Add Package
                                </Button>
                              </div>
                              
                              <div className="space-y-3">
                                {(client.packages || []).map((pkg, idx) => (
                                  <div key={pkg.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-muted/30 rounded-xl border relative">
                                    <div className="md:col-span-3 space-y-1">
                                      <Label className="text-[10px] uppercase text-muted-foreground">Package</Label>
                                      <Select 
                                        value={pkg.packageName} 
                                        onValueChange={(val) => {
                                           if (!val) return;
                                           const sysPkg = packages.find(p => p.name === val);
                                           const updated = [...(client.packages || [])];
                                           const currentPkg = updated[idx];
                                           if (!currentPkg) return;
                                           
                                           updated[idx] = {
                                             ...currentPkg, 
                                             packageName: val,
                                             sessionsTotal: sysPkg ? sysPkg.sessions : undefined,
                                             sessionsRemaining: sysPkg ? sysPkg.sessions : undefined,
                                             endDate: sysPkg && currentPkg.startDate ? addDays(parseISO(currentPkg.startDate), sysPkg.expiryDays).toISOString() : currentPkg.endDate
                                           };
                                           updateClient(client.id, { packages: updated });
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                          {packages.map(p => <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}</SelectItem>)}
                                          <SelectItem value="Custom" className="text-xs">Custom</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                      <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                                      <Input 
                                        type="date" className="h-8 text-xs bg-background" 
                                        value={pkg.startDate ? format(parseISO(pkg.startDate), 'yyyy-MM-dd') : ''}
                                        onChange={e => {
                                          const updated = [...(client.packages || [])];
                                          const currentPkg = updated[idx];
                                          if (!currentPkg) return;
                                          const sysPkg = packages.find(p => p.name === currentPkg.packageName);
                                          const newStart = new Date(e.target.value).toISOString();
                                          updated[idx] = { 
                                            ...currentPkg, 
                                            startDate: newStart,
                                            endDate: sysPkg ? addDays(parseISO(newStart), sysPkg.expiryDays).toISOString() : currentPkg.endDate
                                          };
                                          updateClient(client.id, { packages: updated });
                                        }}
                                      />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                      <Label className="text-[10px] uppercase text-muted-foreground">Expiry</Label>
                                      <Input 
                                        type="date" className="h-8 text-xs bg-background" 
                                        value={pkg.endDate ? format(parseISO(pkg.endDate), 'yyyy-MM-dd') : ''}
                                        onChange={e => {
                                          const updated = [...(client.packages || [])];
                                          const currentPkg = updated[idx];
                                          if (!currentPkg) return;
                                          updated[idx] = { ...currentPkg, endDate: new Date(e.target.value).toISOString() };
                                          updateClient(client.id, { packages: updated });
                                        }}
                                      />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                      <Label className="text-[10px] uppercase text-muted-foreground">Remaining</Label>
                                      <Input 
                                        type="number" className="h-8 text-xs bg-background" 
                                        value={pkg.sessionsRemaining || ''}
                                        onChange={e => {
                                          const updated = [...(client.packages || [])];
                                          const currentPkg = updated[idx];
                                          if (!currentPkg) return;
                                          updated[idx] = { ...currentPkg, sessionsRemaining: parseInt(e.target.value) || 0 };
                                          updateClient(client.id, { packages: updated });
                                        }}
                                      />
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                      <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
                                      <div className="flex gap-1 items-center">
                                        <Select 
                                          value={pkg.status} 
                                          onValueChange={(val: any) => {
                                            if (!val) return;
                                            const updated = [...(client.packages || [])];
                                            const currentPkg = updated[idx];
                                            if (!currentPkg) return;
                                            updated[idx] = { ...currentPkg, status: val };
                                            updateClient(client.id, { packages: updated });
                                          }}
                                        >
                                          <SelectTrigger className="h-8 text-xs flex-1 bg-background"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Active" className="text-xs">Active</SelectItem>
                                            <SelectItem value="Expired" className="text-xs">Expired</SelectItem>
                                            <SelectItem value="Cancelled" className="text-xs">Cancelled</SelectItem>
                                            <SelectItem value="Pending" className="text-xs">Pending</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Button 
                                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                                          onClick={() => {
                                            const updated = (client.packages || []).filter((_, i) => i !== idx);
                                            updateClient(client.id, { packages: updated });
                                          }}
                                        ><Trash2 className="h-4 w-4" /></Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {(client.packages || []).length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed">No packages found for this client. Click "Add Package" to assign one.</p>
                                )}
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
