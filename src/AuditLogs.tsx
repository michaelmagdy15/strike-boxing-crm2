import React, { useState, useMemo } from 'react';
import { useCRMData, useAuth } from './context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { AuditLog, UserId } from './types';
import { ChevronLeft, ChevronRight, Search, Activity, History, Shield, Fingerprint, Database, Terminal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

const ActionBadge = ({ action }: { action: AuditLog['action'] }) => {
  const base = "border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5 shadow-sm";
  switch (action) {
    case 'CREATE': return <Badge className={`${base} bg-emerald-500 text-white`}>NEW_ENTRY</Badge>;
    case 'UPDATE': return <Badge className={`${base} bg-blue-500 text-white`}>MODIFIED</Badge>;
    case 'DELETE': return <Badge className={`${base} bg-rose-600 text-white`}>PURGED</Badge>;
    default: return <Badge variant="secondary" className={base}>{action}</Badge>;
  }
};

const EntityBadge = ({ entity }: { entity: AuditLog['entityType'] }) => {
  const styles: Record<string, string> = {
    CLIENT: "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20",
    LEAD: "border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-900/20",
    PAYMENT: "border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20",
    SESSION: "border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-900/20",
    TARGET: "border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20",
  };
  
  return (
    <Badge variant="outline" className={`${styles[entity] || ""} border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5`}>
      {entity}
    </Badge>
  );
};

export default function AuditLogs() {
  const { auditLogs } = useCRMData();
  const { users } = useAuth();
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        const matchesType = filter === 'ALL' || log.entityType === filter;
        const matchesSearch = log.details.toLowerCase().includes(search.toLowerCase()) ||
                             (users.find(u => u.id === log.userId as UserId)?.name || '').toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
      });
  }, [auditLogs, filter, search, users]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => 
    filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  , [filteredLogs, currentPage, itemsPerPage]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div>
            <h2 className="text-5xl font-black tracking-tighter uppercase mb-2 italic">Intelligence Archive</h2>
            <div className="flex items-center gap-4">
                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] tracking-widest px-3 py-1 uppercase">Event Ledger</Badge>
                <div className="flex items-center gap-1.5 opacity-40">
                    <History className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Chronological System Trace</span>
                </div>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="relative flex-1 xl:flex-none xl:w-96">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              placeholder="Search details or user legacy..."
              className="h-14 pl-14 bg-white dark:bg-zinc-900 border-none shadow-sm rounded-2xl font-black text-xs uppercase tracking-widest px-6"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          
          <Select value={filter} onValueChange={(val) => {
            setFilter(val || 'ALL');
            setCurrentPage(1);
          }}>
            <SelectTrigger className="h-14 xl:w-[220px] bg-white dark:bg-zinc-900 border-none rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 italic">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              <SelectItem value="ALL" className="font-black text-[10px] uppercase p-4 italic">Global Archive</SelectItem>
              <SelectItem value="CLIENT" className="font-black text-[10px] uppercase p-4 italic">Personnel Records</SelectItem>
              <SelectItem value="LEAD" className="font-black text-[10px] uppercase p-4 italic">Market Opportunities</SelectItem>
              <SelectItem value="PAYMENT" className="font-black text-[10px] uppercase p-4 italic">Commercial Ledgers</SelectItem>
              <SelectItem value="SESSION" className="font-black text-[10px] uppercase p-4 italic">Active Sessions</SelectItem>
              <SelectItem value="TARGET" className="font-black text-[10px] uppercase p-4 italic">Operational Targets</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-[40px] border-none bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden p-0 relative">
        {/* Subtle grid pattern for and tactical feel */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        <div className="p-0 relative">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-800/30">
              <TableRow className="border-zinc-100 dark:border-zinc-800 h-20">
                <TableHead className="pl-10 font-black uppercase text-[10px] tracking-[4px]">Timestamp</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[4px]">Operator</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[4px]">Action</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[4px]">Infrastructure</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-[4px] pr-10">Details Archive</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout" initial={false}>
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log, index) => {
                    const user = users.find(u => u.id === log.userId as UserId);
                    return (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="group border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all h-20"
                      >
                        <TableCell className="pl-10 whitespace-nowrap">
                            <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-black text-primary uppercase tracking-tighter">
                                    {format(parseISO(log.timestamp), 'HH:mm:ss')}
                                </span>
                                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                                    {format(parseISO(log.timestamp), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-black text-[10px] border border-zinc-200 dark:border-zinc-700">
                                    {user?.name?.charAt(0) || 'S'}
                                </div>
                                <span className="font-black text-xs uppercase tracking-tight italic">
                                    {user?.name || 'SYSTEM_AUTO'}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell>
                          <EntityBadge entity={log.entityType} />
                        </TableCell>
                        <TableCell className="pr-10">
                            <div className="max-w-[400px] xl:max-w-none text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity italic">
                                {log.details}
                            </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-32">
                        <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
                            <div className="h-20 w-20 rounded-[30px] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Terminal className="h-8 w-8 text-zinc-300" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-zinc-500 font-black uppercase text-xs tracking-[4px]">Void Data Ledger</p>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">No operational events detected within current parameters</p>
                            </div>
                        </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between p-8 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/10">
            <div className="text-[10px] font-black uppercase tracking-[4px] text-zinc-400 mb-4 md:mb-0 bg-white dark:bg-zinc-900 px-6 py-2 rounded-full border border-zinc-100 dark:border-zinc-800">
              Showing <span className="text-primary italic">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-primary italic">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-primary italic">{filteredLogs.length}</span> events
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 translate-x-0 active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Back-Trace
              </Button>
              <div className="flex items-center gap-2">
                 {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                        <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                                "h-10 w-10 rounded-xl font-black text-[10px] transition-all",
                                currentPage === pageNum 
                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
                                    : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                        >
                            {pageNum.toString().padStart(2, '0')}
                        </button>
                    )
                 })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-20 active:scale-95 transition-all"
              >
                Forward <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
