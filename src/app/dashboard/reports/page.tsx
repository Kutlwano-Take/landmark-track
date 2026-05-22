'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download, FileText, TrendingUp, Building2, Users, DollarSign,
  Wrench, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';

const REPORT_TYPES = [
  { id: 'monthly-revenue', label: 'Monthly Revenue', icon: TrendingUp, desc: 'Total rent collected per month' },
  { id: 'occupancy', label: 'Occupancy Report', icon: Building2, desc: 'Occupied vs vacant units' },
  { id: 'vacancy', label: 'Vacancy Report', icon: Building2, desc: 'Vacant units and income loss' },
  { id: 'late-payments', label: 'Late Payments', icon: DollarSign, desc: 'Overdue payments and aging' },
  { id: 'property-performance', label: 'Property Performance', icon: Building2, desc: 'Revenue by property' },
  { id: 'maintenance-costs', label: 'Maintenance Costs', icon: Wrench, desc: 'Cost breakdown by category' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState('monthly-revenue');
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0],
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', selectedReport, dateFrom, dateTo, user?.id],
    queryFn: async () => {
      const userId = user!.id;

      switch (selectedReport) {
        case 'monthly-revenue': {
          const { data } = await supabase
            .from('payments')
            .select('amount_paid, due_date, status')
            .eq('owner_id', userId)
            .eq('status', 'paid')
            .gte('due_date', dateFrom)
            .lte('due_date', dateTo)
            .order('due_date', { ascending: true });
          const rows = data ?? [];
          const byMonth: Record<string, number> = {};
          rows.forEach((r) => {
            const m = r.due_date.slice(0, 7);
            byMonth[m] = (byMonth[m] ?? 0) + Number(r.amount_paid);
          });
          return { rows, byMonth, total: rows.reduce((s, r) => s + Number(r.amount_paid), 0) };
        }
        case 'occupancy':
        case 'vacancy': {
          const { data } = await supabase
            .from('units')
            .select('occupancy_status, condition_status, rent_amount')
            .eq('owner_id', userId);
          const rows = data ?? [];
          const occupied = rows.filter((u) => u.occupancy_status === 'occupied').length;
          const vacant = rows.filter((u) => u.occupancy_status === 'vacant').length;
          const reserved = rows.filter((u) => u.occupancy_status === 'reserved').length;
          const maintenance = rows.filter((u) => u.occupancy_status === 'maintenance').length;
          const potentialIncome = rows
            .filter((u) => u.occupancy_status === 'vacant')
            .reduce((s, u) => s + Number(u.rent_amount), 0);
          return { rows, occupied, vacant, reserved, maintenance, total: rows.length, potentialIncome };
        }
        case 'late-payments': {
          const { data } = await supabase
            .from('payments')
            .select('amount_due, amount_paid, due_date, status, leases!inner(tenants!inner(full_name), units!inner(unit_number))')
            .eq('owner_id', userId)
            .eq('status', 'overdue')
            .order('due_date', { ascending: true });
          const rows = (data ?? []) as any[];
          return {
            rows,
            totalOverdue: rows.reduce((s, r) => s + (Number(r.amount_due) - Number(r.amount_paid)), 0),
            count: rows.length,
          };
        }
        case 'property-performance': {
          const { data: props } = await supabase
            .from('properties')
            .select('id, name')
            .eq('owner_id', userId);
          const propertyIds = (props ?? []).map((p) => p.id);
          const { data: unitsData } = await supabase
            .from('units')
            .select('id, property_id, rent_amount, occupancy_status')
            .eq('owner_id', userId)
            .in('property_id', propertyIds);
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount_paid, due_date, lease_id, leases!inner(unit_id, units!inner(property_id))')
        .eq('owner_id', userId)
        .eq('status', 'paid')
        .gte('due_date', dateFrom)
        .lte('due_date', dateTo);

      const units = unitsData ?? [];
      const payments = (paymentsData ?? []) as any[];

          const byProperty: Record<string, { name: string; units: number; occupied: number; revenue: number }> = {};
          (props ?? []).forEach((p) => {
            byProperty[p.id] = { name: p.name, units: 0, occupied: 0, revenue: 0 };
          });
          units.forEach((u) => {
            if (byProperty[u.property_id]) {
              byProperty[u.property_id].units++;
              if (u.occupancy_status === 'occupied') byProperty[u.property_id].occupied++;
            }
          });
          payments.forEach((p) => {
            const propId = p.leases?.units?.property_id;
            if (propId && byProperty[propId]) {
              byProperty[propId].revenue += Number(p.amount_paid);
            }
          });
          return { rows: Object.values(byProperty) };
        }
        case 'maintenance-costs': {
          const { data } = await supabase
            .from('maintenance_requests')
            .select('priority, estimated_cost, actual_cost, status')
            .eq('owner_id', userId)
            .gte('created_at', dateFrom)
            .lte('created_at', dateTo);
          const rows = data ?? [];
          const totalEstimated = rows.reduce((s, r) => s + Number(r.estimated_cost ?? 0), 0);
          const totalActual = rows.reduce((s, r) => s + Number(r.actual_cost ?? 0), 0);
          return { rows, totalEstimated, totalActual, count: rows.length };
        }
        default:
          return null;
      }
    },
    enabled: !!user,
  });

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success(`${format.toUpperCase()} export — coming soon`);
  };

  const renderReport = () => {
    if (isLoading) return <div className="animate-pulse space-y-3"><div className="h-40 bg-surface-light rounded-xl" /></div>;
    if (!reportData) return null;

    switch (selectedReport) {
      case 'monthly-revenue': {
        const d = reportData as any;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">Total Collected</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(d.total)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">Period</p>
                <p className="text-sm font-medium mt-1">{formatDate(dateFrom)} — {formatDate(dateTo)}</p>
              </div>
            </div>
            {Object.keys(d.byMonth).length === 0 ? (
              <p className="text-sm text-text-secondary">No data for this period.</p>
            ) : (
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-surface-light">
                    <th className="text-left p-3 font-medium">Month</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(d.byMonth).map(([month, amount]) => (
                      <tr key={month} className="border-b border-border last:border-0">
                        <td className="p-3">{month}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(amount as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      case 'occupancy': {
        const d = reportData as any;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Total Units</p><p className="text-xl font-bold mt-1">{d.total}</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Occupied</p><p className="text-xl font-bold text-success mt-1">{d.occupied}</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Vacant</p><p className="text-xl font-bold text-info mt-1">{d.vacant}</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Occupancy Rate</p><p className="text-xl font-bold mt-1">{d.total > 0 ? Math.round((d.occupied / d.total) * 100) : 0}%</p></div>
            </div>
            {d.total > 0 && (
              <div className="h-4 rounded-full bg-surface-light overflow-hidden">
                <div className="h-full rounded-full bg-success" style={{ width: `${(d.occupied / d.total) * 100}%` }} />
              </div>
            )}
          </div>
        );
      }
      case 'vacancy': {
        const d = reportData as any;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Vacant Units</p><p className="text-xl font-bold text-info mt-1">{d.vacant}</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Potential Income Loss</p><p className="text-xl font-bold text-warning mt-1">{formatCurrency(d.potentialIncome)}/mo</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Reserved</p><p className="text-xl font-bold mt-1">{d.reserved}</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Maintenance Holds</p><p className="text-xl font-bold mt-1">{d.maintenance}</p></div>
            </div>
          </div>
        );
      }
      case 'late-payments': {
        const d = reportData as any;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">Overdue Count</p>
                <p className="text-xl font-bold text-error mt-1">{d.count}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-text-muted">Total Overdue Amount</p>
                <p className="text-xl font-bold text-error mt-1">{formatCurrency(d.totalOverdue)}</p>
              </div>
            </div>
            {d.rows.length === 0 ? (
              <p className="text-sm text-text-secondary">No overdue payments.</p>
            ) : (
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-surface-light">
                    <th className="text-left p-3 font-medium">Tenant</th>
                    <th className="text-left p-3 font-medium">Unit</th>
                    <th className="text-right p-3 font-medium">Due</th>
                    <th className="text-right p-3 font-medium">Overdue</th>
                    <th className="text-right p-3 font-medium">Date</th>
                  </tr></thead>
                  <tbody>
                    {d.rows.map((r: any) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="p-3">{r.leases?.tenants?.full_name}</td>
                        <td className="p-3">Unit {r.leases?.units?.unit_number}</td>
                        <td className="p-3 text-right">{formatCurrency(r.amount_due)}</td>
                        <td className="p-3 text-right text-error">{formatCurrency(Number(r.amount_due) - Number(r.amount_paid))}</td>
                        <td className="p-3 text-right">{formatDate(r.due_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      case 'property-performance': {
        const d = reportData as any;
        return (
          <div className="space-y-4">
            {d.rows.length === 0 ? (
              <p className="text-sm text-text-secondary">No data for this period.</p>
            ) : (
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-surface-light">
                    <th className="text-left p-3 font-medium">Property</th>
                    <th className="text-right p-3 font-medium">Units</th>
                    <th className="text-right p-3 font-medium">Occupied</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                  </tr></thead>
                  <tbody>
                    {d.rows.map((r: any) => (
                      <tr key={r.name} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3 text-right">{r.units}</td>
                        <td className="p-3 text-right text-success">{r.occupied}</td>
                        <td className="p-3 text-right">{formatCurrency(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      case 'maintenance-costs': {
        const d = reportData as any;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Requests</p><p className="text-xl font-bold mt-1">{d.count}</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Est. Cost</p><p className="text-xl font-bold mt-1">{formatCurrency(d.totalEstimated)}</p></div>
              <div className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-text-muted">Actual Cost</p><p className="text-xl font-bold mt-1">{formatCurrency(d.totalActual)}</p></div>
            </div>
            {d.rows.length > 0 && (
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-surface-light">
                    <th className="text-left p-3 font-medium">Priority</th>
                    <th className="text-right p-3 font-medium">Est. Cost</th>
                    <th className="text-right p-3 font-medium">Actual Cost</th>
                  </tr></thead>
                  <tbody>
                    {d.rows.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-3 capitalize">{r.priority}</td>
                        <td className="p-3 text-right">{r.estimated_cost ? formatCurrency(r.estimated_cost) : '—'}</td>
                        <td className="p-3 text-right">{r.actual_cost ? formatCurrency(r.actual_cost) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Reports</h1>
          <p className="text-sm text-text-secondary mt-1">Generate insights about your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('csv')} className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button onClick={() => handleExport('excel')} className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={() => handleExport('pdf')} className="btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-text-muted" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
          <span className="text-text-muted">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
        </div>
      </div>

      {/* Report Type Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              onClick={() => setSelectedReport(rt.id)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                selectedReport === rt.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:border-primary/30',
              )}
            >
              <Icon className={cn('h-5 w-5 mb-2', selectedReport === rt.id ? 'text-primary' : 'text-text-muted')} />
              <h3 className="text-sm font-medium">{rt.label}</h3>
              <p className="text-xs text-text-secondary mt-0.5">{rt.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Report Output */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold mb-4">
          {REPORT_TYPES.find((rt) => rt.id === selectedReport)?.label}
        </h2>
        {renderReport()}
      </div>
    </div>
  );
}
