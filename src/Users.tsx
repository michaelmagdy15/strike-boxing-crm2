import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserRole, User } from './types';
import { Shield, User as UserIcon, Plus, Trash2, Edit, BarChart, Clock } from 'lucide-react';
import { UserPerformanceDialog } from './components/UserPerformanceDialog';

export default function Users() {
  const { users, currentUser, updateUser, inviteUser, deleteUser } = useAuth();
  const { branches } = useSettings();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('rep');
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editCanDeletePayments, setEditCanDeletePayments] = useState(false);
  const [editCanViewGlobalDashboard, setEditCanViewGlobalDashboard] = useState(false);
  const [editCanAccessSettings, setEditCanAccessSettings] = useState(false);

  const [performanceUser, setPerformanceUser] = useState<User | null>(null);

  if (currentUser?.role !== 'manager' && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && currentUser?.role !== 'crm_admin') {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  const canChangeRoles = currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin' || currentUser?.role === 'admin';
  const canInviteUsers = canChangeRoles || currentUser?.role === 'manager';

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateUser(userId, { role: newRole });
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditBranch(user.branch || '');
    setEditTarget(user.salesTarget?.toString() || '');
    setEditCanDeletePayments(user.can_delete_payments || false);
    setEditCanViewGlobalDashboard(user.can_view_global_dashboard || false);
    setEditCanAccessSettings(user.can_access_settings_and_history || false);
  };

  const handleUpdateUserDetails = () => {
    if (editingUser) {
      updateUser(editingUser.id, { 
        name: editName, 
        email: editEmail,
        branch: editBranch || undefined,
        salesTarget: editTarget ? parseFloat(editTarget) : undefined,
        can_delete_payments: editCanDeletePayments,
        can_view_global_dashboard: editCanViewGlobalDashboard,
        can_access_settings_and_history: editCanAccessSettings
      });
      setEditingUser(null);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user? This revokes their access.")) {
      deleteUser(userId);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'manager': return <Badge className="bg-purple-500"><Shield className="w-3 h-3 mr-1" /> Manager</Badge>;
      case 'admin': return <Badge className="bg-blue-500">Admin</Badge>;
      case 'super_admin': return <Badge className="bg-red-500"><Shield className="w-3 h-3 mr-1" /> Super Admin</Badge>;
      case 'crm_admin': return <Badge className="bg-emerald-500"><Shield className="w-3 h-3 mr-1" /> CRM Admin</Badge>;
      case 'rep': return <Badge variant="secondary">Rep</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleInvite = async () => {
    if (inviteEmail) {
      await inviteUser(inviteEmail, inviteRole, inviteName || undefined);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('rep');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        {canInviteUsers && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> Invite User
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    placeholder="e.g. Maison Mohamed" 
                    value={inviteName} 
                    onChange={(e) => setInviteName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="user@example.com" 
                    value={inviteEmail} 
                    onChange={(e) => setInviteEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rep">Rep</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      {canInviteUsers && (
                        <SelectItem value="admin">Admin</SelectItem>
                      )}
                      {canChangeRoles && (
                        <>
                          <SelectItem value="crm_admin">CRM Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite}>Send Invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{user.name}</span>
                      {user.id === currentUser.id && <Badge variant="outline" className="ml-1">You</Badge>}
                      {user.isPending && (
                        <Badge variant="outline" className="ml-1 text-amber-600 border-amber-400 bg-amber-50 gap-1">
                          <Clock className="h-3 w-3" /> Pending Invite
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.branch ? (
                      <Badge variant="outline" className="font-normal">{user.branch}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">All</span>
                    )}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {canChangeRoles ? (
                      <Select 
                        defaultValue={user.role} 
                        onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                        disabled={user.id === currentUser.id} // Prevent self-demotion
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rep">Rep</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="crm_admin">CRM Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">Restricted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {user.role === 'rep' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPerformanceUser(user)}
                          title="View Performance & Save Targets"
                        >
                          <BarChart className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      {canChangeRoles && user.id !== currentUser.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.role === 'super_admin'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
             ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="User's full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={editEmail} 
                onChange={(e) => setEditEmail(e.target.value)} 
                placeholder="User's email"
              />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={editBranch} onValueChange={(v) => setEditBranch(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Personal Sales Target (Optional)</Label>
              <Input 
                type="number"
                value={editTarget} 
                onChange={(e) => setEditTarget(e.target.value)} 
                placeholder="Leave blank to use global target"
              />
            </div>
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base">Granular Permissions</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="can_delete" 
                  checked={editCanDeletePayments} 
                  onCheckedChange={(checked) => setEditCanDeletePayments(!!checked)} 
                />
                <Label htmlFor="can_delete" className="font-normal cursor-pointer">Can delete payments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="can_global" 
                  checked={editCanViewGlobalDashboard} 
                  onCheckedChange={(checked) => setEditCanViewGlobalDashboard(!!checked)} 
                />
                <Label htmlFor="can_global" className="font-normal cursor-pointer">Can view global dashboard</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="can_settings" 
                  checked={editCanAccessSettings} 
                  onCheckedChange={(checked) => setEditCanAccessSettings(!!checked)} 
                />
                <Label htmlFor="can_settings" className="font-normal cursor-pointer">Can access settings & history logs</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Note: Updating their email here allows them to login with the new email address if they haven't registered yet. If they already login via Google, it just updates their display email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUserDetails}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {performanceUser && (
        <UserPerformanceDialog
          user={performanceUser}
          isOpen={!!performanceUser}
          onClose={() => setPerformanceUser(null)}
        />
      )}
    </div>
  );
}
