import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, addDays } from 'date-fns';
import { Payment } from './types';
import { Plus, DollarSign, CreditCard, Banknote, FileText, Smartphone, Printer } from 'lucide-react';
import { AlertDialog } from './components/AlertDialog';

export default function Payments() {
  const { payments, clients, users, packages, addPayment, updateClient, currentUser, branding } = useAppContext();
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

  const handlePackageChange = (val: string) => {
    setPackageType(val);
    const pkg = packages.find(p => p.name === val);
    if (pkg) {
      setAmount(pkg.price.toString());
    }
  };

  const handleAddPayment = () => {
    const finalPackageType = packageType === 'Custom' ? customPackage : packageType;
    if (clientId && amount && finalPackageType) {
      if (method === 'Instapay' && (!instapayRef || !/^\d{12}$/.test(instapayRef))) {
        setAlertTitle('Invalid Reference');
        setAlertDescription('Please enter a valid 12-digit Instapay reference number.');
        setAlertOpen(true);
        return;
      }

      addPayment({
        clientId,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        method,
        instapayRef: method === 'Instapay' ? instapayRef : undefined,
        packageType: finalPackageType,
        notes,
        recordedBy: currentUser?.id
      });

      // Update client with new package info
      const pkg = packages.find(p => p.name === packageType);
      if (pkg) {
        const now = new Date();
        updateClient(clientId, {
          packageType: pkg.name,
          sessionsRemaining: pkg.sessions,
          membershipExpiry: addDays(now, pkg.expiryDays).toISOString(),
          status: 'Active'
        });
      } else {
        updateClient(clientId, {
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
  };

  const printInvoice = (payment: Payment, client: any) => {
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
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #000; }
            .logo img { max-height: 60px; object-fit: contain; }
            .invoice-title { font-size: 20px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
            .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .details-col { flex: 1; }
            .label { font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
            .value { font-size: 16px; font-weight: 500; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #ddd; color: #666; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .total-row td { font-weight: bold; font-size: 18px; border-top: 2px solid #333; border-bottom: none; }
            .footer { margin-top: 50px; text-align: center; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo"><img src="/strikelogo.png" alt="${branding.companyName}" /></div>
            <div class="invoice-title">Payment Receipt</div>
          </div>
          
          <div class="details">
            <div class="details-col">
              <div class="label">Billed To</div>
              <div class="value">${client?.name || 'Unknown Client'}</div>
              <div class="label">Member ID</div>
              <div class="value">${client?.memberId ? '#' + client.memberId : 'N/A'}</div>
              <div class="label">Branch</div>
              <div class="value">${client?.branch || 'N/A'}</div>
            </div>
            <div class="details-col" style="text-align: right;">
              <div class="label">Receipt No.</div>
              <div class="value">${payment.id.substring(0, 8).toUpperCase()}</div>
              <div class="label">Date</div>
              <div class="value">${format(parseISO(payment.date), 'MMMM d, yyyy')}</div>
              <div class="label">Payment Method</div>
              <div class="value">${payment.method} ${payment.instapayRef ? '(Ref: ' + payment.instapayRef + ')' : ''}</div>
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
                <td>${payment.packageType}</td>
                <td style="text-align: right;">${payment.amount.toLocaleString()} LE</td>
              </tr>
              <tr class="total-row">
                <td style="text-align: right;">Total Paid</td>
                <td style="text-align: right;">${payment.amount.toLocaleString()} LE</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            Thank you for your business!<br>
            ${branding.companyName}
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
  };

  const getMethodIcon = (method: Payment['method']) => {
    switch (method) {
      case 'Cash': return <Banknote className="h-4 w-4 mr-2 text-green-600" />;
      case 'Credit Card': return <CreditCard className="h-4 w-4 mr-2 text-blue-600" />;
      case 'Bank Transfer': return <FileText className="h-4 w-4 mr-2 text-purple-600" />;
      case 'Instapay': return <Smartphone className="h-4 w-4 mr-2 text-pink-600" />;
      default: return <DollarSign className="h-4 w-4 mr-2 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
        <Dialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Record Payment
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (LE)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Payment['method'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Instapay">Instapay</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {method === 'Instapay' && (
                <div className="space-y-2">
                  <Label>Instapay Reference Number (12 digits)</Label>
                  <Input 
                    placeholder="123456789012" 
                    value={instapayRef} 
                    maxLength={12}
                    onChange={(e) => setInstapayRef(e.target.value.replace(/\D/g, ''))} 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Package Type</Label>
                <Select value={packageType} onValueChange={handlePackageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.name}>
                        {pkg.name} ({pkg.price} LE)
                      </SelectItem>
                    ))}
                    <SelectItem value="Custom">Custom Package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {packageType === 'Custom' && (
                <div className="space-y-2">
                  <Label>Custom Package Name</Label>
                  <Input 
                    placeholder="e.g., 5 S GT Adults" 
                    value={customPackage} 
                    onChange={(e) => setCustomPackage(e.target.value)} 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input 
                  placeholder="Any additional notes" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                />
              </div>
              <Button onClick={handleAddPayment} className="w-full">Save Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="hidden md:table-cell">Package</TableHead>
                  {(currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && <TableHead className="hidden lg:table-cell">Recorded By</TableHead>}
                  <TableHead className="hidden xl:table-cell">Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length > 0 ? (
                  payments.map(payment => {
                    const client = clients.find(c => c.id === payment.clientId);
                    const recordedByUser = users.find(u => u.id === payment.recordedBy);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="font-medium">{format(parseISO(payment.date), 'MMM d')}</div>
                          <div className="text-[10px] text-muted-foreground">{format(parseISO(payment.date), 'h:mm a')}</div>
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">{client?.name || 'Unknown Client'}</TableCell>
                        <TableCell className="font-bold text-green-600 text-xs sm:text-sm">{payment.amount.toLocaleString()} LE</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center">
                            {getMethodIcon(payment.method)}
                            <div>
                              <div className="text-xs sm:text-sm">{payment.method}</div>
                              {payment.instapayRef && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Ref: {payment.instapayRef}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-[10px] sm:text-xs">{payment.packageType}</Badge>
                        </TableCell>
                        {(currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin') && (
                          <TableCell className="text-muted-foreground text-xs sm:text-sm hidden lg:table-cell">
                            {recordedByUser?.name || 'Unknown'}
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground text-xs hidden xl:table-cell">{payment.notes || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => printInvoice(payment, client)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payments recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Available Packages</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <Card key={pkg.id} className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{pkg.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Price:</span>
                  <span className="font-bold text-primary">{pkg.price.toLocaleString()} LE</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Sessions:</span>
                  <span className="font-medium">{pkg.sessions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expiry:</span>
                  <span className="text-xs">{pkg.expiryDays} days</span>
                </div>
                {pkg.branch !== 'ALL' && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="outline" className="text-[10px]">{pkg.branch} Branch</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {packages.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full text-center py-4">
              No packages defined in settings.
            </p>
          )}
        </div>
      </div>

      <AlertDialog 
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title={alertTitle}
        description={alertDescription}
      />
    </div>
  );
}
