import React, { useState } from 'react';
import { useCRMData, useAuth } from './context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save, Building2, Image as ImageIcon, Users, Package, AlertTriangle, ShieldCheck, Database, LayoutGrid, ShieldAlert, CheckCircle2, Cpu, Fingerprint, Activity, Terminal } from 'lucide-react';
import UsersManagement from './Users';
import Packages from './Packages';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function Settings() {
  const { clearAllData, exportBackup, importBackup } = useCRMData();
  const { branding, updateBranding } = useSettings();
  const { users, isSuperUser, currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'branding' | 'users' | 'packages' | 'admin'>('branding');
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
      window.location.reload();
    } finally {
      setIsResetting(false);
    }
  };

  const navItems = [
    { id: 'branding', label: 'Identity', icon: Building2, desc: 'Brand assets' },
    { id: 'users', label: 'Personnel', icon: Users, desc: 'Fleet management' },
    { id: 'packages', label: 'Protocols', icon: Package, desc: 'Service menu' },
    ...(isSuperUser ? [{ id: 'admin', label: 'Command', icon: ShieldCheck, desc: 'Master reset' }] : []),
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Tactical Navigation Sidebar */}
      <aside className="w-full lg:w-80 space-y-8">
        <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic mb-2">Configurations</h2>
            <div className="flex items-center gap-2 opacity-40">
                <Cpu className="h-3 w-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">System Core v4.1.0</span>
            </div>
        </div>

        <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
            <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                "group relative flex items-center justify-between px-6 py-6 rounded-[24px] transition-all duration-500 text-left overflow-hidden",
                activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-[1.02] translate-x-1" 
                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
            >
                {/* Visual Accent */}
                {activeTab === item.id && (
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                )}
                
                <div className="relative flex items-center gap-5">
                    <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                        activeTab === item.id ? "bg-white/20" : "bg-white dark:bg-zinc-800 shadow-sm"
                    )}>
                        <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-white" : "text-zinc-500")} />
                    </div>
                    <div>
                        <div className="font-black text-xs uppercase tracking-widest">{item.label}</div>
                        <div className={cn("text-[8px] font-black uppercase tracking-[2px] mt-0.5 opacity-50", activeTab === item.id ? "text-white" : "text-zinc-400")}>
                            {item.desc}
                        </div>
                    </div>
                </div>
                
                {activeTab === item.id && (
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                )}
            </button>
            ))}
        </nav>

        <Card className="rounded-[32px] border-none bg-zinc-900 p-8 py-10 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <Terminal className="h-10 w-10 text-primary mb-6 opacity-30" />
            <h4 className="text-xl font-black tracking-tighter uppercase italic mb-2">Access Ledger</h4>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-relaxed">
                Active Session Token: <span className="text-primary italic">STRIKE_AC_719</span><br/>
                Signed in as: <span className="text-white italic">{currentUser?.email}</span>
            </p>
        </Card>
      </aside>

      {/* Primary Configuration Grid */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {activeTab === 'branding' && (
              <div className="space-y-12">
                <div className="grid gap-8 xl:grid-cols-2">
                  <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[44px] overflow-hidden">
                    <div className="p-10 space-y-10">
                        <div className="flex items-center gap-5 border-b border-zinc-100 dark:border-zinc-800 pb-8">
                            <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter uppercase italic">Identity Grid</h3>
                                <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Core brand synchronization</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Organisation Title</Label>
                                <Input
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="e.g. STRIKE BOXING"
                                    className="h-16 bg-zinc-100 dark:bg-zinc-950 border-none rounded-2xl font-black text-xl tracking-tight px-6"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="font-black text-[10px] uppercase tracking-widest opacity-40">Digital Vector Hash (URL)</Label>
                                <Input
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://cloud.matrix.io/assets/logo.svg"
                                    className="h-16 bg-zinc-100 dark:bg-zinc-950 border-none rounded-2xl font-black text-xs px-6 font-mono opacity-60 focus:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {logoUrl && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-12 rounded-[32px] bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-6 group"
                            >
                                <div className="flex items-center gap-2 text-primary">
                                    <Activity className="h-3 w-3 animate-pulse" />
                                    <span className="text-[8px] font-black uppercase tracking-[4px]">Live Interface Preview</span>
                                </div>
                                <img 
                                    src={logoUrl} 
                                    alt="Logo Preview" 
                                    className="max-h-24 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform duration-700"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </motion.div>
                            )}
                        </AnimatePresence>

                        <Button 
                            className="w-full h-20 rounded-[28px] font-black text-xs uppercase tracking-[6px] shadow-2xl shadow-primary/30 active:scale-95 transition-all" 
                            onClick={handleSave} 
                            disabled={isSaving}
                        >
                            <Save className="mr-4 h-5 w-5" />
                            {isSaving ? 'Synchronizing Grid...' : 'Deploy Identity Link'}
                        </Button>
                    </div>
                  </Card>

                  <Card className="border-none shadow-2xl bg-zinc-50 dark:bg-zinc-900/40 rounded-[44px] overflow-hidden">
                    <div className="p-10 space-y-10">
                        <div className="flex items-center gap-5 pb-8">
                            <div className="h-16 w-16 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500">
                                <ImageIcon className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter uppercase italic">Visual Protocol</h3>
                                <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Asset compliance standards</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {[
                                { title: "Infinitely Scalable", desc: "SVG vectors provide total clarity at any resolution matrix.", status: "REQUIRED" },
                                { title: "Alpha Channels", desc: "Transparent backgrounds eliminate visual interference.", status: "RECOMMENDED" },
                                { title: "Aspect Ratio", desc: "Wide-span horizontal footprints optimise navigational flow.", status: "GUIDELINE" },
                                { title: "Nav Constraints", desc: "System will auto-normalize height to 44px threshold.", status: "ENFORCED" }
                            ].map((tip, i) => (
                                <div key={i} className="flex gap-5 items-start p-6 rounded-[28px] bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-1">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-black text-xs uppercase tracking-tight">{tip.title}</h4>
                                            <span className="text-[7px] font-black uppercase text-zinc-400 tracking-widest bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{tip.status}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-zinc-500 leading-relaxed italic">{tip.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'users' && <UsersManagement />}
            {activeTab === 'packages' && <Packages />}

            {activeTab === 'admin' && isSuperUser && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="grid gap-8 xl:grid-cols-2">
                  <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[44px] overflow-hidden">
                    <div className="p-10 space-y-10">
                        <div className="flex items-center gap-5 border-b border-zinc-100 dark:border-zinc-800 pb-8">
                            <div className="h-16 w-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500">
                                <Database className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter uppercase italic">Data Custodian</h3>
                                <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Archive & recovery management</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="p-8 rounded-[32px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 space-y-6">
                                <div>
                                    <Label className="font-black text-[10px] uppercase tracking-widest opacity-40 block mb-2">Total System Export</Label>
                                    <p className="text-[10px] font-black text-zinc-400 italic leading-relaxed">Compressed neural-archive containing 100% of personnel data, financial ledgers, and operational protocols.</p>
                                </div>
                                <Button className="w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-[4px] bg-zinc-900 text-white hover:bg-black transition-all" onClick={() => exportBackup()}>
                                    <Save className="mr-3 h-4 w-4" /> Generate Grid Snapshot
                                </Button>
                            </div>

                            <div className="p-8 rounded-[32px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 space-y-6">
                                <div>
                                    <Label className="font-black text-[10px] uppercase tracking-widest opacity-40 block mb-2">System Injection</Label>
                                    <p className="text-[10px] font-black text-zinc-400 italic leading-relaxed">Restore previous operational data into the active grid. Caution: Current state will be overwritten.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="file" 
                                        accept=".json" 
                                        id="backup-upload"
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const text = await file.text();
                                            if (confirm('Verify Core Injection? Current grid state will be permanently replaced.')) {
                                                await importBackup(text);
                                                window.location.reload();
                                            }
                                        }}
                                    />
                                    <Button variant="outline" className="w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-[4px] border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => document.getElementById('backup-upload')?.click()}>
                                        <LayoutGrid className="mr-3 h-4 w-4" /> Inject Ext-Archive
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                  </Card>

                  <Card className="border-none shadow-2xl bg-rose-500/5 dark:bg-rose-950/10 rounded-[44px] overflow-hidden border border-rose-500/20">
                    <div className="p-10 space-y-10">
                        <div className="flex items-center gap-5 border-b border-rose-500/20 pb-8">
                            <div className="h-16 w-16 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-rose-500/40 animate-pulse">
                                <ShieldAlert className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter uppercase italic text-rose-600 dark:text-rose-400">Hazard Protocol</h3>
                                <p className="text-rose-500/60 font-black text-[10px] uppercase tracking-[4px]">System Termination Subsite</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-rose-500/10 p-8 rounded-[32px] border border-rose-500/20 space-y-4">
                                <div className="flex items-center gap-3 text-rose-500">
                                    <AlertTriangle className="h-5 w-5" />
                                    <h4 className="font-black text-xs uppercase tracking-tighter">Liquidate Primary Grid</h4>
                                </div>
                                <p className="text-[10px] font-bold text-rose-500/70 leading-relaxed uppercase tracking-widest pl-8">
                                    Execution will permanently purge:
                                </p>
                                <ul className="space-y-2 text-[10px] font-black text-rose-500/50 uppercase tracking-[4px] list-none pl-8">
                                    <li>- PERSONNEL REGISTRY</li>
                                    <li>- FINANCIAL LEDGERS</li>
                                    <li>- SALES PIPELINE data</li>
                                    <li>- TASK ARCHIVES</li>
                                </ul>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-3 px-4">
                                    <Label className="font-black text-[10px] text-rose-500 uppercase tracking-widest text-center block">System Authorization Key</Label>
                                    <Input 
                                    value={confirmText} 
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Type: DELETE ALL"
                                    className="h-20 bg-white dark:bg-zinc-950 border-rose-500/30 font-black text-center uppercase tracking-[8px] text-2xl rounded-[32px] placeholder:opacity-10 placeholder:text-lg focus:border-rose-500"
                                    />
                                </div>
                                <Button 
                                    className="w-full h-24 rounded-[32px] bg-rose-500 text-white font-black text-xl tracking-[8px] uppercase shadow-2xl shadow-rose-500/40 hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-20 flex flex-col gap-1" 
                                    onClick={handleSystemReset}
                                    disabled={confirmText !== 'DELETE ALL' || isResetting}
                                >
                                    {isResetting ? <Activity className="animate-spin h-6 w-6" /> : 'PURGE GRID'}
                                    <span className="text-[8px] tracking-[4px] animate-pulse">Confirming Final Protocol</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
