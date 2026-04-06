import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { AuditLog } from './types';

export default function AuditLogs() {
  const { auditLogs, users } = useAppContext();
  const [filter, setFilter] = useState('ALL');

  const filteredLogs = filter === 'ALL' 
    ? auditLogs 
    : auditLogs.filter(log => log.entityType === filter);

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE': return <Badge className="bg-green-500">Create</Badge>;
      case 'UPDATE': return <Badge className="bg-blue-500">Update</Badge>;
      case 'DELETE': return <Badge variant="destructive">Delete</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityBadge = (entity: AuditLog['entityType']) => {
    switch (entity) {
      case 'CLIENT': return <Badge variant="outline" className="border-blue-200 text-blue-700">Client</Badge>;
      case 'LEAD': return <Badge variant="outline" className="border-amber-200 text-amber-700">Lead</Badge>;
      case 'PAYMENT': return <Badge variant="outline" className="border-green-200 text-green-700">Payment</Badge>;
      case 'SESSION': return <Badge variant="outline" className="border-purple-200 text-purple-700">Session</Badge>;
      case 'TARGET': return <Badge variant="outline" className="border-indigo-200 text-indigo-700">Target</Badge>;
      default: return <Badge variant="outline">{entity}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">System Audit Logs</h2>
        <div className="flex space-x-2">
          <select 
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All Entities</option>
            <option value="CLIENT">Clients</option>
            <option value="LEAD">Leads</option>
            <option value="PAYMENT">Payments</option>
            <option value="SESSION">Sessions</option>
            <option value="TARGET">Sales Targets</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => {
                  const user = users.find(u => u.id === log.userId);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(parseISO(log.timestamp), 'MMM d, yyyy h:mm:ss a')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user?.name || 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell>
                        {getEntityBadge(log.entityType)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
