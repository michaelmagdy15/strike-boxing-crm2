import React, { useState, useEffect } from 'react';
import { useCart } from './CartContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { useAppContext } from '../context';
import { CheckCircle2, Eye, EyeOff, Dumbbell, Flame, Target, Activity, Key, Phone, Mail, ShieldAlert } from 'lucide-react';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Client } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Checkout({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { items, totalPrice, clearCart } = useCart();
  const { currentUser, loginWithEmail, loginWithMemberId, registerFreeUser } = useAuth();
  const { addTask } = useAppContext();

  // Dialog Navigation steps
  // If not logged in, we start at 'auth'. Otherwise, we go straight to 'details' or 'payment'.
  const [step, setStep] = useState<'auth' | 'details' | 'payment' | 'success'>('auth');
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [signinType, setSigninType] = useState<'email' | 'memberId'>('email');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMemberId, setLoginMemberId] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Registration form states
  const [signupStep, setSignupStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Prefer not to say');
  const [regHeight, setRegHeight] = useState('');
  const [regWeight, setRegWeight] = useState('');
  const [regActivityLevel, setRegActivityLevel] = useState('Moderately Active');
  
  const [regWorkoutTimes, setRegWorkoutTimes] = useState<string[]>([]);
  const [regFitnessTarget, setRegFitnessTarget] = useState('Improve Lifestyle');

  const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Late Night'];

  // Purchase details form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Instapay' | 'Cash'>('Cash');
  const [instapayRef, setInstapayRef] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-set the initial step when modal opens
  useEffect(() => {
    if (open) {
      if (currentUser) {
        setStep('details');
      } else {
        setStep('auth');
      }
    }
  }, [open, currentUser]);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      if (currentUser.clientRecordId) {
        const q = query(collection(db, 'clients'), where('memberId', '==', currentUser.clientRecordId.trim()));
        getDocs(q).then(snap => {
          if (!snap.empty) {
            const clientData = snap.docs[0].data();
            if (clientData.phone) setPhone(clientData.phone);
          }
        }).catch(err => console.error("Error fetching client phone:", err));
      }
    }
  }, [currentUser]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (signinType === 'email') {
        if (!loginEmail || !loginPassword) throw new Error('Email and password are required.');
        await loginWithEmail(loginEmail, loginPassword);
      } else {
        if (!loginMemberId || !loginPassword) throw new Error('Member ID and password are required.');
        await loginWithMemberId(loginMemberId, loginPassword);
      }
      // Success: Firebase auth state updates, triggers the useEffect, advances to 'details'
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterNext = () => {
    if (signupStep === 1 && (!regName || !regPhone || !regEmail || !regPassword)) {
      setError('Please fill in all basic registration details.');
      return;
    }
    if (signupStep === 2 && (!regAge || !regHeight || !regWeight)) {
      setError('Please fill in your metrics to help our AI Coach.');
      return;
    }
    setError('');
    setSignupStep(s => s + 1);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regWorkoutTimes.length === 0) {
      setError('Please select at least one preferred workout time.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await registerFreeUser(regEmail, regPassword, {
        name: regName,
        phone: regPhone,
        age: regAge,
        gender: regGender,
        height: Number(regHeight),
        weight: Number(regWeight),
        activityLevel: regActivityLevel,
        workoutTimes: regWorkoutTimes,
        fitnessTarget: regFitnessTarget
      });
      // Success: Auto-logged in, will advance to 'details' step
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWorkoutTime = (time: string) => {
    setRegWorkoutTimes(prev => 
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const handleDetailsSubmit = () => {
    if (!name || !phone) {
      setError('Name and phone are required.');
      return;
    }
    setError('');
    setStep('payment');
  };

  const handlePurchaseSubmit = async () => {
    if (paymentMethod === 'Instapay' && (!instapayRef || instapayRef.length !== 12)) {
      setError('Please provide a valid 12-digit Instapay reference number.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const clientId = currentUser?.clientRecordId || 'GUEST-LEAD';
      const description = items.map(i => `${i.quantity}x ${i.pkg.name}`).join('\n') + 
        `\n\nPayment Method: ${paymentMethod}` + 
        (paymentMethod === 'Instapay' ? `\nInstapay Ref: ${instapayRef}` : '');

      // Create a pending purchase task in CRM
      await addTask({
        title: `Package Purchase Request: ${name}`,
        description,
        dueDate: new Date().toISOString(),
        status: 'Pending',
        priority: 'High',
        clientId,
        assignedTo: '', // Unassigned general rep task
      });

      // Send confirmation email via Firestore trigger
      const buyerEmail = email || regEmail;
      if (buyerEmail) {
        await addDoc(collection(db, 'mail'), {
          to: buyerEmail,
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
      console.error("Purchase error:", err);
      setError('Failed to submit your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(currentUser ? 'details' : 'auth');
      setName('');
      setPhone('');
      setEmail('');
      setInstapayRef('');
      setSignupStep(1);
      setError('');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={open ? undefined : resetAndClose}>
      <DialogContent className="w-[95vw] sm:max-w-md bg-card max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Checkout</DialogTitle>
          <DialogDescription>Complete your session package request.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="my-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── STEP 1: AUTHENTICATION ── */}
        {step === 'auth' && (
          <Tabs value={authTab} onValueChange={(v) => { setAuthTab(v as any); setError(''); }} className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="signin" className="font-bold">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="font-bold">Join Club</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 pt-4">
              <div className="flex justify-center gap-4 bg-muted/30 p-1.5 rounded-lg border text-xs font-bold mb-2">
                <button
                  type="button"
                  onClick={() => setSigninType('email')}
                  className={`flex-1 py-1.5 rounded-md ${signinType === 'email' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setSigninType('memberId')}
                  className={`flex-1 py-1.5 rounded-md ${signinType === 'memberId' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  Member ID
                </button>
              </div>

              <form onSubmit={handleSignIn} className="space-y-3">
                {signinType === 'email' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="checkout-email">Email Address</Label>
                    <Input id="checkout-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="checkout-member-id">Member ID</Label>
                    <Input id="checkout-member-id" placeholder="MEM-001" value={loginMemberId} onChange={e => setLoginMemberId(e.target.value)} required />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="checkout-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="checkout-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowLoginPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In & Continue'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="pt-2">
              <form onSubmit={signupStep === 3 ? handleRegisterSubmit : (e) => { e.preventDefault(); handleRegisterNext(); }} className="space-y-4">
                {signupStep === 1 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="John Doe" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                    </div>
                    <Button type="submit" className="w-full mt-2">Next Step</Button>
                  </div>
                )}

                {signupStep === 2 && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Age</Label>
                        <Input type="number" value={regAge} onChange={e => setRegAge(e.target.value)} placeholder="e.g. 25" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Gender</Label>
                        <Select value={regGender} onValueChange={setRegGender}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Height (cm)</Label>
                        <Input type="number" value={regHeight} onChange={e => setRegHeight(e.target.value)} placeholder="175" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Weight (kg)</Label>
                        <Input type="number" value={regWeight} onChange={e => setRegWeight(e.target.value)} placeholder="70" required />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Activity Level</Label>
                      <Select value={regActivityLevel} onValueChange={setRegActivityLevel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sedentary">Sedentary (Office job)</SelectItem>
                          <SelectItem value="Lightly Active">Lightly Active (1-3 days/week)</SelectItem>
                          <SelectItem value="Moderately Active">Moderately Active (3-5 days/week)</SelectItem>
                          <SelectItem value="Very Active">Very Active (6-7 days/week)</SelectItem>
                          <SelectItem value="Extra Active">Extra Active (Athlete)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="w-1/3" onClick={() => setSignupStep(1)}>Back</Button>
                      <Button type="submit" className="w-2/3">Next Step</Button>
                    </div>
                  </div>
                )}

                {signupStep === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preferred Workout Times</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {timeOptions.map(time => (
                          <div key={time} className={`flex items-center space-x-2 border rounded-md p-2.5 cursor-pointer transition-colors ${regWorkoutTimes.includes(time) ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`} onClick={() => toggleWorkoutTime(time)}>
                            <Checkbox checked={regWorkoutTimes.includes(time)} onCheckedChange={() => toggleWorkoutTime(time)} />
                            <span className="text-xs font-medium">{time}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary Fitness Target</Label>
                      <div className="space-y-2">
                        {[
                          { id: 'Weight Loss', icon: Flame, desc: 'Burn fat and lean out' },
                          { id: 'Gain Muscle', icon: Dumbbell, desc: 'Build size and strength' },
                          { id: 'Improve Lifestyle', icon: Activity, desc: 'Overall health & mobility' },
                          { id: 'Maintenance', icon: Target, desc: 'Keep current shape' }
                        ].map(target => (
                          <div 
                            key={target.id}
                            onClick={() => setRegFitnessTarget(target.id)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${regFitnessTarget === target.id ? 'border-primary bg-primary/10' : 'hover:border-primary/50'}`}
                          >
                            <div className={`p-1.5 rounded-full ${regFitnessTarget === target.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <target.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-xs">{target.id}</p>
                              <p className="text-[10px] text-muted-foreground">{target.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" className="w-1/3" onClick={() => setSignupStep(2)}>Back</Button>
                      <Button type="submit" className="w-2/3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/95 hover:to-blue-600/95 text-white" disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Register & Checkout'}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </TabsContent>
          </Tabs>
        )}

        {/* ── STEP 2: CONFIRM DETAILS ── */}
        {step === 'details' && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-xl flex items-center justify-between border">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Selected Packages</p>
                <p className="text-sm font-bold mt-0.5">{items.length} Package(s) in cart</p>
              </div>
              <p className="text-lg font-black text-primary">{totalPrice.toLocaleString()} EGP</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Billing/Member Name</Label>
                <Input placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email Address (For Order Confirmation)</Label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <Button className="w-full mt-4" onClick={handleDetailsSubmit}>Continue to Payment</Button>
          </div>
        )}

        {/* ── STEP 3: PAYMENT METHOD ── */}
        {step === 'payment' && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-xl flex justify-between items-center border">
              <span className="font-bold text-sm">Total Price</span>
              <span className="text-xl font-black text-primary">{totalPrice.toLocaleString()} EGP</span>
            </div>

            <div className="space-y-2">
              <Label>Select Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v: 'Instapay' | 'Cash') => setPaymentMethod(v)}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Instapay">Instapay Transfer</SelectItem>
                  <SelectItem value="Cash">Cash at Branch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'Instapay' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-blue-500/10 text-blue-500 text-xs p-3.5 rounded-xl border border-blue-500/20 leading-relaxed">
                  Please transfer <strong>{totalPrice.toLocaleString()} EGP</strong> to Instapay Address: <strong className="select-all text-white">strike@instapay</strong>, then input your 12-digit transaction reference number below.
                </div>
                <div className="space-y-1.5">
                  <Label>12-Digit Instapay Reference Number</Label>
                  <Input 
                    placeholder="123456789012" 
                    value={instapayRef} 
                    onChange={e => setInstapayRef(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    maxLength={12}
                    className="h-11 rounded-xl text-center font-mono tracking-widest text-md"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'Cash' && (
              <div className="bg-primary/10 text-primary text-xs p-3.5 rounded-xl border border-primary/20 leading-relaxed">
                You will need to pay the total amount of <strong>{totalPrice.toLocaleString()} EGP</strong> at the Maxim Compound branch to activate your membership and receive your Member ID.
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep('details')}>Back</Button>
              <Button className="w-2/3 bg-gradient-to-r from-primary to-rose-600 hover:from-primary/95 hover:to-rose-600/95 font-bold" onClick={handlePurchaseSubmit} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Confirm Request'}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SUCCESS SCREEN ── */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center animate-in zoom-in-95 duration-300">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-black tracking-tight">Request Sent!</h2>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Your session booking request has been submitted successfully.
              {(email || regEmail) && " We have sent an order confirmation to your email."}
            </p>
            
            <div className="bg-muted/40 p-4 rounded-2xl border text-xs text-left space-y-2 mt-2 leading-relaxed">
              <p className="font-bold text-foreground">Next steps to activate:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Visit the Maxim Compound branch to settle the payment.</li>
                <li>Your membership will be activated immediately by the staff.</li>
                <li>You will receive your official <strong>Member ID</strong> to log in and unlock premium features like session bookings, QR check-ins, and gym passes.</li>
              </ul>
            </div>
            
            <Button className="w-full mt-4 h-12 font-bold" onClick={resetAndClose}>Back to Storefront</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
