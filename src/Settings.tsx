import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Building2, Image as ImageIcon, Users, Package, AlertTriangle, ShieldCheck } from 'lucide-react';
import UsersManagement from './Users';
import Packages from './Packages';

export default function Settings() {
  const { branding, updateBranding, isSuperUser, clearAllData } = useAppContext();
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

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

  const handleSystemReset = async () => {
    if (confirmText !== 'DELETE ALL') return;
    setIsResetting(true);
    try {
      await clearAllData();
      setIsResetDialogOpen(false);
      setConfirmText('');
      window.location.reload(); // Reload to refresh all data
    } finally {
      setIsResetting(false);
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
          {isSuperUser && (
            <TabsTrigger value="admin" className="flex items-center gap-2 text-destructive data-[state=active]:bg-destructive/10">
              <ShieldCheck className="h-4 w-4" />
              Administration
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

        {isSuperUser && (
          <TabsContent value="admin" className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone: System Reset
                  </CardTitle>
                  <CardDescription>
                    Permanently delete all data and reset the system. This action is irreversible.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                    This will delete all <strong>Clients</strong>, <strong>Payments</strong>, <strong>Leads</strong>, <strong>Packages</strong>, <strong>Tasks</strong>, and <strong>User Accounts</strong>.
                    <br /><br />
                    <span className="text-destructive font-bold">Only the three Super User accounts will be preserved.</span>
                  </p>
                  
                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogTrigger render={<Button variant="destructive" className="w-full" />}>
                      <AlertTriangle className="mr-2 h-4 w-4" /> Clear Whole System
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-destructive">Final Confirmation Required</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <p className="text-sm text-balance">
                          You are about to perform a full system reset. Every record in the database (except super users) will be destroyed. 
                          This cannot be undone.
                        </p>
                        <div className="space-y-2">
                          <Label>Please type <span className="font-bold text-destructive underline">DELETE ALL</span> to confirm:</Label>
                          <Input 
                            value={confirmText} 
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type exactly DELETE ALL"
                            className="border-destructive"
                            autoComplete="off"
                          />
                        </div>
                        <Button 
                          variant="destructive" 
                          className="w-full" 
                          onClick={handleSystemReset}
                          disabled={confirmText !== 'DELETE ALL' || isResetting}
                        >
                          {isResetting ? 'Processing Reset...' : 'CONFIRM IRREVERSIBLE RESET'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Admin Access Details
                  </CardTitle>
                  <CardDescription>
                    Information about authorized super users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Destructive actions are limited to the following whitelisted users:</p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      <li>michaelmitry13@gmail.com</li>
                      <li>Shadyyoussef305@gmail.com</li>
                      <li>magd.gallab@gmail.com</li>
                    </ul>
                    <p className="pt-2 italic">Role: super_admin / crm_admin</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
