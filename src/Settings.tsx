import React, { useState } from 'react';
import { useAppContext } from './context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Building2, Image as ImageIcon, Users, Package } from 'lucide-react';
import UsersManagement from './Users';
import Packages from './Packages';

export default function Settings() {
  const { branding, updateBranding } = useAppContext();
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [isSaving, setIsSaving] = useState(false);

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
      </Tabs>
    </div>
  );
}
