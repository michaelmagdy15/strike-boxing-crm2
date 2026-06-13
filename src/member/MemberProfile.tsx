import React, { useState } from 'react';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Sun, Moon, ShieldCheck, UserCheck, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MemberProfile({ client }: { client: Client | null }) {
  const { currentUser, changeMyPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Basic Info Form State
  const [name, setName] = useState(client?.name || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client?.id || !currentUser?.id) return;
    
    setIsUpdatingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      // 1. Update clients collection
      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        name: name.trim(),
        phone: phone.trim()
      });

      // 2. Update users collection
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        name: name.trim(),
        phone: phone.trim()
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setProfileError("Failed to update profile settings. Please try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    try {
      await changeMyPassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error changing password:", err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError("Incorrect current password.");
      } else {
        setPasswordError(err.message || "Failed to update password. Try again.");
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Account Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your password, theme preferences, and contact information.</p>
      </div>

      {/* Preferences Section (Theme toggling) */}
      <Card className="border bg-card/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            Theme Preference
          </CardTitle>
          <CardDescription className="text-[11px]">Toggle application visual appearance mode.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex items-center justify-between">
          <span className="text-xs font-semibold">
            Currently using <span className="text-primary font-bold capitalize">{theme}</span> mode
          </span>
          <Button variant="outline" size="sm" onClick={toggleTheme} className="h-9 px-4 font-bold border-primary/20 hover:border-primary/40">
            Switch Theme
          </Button>
        </CardContent>
      </Card>

      {/* Edit Profile Info Form */}
      <Card className="border bg-card/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-[11px]">Update your personal contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="memberName" className="text-xs font-bold text-muted-foreground">Full Name</Label>
              <Input
                id="memberName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="memberPhone" className="text-xs font-bold text-muted-foreground">Phone Number</Label>
              <Input
                id="memberPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="bg-background font-mono"
              />
            </div>

            {profileError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg flex items-center gap-2.5 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-600 p-3 rounded-lg flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Profile updated successfully!</span>
              </div>
            )}

            <Button type="submit" disabled={isUpdatingProfile} className="w-full font-bold">
              {isUpdatingProfile ? 'Saving...' : 'Update Details'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="border bg-card/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Security & Password
          </CardTitle>
          <CardDescription className="text-[11px]">Reset your account authentication credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currPass" className="text-xs font-bold text-muted-foreground">Current Password</Label>
              <Input
                id="currPass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPass" className="text-xs font-bold text-muted-foreground">New Password</Label>
              <Input
                id="newPass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPass" className="text-xs font-bold text-muted-foreground">Confirm New Password</Label>
              <Input
                id="confirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-background"
              />
            </div>

            {passwordError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg flex items-center gap-2.5 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-600 p-3 rounded-lg flex items-center gap-2.5 text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            )}

            <Button type="submit" disabled={isUpdatingPassword} className="w-full font-bold">
              {isUpdatingPassword ? 'Updating...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
