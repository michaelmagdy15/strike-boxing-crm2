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
  
  const handleSaveTarget = () => {
    const targetAmt = parseFloat(newTarget);
    if (!isNaN(targetAmt) && targetAmt >= 0) {
      updateUserTarget(user.id, currentMonthStr, targetAmt);
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
      
      // Calculate achieved by getting payments in this month attributed to this user
      const monthPayments = payments.filter(p => {
        const pDate = parseISO(p.date);
        if (!isWithinInterval(pDate, { start, end })) return false;
        
        if (p.recordedBy === user.id) return true;
        // Fallback for older data: if recordedBy is missing, check if the client is currently assigned to this rep
        if (!p.recordedBy) {
          const client = clients.find(c => c.id === p.clientId);
          if (client && client.assignedTo === user.id) return true;
        }
        return false;
      });

      const achievedAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Breakdown by session type
      const privateSessionsSold = monthPayments.filter(p => p.packageType.toLowerCase().includes('private')).length;
      const groupSessionsSold = monthPayments.filter(p => p.packageType.toLowerCase().includes('group') || p.packageType.toLowerCase().includes('gt')).length;

      return {
        month: format(date, 'MMM yyyy'),
        targetAmount,
        achievedAmount,
        privateSessionsSold,
        groupSessionsSold,
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
            <div className="space-y-3 p-4 border rounded-md bg-muted/20">
              <h4 className="font-semibold text-sm">Set Target ({format(new Date(), 'MMM yyyy')})</h4>
              <div className="space-y-2">
                <Label>Monthly Target Amount (LE)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={newTarget} 
                    onChange={e => setNewTarget(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                  <Button onClick={handleSaveTarget}>Save</Button>
                </div>
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
                
                <div className="border-t pt-2 mt-2">
                  <span className="text-xs uppercase font-bold text-muted-foreground">Session Breakdown</span>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Private:</span>
                    <span className="font-medium">{currentMonthData?.privateSessionsSold} sold</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Group:</span>
                    <span className="font-medium">{currentMonthData?.groupSessionsSold} sold</span>
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
                    formatter={(value: number) => [`${value.toLocaleString()}`, 'Amount']}
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
