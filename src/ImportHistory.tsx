import React from 'react';
import { useCRMData, useAuth } from './context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { History, RotateCcw, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { isAdmin } from './types';

export default function ImportHistory() {
  const { importBatches, rollbackImport } = useCRMData();
  const { currentUser } = useAuth();
  const [isConfirmRollbackOpen, setIsConfirmRollbackOpen] = React.useState(false);
  const [batchToRollback, setBatchToRollback] = React.useState<string | null>(null);

  if (!isAdmin(currentUser?.role)) {
    return null;
  }

  const handleRollback = async (batchId: string) => {
    setBatchToRollback(batchId);
    setIsConfirmRollbackOpen(true);
  };

  const confirmRollback = async () => {
    if (batchToRollback) {
      await rollbackImport(batchToRollback);
      setBatchToRollback(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Integrity Verified</Badge>;
      case 'Rolled Back':
        return <Badge variant="outline" className="text-muted-foreground border-zinc-200 dark:border-zinc-800 px-3 py-1 font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5"><RotateCcw className="h-3 w-3" /> Reverted</Badge>;
      default:
        return <Badge variant="secondary" className="px-3 py-1 font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5"><Clock className="h-3 w-3" /> Processing</Badge>;
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-9 font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all shadow-sm">
            <History className="mr-2 h-4 w-4" />
            Archive Feed
          </Button>
        }
      />
      <DialogContent className="max-w-4xl border-none shadow-2xl p-0 overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl max-h-[90vh] flex flex-col">
        <div className="bg-primary/5 p-8 border-b border-primary/10">
          <DialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <History className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight">System Ledger</DialogTitle>
            <DialogDescription className="text-lg font-medium">Audit trail of data injections and environment snapshots.</DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 pt-4">
          <Table>
            <TableHeader className="bg-zinc-50/50 dark:bg-zinc-800/20">
              <TableRow className="border-zinc-100 dark:border-zinc-800">
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-6 pl-4">Timestamp</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Source Identity</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Verification</TableHead>
                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-muted-foreground pr-4">Commands</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {importBatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((batch, idx) => (
                    <motion.tr 
                        key={batch.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                        <TableCell className="py-6 pl-4 font-bold text-sm tracking-tight">
                            {format(parseISO(batch.date), 'MMM d, yyyy · h:mm a')}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 text-muted-foreground rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-xs uppercase tracking-wider line-clamp-1 max-w-[200px]">{batch.fileName}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground italic">Source Data Matrix</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            {getStatusBadge(batch.status)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                            {batch.status === 'Completed' && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all opacity-0 group-hover:opacity-100"
                                onClick={() => handleRollback(batch.id)}
                            >
                                <RotateCcw className="h-3 w-3 mr-2" /> Rollback
                            </Button>
                            )}
                        </TableCell>
                    </motion.tr>
                ))}
              </AnimatePresence>
              {importBatches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-24">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                        <AlertCircle className="h-10 w-10" />
                        <h3 className="font-black uppercase tracking-[4px] text-lg">Empty Ledger</h3>
                        <p className="text-xs font-bold italic">No data injection history recorded in the current environment.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex justify-end">
            <Button variant="secondary" className="font-black uppercase text-[10px] tracking-widest rounded-xl" onClick={() => (document.activeElement as HTMLElement)?.blur()}>
                Close Archive
            </Button>
        </div>
      </DialogContent>

      <ConfirmDialog 
        isOpen={isConfirmRollbackOpen}
        onOpenChange={setIsConfirmRollbackOpen}
        title="Protocol: REVERT"
        description="Initiating rollback will trigger a cascading deletion of all entities associated with this injection signature. This action is terminal and cannot be countermanded."
        onConfirm={confirmRollback}
        variant="destructive"
        confirmText="Confirm Reversion"
      />
    </Dialog>
  );
}
