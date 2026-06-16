import React, { useState } from 'react';
import { useCart } from './CartContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../context';
import { CheckCircle2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { Client } from '../types';

export default function Checkout({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { items, totalPrice, clearCart } = useCart();
  const { currentUser } = useAuth();
  const { addTask, addClient } = useAppContext();

  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Instapay' | 'Cash'>('Cash');
  const [instapayRef, setInstapayRef] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill if logged in as a member (via Client record)
  // But note that `currentUser` here might be staff or member. 
  // If we are in guest mode, we assume no user.

  const handleNext = () => {
    if (!name || !phone) {
      setError('Name and phone are required.');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handleSubmit = async () => {
    if (paymentMethod === 'Instapay' && (!instapayRef || instapayRef.length !== 12)) {
      setError('Please provide a valid 12-digit Instapay reference number.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. Create a Lead record if the user is a guest
      let clientId = currentUser?.clientRecordId;
      if (!clientId) {
        // Simple Lead creation
        const newLead: Omit<Client, 'id'> = {
          name,
          phone,
          status: 'Lead',
          stage: 'New',
          source: 'Other',
          category: 'None',
          createdAt: new Date().toISOString(),
          paid: false
        };
        const docRef = await addDoc(collection(db, 'clients'), newLead);
        clientId = docRef.id;
      }

      // 2. Create a Purchase Request Task
      const description = items.map(i => `${i.quantity}x ${i.pkg.name}`).join('\n') + 
        `\n\nPayment Method: ${paymentMethod}` + 
        (paymentMethod === 'Instapay' ? `\nInstapay Ref: ${instapayRef}` : '');

      await addTask({
        title: `Package Purchase Request: ${name}`,
        description,
        dueDate: new Date().toISOString(),
        status: 'Pending',
        priority: 'High',
        clientId,
        assignedTo: 'admin', // General unassigned/admin task
      });

      // Send email confirmation using the mail collection trigger
      if (email) {
        await addDoc(collection(db, 'mail'), {
          to: email,
          message: {
            subject: "Your STRIKE Session Request Received",
            from: "info@strike-egy.com",
            html: `
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <div style="background-color: #000000; padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 2px;">STRIKE</h1>
                  <p style="color: #a3a3a3; margin: 5px 0 0 0; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">Boxing Club</p>
                </div>
                <div style="padding: 40px 30px;">
                  <h2 style="color: #000000; margin-top: 0; font-size: 22px;">Thank you for your request, ${name}!</h2>
                  <p style="color: #555555; font-size: 16px; line-height: 1.6;">Your session request has been successfully received and is currently pending activation.</p>
                  
                  <div style="background-color: #f9f9f9; border-left: 4px solid #000000; padding: 20px; margin: 30px 0;">
                    <h3 style="color: #000000; margin-top: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">Order Summary</h3>
                    <p style="color: #333333; font-size: 15px; white-space: pre-wrap; margin-bottom: 0;">${description}</p>
                  </div>
                  
                  <h3 style="color: #000000; font-size: 18px; margin-bottom: 10px;">Next Steps</h3>
                  <ul style="color: #555555; font-size: 16px; line-height: 1.6; padding-left: 20px; margin-top: 0;">
                    <li>Visit the branch to complete your payment on the spot.</li>
                    <li>Your account will be instantly activated upon payment.</li>
                    <li>You will receive your <strong>Member ID</strong> to log in and access all active member features in the app.</li>
                  </ul>
                  
                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0 30px 0;" />
                  <p style="color: #777777; font-size: 14px; margin: 0;">Stay sharp,<br/><strong style="color: #000000;">The STRIKE Team</strong></p>
                </div>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
                  <p style="margin: 0;">© ${new Date().getFullYear()} STRIKE Boxing Club. All rights reserved.</p>
                </div>
              </div>
            `
          }
        });
      }

      setStep('success');
      clearCart();
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit your request. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('details');
      setName('');
      setPhone('');
      setEmail('');
      setInstapayRef('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={open ? undefined : resetAndClose}>
      <DialogContent className="w-[95vw] sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>Complete your purchase request.</DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-4 py-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number <span className="text-destructive">*</span></Label>
              <Input type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button className="w-full mt-4" onClick={handleNext}>Continue to Payment</Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4 py-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            
            <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center mb-4">
              <span className="font-semibold">Total Amount</span>
              <span className="text-lg font-bold text-primary">{totalPrice.toLocaleString()} EGP</span>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v: string | null) => v && setPaymentMethod(v as 'Instapay' | 'Cash')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instapay">Instapay</SelectItem>
                  <SelectItem value="Cash">Cash at Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'Instapay' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="bg-blue-500/10 text-blue-500 text-xs p-3 rounded-md mb-2 border border-blue-500/20">
                  Please transfer the exact amount to our Instapay account and enter the 12-digit reference number below.
                </div>
                <Label>Instapay Reference Number <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="123456789012" 
                  value={instapayRef} 
                  onChange={e => setInstapayRef(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  maxLength={12}
                />
              </div>
            )}

            {paymentMethod === 'Cash' && (
              <div className="bg-primary/10 text-primary text-xs p-3 rounded-md border border-primary/20">
                You will need to pay the total amount at the branch to activate your membership and receive your Member ID.
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="w-1/3" onClick={() => setStep('details')}>Back</Button>
              <Button className="w-2/3" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Confirm Request'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center animate-in zoom-in-95">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Request Sent!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your session request has been submitted successfully. 
              {email && " An email confirmation has been sent."}
            </p>
            <p className="text-sm font-medium mt-2 p-3 bg-muted rounded-lg">
              Your account will be activated when you pay at the branch on the spot. You will receive your Member ID then to log in and access all active member features.
            </p>
            <Button className="w-full mt-6" onClick={resetAndClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
