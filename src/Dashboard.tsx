import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from './context';
import { differenceInDays, isSameDay, parseISO, isAfter, isBefore, addDays, subDays } from 'date-fns';
import { Target, Users, CalendarDays, AlertTriangle, Gift, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

function PaginatedList({ items, renderItem, itemsPerPage = 5 }: { items: any[], renderItem: (item: any) => React.ReactNode, itemsPerPage?: number }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
  const { clients, salesTarget, updateSalesTarget, currentUser } = useAppContext();
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [newTarget, setNewTarget] = useState(salesTarget.targetAmount.toString());
  
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

  const targetPercentage = Math.round((salesTarget.currentAmount / salesTarget.targetAmount) * 100);

  const handleUpdateTarget = () => {
    const target = parseFloat(newTarget);
    if (!isNaN(target) && target > 0) {
      updateSalesTarget(target);
      setIsTargetDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Target</CardTitle>
            {currentUser?.role === 'manager' && (
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
            <div className="text-2xl font-bold">{salesTarget.currentAmount.toLocaleString()} LE</div>
            <p className="text-xs text-muted-foreground">
              {targetPercentage}% of {salesTarget.targetAmount.toLocaleString()} LE target
            </p>
            <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${Math.min(targetPercentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
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
              Memberships ending in &lt; 30 days
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Session Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Private Sessions</span>
                <span className="text-sm font-bold">{salesTarget.privateSessionsSold}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Group Sessions</span>
                <span className="text-sm font-bold">{salesTarget.groupSessionsSold}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Required: Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {negativeSessions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Negative Sessions (Needs Renewal)
                  </h4>
                  <PaginatedList 
                    items={negativeSessions} 
                    renderItem={(client) => (
                      <div key={client.id} className="flex items-center justify-between p-2 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-md">
                        <div>
                          <p className="font-medium text-sm">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.packageType}</p>
                        </div>
                        <Badge variant="destructive">{client.sessionsRemaining} sessions</Badge>
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
                    <AlertTriangle className="h-4 w-4 mr-1" /> Expired Memberships
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
                <p className="text-sm text-muted-foreground">All session tracking is up to date.</p>
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

              {upcomingVisits.length === 0 && nearlyExpiredList.length === 0 && (
                <p className="text-sm text-muted-foreground">No urgent reminders at this time.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


