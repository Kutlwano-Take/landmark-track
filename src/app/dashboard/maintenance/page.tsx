'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Wrench, X, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MaintenanceRequest, Unit } from '@/lib/types';

const STATUSES = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'emergency'] as const;

const PRIORITY_ORDER: Record<string, number> = { emergency: 4, high: 3, medium: 2, low: 1 };

export default function MaintenancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium' as string,
    unit_id: '', property_id: '', estimated_cost: '', assigned_to: '',
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenance', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('maintenance_requests')
        .select('*, units!left(unit_number)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as (MaintenanceRequest & { units: { unit_number: string } | null })[];
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units-all', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('id, unit_number, property_id')
        .eq('owner_id', user!.id)
        .order('unit_number');
      return (data ?? []) as Unit[];
    },
    enabled: !!user,
  });

  const saveRequest = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error('Title is required');
      const payload: any = {
        owner_id: user!.id,
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        unit_id: form.unit_id || null,
        property_id: form.property_id || null,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
        assigned_to: form.assigned_to || null,
      };
      if (editing) {
        const { error } = await supabase.from('maintenance_requests').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('maintenance_requests').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setShowForm(false);
      setEditing(null);
      resetForm();
      toast.success(editing ? 'Request updated' : 'Request created');
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const payload: any = { status };
      if (status === 'completed') payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from('maintenance_requests').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => setForm({
    title: '', description: '', priority: 'medium',
    unit_id: '', property_id: '', estimated_cost: '', assigned_to: '',
  });

  const editRequest = (r: MaintenanceRequest) => {
    setForm({
      title: r.title,
      description: r.description ?? '',
      priority: r.priority,
      unit_id: r.unit_id ?? '',
      property_id: r.property_id ?? '',
      estimated_cost: r.estimated_cost?.toString() ?? '',
      assigned_to: r.assigned_to ?? '',
    });
    setEditing(r);
    setShowForm(true);
  };

  const sorted = [...(requests ?? [])].sort((a, b) =>
    (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0),
  );

  const columns = STATUSES.map((status) => ({
    status,
    items: sorted
      .filter((r) => r.status === status)
      .filter((r) => {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.units?.unit_number?.toLowerCase().includes(q);
      }),
  }));

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'emergency': return 'bg-error/10 text-error border-error/30';
      case 'high': return 'bg-warning/10 text-warning border-warning/30';
      case 'medium': return 'bg-info/10 text-info border-info/30';
      default: return 'bg-surface-light text-text-secondary border-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Maintenance</h1>
          <p className="text-sm text-text-secondary mt-1">Kanban board for maintenance requests</p>
        </div>
        <button
          onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text" placeholder="Search requests..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <div key={s} className="min-w-[250px] flex-1 space-y-3">
              <div className="h-6 bg-surface-light rounded w-1/2 mb-3 animate-pulse" />
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-4 animate-pulse">
                  <div className="h-4 bg-surface-light rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-light rounded w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (requests ?? []).length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Wrench className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No maintenance requests</h3>
          <p className="text-sm text-text-secondary">Create your first request to get started.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
          {columns.map((col) => (
            <div key={col.status} className="min-w-[260px] lg:min-w-[280px] flex-1 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-medium capitalize text-sm flex items-center gap-2">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    col.status === 'open' ? 'bg-info' :
                    col.status === 'assigned' ? 'bg-warning' :
                    col.status === 'in_progress' ? 'bg-primary' :
                    col.status === 'completed' ? 'bg-success' : 'bg-text-muted',
                  )} />
                  {col.status.replace('_', ' ')}
                </h3>
                <span className="text-xs text-text-muted">{col.items.length}</span>
              </div>
              {col.items.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-6 text-center">
                  <p className="text-xs text-text-muted">Empty</p>
                </div>
              ) : (
                col.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => editRequest(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium leading-tight">{item.title}</h4>
                      {item.priority === 'emergency' && (
                        <AlertTriangle className="h-4 w-4 text-error shrink-0 ml-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                      {item.units?.unit_number && <span>Unit {item.units.unit_number}</span>}
                      {item.estimated_cost && <span>&middot; Est. {formatCurrency(item.estimated_cost)}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', getPriorityColor(item.priority))}>
                        {item.priority}
                      </span>
                      <div className="flex gap-1">
                        {col.status !== 'completed' && col.status !== 'cancelled' && (
                          <select
                            value={item.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateStatus.mutate({ id: item.id, status: e.target.value })}
                            className="text-[10px] bg-transparent border border-border rounded px-1 py-0.5 cursor-pointer"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-text-muted mt-2">{formatDate(item.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">{editing ? 'Edit Request' : 'New Maintenance Request'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Leaking tap in bathroom" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[60px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select value={form.unit_id} onChange={(e) => {
                    const u = units?.find((x) => x.id === e.target.value);
                    setForm({ ...form, unit_id: e.target.value, property_id: u?.property_id ?? '' });
                  }} className="input-field">
                    <option value="">Select unit</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>{u.unit_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estimated Cost (ZAR)</label>
                  <input type="number" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Assigned To</label>
                  <input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="input-field" placeholder="Contractor name" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => saveRequest.mutate()} className="btn-primary flex-1">
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
