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
import { Trash2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Gift, Phone, Calendar, Download } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import ImportData from './ImportData';
import ImportHistory from './ImportHistory';

export default function Clients() {
  const { clients, updateClient, deleteMultipleClients, deleteClient, currentUser, users, payments } = useAppContext();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const now = new Date();

  // Filter clients
  const members = clients.filter(c => c.status !== 'Lead');
  
  const activeMembers = members.filter(c => c.status === 'Active');
  
  const nearlyExpired = members.filter(c => c.status === 'Nearly Expired');
  
  const expired = members.filter(c => c.status === 'Expired');
  
  const upcomingBirthdays = members.filter(c => {
    if (!c.dateOfBirth) return false;
    const dob = parseISO(c.dateOfBirth);
    const dobThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    return isAfter(dobThisYear, subDays(now, 1)) && isBefore(dobThisYear, addDays(now, 7));
  });

  const getFilteredMembers = () => {
    switch (activeTab) {
      case 'active': return activeMembers;
      case 'expiring': return nearlyExpired;
      case 'expired': return expired;
      default: return members;
    }
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

  // Reset page when tab changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedClientIds([]);
  }, [activeTab]);

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
      case 'Active': return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'Nearly Expired': return <Badge className="bg-amber-500"><AlertTriangle className="w-3 h-3 mr-1" /> Expiring Soon</Badge>;
      case 'Expired': return <Badge variant="destructive">Expired</Badge>;
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
            {(currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && <TableHead className="hidden lg:table-cell">Total Paid</TableHead>}
            {(currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && <TableHead className="hidden xl:table-cell">Assigned To</TableHead>}
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
                  {client.phone}
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
              {(currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && (
                <TableCell className="font-medium text-green-600 hidden lg:table-cell">
                  {totalPaid.toLocaleString()} LE
                </TableCell>
              )}
              {(currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && (
                <TableCell className="hidden xl:table-cell">
                  <select 
                    className="flex h-8 w-[130px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue={client.assignedTo || 'unassigned'}
                    onChange={(e) => updateClient(client.id, { assignedTo: e.target.value === 'unassigned' ? undefined : e.target.value })}
                  >
                    <option value="unassigned">Unassigned</option>
                    {users.filter(u => u.role === 'rep').map(rep => (
                      <option key={rep.id} value={rep.id}>{rep.name}</option>
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
                    </div>
                  </DialogContent>
                </Dialog>
                {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && (
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
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="flex w-max sm:w-full bg-muted/50 rounded-lg p-1 justify-start sm:justify-center">
            <TabsTrigger value="all" className="px-4 text-xs sm:text-sm">All ({members.length})</TabsTrigger>
            <TabsTrigger value="active" className="px-4 text-xs sm:text-sm">Active ({activeMembers.length})</TabsTrigger>
            <TabsTrigger value="expiring" className="px-4 text-xs sm:text-sm">Expiring ({nearlyExpired.length})</TabsTrigger>
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
              {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && (
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
