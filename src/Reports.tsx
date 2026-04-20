import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from './context';
import { 
  format, 
  parseISO, 
  isSameMonth, 
  subMonths, 
  differenceInDays, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval 
} from 'date-fns';
import { Download, TrendingUp, UserMinus, Users, DollarSign, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Reports() {
  const { clients, payments, attendances } = useAppContext();
  const now = new Date();

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Lead Source ROI
  const sourceROI = useMemo(() => {
    const sources = Array.from(new Set(clients.map(c => c.source).filter(Boolean))) as string[];
    return sources.map(source => {
      const sourceLeads = clients.filter(c => c.source === source);
      const converted = sourceLeads.filter(c => c.status !== 'Lead');
      const revenue = payments
        .filter(p => !p.deleted_at && sourceLeads.some(c => c.id === p.clientId))
        .reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);
      
      return {
        Source: source,
        'Total Leads': sourceLeads.length,
        'Converted Count': converted.length,
        'Conversion %': sourceLeads.length > 0 ? ((converted.length / sourceLeads.length) * 100).toFixed(1) + '%' : '0%',
        'Total Revenue': revenue
      };
    });
  }, [clients, payments]);

  // 2. Churn Risk
  const churnRisk = useMemo(() => {
    const activeMembers = clients.filter(c => c.status === 'Active');
    return activeMembers.filter(member => {
      const memberAttendances = attendances.filter(a => a.clientId === member.id);
      if (memberAttendances.length === 0) return true;
      
      const lastAttendance = memberAttendances.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!lastAttendance) return true;
      return differenceInDays(now, parseISO(lastAttendance.date)) > 14;
    }).map(m => {
      const lastAtt = attendances.filter(a => a.clientId === m.id).sort((a, b) => b.date.localeCompare(a.date))[0];
      return {
        Name: m.name,
        Phone: m.phone,
        Status: m.status,
        'Last Attendance': lastAtt ? format(parseISO(lastAtt.date), 'yyyy-MM-dd') : 'Never',
        'Days Absent': lastAtt ? differenceInDays(now, parseISO(lastAtt.date)) : 'N/A'
      };
    });
  }, [clients, attendances]);

  // 3. Cohort Retention
  const cohortRetention = useMemo(() => {
    const cohorts: Record<string, { renewed: number, churned: number }> = {};
    
    clients.forEach(c => {
      if (!c.startDate) return;
      const month = format(parseISO(c.startDate), 'MMM yyyy');
      if (!cohorts[month]) cohorts[month] = { renewed: 0, churned: 0 };
      
      if (c.status === 'Active' || c.status === 'Nearly Expired') {
        cohorts[month].renewed++;
      } else if (c.status === 'Expired') {
        cohorts[month].churned++;
      }
    });

    return Object.entries(cohorts).map(([month, stats]) => ({
      Cohort: month,
      Renewed: stats.renewed,
      Churned: stats.churned,
      'Retention %': (stats.renewed + stats.churned) > 0 
        ? ((stats.renewed / (stats.renewed + stats.churned)) * 100).toFixed(1) + '%' 
        : '0%'
    })).sort((a, b) => b.Cohort.localeCompare(a.Cohort));
  }, [clients]);

  // 4. Revenue Forecast
  const revenueForecast = useMemo(() => {
    // expiring this month
    const expiringThisMonth = clients.filter(c => 
      c.status === 'Active' && 
      c.membershipExpiry && 
      isSameMonth(parseISO(c.membershipExpiry), now)
    );

    const sumExpiringValue = expiringThisMonth.reduce((sum, c) => {
      const clientPayments = payments.filter(p => p.clientId === c.id && !p.deleted_at);
      const lastPayment = clientPayments.sort((a, b) => b.date.localeCompare(a.date))[0];
      return sum + (lastPayment?.amount_paid || lastPayment?.amount || 0);
    }, 0);

    // Calculate renewal rate from last 3 months
    const last3Months = [subMonths(now, 1), subMonths(now, 2), subMonths(now, 3)];
    const monthlyRates = last3Months.map(monthDate => {
      const expiredInMonth = clients.filter(c => 
        c.membershipExpiry && 
        isSameMonth(parseISO(c.membershipExpiry), monthDate)
      );
      
      if (expiredInMonth.length === 0) return null;

      const renewed = expiredInMonth.filter(c => {
        // A member who expired but is currently active/nearly expired is considered renewed
        return c.status === 'Active' || c.status === 'Nearly Expired';
      }).length;

      return renewed / expiredInMonth.length;
    }).filter(rate => rate !== null) as number[];

    const avgRenewalRate = monthlyRates.length > 0 
      ? monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length 
      : 0.7; // Default fallback 70%

    return {
      expiringCount: expiringThisMonth.length,
      sumValue: sumExpiringValue,
      renewalRate: avgRenewalRate,
      forecast: sumExpiringValue * avgRenewalRate
    };
  }, [clients, payments]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Management Reports</h2>
          <p className="text-muted-foreground">Comprehensive insights into lead performance, retention, and revenue projections.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lead Source ROI */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Lead Source ROI
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(sourceROI, 'lead_source_roi')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">ROI (LE)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceROI.map((row) => (
                  <TableRow key={row.Source}>
                    <TableCell className="font-medium">{row.Source}</TableCell>
                    <TableCell className="text-right">{row['Total Leads']}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none">
                        {row['Conversion %']}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {row['Total Revenue'].toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Churn Risk */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-destructive" />
              Churn Risk (14+ Days)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(churnRisk, 'churn_risk')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Days Absent</TableHead>
                    <TableHead className="text-right">Last Visit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {churnRisk.map((row) => (
                    <TableRow key={row.Name}>
                      <TableCell className="font-medium truncate max-w-[150px]">{row.Name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="font-bold">
                          {row['Days Absent']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {row['Last Attendance']}
                      </TableCell>
                    </TableRow>
                  ))}
                  {churnRisk.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        No active members are currently at risk.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cohort Retention */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Cohort Retention
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(cohortRetention, 'cohort_retention')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Churned</TableHead>
                  <TableHead className="text-right">Retention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohortRetention.map((row) => (
                  <TableRow key={row.Cohort}>
                    <TableCell className="font-medium">{row.Cohort}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">{row.Renewed}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">{row.Churned}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-blue-500">
                        {row['Retention %']}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Revenue Forecast */}
        <Card className="shadow-lg border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="h-5 w-5" />
              Revenue Forecast
            </CardTitle>
            <Badge variant="outline" className="border-indigo-500 text-indigo-600">
              {format(now, 'MMMM yyyy')}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background p-4 rounded-xl shadow-sm border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Expiring Members</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{revenueForecast.expiringCount}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
              </div>
              <div className="bg-background p-4 rounded-xl shadow-sm border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Total Value</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{revenueForecast.sumValue.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">LE</span>
                </div>
              </div>
            </div>

            <div className="relative p-6 bg-indigo-600 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/20">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Calendar className="h-24 w-24 text-white" />
              </div>
              <div className="relative z-10">
                <p className="text-indigo-100 text-sm font-medium mb-1">Predicted Renewal Revenue</p>
                <div className="text-4xl font-extrabold text-white mb-2">
                  {Math.round(revenueForecast.forecast).toLocaleString()} <span className="text-lg font-normal opacity-80">LE</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-100 text-xs">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">
                    {(revenueForecast.renewalRate * 100).toFixed(0)}% Avg Renewal Rate
                  </Badge>
                  <span>Based on last 3 months</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => exportToCSV([
                {
                  'Month': format(now, 'yyyy-MM'),
                  'Expiring Count': revenueForecast.expiringCount,
                  'Total Potential Value': revenueForecast.sumValue,
                  'Estimated Renewal Rate': (revenueForecast.renewalRate * 100).toFixed(2) + '%',
                  'Forecasted Revenue': Math.round(revenueForecast.forecast)
                }
              ], `revenue_forecast_${format(now, 'yyyy_MM')}`)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Forecast CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
