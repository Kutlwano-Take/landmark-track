'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2, Home, Users, DoorOpen, AlertTriangle, TrendingUp, Wallet, Wrench,
  Calendar, CreditCard, Bell,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      const userId = user!.id;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const [propsRes, unitsRes, tenantsRes, paymentsRes, maintRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
        supabase.from('units').select('id, occupancy_status, condition_status, rent_amount').eq('owner_id', userId),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('status', 'active'),
        supabase.from('payments').select('amount_due, amount_paid, status, due_date, paid_date, payment_type').eq('owner_id', userId),
        supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('owner_id', userId).neq('status', 'completed'),
      ]);

      const units = unitsRes.data ?? [];
      const payments = paymentsRes.data ?? [];

      const occupied = units.filter((u) => u.occupancy_status === 'occupied').length;
      const vacant = units.filter((u) => u.occupancy_status === 'vacant').length;
      const damaged = units.filter((u) =>
        ['damaged', 'uninhabitable'].includes(u.condition_status),
      ).length;

      const monthPayments = payments.filter((p) => p.due_date >= monthStart);
      const monthlyRevenue = monthPayments
        .filter((p) => p.status === 'paid')
        .reduce((s, p) => s + Number(p.amount_paid), 0);
      const outstanding = payments
        .filter((p) => p.status === 'overdue' || p.status === 'partial')
        .reduce((s, p) => s + (Number(p.amount_due) - Number(p.amount_paid)), 0);
      const collectionRate = monthPayments.length > 0
        ? Math.round((monthPayments.filter((p) => p.status === 'paid').length / monthPayments.length) * 100)
        : 0;
      const occupancyRate = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0;

      return {
        properties: propsRes.count ?? 0,
        totalUnits: units.length,
        occupied,
        vacant,
        damaged,
        activeTenants: tenantsRes.count ?? 0,
        monthlyRevenue,
        outstanding,
        occupancyRate,
        collectionRate,
        pendingMaintenance: maintRes.count ?? 0,
        rentPaid: monthPayments.filter((p) => p.status === 'paid').length,
        rentDue: monthPayments.filter((p) => p.status === 'due').length,
        rentOverdue: monthPayments.filter((p) => p.status === 'overdue').length,
        expectedIncome: monthPayments.reduce((s, p) => s + Number(p.amount_due), 0),
      };
    },
    enabled: !!user,
  });

  // Fetch leases expiring soon
  const { data: expiringLeases } = useQuery({
    queryKey: ['expiring-leases', user?.id],
    queryFn: async () => {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      const { data } = await supabase
        .from('leases')
        .select('id, start_date, end_date, rent_amount, status, tenants!inner(full_name), units!inner(unit_number)')
        .eq('owner_id', user!.id)
        .eq('status', 'active')
        .lte('end_date', thirtyDays.toISOString().split('T')[0])
        .order('end_date', { ascending: true })
        .limit(5);
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  // Fetch recent payments
  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount_paid, amount_due, status, due_date, paid_date, payment_type, leases!inner(tenants!inner(full_name), units!inner(unit_number))')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  // Fetch recent maintenance
  const { data: recentMaintenance } = useQuery({
    queryKey: ['recent-maintenance', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('id, title, priority, status, created_at, unit_id, units!inner(unit_number)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const KPI_CARDS = [
    { label: 'Properties', value: stats?.properties ?? 0, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Units', value: stats?.totalUnits ?? 0, icon: Home, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Occupied', value: stats?.occupied ?? 0, icon: Users, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Vacant', value: stats?.vacant ?? 0, icon: DoorOpen, color: 'text-info', bg: 'bg-info/10' },
    { label: 'Damaged', value: stats?.damaged ?? 0, icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10' },
    { label: 'Active Tenants', value: stats?.activeTenants ?? 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Monthly Revenue', value: formatCurrency(stats?.monthlyRevenue ?? 0), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Outstanding', value: formatCurrency(stats?.outstanding ?? 0), icon: Wallet, color: 'text-error', bg: 'bg-error/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time overview of your portfolio.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.label}
            className={cn(
              'rounded-xl border border-border bg-surface p-4 lg:p-5 transition-all hover:shadow-lg hover:shadow-primary/5',
              isLoading && 'animate-pulse',
            )}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  {card.label}
                </p>
                <p className={cn('text-xl lg:text-2xl font-bold', isLoading ? 'text-text-muted' : '')}>
                  {isLoading ? '—' : card.value}
                </p>
              </div>
              <div className={cn('grid h-9 w-9 place-items-center rounded-lg', card.bg)}>
                <card.icon className={cn('h-4 w-4', card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Occupancy Rate</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-2xl font-bold">{isLoading ? '—' : `${stats?.occupancyRate ?? 0}%`}</p>
            <div className="flex-1 mx-3 h-2 rounded-full bg-surface-light overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${stats?.occupancyRate ?? 0}%` }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Collection Rate</p>
          <p className="mt-2 text-2xl font-bold">{isLoading ? '—' : `${stats?.collectionRate ?? 0}%`}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Expected Income</p>
          <p className="mt-2 text-2xl font-bold">{isLoading ? '—' : formatCurrency(stats?.expectedIncome ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Pending Maintenance</p>
          <p className="mt-2 text-2xl font-bold">{isLoading ? '—' : stats?.pendingMaintenance ?? 0}</p>
        </div>
      </div>

      {/* Rent Summary & Expiring Leases */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rent Summary */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Rent Collection This Month
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-xl font-bold text-success">{stats?.rentPaid ?? 0}</p>
              <p className="text-xs text-success mt-1">Paid</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xl font-bold text-warning">{stats?.rentDue ?? 0}</p>
              <p className="text-xs text-warning mt-1">Due</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-error/10 border border-error/20">
              <p className="text-xl font-bold text-error">{stats?.rentOverdue ?? 0}</p>
              <p className="text-xs text-error mt-1">Overdue</p>
            </div>
          </div>
          <Link
            href="/dashboard/payments"
            className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:text-primary-light"
          >
            View all payments &rarr;
          </Link>
        </div>

        {/* Expiring Leases */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-warning" />
            Leases Expiring Soon
          </h3>
          {!expiringLeases || expiringLeases.length === 0 ? (
            <p className="text-sm text-text-secondary">No leases expiring in the next 30 days.</p>
          ) : (
            <div className="space-y-2">
              {expiringLeases.map((lease) => (
                <div
                  key={lease.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-light"
                >
                  <div>
                    <p className="text-sm font-medium">{lease.tenants?.full_name}</p>
                    <p className="text-xs text-text-secondary">
                      Unit {lease.units?.unit_number} &middot; {formatCurrency(lease.rent_amount)}/mo
                    </p>
                  </div>
                  <span className="text-xs text-error font-medium">
                    Expires {formatDate(lease.end_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/dashboard/leases"
            className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:text-primary-light"
          >
            View all leases &rarr;
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Recent Payments
          </h3>
          {!recentPayments || recentPayments.length === 0 ? (
            <p className="text-sm text-text-secondary">No payments recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-light"
                >
                  <div>
                    <p className="text-sm font-medium">{p.leases?.tenants?.full_name}</p>
                    <p className="text-xs text-text-secondary">
                      Unit {p.leases?.units?.unit_number} &middot; {formatDate(p.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(p.amount_paid)}</p>
                    <span
                      className={cn(
                        'text-[10px] font-medium',
                        p.status === 'paid' ? 'text-success' : p.status === 'overdue' ? 'text-error' : 'text-warning',
                      )}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Maintenance */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-warning" />
            Recent Maintenance
          </h3>
          {!recentMaintenance || recentMaintenance.length === 0 ? (
            <p className="text-sm text-text-secondary">No maintenance requests yet.</p>
          ) : (
            <div className="space-y-2">
              {recentMaintenance.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-light"
                >
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-text-secondary">
                      Unit {m.units?.unit_number} &middot; {formatDate(m.created_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      m.priority === 'emergency'
                        ? 'bg-error/10 text-error'
                        : m.priority === 'high'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-info/10 text-info',
                    )}
                  >
                    {m.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/dashboard/maintenance"
            className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:text-primary-light"
          >
            View all maintenance &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
