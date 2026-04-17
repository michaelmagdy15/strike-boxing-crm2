import React, { useState, useRef, useCallback } from 'react';
import { useCRMData, useAuth } from './context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Activity, Cpu, Database, LayoutGrid, Terminal } from 'lucide-react';
import Papa from 'papaparse';
import { addDays } from 'date-fns';
import { Client } from './types';
import { FileUploader } from './components/import/FileUploader';
import { ColumnMapper } from './components/import/ColumnMapper';
import { ImportProgress, ImportSummary } from './components/import/ImportStatus';
import { motion, AnimatePresence } from 'motion/react';

interface ImportDataProps {
  type: 'Lead' | 'Active';
}

export default function ImportData({ type }: ImportDataProps) {
  const { bulkAddClients, packages, addImportBatch } = useCRMData();
  const { currentUser } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'confirm'>('upload');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0, errors: [] as {row: number, reason: string}[] });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fields = [
    { key: 'name', label: 'Operator Name', required: true },
    { key: 'phone', label: 'Communication Hash', required: true },
    { key: 'branch', label: 'Sector / Branch' },
    { key: 'source', label: 'Acquisition Source' },
    { key: 'packageType', label: 'Service Protocol' },
    { key: 'sessionsRemaining', label: 'Active Balance' },
    { key: 'membershipExpiry', label: 'Authorization End' },
  ];

  const processParsedData = useCallback((results: Papa.ParseResult<any>) => {
    const parsedHeaders = results.meta.fields || [];
    setHeaders(parsedHeaders);
    setData(results.data);
    
    const newMapping: Record<string, string> = {};
    const fieldAliases: Record<string, string[]> = {
      name: ['name', 'full name', 'client', 'customer', 'member', 'lead', 'اسم', 'الاسم'],
      phone: ['phone', 'mobile', 'number', 'tel', 'contact', 'whatsapp', 'رقم', 'تليفون', 'هاتف', 'موبايل'],
      branch: ['branch', 'location', 'gym', 'فرع'],
      source: ['source', 'how did you hear', 'referral', 'origin', 'مصدر', 'من اين'],
      packageType: ['package', 'plan', 'membership', 'type', 'subscription', 'باقة', 'نوع الباقة'],
      sessionsRemaining: ['session', 'remaining', 'left', 'balance', 'count', 'جلسات', 'متبقي'],
      membershipExpiry: ['expiry', 'end date', 'valid until', 'expires', 'date', 'انتهاء', 'تاريخ الانتهاء']
    };

    fields.forEach(field => {
      const aliases = fieldAliases[field.key] || [field.key];
      let match = parsedHeaders.find(h => aliases.some(alias => h.toLowerCase() === alias.toLowerCase()));
      if (!match) {
        match = parsedHeaders.find(h => aliases.some(alias => h.toLowerCase().includes(alias.toLowerCase())));
      }
      if (match) newMapping[field.key] = match;
    });

    setMapping(newMapping);
    setStep('map');
    setIsLoading(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsLoading(true);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: processParsedData,
        error: (err) => {
          setError(`Matrix parsing error: ${err.message}`);
          setIsLoading(false);
        }
      });
    }
  };

  const handleFetchUrl = async () => {
    if (!url) return;
    setIsLoading(true);
    setError(null);
    try {
      let fetchUrl = url;
      if (url.includes('docs.google.com/spreadsheets')) {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (idMatch) fetchUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Ingestion failed. Ensure external link is public.');
      
      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: processParsedData,
        error: (err) => {
          setError(`External parsing error: ${err.message}`);
          setIsLoading(false);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network protocol failure');
      setIsLoading(false);
    }
  };

  const performImport = async (importData: any[], importMapping: Record<string, string>) => {
    setStep('importing');
    setProgress(0);
    
    const now = new Date();
    const batchId = await addImportBatch({
      date: now.toISOString(),
      fileName: file ? file.name : (url ? 'External Archive' : 'Manual Entry'),
      importedCount: 0,
      failedCount: 0,
      errors: [],
      status: 'Completed'
    });

    const clientsToImport: Client[] = [];
    const errors: {row: number, reason: string}[] = [];
    let failedCount = 0;

    for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        try {
            let name = (row[importMapping['name']] || '').toString().trim();
            let phone = (row[importMapping['phone']] || '').toString().replace(/[^\d+]/g, '');
            
            if (!name || !phone) {
                failedCount++;
                errors.push({ row: i + 1, reason: 'Identifier mismatch (Missing Name/Hash)' });
                continue;
            }

            let branchRaw = (row[importMapping['branch']] || '').toString().trim().toUpperCase();
            let source = (row[importMapping['source']] || 'Inorganic').toString().trim();
            let packageType = (row[importMapping['packageType']] || '').toString().trim();
            let sessionsRemainingRaw = row[importMapping['sessionsRemaining']];
            let membershipExpiryRaw = row[importMapping['membershipExpiry']];

            if (!packageType && sessionsRemainingRaw) {
                const s = Number(sessionsRemainingRaw);
                const pkg = packages.find(p => p.sessions === s);
                if (pkg) packageType = pkg.name;
            }

            let membershipExpiry: string | undefined;
            if (membershipExpiryRaw) {
                const date = new Date(membershipExpiryRaw);
                if (!isNaN(date.getTime())) membershipExpiry = date.toISOString();
            }

            if (!membershipExpiry && packageType) {
              const pkg = packages.find(p => p.name.toLowerCase() === packageType.toLowerCase());
              if (pkg) membershipExpiry = addDays(now, 30).toISOString();
            }

            let sessionsRemaining: number | 'no attend' | undefined;
            if (sessionsRemainingRaw !== undefined && sessionsRemainingRaw !== '') {
                const s = Number(sessionsRemainingRaw);
                sessionsRemaining = isNaN(s) ? (sessionsRemainingRaw.toString().toLowerCase().includes('no') ? 'no attend' : undefined) : s;
            }

            let branch: 'COMPLEX' | 'MIVIDA' | undefined;
            if (branchRaw.includes('COMPLEX')) branch = 'COMPLEX';
            else if (branchRaw.includes('MIVIDA')) branch = 'MIVIDA';

            clientsToImport.push({
                id: crypto.randomUUID(),
                name, phone, status: type as any, source, branch,
                packageType: packageType || 'None',
                sessionsRemaining, membershipExpiry,
                comments: [], lastContactDate: now.toISOString(),
                assignedTo: currentUser?.role === 'rep' ? currentUser.id : undefined,
                importBatchId: batchId
            });
        } catch (err) {
            failedCount++;
            errors.push({ row: i + 1, reason: 'Sequence interruption' });
        }
        
        if (i % 50 === 0) setProgress(Math.round((i / importData.length) * 50));
    }
    
    setProgress(75);
    const result = await bulkAddClients(clientsToImport);
    
    setProgress(100);
    setImportStats({ 
      success: result.success, 
      failed: failedCount + result.failed, 
      errors: [...errors, ...result.errors] 
    });
    setStep('confirm');
  };

  const handleSmartImport = async () => {
    if (url) await handleFetchUrl();
    else if (file) {
        if (mapping['name'] && mapping['phone']) {
            await performImport(data, mapping);
        }
    }
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setData([]);
    setMapping({});
    setStep('upload');
    setError(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 bg-white/50 dark:bg-zinc-900 border-none shadow-sm hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest px-6">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" />
            Ingest {type}s
          </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 border-none shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[40px]">
        <div className="bg-primary p-12 relative overflow-hidden">
            {/* Visual background details */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="absolute top-0 right-0 p-8 opacity-20">
                <Database className="h-32 w-32 text-white" />
            </div>
            
            <DialogHeader className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <Terminal className="h-6 w-6 text-white" />
                    </div>
                    <Badge className="bg-white/10 text-white border-none font-black text-[9px] tracking-widest px-3 py-1 uppercase">Stage {step === 'upload' ? '01' : step === 'map' ? '02' : step === 'importing' ? '03' : '04'}</Badge>
                </div>
                <DialogTitle className="text-5xl font-black tracking-tighter text-white uppercase italic">
                    Data Ingestion Matrix
                </DialogTitle>
                <div className="flex items-center gap-2 text-white/60 font-black text-[10px] uppercase tracking-widest mt-2">
                    <Activity className="h-3 w-3 animate-pulse" />
                    {step === 'upload' ? 'SOURCE IDENTIFICATION' : step === 'map' ? 'FIELD SYNCHRONIZATION' : step === 'importing' ? 'INGESTION IN PROGRESS' : 'MISSION COMPLETE'}
                </div>
            </DialogHeader>
        </div>

        <div className="p-12">
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                >
                    {step === 'upload' && (
                        <FileUploader 
                            file={file}
                            url={url}
                            isLoading={isLoading}
                            error={error}
                            onFileChange={handleFileChange}
                            onUrlChange={setUrl}
                            onFetchUrl={handleFetchUrl}
                            onSmartImport={handleSmartImport}
                            fileInputRef={fileInputRef}
                        />
                    )}

                    {step === 'map' && (
                        <ColumnMapper 
                            fields={fields}
                            headers={headers}
                            mapping={mapping}
                            onMappingChange={(key, val) => setMapping(prev => ({ ...prev, [key]: val }))}
                            onStartImport={() => performImport(data, mapping)}
                            onBack={() => setStep('upload')}
                            rowCount={data.length}
                        />
                    )}

                    {step === 'importing' && <ImportProgress progress={progress} />}

                    {step === 'confirm' && (
                        <ImportSummary 
                            stats={importStats}
                            onClose={reset}
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
