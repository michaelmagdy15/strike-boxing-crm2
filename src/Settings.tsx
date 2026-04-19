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

export default function Settings() {
  const { branding, updateBranding, currentUser, wipeSystem } = useAppContext();
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isWipeDialogOpen, setIsWipeDialogOpen] = useState(false);
  const [wipeStep, setWipeStep] = useState(1);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  const canWipe = currentUser?.role === 'super_admin' || currentUser?.role === 'crm_admin' || currentUser?.email === 'michaelmitry13@gmail.com';

  React.useEffect(() => {
    setCompanyName(branding.companyName);
    setLogoUrl(branding.logoUrl);
  }, [branding]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBranding({ companyName, logoUrl });
    } finally {
      setIsSaving(false);
    }
  };

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
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Logo Tips
                </CardTitle>
                <CardDescription>
                  How to get the best results for your logo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-2">
                  <li>Use a high-resolution PNG or SVG with a transparent background.</li>
                  <li>Horizontal logos work better than square or vertical ones in the header.</li>
                  <li>Host your image on a reliable CDN or a public URL (like Imgur or your website).</li>
                  <li>The logo will be displayed at a maximum height of 32px in the header.</li>
                </ul>
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
