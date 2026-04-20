import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppContext } from '../context';
import { User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface UserPerformanceDialogProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function UserPerformanceDialog({ user, isOpen, onClose }: UserPerformanceDialogProps) {
  const { userTargets, payments, updateUserTarget, clients } = useAppContext();
  
  // Find current month string (e.g. '2026-04')
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const existingCurrentTarget = userTargets.find(t => t.userId === user.id && t.month === currentMonthStr);
  const [newTarget, setNewTarget] = useState(existingCurrentTarget?.targetAmount.toString() || '');
  const [newPrivateTarget, setNewPrivateTarget] = useState(existingCurrentTarget?.privateTarget?.toString() || '0');
  const [newGroupTarget, setNewGroupTarget] = useState(existingCurrentTarget?.groupTarget?.toString() || '0');
  
  const handleSaveTarget = () => {
    const totalAmt = parseFloat(newTarget);
    const privateAmt = parseFloat(newPrivateTarget);
    const groupAmt = parseFloat(newGroupTarget);

    if (!isNaN(totalAmt) && totalAmt >= 0) {
      updateUserTarget(user.id, currentMonthStr, totalAmt, privateAmt, groupAmt);
    }
  };

  // Generate last 6 months data for chart
  const performanceData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
    
    return months.map(date => {
      const monthStr = format(date, 'yyyy-MM');
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      
      const targetDoc = userTargets.find(t => t.userId === user.id && t.month === monthStr);
      const targetAmount = targetDoc ? targetDoc.targetAmount : 0;
      const privateTarget = targetDoc ? (targetDoc.privateTarget || 0) : 0;
      const groupTarget = targetDoc ? (targetDoc.groupTarget || 0) : 0;
      
      // Calculate achieved by getting payments in this month attributed to this user
      const monthPayments = payments.filter(p => {
        const pDate = parseISO(p.date);
        if (!isWithinInterval(pDate, { start, end })) return false;
        
        const client = clients.find(c => c.id === p.clientId);
        
        // Branch Check
        if (user.branch && user.branch.toLowerCase() !== 'all') {
          if (client?.branch !== user.branch) return false;
        }

        if (p.recordedBy === user.id) return true;
        // Fallback for older data: if recordedBy is missing, check if the client is currently assigned to this rep
        if (!p.recordedBy && client) {
          if (client.assignedTo === user.id) return true;
        }
        return false;
      });

      const achievedAmount = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      
      // Breakdown by session type
      const privatePayments = monthPayments.filter(p => p.packageType.toLowerCase().includes('private'));
      const groupPayments = monthPayments.filter(p => p.packageType.toLowerCase().includes('group') || p.packageType.toLowerCase().includes('gt'));

      const privateSessionsSold = privatePayments.length;
      const groupSessionsSold = groupPayments.length;
      const privateRevenue = privatePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const groupRevenue = groupPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      return {
        month: format(date, 'MMM yyyy'),
        targetAmount,
        achievedAmount,
        privateSessionsSold,
        groupSessionsSold,
        privateRevenue,
        groupRevenue,
        privateTarget,
        groupTarget,
        isTargetMet: targetAmount > 0 && achievedAmount >= targetAmount
      };
    });
  }, [userTargets, payments, clients, user.id]);

  // Determine current month's breakdown to show separately
  const currentMonthData = performanceData[performanceData.length - 1];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Performance: {user.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 border rounded-md bg-muted/20">
              <h4 className="font-semibold text-sm">Set Targets ({format(new Date(), 'MMM yyyy')})</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Total Amount (LE)</Label>
                  <Input 
                    type="number" 
                    value={newTarget} 
                    onChange={e => setNewTarget(e.target.value)}
                    placeholder="e.g. 50000"
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Private Target</Label>
                    <Input 
                      type="number" 
                      value={newPrivateTarget} 
                      onChange={e => setNewPrivateTarget(e.target.value)}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Group Target</Label>
                    <Input 
                      type="number" 
                      value={newGroupTarget} 
                      onChange={e => setNewGroupTarget(e.target.value)}
                      placeholder="0"
                      className="h-8"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveTarget} className="w-full mt-2">Save Targets</Button>
              </div>
            </div>
            
            <div className="space-y-3 p-4 border rounded-md bg-muted/20">
              <h4 className="font-semibold text-sm">Current Month Status</h4>
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Target:</span>
                  <span className="font-medium">{currentMonthData?.targetAmount.toLocaleString()} LE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Achieved:</span>
                  <span className={`font-medium ${currentMonthData?.isTargetMet ? 'text-emerald-500' : ''}`}>
                    {currentMonthData?.achievedAmount.toLocaleString()} LE
                  </span>
                </div>
                
                <div className="border-t pt-2 mt-2 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Sessions Breakdown</span>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-muted-foreground block">Private Training</span>
                      <span className="text-base font-bold">
                        {currentMonthData?.privateRevenue.toLocaleString()} <span className="text-[10px] font-normal">LE</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">
                        {currentMonthData?.privateSessionsSold} sessions
                      </span>
                      {(currentMonthData?.privateTarget ?? 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">of {currentMonthData?.privateTarget} target</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-muted-foreground block">Group Training</span>
                      <span className="text-base font-bold">
                        {currentMonthData?.groupRevenue.toLocaleString()} <span className="text-[10px] font-normal">LE</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">
                        {currentMonthData?.groupSessionsSold} sessions
                      </span>
                      {(currentMonthData?.groupTarget ?? 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground block mt-0.5">of {currentMonthData?.groupTarget} target</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Historical Performance (6 Months)</h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString()}`, 'Amount']}
                    cursor={{fill: 'transparent'}}
                  />
                  <Legend />
                  <Bar dataKey="targetAmount" name="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="achievedAmount" name="Achieved" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
