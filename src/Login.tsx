import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserRole } from './types';
import { Eye, EyeOff, ShieldCheck, Dumbbell, Users, ArrowLeft, CheckCircle2 } from 'lucide-react';

type View = 'login' | 'signup' | 'signup-success';

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function Login() {
  const { login, loginWithEmail, loginWithCoachId, loginWithMemberId, submitSignUpRequest, submitPasswordResetRequest, submitMemberPasswordResetRequest, isAuthReady, authError, setAuthError } = useAuth();
  const { branding } = useSettings();

  const [view, setView] = useState<View>('login');

  // Email/password tab
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Coach ID tab
  const [coachId, setCoachId] = useState('');
  const [coachPassword, setCoachPassword] = useState('');
  const [showCoachPassword, setShowCoachPassword] = useState(false);

  // Member ID tab
  const [memberId, setMemberId] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [showMemberPassword, setShowMemberPassword] = useState(false);

  // Sign-up form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('rep');
  const [signupMessage, setSignupMessage] = useState('');

  // Forgot password dialog (staff / coach — email based)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotName, setForgotName] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Forgot password dialog (member — ID + phone based)
  const [memberForgotOpen, setMemberForgotOpen] = useState(false);
  const [memberForgotId, setMemberForgotId] = useState('');
  const [memberForgotPhone, setMemberForgotPhone] = useState('');
  const [memberForgotSubmitted, setMemberForgotSubmitted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleError = (err: unknown) => {
    const code = (err as any)?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      setError('Invalid email or password. Please try again.');
    } else if (code === 'auth/too-many-requests') {
      setError('Too many failed attempts. Please wait a moment and try again.');
    } else if (code === 'auth/user-disabled') {
      setError('This account has been disabled. Please contact an administrator.');
    } else {
      setError((err as Error)?.message || 'An error occurred. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setAuthError(null);
    setIsLoading(true);
    try { await login(); } catch (err) { handleError(err); }
    finally { setIsLoading(false); }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setAuthError(null);
    setIsLoading(true);
    try { await loginWithEmail(email, password); } catch (err) { handleError(err); }
    finally { setIsLoading(false); }
  };

  const handleCoachLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachId || !coachPassword) { setError('Please enter your Coach ID and password.'); return; }
    setError('');
    setIsLoading(true);
    try { await loginWithCoachId(coachId, coachPassword); } catch (err) { handleError(err); }
    finally { setIsLoading(false); }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !memberPassword) { setError('Please enter your Member ID and password.'); return; }
    setError('');
    setIsLoading(true);
    try { await loginWithMemberId(memberId, memberPassword); } catch (err) { handleError(err); }
    finally { setIsLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail) { setError('Please fill in all required fields.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await submitSignUpRequest(signupName, signupEmail, signupRole, signupMessage);
      setView('signup-success');
    } catch (err) {
      setError((err as Error)?.message || 'Failed to submit request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsLoading(true);
    setError('');
    try {
      await submitPasswordResetRequest(forgotEmail, forgotName);
      setForgotSubmitted(true);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to submit request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForgotId || !memberForgotPhone) return;
    setIsLoading(true);
    setError('');
    try {
      await submitMemberPasswordResetRequest(memberForgotId, memberForgotPhone);
      setMemberForgotSubmitted(true);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to submit request.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const Logo = () => (
    <div className="mb-8 text-center flex flex-col items-center">
      {branding.logoUrl ? (
        <img src={branding.logoUrl} alt={branding.companyName} className="h-20 w-auto object-contain mb-4" referrerPolicy="no-referrer" />
      ) : (
        <>
          <h1 className="text-5xl font-extralight tracking-[0.2em] uppercase text-primary font-logo">{branding.companyName}</h1>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.4em] font-logo mt-2">Don't limit your challenges</p>
        </>
      )}
    </div>
  );

  // ── Sign-up success view ──
  if (view === 'signup-success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Logo />
        <Card className="w-full max-w-md shadow-2xl text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground text-sm">Your sign-up request has been sent to the administrators. You'll be notified once your account is approved.</p>
            <Button variant="outline" onClick={() => setView('login')}>Back to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sign-up request view ──
  if (view === 'signup') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Logo />
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setView('login'); setError(''); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Request Access</CardTitle>
                <CardDescription className="mt-1">An admin will review and approve your account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Your full name" required />
              </div>
              <div className="space-y-2">
                <Label>Email Address <span className="text-destructive">*</span></Label>
                <Input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Requested Role</Label>
                <Select value={signupRole} onValueChange={v => setSignupRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rep">Sales Rep</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message (Optional)</Label>
                <Textarea
                  value={signupMessage}
                  onChange={e => setSignupMessage(e.target.value)}
                  placeholder="Any additional info for the admin..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main login view ──
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Logo />

      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="break-words font-mono text-xs">
                {authError}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="staff" onValueChange={() => { setError(''); setAuthError(null); }}>
            <TabsList className="grid grid-cols-3 w-full mb-4">
              <TabsTrigger value="staff" className="flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5" /> Staff
              </TabsTrigger>
              <TabsTrigger value="coach" className="flex items-center gap-1.5 text-xs">
                <Dumbbell className="h-3.5 w-3.5" /> Coach
              </TabsTrigger>
              <TabsTrigger value="member" className="flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" /> Member
              </TabsTrigger>
            </TabsList>

            {/* ── Staff Tab ── */}
            <TabsContent value="staff" className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-12 justify-center gap-3 border-muted-foreground/20 hover:bg-primary hover:text-primary-foreground transition-all"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <GoogleIcon />
                <span className="font-semibold">Continue with Google</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input id="staff-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pr-10"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="flex justify-between text-xs">
                <button className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline" onClick={() => { setForgotOpen(true); setForgotSubmitted(false); setForgotEmail(''); setForgotName(''); }}>
                  Forgot password?
                </button>
                <button className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline" onClick={() => { setView('signup'); setError(''); }}>
                  Request access
                </button>
              </div>
            </TabsContent>

            {/* ── Coach Tab ── */}
            <TabsContent value="coach" className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Sign in using your Coach ID (e.g. COACH-001) and password.</p>
              <form onSubmit={handleCoachLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="coach-id">Coach ID</Label>
                  <Input
                    id="coach-id"
                    placeholder="COACH-001"
                    value={coachId}
                    onChange={e => setCoachId(e.target.value.toUpperCase())}
                    className="font-mono tracking-wide"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coach-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="coach-password"
                      type={showCoachPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={coachPassword}
                      onChange={e => setCoachPassword(e.target.value)}
                      className="pr-10"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowCoachPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCoachPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In as Coach'}
                </Button>
              </form>
              <div className="text-center">
                <button className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline" onClick={() => { setForgotOpen(true); setForgotSubmitted(false); setForgotEmail(''); setForgotName(''); }}>
                  Forgot password?
                </button>
              </div>
            </TabsContent>

            {/* ── Member Tab ── */}
            <TabsContent value="member" className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">Sign in using your Member ID and password.</p>
              <form onSubmit={handleMemberLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="member-id">Member ID</Label>
                  <Input
                    id="member-id"
                    placeholder="Your member ID"
                    value={memberId}
                    onChange={e => setMemberId(e.target.value)}
                    className="font-mono tracking-wide"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="member-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="member-password"
                      type={showMemberPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={memberPassword}
                      onChange={e => setMemberPassword(e.target.value)}
                      className="pr-10"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowMemberPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showMemberPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In as Member'}
                </Button>
              </form>
              <div className="text-center">
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setMemberForgotOpen(true);
                    setMemberForgotSubmitted(false);
                    setMemberForgotId('');
                    setMemberForgotPhone('');
                    setError('');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Forgot Password Dialog (Staff / Coach — email) ── */}
      <Dialog open={forgotOpen} onOpenChange={open => { setForgotOpen(open); if (!open) setForgotSubmitted(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {forgotSubmitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-semibold">Request Submitted</p>
              <p className="text-sm text-muted-foreground">An admin will review your request and send a reset email to <strong>{forgotEmail}</strong>.</p>
              <Button onClick={() => setForgotOpen(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 py-2">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input placeholder="Full name" value={forgotName} onChange={e => setForgotName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" placeholder="you@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
              </div>
              <p className="text-xs text-muted-foreground">An admin will approve your request and send you a password reset link.</p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading || !forgotEmail}>
                  {isLoading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Forgot Password Dialog (Member — ID + Phone) ── */}
      <Dialog open={memberForgotOpen} onOpenChange={open => { setMemberForgotOpen(open); if (!open) { setMemberForgotSubmitted(false); setError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Member Password</DialogTitle>
          </DialogHeader>
          {memberForgotSubmitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-semibold">Request Submitted</p>
              <p className="text-sm text-muted-foreground">
                An admin will review and reset your password. Your new temporary password will be <strong>12345678</strong> — you'll be asked to change it on first login.
              </p>
              <Button onClick={() => setMemberForgotOpen(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleMemberForgotPassword} className="space-y-4 py-2">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <p className="text-sm text-muted-foreground">
                Enter your <strong>Member ID</strong> and the <strong>phone number</strong> registered with your account.
              </p>
              <div className="space-y-2">
                <Label>Member ID</Label>
                <Input
                  placeholder="e.g. MEM-001"
                  value={memberForgotId}
                  onChange={e => setMemberForgotId(e.target.value)}
                  className="font-mono tracking-wide"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 01012345678"
                  value={memberForgotPhone}
                  onChange={e => setMemberForgotPhone(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">An admin will verify your identity and reset your password.</p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMemberForgotOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading || !memberForgotId || !memberForgotPhone}>
                  {isLoading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
