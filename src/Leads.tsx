import React, { useState, useDeferredValue } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { Client, LeadCategory, LeadInterest, LeadSource, LeadStage, Branch } from './types';
import { Phone, Calendar, MessageSquare, Plus, FileSpreadsheet, Download, UserCheck, ArrowRight } from 'lucide-react';
import ImportData from './ImportData';
import ImportHistory from './ImportHistory';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';

export default function Leads() {
  const { clients, addClient, updateClient, deleteMultipleClients, deleteClient, addComment, currentUser, users, canAssignLeads, canDeleteRecords } = useAppContext();
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Client | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<Branch | 'All'>('All');
  const [filterStage, setFilterStage] = useState<LeadStage | 'All'>('All');
  const [filterInterest, setFilterInterest] = useState<LeadInterest | 'All'>('All');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string | 'All'>('All');

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredFilterBranch = useDeferredValue(filterBranch);
  const deferredFilterStage = useDeferredValue(filterStage);
  const deferredFilterInterest = useDeferredValue(filterInterest);
  const deferredFilterAssignedTo = useDeferredValue(filterAssignedTo);
  const deferredActiveTab = useDeferredValue(activeTab);
  
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadSource, setNewLeadSource] = useState<LeadSource>('Instagram');
  const [newLeadBranch, setNewLeadBranch] = useState<Branch | ''>('');
  
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Client | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleteAllLeadsDialogOpen, setIsDeleteAllLeadsDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;


  const allLeads = clients.filter(c => c.status === 'Lead');
  
  const getFilteredLeads = () => {
    let filtered = allLeads;
    
    // Tab filtering
    switch (deferredActiveTab) {
      case 'unassigned': filtered = filtered.filter(l => !l.assignedTo); break;
      case 'instagram': filtered = filtered.filter(l => l.source === 'Instagram'); break;
      case 'whatsapp': filtered = filtered.filter(l => l.source === 'WhatsApp'); break;
      case 'walkin': filtered = filtered.filter(l => l.source === 'Walk-in'); break;
      case 'trials': filtered = filtered.filter(l => l.stage === 'Trial'); break;
      case 'followup': filtered = filtered.filter(l => l.stage === 'Follow Up'); break;
    }

    // Search filtering
    if (deferredSearchTerm) {
      const term = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(term) || 
        l.phone.includes(term)
      );
    }

    // Quick filters
    if (deferredFilterBranch !== 'All') {
      filtered = filtered.filter(l => l.branch === deferredFilterBranch);
    }
    if (deferredFilterStage !== 'All') {
      filtered = filtered.filter(l => l.stage === deferredFilterStage);
    }
    if (deferredFilterInterest !== 'All') {
      filtered = filtered.filter(l => l.interest === deferredFilterInterest);
    }
    if (deferredFilterAssignedTo !== 'All') {
      filtered = filtered.filter(l => deferredFilterAssignedTo === 'unassigned' ? !l.assignedTo : l.assignedTo === deferredFilterAssignedTo);
    }

    return filtered;
  };

  const leads = getFilteredLeads();
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const paginatedLeads = leads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(paginatedLeads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, id]);
    } else {
      setSelectedLeadIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkStageUpdate = async (stage: LeadStage) => {
    for (const id of selectedLeadIds) {
      await updateClient(id, { stage });
    }
    setSelectedLeadIds([]);
  };

  const handleBulkAssign = async (userId: string) => {
    for (const id of selectedLeadIds) {
      await updateClient(id, { assignedTo: userId === 'unassigned' ? '' : userId });
    }
    setSelectedLeadIds([]);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    await deleteMultipleClients(selectedLeadIds);
    setSelectedLeadIds([]);
  };

  const handleDeleteLead = async (id: string) => {
    setLeadToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteLead = async () => {
    if (leadToDelete) {
      await deleteClient(leadToDelete);
      setLeadToDelete(null);
    }
  };

  const handleDeleteAllLeads = async () => {
    setIsDeleteAllLeadsDialogOpen(true);
  };

  const confirmDeleteAllLeads = async () => {
    const allLeadIds = allLeads.map(l => l.id);
    if (allLeadIds.length > 0) {
      await deleteMultipleClients(allLeadIds);
      setSelectedLeadIds([]);
    }
  };

  // Reset page when tab changes
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedLeadIds([]);
  }, [activeTab]);

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Branch', 'Source', 'Stage', 'Interest', 'Category', 'Trial Date', 'Last Contact', 'Next Reminder', 'Assigned To'];
    const csvRows = [
      headers.join(','),
      ...leads.map(l => {
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
  
  const handleAddComment = () => {
    if (selectedLead && newComment && currentUser) {
      addComment(selectedLead.id, newComment, currentUser.name);
      setNewComment('');
    }
  };

  const handleAddLead = () => {
    if (newLeadName && newLeadPhone) {
      const newLead: Client = {
        id: Math.random().toString(36).substr(2, 9),
        name: newLeadName,
        phone: newLeadPhone,
        status: 'Lead',
        source: newLeadSource,
        branch: newLeadBranch || undefined,
        stage: 'New',
        comments: [],
        assignedTo: currentUser?.role === 'rep' ? currentUser.id : undefined,
        lastContactDate: new Date().toISOString().split('T')[0],
        nextReminderDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      };
      addClient(newLead);
      setIsNewLeadOpen(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadSource('Instagram');
      setNewLeadBranch('');
    }
  };

  const handleStageChange = (lead: Client, newStage: LeadStage) => {
    if (newStage === 'Converted') {
      setLeadToConvert(lead);
      setIsConvertDialogOpen(true);
    } else {
      updateClient(lead.id, { stage: newStage });
    }
  };

  const handleInterestChange = (lead: Client, newInterest: LeadInterest) => {
    if (newInterest === 'Not Interested') {
      updateClient(lead.id, { interest: newInterest, assignedTo: '' });
    } else {
      updateClient(lead.id, { interest: newInterest });
    }
  };

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

  const getInterestBadge = (interest?: LeadInterest) => {
    switch (interest) {
      case 'Interested': return <Badge className="bg-green-500">Interested</Badge>;
      case 'Not Interested': return <Badge variant="destructive">Not Interested</Badge>;
      case 'Pending': return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Check if reminder is due (overdue or due within the next 3 days)
  const isReminderDue = (lead: Client) => {
    if (!lead.nextReminderDate) return false;
    const nextReminder = parseISO(lead.nextReminderDate);
    const now = new Date();
    const threeDaysFromNow = addDays(now, 3);
    
    return isBefore(nextReminder, threeDaysFromNow);
  };

  const renderLeadsTable = (leadsData: Client[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox 
                checked={selectedLeadIds.length === leadsData.length && leadsData.length > 0}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="hidden md:table-cell">Branch</TableHead>
            <TableHead className="hidden md:table-cell">Source</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Paid Status</TableHead>
            <TableHead className="hidden lg:table-cell">Interest</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="hidden xl:table-cell">Trial/Visit Date</TableHead>
            <TableHead className="hidden md:table-cell">Last Contact</TableHead>
            <TableHead>Next Reminder</TableHead>
            {canAssignLeads && <TableHead className="hidden lg:table-cell">Assigned To</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leadsData.map(lead => (
            <TableRow key={lead.id} className={isReminderDue(lead) ? (isBefore(parseISO(lead.nextReminderDate!), new Date()) ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-amber-50/50 dark:bg-amber-900/10') : ''}>
              <TableCell>
                <Checkbox 
                  checked={selectedLeadIds.includes(lead.id)}
                  onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                />
              </TableCell>
              <TableCell className="font-medium">
                {lead.name}
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                  {currentUser?.role === 'rep' && lead.assignedTo !== currentUser.id ? '**********' : lead.phone}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary">{lead.branch || 'Unassigned'}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline">{lead.source || 'Unknown'}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{lead.stage || 'New'}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={lead.paid || false} 
                    onCheckedChange={(checked) => updateClient(lead.id, { paid: !!checked })}
                  />
                  <span className="text-xs">{lead.paid ? 'Paid' : 'Not Paid'}</span>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell">{getInterestBadge(lead.interest)}</TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="outline">{lead.category || 'None'}</Badge>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {lead.trialDate || lead.expectedVisitDate ? (
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-2 text-blue-500" />
                    {format(parseISO((lead.trialDate || lead.expectedVisitDate)!), 'MMM d, yyyy')}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not set</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {lead.lastContactDate ? format(parseISO(lead.lastContactDate), 'MMM d') : 'Never'}
              </TableCell>
               <TableCell>
                {lead.nextReminderDate ? (
                  <div className="flex flex-col space-y-1">
                    <span className="text-sm">
                      {format(parseISO(lead.nextReminderDate), 'MMM d, yyyy')}
                    </span>
                    {isBefore(parseISO(lead.nextReminderDate), new Date()) ? (
                      <Badge variant="destructive" className="w-fit text-[10px] h-4 px-1">OVERDUE</Badge>
                    ) : isBefore(parseISO(lead.nextReminderDate), addDays(new Date(), 3)) ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 w-fit text-[10px] h-4 px-1">DUE SOON</Badge>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not set</span>
                )}
              </TableCell>
              {canAssignLeads && (
                <TableCell className="hidden lg:table-cell">
                  <Select 
                    defaultValue={lead.assignedTo || 'unassigned'}
                    onValueChange={(v) => updateClient(lead.id, { assignedTo: v === 'unassigned' ? '' : v })}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Assign rep">
                        {lead.assignedTo && lead.assignedTo !== 'unassigned'
                          ? users.find(u => u.id === lead.assignedTo)?.name || 'Unknown User'
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.filter(u => u.role === 'rep').map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>{rep.name || rep.email || 'Unknown User'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
              <TableCell>
                <Dialog>
                  <DialogTrigger render={<Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)} />}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Log Activity</span>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Lead Details: {lead.name}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
                      <div className="md:col-span-7 space-y-6">
                        <h3 className="font-semibold text-base border-b pb-2">Update Status</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</Label>
                            <Select 
                              defaultValue={lead.source} 
                              onValueChange={(v) => updateClient(lead.id, { source: v as LeadSource })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Instagram">Instagram</SelectItem>
                                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                <SelectItem value="Walk-in">Walk-in</SelectItem>
                                <SelectItem value="TikTok">TikTok</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branch</Label>
                            <Select 
                              defaultValue={lead.branch || ''} 
                              onValueChange={(v) => updateClient(lead.id, { branch: v as Branch })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select branch" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="COMPLEX">COMPLEX</SelectItem>
                                <SelectItem value="MIVIDA">MIVIDA</SelectItem>
                                <SelectItem value="Strike IMPACT">Strike IMPACT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stage</Label>
                            <Select 
                              defaultValue={lead.stage} 
                              onValueChange={(v) => handleStageChange(lead, v as LeadStage)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Trial">Int. & Trial</SelectItem>
                                <SelectItem value="Follow Up">Follow Up</SelectItem>
                                <SelectItem value="Converted">Converted</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interest Level</Label>
                            <Select 
                              defaultValue={lead.interest} 
                              onValueChange={(v) => handleInterestChange(lead, v as LeadInterest)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select interest" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Interested">Interested</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Not Interested">Not Interested</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category / Reason</Label>
                            <Select 
                              defaultValue={lead.category}
                              onValueChange={(v) => updateClient(lead.id, { category: v as LeadCategory })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Out of area zone">Out of area zone</SelectItem>
                                <SelectItem value="Social class">Social class</SelectItem>
                                <SelectItem value="Price">Price</SelectItem>
                                <SelectItem value="No answer">No answer</SelectItem>
                                <SelectItem value="Ladies only">Ladies only</SelectItem>
                                <SelectItem value="Morning session">Morning session</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                                <SelectItem value="None">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trial / Expected Visit Date</Label>
                            <Input 
                              type="date" 
                              className="w-full"
                              defaultValue={lead.trialDate || lead.expectedVisitDate ? format(parseISO((lead.trialDate || lead.expectedVisitDate)!), 'yyyy-MM-dd') : ''}
                              onChange={(e) => updateClient(lead.id, { trialDate: new Date(e.target.value).toISOString(), expectedVisitDate: new Date(e.target.value).toISOString() })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Next Reminder Date</Label>
                            <Input 
                              type="date" 
                              className="w-full"
                              defaultValue={lead.nextReminderDate ? format(parseISO(lead.nextReminderDate), 'yyyy-MM-dd') : ''}
                              onChange={(e) => updateClient(lead.id, { nextReminderDate: new Date(e.target.value).toISOString() })}
                            />
                          </div>

                          <div className="flex items-center space-x-2 pt-4">
                            <Checkbox 
                              id={`paid-detail-${lead.id}`}
                              checked={lead.paid || false} 
                              onCheckedChange={(checked) => updateClient(lead.id, { paid: !!checked })}
                            />
                            <Label htmlFor={`paid-detail-${lead.id}`} className="text-sm font-medium">Payment Received (Paid)</Label>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-5 space-y-6 md:border-l md:pl-6">
                        <h3 className="font-semibold text-base border-b pb-2">Audit Log & Comments</h3>
                        <div className="h-[300px] overflow-y-auto space-y-3 pr-2">
                          {lead.comments.length > 0 ? (
                            lead.comments.map(comment => (
                              <div key={comment.id} className="bg-muted/50 p-3 rounded-lg text-sm border border-border/50">
                                <p className="leading-relaxed">{comment.text}</p>
                                <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                  <span>{comment.author}</span>
                                  <span>{format(parseISO(comment.date), 'MMM d, h:mm a')}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                              No comments yet.
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3 pt-2">
                          <Textarea 
                            placeholder="Add a comment..." 
                            className="min-h-[100px] resize-none"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                          />
                          <Button className="w-full shadow-sm" onClick={handleAddComment}>Add Comment</Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                {canDeleteRecords && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteLead(lead.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Leads Follow-up</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <ImportData type="Lead" />
          <ImportHistory />
          {canDeleteRecords && (
            <Button variant="destructive" size="sm" onClick={handleDeleteAllLeads}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Leads
            </Button>
          )}
          <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input id="name" placeholder="Client Name" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input id="phone" placeholder="+20 100..." value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={newLeadSource} onValueChange={(v) => setNewLeadSource(v as LeadSource)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={newLeadBranch} onValueChange={(v) => setNewLeadBranch(v as Branch)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLEX">COMPLEX</SelectItem>
                      <SelectItem value="MIVIDA">MIVIDA</SelectItem>
                      <SelectItem value="Strike IMPACT">Strike IMPACT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleAddLead}>Save Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Search Name/Phone</Label>
            <Input 
              placeholder="Search..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Branch</Label>
            <Select value={filterBranch} onValueChange={(v) => setFilterBranch(v as Branch | 'All')}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                <SelectItem value="COMPLEX">COMPLEX</SelectItem>
                <SelectItem value="MIVIDA">MIVIDA</SelectItem>
                <SelectItem value="Strike IMPACT">Strike IMPACT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Stage</Label>
            <Select value={filterStage} onValueChange={(v) => setFilterStage(v as LeadStage | 'All')}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Stages</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Follow Up">Follow Up</SelectItem>
                <SelectItem value="Trial">Trial</SelectItem>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Not Interested">Not Interested</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Interest</Label>
            <Select value={filterInterest} onValueChange={(v) => setFilterInterest(v as LeadInterest | 'All')}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Interests" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Interests</SelectItem>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Not Interested">Not Interested</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Assigned To</Label>
            <Select value={filterAssignedTo} onValueChange={setFilterAssignedTo}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Reps">
                  {filterAssignedTo === 'All' || !filterAssignedTo
                    ? undefined
                    : filterAssignedTo === 'unassigned'
                      ? 'Unassigned'
                      : users.find(u => u.id === filterAssignedTo)?.name || 'Unknown User'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Reps</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.filter(u => u.role === 'rep').map(rep => (
                  <SelectItem key={rep.id} value={rep.id}>{rep.name || rep.email || 'Unknown User'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {selectedLeadIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-3 rounded-lg shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary-foreground text-primary">
              {selectedLeadIds.length} selected
            </Badge>
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setSelectedLeadIds([])}>
              Cancel
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-primary-foreground/10 p-1 rounded-md">
              <ArrowRight className="h-4 w-4" />
              <Select onValueChange={(v) => handleBulkStageUpdate(v as LeadStage)}>
                <SelectTrigger className="h-8 w-[140px] bg-transparent border-none text-primary-foreground">
                  <SelectValue placeholder="Update Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Trial">Int. & Trial</SelectItem>
                  <SelectItem value="Follow Up">Follow Up</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canAssignLeads ? (
              <div className="flex items-center gap-2 bg-primary-foreground/10 p-1 rounded-md">
                <UserCheck className="h-4 w-4" />
                <Select onValueChange={handleBulkAssign}>
                  <SelectTrigger className="h-8 w-[140px] bg-transparent border-none text-primary-foreground">
                    <SelectValue placeholder="Assign To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.filter(u => u.role === 'rep').map(rep => (
                      <SelectItem key={rep.id} value={rep.id}>{rep.name || rep.email || 'Unknown User'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {canDeleteRecords && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        onConfirm={confirmDeleteLead}
        variant="destructive"
        confirmText="Delete"
      />

      <ConfirmDialog 
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        title="Delete Multiple Leads"
        description={`Are you sure you want to delete ${selectedLeadIds.length} leads? This action cannot be undone.`}
        onConfirm={confirmBulkDelete}
        variant="destructive"
        confirmText="Delete All Selected"
      />

      <ConfirmDialog 
        isOpen={isDeleteAllLeadsDialogOpen}
        onOpenChange={setIsDeleteAllLeadsDialogOpen}
        title="CRITICAL: Delete All Leads"
        description="Are you sure you want to delete ALL leads in the system? This action is permanent and cannot be undone."
        onConfirm={confirmDeleteAllLeads}
        variant="destructive"
        confirmText="Yes, Delete Everything"
      />

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabsList className="flex w-max sm:w-full bg-muted/50 rounded-lg p-1 justify-start sm:justify-center mb-4">
            <TabsTrigger value="all" className="px-4 text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="unassigned" className="px-4 text-xs sm:text-sm text-amber-600 font-bold dark:text-amber-500">Unassigned</TabsTrigger>
            <TabsTrigger value="instagram" className="px-4 text-xs sm:text-sm">Instagram</TabsTrigger>
            <TabsTrigger value="whatsapp" className="px-4 text-xs sm:text-sm">WhatsApp</TabsTrigger>
            <TabsTrigger value="walkin" className="px-4 text-xs sm:text-sm">Walk-in</TabsTrigger>
            <TabsTrigger value="trials" className="px-4 text-xs sm:text-sm">Trials</TabsTrigger>
            <TabsTrigger value="followup" className="px-4 text-xs sm:text-sm">Follow up</TabsTrigger>
          </TabsList>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {renderLeadsTable(paginatedLeads)}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, leads.length)} of {leads.length} entries
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

      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Client?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Would you like to convert <strong>{leadToConvert?.name}</strong> into an active client record? 
              This will move them from Leads to Members.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmConversion}>Confirm Conversion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

