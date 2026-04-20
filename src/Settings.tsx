import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Building2, Image as ImageIcon, Users, Package, AlertTriangle, ShieldAlert, Trash2, Dumbbell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import UsersManagement from './Users';
import Packages from './Packages';
import Coaches from './Coaches';
import CommissionReport from './components/CommissionReport';
import { BadgePercent, QrCode, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Branch } from './types';

export default function Settings() {
  const { branding, updateBranding, currentUser, wipeSystem, canAccessSettings, backfillMemberIds } = useAppContext();
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [kioskPin, setKioskPin] = useState(branding.kioskPin || '');
  const [dailyPin, setDailyPin] = useState(branding.dailyCheckinPin || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isWipeDialogOpen, setIsWipeDialogOpen] = useState(false);
  const [wipeStep, setWipeStep] = useState(1);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  const canWipe = canAccessSettings || currentUser?.email === 'michaelmitry13@gmail.com';

  React.useEffect(() => {
    setCompanyName(branding.companyName);
    setLogoUrl(branding.logoUrl);
    setKioskPin(branding.kioskPin || '');
    setDailyPin(branding.dailyCheckinPin || '');
  }, [branding]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBranding({ companyName, logoUrl, kioskPin, dailyCheckinPin: dailyPin });
    } finally {
      setIsSaving(false);
    }
  };

  const branches: Branch[] = ['COMPLEX', 'MIVIDA', 'Strike IMPACT'];
  const appUrl = window.location.origin;

  const handlePrintQR = (branch: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrUrl = `${appUrl}/checkin?branch=${encodeURIComponent(branch)}`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Check-in QR - ${branch}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; items-center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .container { border: 2px solid #000; padding: 40px; border-radius: 20px; }
            h1 { font-size: 48px; margin-bottom: 10px; }
            h2 { font-size: 24px; color: #666; margin-bottom: 40px; }
            .qr-placeholder { margin: 20px auto; }
            .footer { margin-top: 40px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${branding.logoUrl}" style="max-height: 80px; margin-bottom: 20px;" />
            <h1>Scan to Check-in</h1>
            <h2>${branch} Branch</h2>
            <div id="qr-code"></div>
            <p class="footer">Please ask the front desk for today's PIN</p>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(document.getElementById('qr-code'), '${qrUrl}', { width: 400 }, function (error) {
              if (error) console.error(error);
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!canAccessSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive opacity-20" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          This section is exclusively managed by Atef (Sales Manager). 
          Please contact him for any system configuration or history access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="coaches" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Coaches
          </TabsTrigger>
          <TabsTrigger value="commission" className="flex items-center gap-2">
            <BadgePercent className="h-4 w-4" />
            Commission
          </TabsTrigger>
          {canWipe && (
            <TabsTrigger value="danger" className="flex items-center gap-2 text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="branding" className="space-y-6 animate-in fade-in-50 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Branding
                </CardTitle>
                <CardDescription>
                  Customize your CRM's appearance with your company name and logo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logoUrl"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide a URL to your company logo image. Transparent PNG works best.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kioskPin">Kiosk Access PIN</Label>
                  <Input
                    id="kioskPin"
                    type="password"
                    value={kioskPin}
                    onChange={(e) => setKioskPin(e.target.value)}
                    placeholder="Enter 4-6 digit PIN"
                  />
                  <p className="text-xs text-muted-foreground">
                    This PIN allows local front-desk devices to access the attendance scanner without a full CRM account.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyPin">Daily Check-in PIN</Label>
                  <Input
                    id="dailyPin"
                    value={dailyPin}
                    onChange={(e) => setDailyPin(e.target.value)}
                    placeholder="e.g. 1234"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for members using self-check-in. Change this daily for security.
                  </p>
                </div>

                {logoUrl && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/50 flex flex-col items-center justify-center space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Preview</span>
                    <img 
                      src={logoUrl} 
                      alt="Logo Preview" 
                      className="max-h-12 object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleSave} 
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Branding'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Self-Check-in QR Codes
                </CardTitle>
                <CardDescription>
                  Display or print these QR codes for members to scan with their phones.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-1 overflow-auto">
                  {branches.map(branch => (
                    <div key={branch} className="flex flex-col items-center p-4 border rounded-lg bg-muted/30 space-y-3">
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-sm tracking-tight">{branch}</span>
                        <Button variant="outline" size="sm" onClick={() => handlePrintQR(branch)}>
                          <Printer className="h-4 w-4 mr-2" />
                          Print
                        </Button>
                      </div>
                      <div className="bg-white p-2 rounded-md shadow-sm">
                        <QRCodeSVG 
                          value={`${appUrl}/checkin?branch=${encodeURIComponent(branch)}`} 
                          size={120}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground break-all text-center">
                        {appUrl}/checkin?branch={branch}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="animate-in fade-in-50 duration-500">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="packages" className="animate-in fade-in-50 duration-500">
          <Packages />
        </TabsContent>

        <TabsContent value="coaches" className="animate-in fade-in-50 duration-500">
          <Coaches />
        </TabsContent>

        <TabsContent value="commission" className="animate-in fade-in-50 duration-500">
          <CommissionReport />
        </TabsContent>

        {canWipe && (
          <TabsContent value="danger" className="animate-in fade-in-50 duration-500">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  Master System Reset
                </CardTitle>
                <CardDescription className="text-destructive/80 font-medium">
                  This area contains highly destructive actions. Proceed with extreme caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border border-destructive/20 rounded-lg bg-background/50 space-y-3">
                  <h4 className="font-bold text-destructive flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Wipe All CRM Data
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete all Clients, Leads, Payments, Attendance records, and Tasks. 
                    This action is irreversible. Admins and Branding settings will be preserved.
                  </p>
                  <Button 
                    variant="destructive" 
                    className="font-bold"
                    onClick={() => {
                      setWipeStep(1);
                      setIsWipeDialogOpen(true);
                    }}
                  >
                    Wipe System Content
                  </Button>
                </div>

                <div className="p-4 border border-primary/20 rounded-lg bg-background/50 space-y-3">
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Standardize ID System
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Assign a permanent, sequential Member ID to all existing records (Leads & Members) that don't have one yet. 
                    This ensures total consistency across the CRM for check-ins and QR codes.
                  </p>
                  <Button 
                    variant="default" 
                    className="font-bold"
                    onClick={backfillMemberIds}
                  >
                    Backfill Missing IDs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isWipeDialogOpen} onOpenChange={setIsWipeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {wipeStep === 1 ? 'Confirm Reset' : 'Final Verification'}
            </DialogTitle>
            <DialogDescription>
              {wipeStep === 1 
                ? 'Are you absolutely sure you want to delete all CRM data? This cannot be undone.' 
                : 'To prevent accidental deletion, please type "RESET SYSTEM" in the box below to confirm.'}
            </DialogDescription>
          </DialogHeader>
          
          {wipeStep === 2 && (
            <div className="py-4">
              <Input 
                value={wipeConfirmText} 
                onChange={(e) => setWipeConfirmText(e.target.value.toUpperCase())}
                placeholder="RESET SYSTEM"
                className="font-mono text-center tracking-widest"
              />
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsWipeDialogOpen(false)} disabled={isWiping}>
              Cancel
            </Button>
            {wipeStep === 1 ? (
              <Button variant="destructive" onClick={() => setWipeStep(2)}>
                Continue to Final Step
              </Button>
            ) : (
              <Button 
                variant="destructive" 
                disabled={wipeConfirmText !== 'RESET SYSTEM' || isWiping}
                onClick={async () => {
                  setIsWiping(true);
                  try {
                    await wipeSystem();
                    setIsWipeDialogOpen(false);
                    window.location.reload(); // Refresh to clear local state
                  } catch (e) {
                    alert("Wipe failed: " + (e as Error).message);
                    setIsWiping(false);
                  }
                }}
              >
                {isWiping ? 'Wiping...' : 'Wipe Everything Now'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
