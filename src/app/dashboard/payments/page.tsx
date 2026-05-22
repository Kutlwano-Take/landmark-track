'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, CreditCard, TrendingUp, DollarSign, X, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Payment, Lease } from '@/lib/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PaymentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const [form, setForm] = useState({
    lease_id: '', payment_type: 'rent', amount_due: '',
    amount_paid: '', due_date: '', paid_date: '', reference: '', notes: '',
  });

  const now = new Date();
  const monthStart = new Date(yearFilter, monthFilter, 1).toISOString().split('T')[0];
  const monthEnd = new Date(yearFilter, monthFilter + 1, 0).toISOString().split('T')[0];

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', user?.id, monthFilter, yearFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, leases!inner(tenant_id, rent_amount, units!inner(unit_number), tenants!inner(full_name))')
        .eq('owner_id', user!.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .order('due_date', { ascending: false });
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const { data: activeLeases } = useQuery({
    queryKey: ['leases-active-payments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leases')
        .select('id, unit_id, tenant_id, rent_amount, start_date, end_date, status, units!inner(unit_number), tenants!inner(full_name)')
        .eq('owner_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const { data: overduePayments } = useQuery({
    queryKey: ['payments-overdue', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, leases!inner(tenants!inner(full_name), units!inner(unit_number))')
        .eq('owner_id', user!.id)
        .eq('status', 'overdue')
        .order('due_date', { ascending: true })
        .limit(10);
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const savePayment = useMutation({
    mutationFn: async () => {
      if (!form.lease_id || !form.amount_due || !form.due_date) {
        throw new Error('Please fill in required fields');
      }
      const payload: any = {
        owner_id: user!.id,
        lease_id: form.lease_id,
        payment_type: form.payment_type,
        amount_due: Number(form.amount_due),
        amount_paid: form.amount_paid ? Number(form.amount_paid) : 0,
        due_date: form.due_date,
        paid_date: form.paid_date || null,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      const { error } = await supabase.from('payments').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['payments-overdue'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setShowForm(false);
      resetForm();
      toast.success('Payment recorded');
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => setForm({
    lease_id: '', payment_type: 'rent', amount_due: '',
    amount_paid: '', due_date: '', paid_date: '', reference: '', notes: '',
  });

  const totalDue = (payments ?? []).reduce((s, p) => s + Number(p.amount_due), 0);
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
  const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
  const paidCount = (payments ?? []).filter((p) => p.status === 'paid').length;
  const dueCount = (payments ?? []).filter((p) => p.status === 'due').length;
  const overdueCount = (payments ?? []).filter((p) => p.status === 'overdue').length;
  const partialCount = (payments ?? []).filter((p) => p.status === 'partial').length;

  const filtered = (payments ?? []).filter((p) => {
    const q = search.toLowerCase();
    return p.leases?.tenants?.full_name?.toLowerCase().includes(q) ||
      p.leases?.units?.unit_number?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Payments</h1>
          <p className="text-sm text-text-secondary mt-1">Track rent collections and outstanding balances</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total Due</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalDue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total Collected</p>
          <p className="text-xl font-bold text-success mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Collection Rate</p>
          <p className="text-xl font-bold mt-1">{collectionRate}%</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider">Outstanding</p>
          <p className="text-xl font-bold text-error mt-1">{formatCurrency(totalDue - totalPaid)}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Paid', count: paidCount, cls: 'text-success bg-success/10 border-success/20' },
          { label: 'Partial', count: partialCount, cls: 'text-warning bg-warning/10 border-warning/20' },
          { label: 'Due', count: dueCount, cls: 'text-info bg-info/10 border-info/20' },
          { label: 'Overdue', count: overdueCount, cls: 'text-error bg-error/10 border-error/20' },
        ].map((s) => (
          <div key={s.label} className={`text-center p-3 rounded-lg border ${s.cls}`}>
            <p className="text-lg font-bold">{s.count}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text" placeholder="Search by tenant or unit..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="input-field w-auto"
        >
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          className="input-field w-auto"
        >
          {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Overdue Alert */}
      {(overduePayments ?? []).length > 0 && (
        <div className="rounded-xl border border-error/30 bg-error/5 p-4">
          <h3 className="font-medium text-error flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" />
            {overduePayments.length} overdue payment{(overduePayments ?? []).length > 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {overduePayments?.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.leases?.tenants?.full_name} — Unit {p.leases?.units?.unit_number}</span>
                <span className="font-medium text-error">{formatCurrency(Number(p.amount_due) - Number(p.amount_paid))} overdue</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-5 animate-pulse">
              <div className="h-4 bg-surface-light rounded w-1/3 mb-3" />
              <div className="h-3 bg-surface-light rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <CreditCard className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No payments this period</h3>
          <p className="text-sm text-text-secondary">Record a payment to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => (
            <div key={payment.id} className="rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{payment.leases?.tenants?.full_name ?? 'Unknown'}</h3>
                    <p className="text-xs text-text-secondary">
                      Unit {payment.leases?.units?.unit_number} &middot; {formatDate(payment.due_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    payment.status === 'paid' ? 'bg-success/10 text-success' :
                    payment.status === 'partial' ? 'bg-warning/10 text-warning' :
                    payment.status === 'overdue' ? 'bg-error/10 text-error' :
                    'bg-info/10 text-info',
                  )}>
                    {payment.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-sm">
                <span className="text-text-secondary capitalize">{payment.payment_type}</span>
                <div className="text-right">
                  <p>Due: <span className="font-medium">{formatCurrency(payment.amount_due)}</span></p>
                  <p>Paid: <span className={cn('font-medium', payment.status === 'paid' ? 'text-success' : 'text-text-secondary')}>
                    {formatCurrency(payment.amount_paid)}
                  </span></p>
                </div>
              </div>
              {payment.reference && (
                <p className="text-xs text-text-muted mt-1">Ref: {payment.reference}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Record Payment</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Lease *</label>
                  <select
                    value={form.lease_id}
                    onChange={(e) => {
                      const l = activeLeases?.find((x) => x.id === e.target.value);
                      setForm({
                        ...form,
                        lease_id: e.target.value,
                        amount_due: l ? l.rent_amount.toString() : form.amount_due,
                      });
                    }}
                    className="input-field"
                  >
                    <option value="">Select active lease</option>
                    {activeLeases?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.tenants?.full_name} — Unit {l.units?.unit_number} ({formatCurrency(l.rent_amount)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Type</label>
                  <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })} className="input-field">
                    <option value="rent">Rent</option>
                    <option value="deposit">Deposit</option>
                    <option value="utilities">Utilities</option>
                    <option value="penalty">Penalty</option>
                    <option value="discount">Discount</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date *</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Due (ZAR) *</label>
                  <input type="number" value={form.amount_due} onChange={(e) => setForm({ ...form, amount_due: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Paid (ZAR)</label>
                  <input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} className="input-field" placeholder="Leave 0 for unpaid" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Paid Date</label>
                  <input type="date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference</label>
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="input-field" placeholder="EFT ref / receipt #" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field min-h-[60px]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => savePayment.mutate()} className="btn-primary flex-1">Record Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
