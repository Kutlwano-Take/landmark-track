'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Users, Mail, Phone, Briefcase, DollarSign,
  Pencil, X, User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import type { Tenant, Unit, Lease } from '@/lib/types';

export default function TenantsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);

  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', id_number: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    occupation: '', employer: '', monthly_income: '', notes: '',
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as Tenant[];
    },
    enabled: !!user,
  });

  const { data: leases } = useQuery({
    queryKey: ['leases-simple', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leases')
        .select('id, tenant_id, unit_id, status, start_date, end_date, rent_amount, units!inner(unit_number, property_id)')
        .eq('owner_id', user!.id)
        .eq('status', 'active');
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const saveTenant = useMutation({
    mutationFn: async () => {
      const payload: any = { owner_id: user!.id, full_name: form.full_name };
      if (form.phone) payload.phone = form.phone;
      if (form.email) payload.email = form.email;
      if (form.id_number) payload.id_number = form.id_number;
      if (form.emergency_contact_name) payload.emergency_contact_name = form.emergency_contact_name;
      if (form.emergency_contact_phone) payload.emergency_contact_phone = form.emergency_contact_phone;
      if (form.occupation) payload.occupation = form.occupation;
      if (form.employer) payload.employer = form.employer;
      if (form.monthly_income) payload.monthly_income = Number(form.monthly_income);
      if (form.notes) payload.notes = form.notes;

      if (editing) {
        const { error } = await supabase.from('tenants').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenants').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      setShowForm(false);
      setEditing(null);
      toast.success(editing ? 'Tenant updated' : 'Tenant created');
    },
    onError: (err) => toast.error(err.message),
  });

  const editTenant = (t: Tenant) => {
    setForm({
      full_name: t.full_name, phone: t.phone ?? '', email: t.email ?? '',
      id_number: t.id_number ?? '', emergency_contact_name: t.emergency_contact_name ?? '',
      emergency_contact_phone: t.emergency_contact_phone ?? '',
      occupation: t.occupation ?? '', employer: t.employer ?? '',
      monthly_income: t.monthly_income?.toString() ?? '', notes: t.notes ?? '',
    });
    setEditing(t);
    setShowForm(true);
  };

  const filtered = (tenants ?? []).filter((t) =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Tenants</h1>
          <p className="text-sm text-text-secondary mt-1">Manage tenant profiles</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', email: '', id_number: '', emergency_contact_name: '', emergency_contact_phone: '', occupation: '', employer: '', monthly_income: '', notes: '' }); setShowForm(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Tenant
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text" placeholder="Search by name, email, or phone..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-light" />
                <div className="flex-1">
                  <div className="h-4 bg-surface-light rounded w-1/3 mb-2" />
                  <div className="h-3 bg-surface-light rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Users className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No tenants yet</h3>
          <p className="text-sm text-text-secondary">Add your first tenant to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tenant) => {
            const activeLease = leases?.find((l) => l.tenant_id === tenant.id);
            return (
              <div key={tenant.id} className="rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                      {getInitials(tenant.full_name)}
                    </div>
                    <div>
                      <h3 className="font-medium">{tenant.full_name}</h3>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                        {tenant.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{tenant.email}</span>}
                        {tenant.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{tenant.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      tenant.status === 'active' ? 'status-occupied' :
                      tenant.status === 'notice_given' ? 'status-pending' :
                      'status-overdue',
                    )}>
                      {tenant.status.replace('_', ' ')}
                    </span>
                    <button onClick={() => editTenant(tenant)} className="p-1.5 rounded-lg hover:bg-surface-light">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border text-sm">
                  {tenant.occupation && (
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Briefcase className="h-3.5 w-3.5" /> {tenant.occupation}
                    </div>
                  )}
                  {tenant.monthly_income && (
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <DollarSign className="h-3.5 w-3.5" /> {formatCurrency(tenant.monthly_income)}/mo
                    </div>
                  )}
                  {activeLease && (
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <span className="text-success">Unit {activeLease.units?.unit_number}</span>
                      <span className="text-text-muted">&middot; {formatCurrency(activeLease.rent_amount)}/mo</span>
                    </div>
                  )}
                  <div className="text-text-secondary">
                    Status: {activeLease ? <span className="text-success">Active lease</span> : <span className="text-warning">No lease</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tenant Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">{editing ? 'Edit Tenant' : 'Add Tenant'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ID / Passport</label>
                  <input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Income</label>
                  <input type="number" value={form.monthly_income} onChange={(e) => setForm({ ...form, monthly_income: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Occupation</label>
                  <input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employer</label>
                  <input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emergency Contact</label>
                  <input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} className="input-field" placeholder="Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emergency Phone</label>
                  <input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field min-h-[60px]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => saveTenant.mutate()} className="btn-primary flex-1">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
