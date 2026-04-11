import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserRole } from './types';
import { Shield, User as UserIcon, Plus, Trash2 } from 'lucide-react';

export default function Users() {
  const { users, currentUser, updateUser, inviteUser, deleteUser } = useAppContext();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('rep');

  if (currentUser?.role !== 'manager' && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin' && currentUser?.role !== 'crm_admin') {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  const canChangeRoles = currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin';

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateUser(userId, { role: newRole });
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
      case 'rep': return <Badge variant="secondary">Sales Rep</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleInvite = async () => {
    if (inviteEmail) {
      await inviteUser(inviteEmail, inviteRole);
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('rep');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        {canChangeRoles && (
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
                      <SelectItem value="rep">Sales Rep</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="crm_admin">CRM Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
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
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                      {user.name}
                      {user.id === currentUser.id && <Badge variant="outline" className="ml-2">You</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
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
                          <SelectItem value="crm_admin">CRM Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="rep">Sales Rep</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">Restricted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canChangeRoles && user.id !== currentUser.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.role === 'super_admin'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
