import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, isAfter, isBefore, addDays, subDays } from 'date-fns';
import { Client } from './types';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Gift, Phone, Calendar, Download, Plus, Search, ArrowUpDown, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ConfirmDialog } from './components/ConfirmDialog';
import ImportData from './ImportData';
import ImportHistory from './ImportHistory';

export default function Clients() {
  const { clients, addClient, updateClient, deleteMultipleClients, deleteClient, currentUser, users, payments, canViewGlobalDashboard, canDeleteRecords } = useAppContext();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberBranch, setNewMemberBranch] = useState<any>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

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
        assignedTo: currentUser?.role === 'rep' ? currentUser.id : undefined,
        startDate: new Date().toISOString()
      });
      setIsNewMemberOpen(false);
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberBranch('');
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const now = new Date();

  // Filter clients
  const members = clients.filter(c => c.status !== 'Lead');
  
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
    switch (activeTab) {
      case 'active': base = [...activeMembers, ...nearlyExpired]; break;
      case 'hold': base = onHold; break;
      case 'expired': base = expired; break;
      default: base = [...activeMembers, ...nearlyExpired]; break;
    }

    let filtered = base;

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(term) || 
        m.phone.includes(term) ||
        (m.memberId && m.memberId.toString().includes(term))
      );
    }

    // Branch
    if (filterBranch !== 'All') {
      filtered = filtered.filter(m => m.branch === filterBranch);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'id-asc') return (Number(a.memberId) || 0) - (Number(b.memberId) || 0);
      if (sortBy === 'id-desc') return (Number(b.memberId) || 0) - (Number(a.memberId) || 0);
      if (sortBy === 'newest') {
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
    const headers = ['Member ID', 'Name', 'Phone', 'Branch', 'Package', 'Sessions', 'Status', 'Expiry Date', 'Total Paid', 'Assigned To'];
    const csvRows = [
      headers.join(','),
      ...members.map(c => {
        const clientPayments = payments.filter(p => p.clientId === c.id);
        const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
        const assignedUser = users.find(u => u.id === c.assignedTo)?.name || 'Unassigned';
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
                    defaultValue={client.assignedTo || 'unassigned'}
                    onChange={(e) => updateClient(client.id, { assignedTo: e.target.value === 'unassigned' ? '' : e.target.value })}
                  >
                    <option value="unassigned">Unassigned</option>
                    {users.filter(u => u.role === 'rep').map(rep => (
                      <option key={rep.id} value={rep.id}>{rep.name || rep.email || 'Unknown User'}</option>
                    ))}
                  </select>
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="sm" />}>
                      Manage
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Manage Member: {client.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                          <Label>Branch</Label>
                          <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            defaultValue={client.branch || ''}
                            onChange={(e) => updateClient(client.id, { branch: e.target.value as any })}
                          >
                            <option value="" disabled>Select Branch</option>
                            <option value="COMPLEX">COMPLEX</option>
                            <option value="MIVIDA">MIVIDA</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Points</Label>
                          <Input 
                            type="number" 
                            defaultValue={client.points} 
                            onChange={(e) => updateClient(client.id, { points: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Package Type</Label>
                          <Input 
                            defaultValue={client.packageType} 
                            onChange={(e) => updateClient(client.id, { packageType: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Sessions Remaining</Label>
                          <Input 
                            defaultValue={client.sessionsRemaining} 
                            onChange={(e) => {
                              const val = e.target.value;
                              updateClient(client.id, { 
                                sessionsRemaining: isNaN(Number(val)) ? val : Number(val) 
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input 
                            type="date" 
                            defaultValue={client.startDate ? format(parseISO(client.startDate), 'yyyy-MM-dd') : ''}
                            onChange={(e) => updateClient(client.id, { startDate: new Date(e.target.value).toISOString() })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>End Date (Expiry)</Label>
                          <Input 
                            type="date" 
                            defaultValue={client.membershipExpiry ? format(parseISO(client.membershipExpiry), 'yyyy-MM-dd') : ''}
                            onChange={(e) => updateClient(client.id, { membershipExpiry: new Date(e.target.value).toISOString() })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date of Birth</Label>
                          <Input 
                            type="date" 
                            defaultValue={client.dateOfBirth ? format(parseISO(client.dateOfBirth), 'yyyy-MM-dd') : ''}
                            onChange={(e) => updateClient(client.id, { dateOfBirth: new Date(e.target.value).toISOString() })}
                          />
                        </div>
                      </div>
                      
                      <div className="pt-6 border-t flex flex-col items-center space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <QrCode className="h-4 w-4" />
                          <span>Member QR Identity</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border">
                          <QRCodeSVG 
                            value={client.id} 
                            size={160} 
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                            #{client.memberId || client.id.substring(0, 8)}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            Scan this code at the reception for attendance
                          </p>
                        </div>
                      </div>
                    </div>
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
          <ImportData type="Active" />
          <ImportHistory />
          <Dialog open={isNewMemberOpen} onOpenChange={setIsNewMemberOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Member Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="+20 100..." value={newMemberPhone} onChange={(e) => setNewMemberPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newMemberBranch} 
                    onChange={(e) => setNewMemberBranch(e.target.value)}
                  >
                    <option value="" disabled>Select branch</option>
                    <option value="COMPLEX">COMPLEX</option>
                    <option value="MIVIDA">MIVIDA</option>
                    <option value="Strike IMPACT">Strike IMPACT</option>
                  </select>
                </div>
                <Button onClick={handleAddMember} className="w-full">Save Member</Button>
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
              <option value="COMPLEX">COMPLEX</option>
              <option value="MIVIDA">MIVIDA</option>
              <option value="Strike IMPACT">Strike IMPACT</option>
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
          </TabsList>
        </div>

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
      </Tabs>

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
