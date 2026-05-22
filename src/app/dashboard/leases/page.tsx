'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, FileText, Calendar, DollarSign, X, Pencil, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, daysBetween, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Lease, Unit, Tenant, OccupancyStatus } from '@/lib/types';

const SCHEDULES = [
  { value: 'month_end', label: 'Month End' },
  { value: 'day_25', label: 'Day 25' },
  { value: 'day_15', label: 'Day 15' },
  { value: 'day_1', label: 'Day 1' },
  { value: 'custom', label: 'Custom Day' },
];

export default function LeasesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lease | null>(null);

  const [form, setForm] = useState({
    unit_id: '', tenant_id: '', start_date: '', end_date: '',
    rent_amount: '', deposit_amount: '', schedule: 'month_end',
    custom_day: '', special_terms: '', document_url: '',
  });

  const { data: leases, isLoading } = useQuery({
    queryKey: ['leases', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leases')
        .select('*, units!inner(unit_number, property_id, properties!inner(name)), tenants!inner(full_name, phone, email)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as (Lease & {
        units: { unit_number: string; property_id: string; properties: { name: string } };
        tenants: { full_name: string; phone: string | null; email: string | null };
      })[];
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units-vacant', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('id, unit_number, rent_amount, occupancy_status, properties!inner(name)')
        .eq('owner_id', user!.id)
        .in('occupancy_status', ['vacant', 'reserved'])
        .order('unit_number');
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const { data: tenants } = useQuery({
    queryKey: ['tenants-active', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('id, full_name, phone, email, status')
        .eq('owner_id', user!.id)
        .neq('status', 'former')
        .order('full_name');
      return (data ?? []) as Tenant[];
    },
    enabled: !!user,
  });

  const saveLease = useMutation({
    mutationFn: async () => {
      if (!form.unit_id || !form.tenant_id || !form.start_date || !form.end_date || !form.rent_amount) {
        throw new Error('Please fill in all required fields');
      }
      const payload: any = {
        owner_id: user!.id,
        unit_id: form.unit_id,
        tenant_id: form.tenant_id,
        start_date: form.start_date,
        end_date: form.end_date,
        rent_amount: Number(form.rent_amount),
        deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null,
        schedule: form.schedule,
        custom_day: form.schedule === 'custom' && form.custom_day ? Number(form.custom_day) : null,
        special_terms: form.special_terms || null,
        document_url: form.document_url || null,
      };

      if (editing) {
        const { error } = await supabase.from('leases').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leases').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leases'] });
      qc.invalidateQueries({ queryKey: ['units-vacant'] });
      setShowForm(false);
      setEditing(null);
      resetForm();
      toast.success(editing ? 'Lease updated' : 'Lease created');
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => setForm({
    unit_id: '', tenant_id: '', start_date: '', end_date: '',
    rent_amount: '', deposit_amount: '', schedule: 'month_end',
    custom_day: '', special_terms: '', document_url: '',
  });

  const editLease = (lease: Lease) => {
    setForm({
      unit_id: lease.unit_id,
      tenant_id: lease.tenant_id,
      start_date: lease.start_date,
      end_date: lease.end_date,
      rent_amount: lease.rent_amount.toString(),
      deposit_amount: lease.deposit_amount?.toString() ?? '',
      schedule: lease.schedule,
      custom_day: lease.custom_day?.toString() ?? '',
      special_terms: lease.special_terms ?? '',
      document_url: lease.document_url ?? '',
    });
    setEditing(lease);
    setShowForm(true);
  };

  const filtered = (leases ?? []).filter((l) => {
    const unitInfo = l.units?.unit_number ?? '';
    const tenantName = l.tenants?.full_name ?? '';
    const q = search.toLowerCase();
    return unitInfo.includes(q) || tenantName.toLowerCase().includes(q);
  });

  const getLeaseBadge = (status: string, endDate: string) => {
    const days = daysBetween(new Date().toISOString(), endDate);
    if (status !== 'active') return { label: status, cls: 'status-overdue' };
    if (days < 0) return { label: 'expired', cls: 'status-overdue' };
    if (days <= 7) return { label: `${days}d left`, cls: 'status-overdue' };
    if (days <= 14) return { label: `${days}d left`, cls: 'status-pending' };
    if (days <= 30) return { label: `${days}d left`, cls: 'status-partial' };
    return { label: 'active', cls: 'status-occupied' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Leases</h1>
          <p className="text-sm text-text-secondary mt-1">Manage lease agreements</p>
        </div>
        <button
          onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Lease
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text" placeholder="Search by tenant name or unit..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

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
          <FileText className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No leases yet</h3>
          <p className="text-sm text-text-secondary">Create a lease to link a tenant with a unit.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lease) => {
            const badge = getLeaseBadge(lease.status, lease.end_date);
            return (
              <div key={lease.id} className="rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">{lease.tenants?.full_name ?? 'Unknown'}</h3>
                      <p className="text-xs text-text-secondary">
                        Unit {lease.units?.unit_number} &middot; {lease.units?.properties?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', badge.cls)}>
                      {badge.label}
                    </span>
                    <button onClick={() => editLease(lease)} className="p-1.5 rounded-lg hover:bg-surface-light">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border text-sm">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(lease.start_date)} &mdash; {formatDate(lease.end_date)}
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <DollarSign className="h-3.5 w-3.5" /> {formatCurrency(lease.rent_amount)}/mo
                  </div>
                  <div className="text-text-secondary capitalize">{lease.schedule.replace('_', ' ')}</div>
                  <div className="text-text-secondary">
                    Status: <span className={cn(
                      lease.status === 'active' ? 'text-success' :
                      lease.status === 'expired' ? 'text-error' :
                      'text-warning'
                    )}>{lease.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lease Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">{editing ? 'Edit Lease' : 'New Lease'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              {!editing && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-info/10 text-info text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Creating a lease will mark the unit as occupied and the tenant as active.</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit *</label>
                  <select
                    value={form.unit_id}
                    onChange={(e) => {
                      const u = units?.find((x) => x.id === e.target.value);
                      setForm({ ...form, unit_id: e.target.value, rent_amount: u ? u.rent_amount.toString() : form.rent_amount });
                    }}
                    className="input-field"
                  >
                    <option value="">Select unit</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_number} — {u.properties?.name} ({formatCurrency(u.rent_amount)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tenant *</label>
                  <select
                    value={form.tenant_id}
                    onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select tenant</option>
                    {tenants?.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}{t.phone ? ` — ${t.phone}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date *</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rent Amount (ZAR) *</label>
                  <input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deposit (ZAR)</label>
                  <input type="number" value={form.deposit_amount} onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rent Schedule</label>
                  <select value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} className="input-field">
                    {SCHEDULES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {form.schedule === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Custom Day</label>
                    <input type="number" min="1" max="28" value={form.custom_day} onChange={(e) => setForm({ ...form, custom_day: e.target.value })} className="input-field" />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Special Terms</label>
                  <textarea value={form.special_terms} onChange={(e) => setForm({ ...form, special_terms: e.target.value })} className="input-field min-h-[60px]" placeholder="Any special clauses or terms..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => saveLease.mutate()} className="btn-primary flex-1">
                  {editing ? 'Update' : 'Create Lease'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
