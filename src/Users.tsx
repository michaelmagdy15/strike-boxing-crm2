import React, { useState } from 'react';
import { useCRMData, useAuth } from './context';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserRole, isAdmin, isSuperAdmin } from './types';
import { Shield, User as UserIcon, Plus, Trash2, Mail, Users as UsersIcon, Lock, Fingerprint, Activity, ShieldCheck, Key } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';

export default function Users() {
  const { users, updateUser, inviteUser, deleteUser, isSuperUser, currentUser } = useAuth();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('rep');
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  if (!isAdmin(currentUser?.role)) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative">
              <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
              <div className="relative bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-rose-500/20">
                  <Fingerprint className="h-16 w-16 text-rose-500 animate-pulse" />
              </div>
          </div>
          <div className="space-y-2">
              <h3 className="text-4xl font-black tracking-tighter uppercase italic text-rose-500">Access Denied</h3>
              <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[4px] max-w-sm">Administrative clearance required for personnel management</p>
          </div>
        </div>
      );
  }

  const canChangeRoles = isSuperAdmin(currentUser?.role);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    updateUser(userId, { role: newRole });
  };

  const getRoleBadge = (role: UserRole) => {
    const baseClass = "h-7 border-none font-black text-[10px] uppercase tracking-widest px-3 shadow-lg";
    switch (role) {
      case 'manager': return <Badge className={`${baseClass} bg-indigo-500 text-white`}><Shield className="w-3 h-3 mr-1.5" /> COMMAND</Badge>;
      case 'admin': return <Badge className={`${baseClass} bg-blue-500 text-white`}>SYS_ADMIN</Badge>;
      case 'super_admin': return <Badge className={`${baseClass} bg-rose-600 text-white`}><ShieldCheck className="w-3 h-3 mr-1.5" /> MASTER_OPERATOR</Badge>;
      case 'crm_admin': return <Badge className={`${baseClass} bg-emerald-600 text-white`}><Key className="w-3 h-3 mr-1.5" /> GOVERNANCE</Badge>;
      case 'rep': return <Badge className={`${baseClass} bg-zinc-100 dark:bg-zinc-800 text-zinc-500`}>FIELD_REP</Badge>;
      default: return <Badge variant="outline" className={baseClass}>{role}</Badge>;
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
            <h2 className="text-5xl font-black tracking-tighter uppercase mb-2 italic">Access Control</h2>
            <div className="flex items-center gap-4">
                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-3 py-1">PERSONNEL FLEET</Badge>
                <div className="flex items-center gap-1.5 opacity-40">
                    <Activity className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Global Authentication Secured</span>
                </div>
            </div>
        </div>
        
        {canChangeRoles && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
                <Button className="h-16 px-10 rounded-[20px] font-black text-[10px] uppercase tracking-[4px] shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
                  <Plus className="mr-3 h-5 w-5" /> Recruit Personnel
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-950">
              <div className="p-10 space-y-8">
                 <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-8">
                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <UsersIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-3xl font-black tracking-tighter uppercase">Clearance Dispatch</DialogTitle>
                        <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Authorizing new team identity</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Personnel Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                            <Input 
                                type="email" 
                                placeholder="operator@strikeboxing.com" 
                                value={inviteEmail} 
                                className="h-16 pl-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-lg tracking-tight px-6 placeholder:opacity-20"
                                onChange={(e) => setInviteEmail(e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Clearance Level</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                          <SelectTrigger className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 italic">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="rep" className="font-black text-[10px] uppercase p-4 italic">Field Representative</SelectItem>
                                <SelectItem value="manager" className="font-black text-[10px] uppercase p-4 italic">Dept. Command</SelectItem>
                                <SelectItem value="admin" className="font-black text-[10px] uppercase p-4 italic">System Administrator</SelectItem>
                                <SelectItem value="crm_admin" className="font-black text-[10px] uppercase p-4 italic">CRM Governance</SelectItem>
                                <SelectItem value="super_admin" className="font-black text-[10px] uppercase p-4 italic text-rose-500">Master Operator</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                 </div>

                 <Button className="w-full h-20 rounded-2xl font-black text-xs uppercase tracking-[6px] shadow-2xl shadow-primary/30 active:scale-95 transition-all" onClick={handleInvite} disabled={!inviteEmail}>
                    Dispatch Authentication Link
                 </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="rounded-[40px] border-none bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-800/30">
            <TableRow className="border-zinc-100 dark:border-zinc-800 h-20">
              <TableHead className="pl-10 font-black uppercase text-[10px] tracking-[4px]">Identity Archive</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-[4px]">Clearance Status</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-[4px]">Permission Override</TableHead>
              {isSuperUser && <TableHead className="text-right pr-10 font-black uppercase text-[10px] tracking-[4px]">Kill-Switch</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {users.map((user, idx) => (
                  <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all h-24"
                  >
                      <TableCell className="pl-10">
                          <div className="flex items-center gap-6">
                              <div className="relative group/avatar">
                                  <div className="absolute inset-0 bg-primary/20 blur-lg rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                                  <div className="relative h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-black text-2xl shadow-inner border border-zinc-200 dark:border-zinc-700 overflow-hidden transform group-hover/avatar:scale-105 transition-transform duration-500">
                                      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                                      {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <div className="flex items-center gap-3">
                                      <span className="font-black text-xl tracking-tighter uppercase italic">{user.name || 'Incognito Personnel'}</span>
                                      {user.id === currentUser?.id && <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">TARGET_YOU</Badge>}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-black flex items-center gap-2 uppercase tracking-widest opacity-40">
                                      <Mail className="h-2.5 w-2.5" />
                                      {user.email}
                                  </div>
                              </div>
                          </div>
                      </TableCell>
                      <TableCell>
                          {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                          {canChangeRoles ? (
                          <Select 
                              defaultValue={user.role} 
                              onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                              disabled={user.id === currentUser?.id}
                          >
                              <SelectTrigger className="w-[200px] h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-black text-[10px] uppercase tracking-[2px] shadow-sm hover:ring-2 hover:ring-primary/20 transition-all px-4 italic">
                                <SelectValue placeholder="Override..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl">
                                  <SelectItem value="rep" className="font-black text-[10px] uppercase p-4 italic">Field Rep</SelectItem>
                                  <SelectItem value="manager" className="font-black text-[10px] uppercase p-4 italic">Dept. Command</SelectItem>
                                  <SelectItem value="admin" className="font-black text-[10px] uppercase p-4 italic">Sys Admin</SelectItem>
                                  <SelectItem value="crm_admin" className="font-black text-[10px] uppercase p-4 italic">CRM Governance</SelectItem>
                                  <SelectItem value="super_admin" className="font-black text-[10px] uppercase p-4 italic text-rose-500">Master Op</SelectItem>
                              </SelectContent>
                          </Select>
                          ) : (
                          <div className="flex items-center gap-2 text-zinc-400 font-black text-[10px] uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/20 w-fit px-4 py-2 rounded-full border border-zinc-100 dark:border-zinc-800">
                              <Lock className="h-3 w-3" />
                              UNAUTHORIZED_ACCESS
                          </div>
                          )}
                      </TableCell>
                      {isSuperUser && (
                          <TableCell className="text-right pr-10">
                          {!isSuperAdmin(user.role) && user.id !== currentUser?.id && (
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-12 w-12 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-90"
                                  onClick={() => {
                                      setUserToDelete(user.id);
                                      setIsDeleteConfirmOpen(true);
                                  }}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                          )}
                          </TableCell>
                      )}
                  </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Liquidate Identity"
        description="Terminating this access profile will permanently purge all associated credentials and historical footprints from the primary grid. This operation is IRREVERSIBLE."
        confirmText="Confirm Liquidation"
        variant="destructive"
        onConfirm={() => {
          if (userToDelete) {
            deleteUser(userToDelete);
            setUserToDelete(null);
          }
        }}
      />
    </div>
  );
}
