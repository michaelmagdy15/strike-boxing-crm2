import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useAuditLogs } from './hooks/useAuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { AuditLog, Branch } from './types';
import { MapPin, Search, Filter, ShieldAlert, History } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AuditLogs() {
  const { currentUser, users } = useAuth();
  const { auditLogs } = useAuditLogs(currentUser);
  const canAccessSettings = currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin' || !!currentUser?.can_access_settings_and_history;
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState<Branch | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    const matchesEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
    const matchesBranch = branchFilter === 'ALL' || log.branch === branchFilter;
    const matchesSearch = searchTerm === '' || log.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEntity && matchesBranch && matchesSearch;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE': return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">Create</Badge>;
      case 'UPDATE': return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-none">Update</Badge>;
      case 'DELETE': return <Badge variant="destructive">Delete</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityBadge = (entity: AuditLog['entityType']) => {
    switch (entity) {
      case 'CLIENT': return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Client</Badge>;
      case 'LEAD': return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Lead</Badge>;
      case 'PAYMENT': return <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Payment</Badge>;
      case 'PACKAGE_RECORD': return <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">Package</Badge>;
      case 'TARGET': return <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50">Target</Badge>;
      case 'ATTENDANCE': return <Badge variant="outline" className="border-pink-200 text-pink-700 bg-pink-50">Attendance</Badge>;
      default: return <Badge variant="outline">{entity}</Badge>;
    }
  };

  if (!canAccessSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive opacity-20" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          System history is exclusively visible to Atef (Sales Manager).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">System History</h2>
          <p className="text-muted-foreground">Track all activities, changes, and attendance across branches.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search Activity</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search details..." 
              className="pl-9 h-11 bg-background border-muted"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 text-nowrap">Entity Type</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select 
              className="flex h-11 w-full items-center justify-between rounded-md border border-muted bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="ALL">All Activity</option>
              <option value="CLIENT">Clients</option>
              <option value="LEAD">Leads</option>
              <option value="PAYMENT">Payments</option>
              <option value="PACKAGE_RECORD">Packages</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="TARGET">Sales Targets</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Branch</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select 
              className="flex h-11 w-full items-center justify-between rounded-md border border-muted bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value as any)}
            >
              <option value="ALL">All Branches</option>
              <option value="COMPLEX">COMPLEX</option>
              <option value="MIVIDA">MIVIDA</option>
              <option value="Strike IMPACT">Strike IMPACT</option>
            </select>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-lg shadow-primary/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[150px]">Team Member</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead>Activity Details</TableHead>
                  <TableHead className="w-[120px]">Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => {
                    const user = users.find(u => u.id === log.userId);
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="whitespace-nowrap text-[12px] font-medium text-muted-foreground">
                          {format(parseISO(log.timestamp), 'MMM d, h:mm:ss a')}
                        </TableCell>
                        <TableCell className="font-bold text-sm">
                          {user?.name || 'Unknown User'}
                        </TableCell>
                        <TableCell>
                          {getActionBadge(log.action)}
                        </TableCell>
                        <TableCell>
                          {getEntityBadge(log.entityType)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {log.details}
                        </TableCell>
                        <TableCell>
                          {log.branch ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit text-[10px] font-bold">
                              <MapPin className="h-2 w-2" /> {log.branch}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px] italic">Global</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <History className="h-10 w-10 mb-4 opacity-20" />
                        <p className="font-medium text-lg">No history records found</p>
                        <p className="text-sm">Try adjusting your filters or search term.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

