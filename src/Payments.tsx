import React, { useState, useMemo, useCallback } from 'react';
import { useCRMData, useAuth, useSettings } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, addDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Payment, isAdmin, Client, Package, ClientId, UserId, PaymentId } from './types';
import { Plus, DollarSign, CreditCard, Banknote, FileText, Smartphone, Printer, Trash2, TrendingUp, Wallet, Receipt, Calendar, Info, Search, Filter, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { AlertDialog } from './components/AlertDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { motion, AnimatePresence } from 'motion/react';

const getMethodIcon = (method: Payment['method']) => {
  switch (method) {
    case 'Cash': return <Banknote className="h-4 w-4 text-emerald-500" />;
    case 'Credit Card': return <CreditCard className="h-4 w-4 text-blue-500" />;
    case 'Bank Transfer': return <FileText className="h-4 w-4 text-purple-500" />;
    case 'Instapay': return <Smartphone className="h-4 w-4 text-pink-500" />;
    default: return <DollarSign className="h-4 w-4 text-zinc-500" />;
  }
};

const PaymentTableRow = React.memo(({ 
  payment, 
  client, 
  recordedBy, 
  onPrint, 
  onDelete, 
  showRecordedBy, 
  isSuperUser 
}: { 
  payment: Payment, 
  client?: Client, 
  recordedBy?: any, 
  onPrint: (p: Payment, c?: Client) => void, 
  onDelete: (id: string) => void,
  showRecordedBy: boolean,
  isSuperUser: boolean
}) => {
  return (
    <TableRow className="group transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50 h-20 border-zinc-100 dark:border-zinc-800">
      <TableCell>
        <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight">{format(parseISO(payment.date), 'MMM d, yyyy')}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{format(parseISO(payment.date), 'h:mm a')}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight">{client?.name || 'Unknown Target'}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{client?.phone || 'No Comms'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-black text-lg tracking-tighter text-emerald-600 dark:text-emerald-400">
                {payment.amount.toLocaleString()} <span className="text-[10px] uppercase font-black opacity-50 ml-1">LE</span>
            </span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
            {getMethodIcon(payment.method)}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest">{payment.method}</span>
            {payment.instapayRef && (
              <span className="text-[8px] font-mono text-muted-foreground opacity-60">REF: {payment.instapayRef}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge className="bg-primary/5 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3 py-1">
            {payment.packageType}
        </Badge>
      </TableCell>
      {showRecordedBy && (
        <TableCell className="hidden lg:table-cell">
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-black italic">
                    {recordedBy?.name?.slice(0, 1) || '?'}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{recordedBy?.name || 'Automated'}</span>
            </div>
        </TableCell>
      )}
      <TableCell className="hidden xl:table-cell">
        <span className="text-[10px] font-bold opacity-40 italic max-w-[200px] truncate block">{payment.notes || '—'}</span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={() => onPrint(payment, client)} className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary">
            <Printer className="h-4 w-4" />
          </Button>
          {isSuperUser && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              onClick={() => onDelete(payment.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

const PackageCard = React.memo(({ pkg }: { pkg: Package }) => (
  <Card className="rounded-[32px] border-none bg-zinc-50 dark:bg-zinc-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
    <div className="p-8 space-y-6">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                 <h4 className="text-xl font-black tracking-tighter uppercase">{pkg.name}</h4>
                 <Badge variant="outline" className="border-zinc-200 dark:border-zinc-700 font-black text-[8px] uppercase tracking-widest px-2">
                    {pkg.branch === 'ALL' ? 'Global Access' : `${pkg.branch} Sector`}
                 </Badge>
            </div>
            <Zap className="h-5 w-5 text-primary opacity-20" />
        </div>

        <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-zinc-200/50 dark:border-zinc-800/50 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Revenue Model</span>
                <span className="text-2xl font-black tracking-tighter text-primary">{pkg.price.toLocaleString()} <span className="text-xs">LE</span></span>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 shadow-inner">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">Sessions</span>
                    <span className="text-lg font-black tracking-tighter">{pkg.sessions}</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 shadow-inner">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1">Duration</span>
                    <span className="text-lg font-black tracking-tighter">{pkg.expiryDays} <span className="text-xs">DAYS</span></span>
                </div>
            </div>
        </div>
    </div>
  </Card>
));

export default function Payments() {
  const { payments, clients, packages, addPayment, deletePayment, updateClient } = useCRMData();
  const { isSuperUser } = useAuth();
  const { branding } = useSettings();
  const { currentUser, users } = useAuth();
  
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Payment['method']>('Cash');
  const [instapayRef, setInstapayRef] = useState('');
  const [packageType, setPackageType] = useState('');
  const [customPackage, setCustomPackage] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    
    const currentMonthPayments = payments.filter(p => 
      isWithinInterval(parseISO(p.date), { start: startOfCurrentMonth, end: endOfCurrentMonth })
    );

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
    const monthlyRevenue = currentMonthPayments.reduce((acc, p) => acc + p.amount, 0);
    const dailyAverage = monthlyRevenue / now.getDate();
    
    return {
      total: totalRevenue,
      monthly: monthlyRevenue,
      daily: dailyAverage,
      transactionCount: currentMonthPayments.length
    };
  }, [payments]);

  const handlePackageChange = useCallback((val: string) => {
    setPackageType(val);
    const pkg = packages.find(p => p.name === val);
    if (pkg) {
      setAmount(pkg.price.toString());
    }
  }, [packages]);

  const handleAddPayment = useCallback(() => {
    const finalPackageType = packageType === 'Custom' ? customPackage : packageType;
    if (clientId && amount && finalPackageType) {
      if (method === 'Instapay' && (!instapayRef || !/^\d{12}$/.test(instapayRef))) {
        setAlertTitle('Invalid Reference');
        setAlertDescription('Please enter a valid 12-digit Instapay reference number.');
        setAlertOpen(true);
        return;
      }

      addPayment({
        clientId: clientId as ClientId,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        method,
        instapayRef: method === 'Instapay' ? instapayRef : undefined,
        packageType: finalPackageType,
        notes,
        recordedBy: currentUser?.id as UserId
      });

      // Update client with new package info
      const pkg = packages.find(p => p.name === packageType);
      if (pkg) {
        const now = new Date();
        updateClient(clientId as ClientId, {
          packageType: pkg.name,
          sessionsRemaining: pkg.sessions,
          membershipExpiry: addDays(now, pkg.expiryDays).toISOString(),
          status: 'Active'
        });
      } else {
        updateClient(clientId as ClientId, {
          packageType: finalPackageType,
          status: 'Active'
        });
      }

      setIsNewPaymentOpen(false);
      // Reset form
      setClientId('');
      setAmount('');
      setMethod('Cash');
      setInstapayRef('');
      setPackageType('');
      setCustomPackage('');
      setNotes('');
    }
  }, [clientId, amount, method, instapayRef, packageType, customPackage, notes, currentUser, packages, addPayment, updateClient]);

  const printInvoice = useCallback((payment: Payment, client?: Client) => {
    const win = window.open('', '_blank');
    if (!win) {
      setAlertTitle('Popups Blocked');
      setAlertDescription('Please allow popups to print invoices.');
      setAlertOpen(true);
      return;
    }
    
    win.document.write(`
      <html>
        <head>
          <title>Invoice - ${payment.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 60px; color: #111; background: #fff; line-height: 1.5; }
            .header { border-bottom: 8px solid #000; padding-bottom: 30px; margin-bottom: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo { font-size: 42px; font-weight: 900; letter-spacing: -2px; text-transform: uppercase; }
            .invoice-title { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; color: #666; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 60px; }
            .label { font-size: 10px; font-weight: 900; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
            .value { font-size: 18px; font-weight: 700; margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 60px; }
            th { text-align: left; padding: 20px; border-bottom: 4px solid #000; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; }
            td { padding: 25px 20px; border-bottom: 1px solid #eee; font-size: 16px; font-weight: 700; }
            .total-row td { font-weight: 900; font-size: 28px; border-top: 8px solid #000; border-bottom: none; padding-top: 30px; letter-spacing: -1px; }
            .footer { margin-top: 100px; text-align: center; border-top: 1px solid #eee; padding-top: 40px; color: #888; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">${branding.companyName}</div>
            <div class="invoice-title">Official Receipt</div>
          </div>
          
          <div class="details">
            <div class="details-col">
              <div class="label">Billed To</div>
              <div class="value">${client?.name || 'Unknown Client'}</div>
              <div class="label">Comms Line</div>
              <div class="value">${client?.phone || 'N/A'}</div>
              <div class="label">Assigned Sector</div>
              <div class="value">${client?.branch || 'N/A'}</div>
            </div>
            <div class="details-col">
              <div class="label">Receipt Trace</div>
              <div class="value">#${payment.id.substring(0, 8).toUpperCase()}</div>
              <div class="label">Chronology</div>
              <div class="value">${format(parseISO(payment.date), 'MMMM d, yyyy')}</div>
              <div class="label">Transfer Protocol</div>
              <div class="value">${payment.method.toUpperCase()} ${payment.instapayRef ? '(REF: ' + payment.instapayRef + ')' : ''}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-transform: uppercase;">Service Package: ${payment.packageType}</td>
                <td style="text-align: right;">${payment.amount.toLocaleString()} LE</td>
              </tr>
              <tr class="total-row">
                <td style="text-align: right; text-transform: uppercase;">Settled Total</td>
                <td style="text-align: right;">${payment.amount.toLocaleString()} LE</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Protocol Secured & Verified by ${branding.companyName}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }, [branding]);

  const handleDeleteTrigger = useCallback((id: string) => {
    setPaymentToDelete(id);
    setIsDeleteConfirmOpen(true);
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
        const client = clients.find(c => c.id === payment.clientId);
        const searchStr = (client?.name + ' ' + client?.phone + ' ' + payment.packageType + ' ' + payment.method).toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, clients, searchTerm]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
            <h2 className="text-5xl font-black tracking-tighter uppercase mb-2">Revenue Command</h2>
            <div className="flex items-center gap-4">
                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] tracking-widest px-3 py-1">SOLVENT</Badge>
                <div className="flex items-center gap-1.5 opacity-40">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Financial Integrity Verified</span>
                </div>
            </div>
        </div>

        <Dialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
            <DialogTrigger render={
                <Button className="h-14 px-10 rounded-[20px] font-black text-[10px] uppercase tracking-[4px] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  <Plus className="mr-3 h-5 w-5" /> Record Transaction
                </Button>
            } />
            <DialogContent className="max-w-2xl rounded-[40px] border-none shadow-[0_50px_150px_rgba(0,0,0,0.5)] p-0 overflow-hidden bg-white dark:bg-zinc-950">
              <div className="p-10 space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                        <Wallet className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div>
                        <DialogTitle className="text-3xl font-black tracking-tighter uppercase opacity-90">Secure Settlement</DialogTitle>
                        <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Initialising financial trace protocol</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Target Entity</Label>
                        <Select value={clientId} onValueChange={(v) => setClientId(v || '')}>
                            <SelectTrigger className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6">
                                <SelectValue placeholder="Identify Personnel..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                {clients.filter(c => c.status !== 'Lead').map(client => (
                                    <SelectItem key={client.id} value={client.id} className="font-black text-sm p-4 italic uppercase">{client.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                             <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Settlement Amount (LE)</Label>
                             <div className="relative">
                                <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                <Input type="number" className="h-16 pl-14 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-xl tracking-tighter" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                             </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Service Package</Label>
                            <Select value={packageType} onValueChange={(v) => handlePackageChange(v || '')}>
                                <SelectTrigger className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6">
                                    <SelectValue placeholder="Protocol Type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {packages.map(pkg => (
                                        <SelectItem key={pkg.id} value={pkg.name} className="font-black text-sm p-4 italic uppercase">{pkg.name}</SelectItem>
                                    ))}
                                    <SelectItem value="Custom" className="font-black text-sm p-4 italic uppercase">Custom Strategy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {packageType === 'Custom' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                             <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Custom Designation</Label>
                             <Input className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black" placeholder="e.g., Executive Tier X" value={customPackage} onChange={(e) => setCustomPackage(e.target.value)} />
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Transfer Protocol</Label>
                        <Select value={method} onValueChange={(v) => setMethod((v || 'Cash') as any)}>
                            <SelectTrigger className="h-16 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl font-black text-sm px-6">
                                <SelectValue placeholder="Payment Method" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="Cash" className="p-4 italic font-black uppercase">Cash</SelectItem>
                                <SelectItem value="Credit Card" className="p-4 italic font-black uppercase">Credit Card</SelectItem>
                                <SelectItem value="Instapay" className="p-4 italic font-black uppercase">Instapay (Validated)</SelectItem>
                                <SelectItem value="Bank Transfer" className="p-4 italic font-black uppercase">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {method === 'Instapay' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                             <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Hash Reference (12 Digits)</Label>
                             <Input className="h-16 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 rounded-2xl font-mono text-xl tracking-widest text-emerald-600" maxLength={12} value={instapayRef} onChange={(e) => setInstapayRef(e.target.value.replace(/\D/g, ''))} />
                        </div>
                    )}
                 </div>

                 <Button onClick={handleAddPayment} className="w-full h-20 rounded-2xl font-black text-xs uppercase tracking-[6px] shadow-2xl shadow-primary/30 active:scale-95 transition-all">Submit Settlement Trace</Button>
              </div>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: 'Cumulative Revenue', value: stats.total, icon: Wallet, color: 'text-zinc-500' },
                { label: 'Monthly Inbound', value: stats.monthly, icon: Receipt, color: 'text-emerald-500', trend: <ArrowUpRight className="h-3 w-3 mr-1" /> },
                { label: 'Daily Momentum', value: Math.round(stats.daily), icon: Zap, color: 'text-blue-500' },
                { label: 'Active Pipeline', value: stats.transactionCount, icon: Calendar, color: 'text-purple-500' },
            ].map((stat, i) => (
                <Card key={i} className="rounded-[30px] border-none bg-white dark:bg-zinc-900 shadow-xl overflow-hidden group hover:-translate-y-1 transition-all">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 group-hover:scale-110 transition-transform ${stat.color}`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            {stat.trend && (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5">
                                    {stat.trend} Synchronized
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl font-black tracking-tighter mb-1 uppercase">
                                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                {i < 3 && <span className="text-xs ml-1 opacity-40 font-bold">LE</span>}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{stat.label}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            <div className="xl:col-span-2 space-y-8">
                 <Card className="rounded-[40px] border-none bg-white dark:bg-zinc-900 shadow-xl p-8 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="w-full md:w-96 space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 pl-4">Trace Search</Label>
                             <div className="relative">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                <Input 
                                    className="h-16 pl-14 bg-zinc-50 dark:bg-zinc-950 border-none rounded-[20px] font-black text-sm shadow-inner" 
                                    placeholder="Trace by Personnel or Package..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                             </div>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" className="h-16 px-8 rounded-2xl border-none bg-zinc-50 dark:bg-zinc-950 font-black text-[10px] uppercase tracking-widest shadow-sm">
                                <Filter className="mr-3 h-4 w-4" /> Filter Protocols
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-[28px] overflow-hidden border border-zinc-100 dark:border-zinc-800">
                        <Table>
                            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                <TableRow className="border-none h-16">
                                    <TableHead className="pl-8 font-black text-[10px] uppercase tracking-widest">Chronology</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Personnel</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Settlement</TableHead>
                                    <TableHead className="hidden sm:table-cell font-black text-[10px] uppercase tracking-widest">Protocol</TableHead>
                                    <TableHead className="hidden md:table-cell font-black text-[10px] uppercase tracking-widest">Package</TableHead>
                                    {isAdmin(currentUser?.role) && <TableHead className="hidden lg:table-cell font-black text-[10px] uppercase tracking-widest">Handler</TableHead>}
                                    <TableHead className="hidden xl:table-cell font-black text-[10px] uppercase tracking-widest">Log</TableHead>
                                    <TableHead className="pr-8 text-right font-black text-[10px] uppercase tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {filteredPayments.length > 0 ? (
                                        filteredPayments.map(payment => (
                                            <PaymentTableRow 
                                                key={payment.id}
                                                payment={payment}
                                                client={clients.find(c => c.id === payment.clientId)}
                                                recordedBy={users.find(u => u.id === payment.recordedBy)}
                                                onPrint={printInvoice}
                                                onDelete={handleDeleteTrigger}
                                                showRecordedBy={isAdmin(currentUser?.role)}
                                                isSuperUser={isSuperUser}
                                            />
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-20 opacity-20 italic font-black uppercase tracking-[8px]">
                                                No Financial Traces Detected
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                 </Card>
            </div>

            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black tracking-tighter uppercase">Service Models</h3>
                    <Badge className="bg-primary/10 text-primary border-none font-black text-[8px] tracking-widest">REVENUE SOURCE</Badge>
                </div>
                <div className="space-y-4">
                    {packages.map(pkg => (
                        <PackageCard key={pkg.id} pkg={pkg} />
                    ))}
                    {packages.length === 0 && (
                        <div className="p-10 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center opacity-30">
                            <span className="text-[10px] font-black uppercase tracking-[4px]">System Models Undefined</span>
                        </div>
                    )}
                </div>
            </div>
      </div>

      <AlertDialog 
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title={alertTitle}
        description={alertDescription}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Vaporize Financial Record"
        description="This will permanently nullify the financial trace from the historical ledger. This operation is IRREVERSIBLE."
        confirmText="Confirm Vaporization"
        variant="destructive"
        onConfirm={() => {
          if (paymentToDelete) {
            deletePayment(paymentToDelete as PaymentId);
            setPaymentToDelete(null);
          }
        }}
      />
    </div>
  );
}
