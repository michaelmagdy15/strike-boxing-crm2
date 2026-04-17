import React, { useState } from 'react';
import { useCRMData, useAuth } from './context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, isAdmin } from './types';
import { Plus, Edit, Trash2, Box, Zap, MapPin, Calendar, DollarSign, Lock, ShieldCheck, TrendingUp, Layers, Fingerprint } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';

const getPackageIcon = (sessions: number) => {
    if (sessions >= 20) return <Layers className="h-6 w-6" />;
    if (sessions >= 10) return <Zap className="h-6 w-6" />;
    return <Fingerprint className="h-6 w-6" />;
};

export default function Packages() {
  const { packages, addPackage, updatePackage, deletePackage } = useCRMData();
  const { currentUser } = useAuth();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const [name, setName] = useState('');
  const [sessions, setSessions] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [expiryDays, setExpiryDays] = useState<number | ''>('');
  const [branch, setBranch] = useState<'COMPLEX' | 'MIVIDA' | 'ALL'>('ALL');

  if (!isAdmin(currentUser?.role)) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative">
              <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
              <div className="relative bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-rose-500/20">
                  <Lock className="h-16 w-16 text-rose-500 animate-pulse" />
              </div>
          </div>
          <div className="space-y-2">
              <h3 className="text-4xl font-black tracking-tighter uppercase italic">Protocol Locked</h3>
              <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[4px] max-w-sm">Reserved for Level 10 Executive Management</p>
          </div>
        </div>
      );
  }

  const handleAdd = async () => {
    if (name && sessions !== '' && price !== '' && expiryDays !== '') {
      await addPackage({
        name,
        sessions: Number(sessions),
        price: Number(price),
        expiryDays: Number(expiryDays),
        branch
      });
      setIsAddOpen(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (editingPackage && name && sessions !== '' && price !== '' && expiryDays !== '') {
      await updatePackage(editingPackage.id, {
        name,
        sessions: Number(sessions),
        price: Number(price),
        expiryDays: Number(expiryDays),
        branch
      });
      setIsEditOpen(false);
      setEditingPackage(null);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    setPackageToDelete(id);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (packageToDelete) {
      await deletePackage(packageToDelete);
      setPackageToDelete(null);
    }
  };

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setSessions(pkg.sessions);
    setPrice(pkg.price);
    setExpiryDays(pkg.expiryDays);
    setBranch(pkg.branch);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setName('');
    setSessions('');
    setPrice('');
    setExpiryDays('');
    setBranch('ALL');
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
            <h2 className="text-5xl font-black tracking-tighter uppercase mb-2 italic">Service Protocols</h2>
            <div className="flex items-center gap-4">
                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-3 py-1">OPERATIONAL CATALOG</Badge>
                <div className="flex items-center gap-1.5 opacity-40">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Revenue Model Optimised</span>
                </div>
            </div>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-16 px-10 rounded-[20px] font-black text-[10px] uppercase tracking-[4px] shadow-2xl shadow-primary/20 hover:scale-105 transition-all">
              <Plus className="mr-3 h-5 w-5" /> Blueprint New Protocol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-950">
            <div className="p-10 space-y-8">
               <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-8">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Box className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                      <DialogTitle className="text-3xl font-black tracking-tighter uppercase">Protocol Blueprint</DialogTitle>
                      <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Engineering new commercial offering</p>
                  </div>
               </div>

               <div className="space-y-6">
                 <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Protocol Identity</Label>
                    <Input 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="e.g. TITAN ELITE RECOVERY" 
                      className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-lg tracking-tight px-6 placeholder:opacity-20"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Volume (Sessions)</Label>
                        <div className="relative">
                            <Zap className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                            <Input type="number" value={sessions} onChange={e => setSessions(e.target.value ? Number(e.target.value) : '')} className="h-16 pl-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xl tracking-tighter" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Base Exchange (LE)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                            <Input type="number" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} className="h-16 pl-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xl tracking-tighter" />
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Time-to-Expiry (Days)</Label>
                        <div className="relative">
                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                            <Input type="number" value={expiryDays} onChange={e => setExpiryDays(e.target.value ? Number(e.target.value) : '')} className="h-16 pl-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xl tracking-tighter" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Operational Sector</Label>
                        <Select value={branch} onValueChange={(v: any) => setBranch(v)}>
                          <SelectTrigger className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xs uppercase px-6">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="ALL" className="font-black text-[10px] uppercase p-4 italic">Global Access</SelectItem>
                            <SelectItem value="COMPLEX" className="font-black text-[10px] uppercase p-4 italic">The Complex</SelectItem>
                            <SelectItem value="MIVIDA" className="font-black text-[10px] uppercase p-4 italic">Mivida Site</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                 </div>
               </div>

               <Button onClick={handleAdd} className="w-full h-20 rounded-2xl font-black text-xs uppercase tracking-[6px] shadow-2xl shadow-primary/30 active:scale-95 transition-all" disabled={!name || sessions === '' || price === ''}>
                  Commission Protocol Trace
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {packages.length === 0 ? (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full py-40 text-center rounded-[50px] bg-zinc-50 dark:bg-zinc-900/50 border-4 border-dashed border-zinc-200 dark:border-zinc-800 space-y-8"
            >
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                    <ShieldCheck className="relative h-20 w-20 text-primary/30 mx-auto" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tighter uppercase opacity-30 italic">No Active Protocols</h3>
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[6px] max-w-sm mx-auto">Initialise commercial menu to begin intake</p>
                </div>
            </motion.div>
          ) : (
            packages.map((pkg, idx) => (
              <motion.div
                key={pkg.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
              >
                <Card className="group relative border-none shadow-xl hover:shadow-[0_40px_100px_rgba(0,0,0,0.2)] transition-all duration-500 rounded-[44px] overflow-hidden bg-white dark:bg-zinc-900 flex flex-col h-full">
                  {/* Premium Texture & Depth */}
                  <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                  <div className="absolute top-0 right-0 p-10 opacity-5 transition-opacity group-hover:opacity-10 transform translate-x-4 -translate-y-4">
                        {getPackageIcon(pkg.sessions)}
                  </div>
                  
                  <CardHeader className="relative p-10 pb-4">
                    <div className="flex justify-between items-start">
                        <div className="bg-primary text-primary-foreground p-5 rounded-[24px] shadow-2xl shadow-primary/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                            {getPackageIcon(pkg.sessions)}
                        </div>
                        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700" onClick={() => openEdit(pkg)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40" onClick={() => handleDelete(pkg.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="mt-8">
                        <h3 className="text-3xl font-black tracking-tighter uppercase italic group-hover:text-primary transition-colors leading-none">{pkg.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-4">
                            <Badge variant="outline" className="border-zinc-200 dark:border-zinc-800 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 py-1 px-3 rounded-full opacity-60">
                                <MapPin className="h-2.5 w-2.5" />
                                {pkg.branch} SECTOR
                            </Badge>
                             <Badge variant="outline" className="border-zinc-200 dark:border-zinc-800 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 py-1 px-3 rounded-full opacity-60">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                VALIDATED
                            </Badge>
                        </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative p-10 pt-6 flex-1">
                    <div className="flex items-baseline gap-2 mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-8">
                        <span className="text-6xl font-black tracking-tighter">
                            {pkg.price.toLocaleString()}
                        </span>
                        <span className="text-sm font-black text-muted-foreground uppercase opacity-40">LE / UNIT</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-[28px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 group-hover:border-primary/20 transition-all">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-2">Session Integrity</span>
                            <div className="flex items-center justify-between">
                                <Zap className="h-4 w-4 text-primary" />
                                <span className="text-2xl font-black tracking-tighter italic">{pkg.sessions}</span>
                            </div>
                        </div>
                        <div className="p-6 rounded-[28px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 group-hover:border-primary/20 transition-all">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-30 block mb-2">Life Duration</span>
                            <div className="flex items-center justify-between">
                                <Calendar className="h-4 w-4 text-amber-500" />
                                <span className="text-2xl font-black tracking-tighter italic">{pkg.expiryDays}D</span>
                            </div>
                        </div>
                    </div>
                  </CardContent>

                  <CardFooter className="relative p-10 pt-0 mt-auto">
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-zinc-200 dark:border-zinc-800 font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all">
                        Verify Specifications
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-xl rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-950">
           <div className="p-10 space-y-8">
              <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-8">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Edit className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                      <DialogTitle className="text-3xl font-black tracking-tighter uppercase">Refine Protocol</DialogTitle>
                      <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Adjusting commercial specifications</p>
                  </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-3">
                    <Label className="font-black text-[10px] uppercase tracking-widest opacity-40 text-left">Level Designation</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-lg tracking-tight" />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Sessions</Label>
                        <Input type="number" value={sessions} onChange={e => setSessions(e.target.value ? Number(e.target.value) : '')} className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xl tracking-tighter" />
                    </div>
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Exchange</Label>
                        <Input type="number" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xl tracking-tighter" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Span</Label>
                        <Input type="number" value={expiryDays} onChange={e => setExpiryDays(e.target.value ? Number(e.target.value) : '')} className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xl tracking-tighter" />
                    </div>
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Sector</Label>
                        <Select value={branch} onValueChange={(v: any) => setBranch(v)}>
                            <SelectTrigger className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xs uppercase px-6">
                            <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="ALL" className="font-black text-[10px] uppercase p-4 italic">Global Access</SelectItem>
                                <SelectItem value="COMPLEX" className="font-black text-[10px] uppercase p-4 italic">The Complex</SelectItem>
                                <SelectItem value="MIVIDA" className="font-black text-[10px] uppercase p-4 italic">Mivida Site</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                 </div>
              </div>

              <Button onClick={handleEdit} className="w-full h-20 rounded-2xl font-black text-xs uppercase tracking-[6px] shadow-2xl shadow-primary/30 active:scale-95 transition-all">
                Update Protocol Trace
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog 
        isOpen={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        title="Liquidate Protocol"
        description="Terminating this commercial offering will permanently remove it from the active intake grid. This operation is IRREVERSIBLE."
        onConfirm={confirmDelete}
        variant="destructive"
        confirmText="Confirm Liquidation"
      />
    </div>
  );
}
