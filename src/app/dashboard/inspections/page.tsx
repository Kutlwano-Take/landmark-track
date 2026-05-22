'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, ClipboardList, Check, X, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Inspection, Unit } from '@/lib/types';

const CHECKLIST_ITEMS = [
  { key: 'walls', label: 'Walls' },
  { key: 'windows', label: 'Windows' },
  { key: 'doors', label: 'Doors' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'flooring', label: 'Flooring' },
  { key: 'furniture', label: 'Furniture' },
  { key: 'appliances', label: 'Appliances' },
];

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor', color: 'text-info bg-info/10' },
  { value: 'moderate', label: 'Moderate', color: 'text-warning bg-warning/10' },
  { value: 'severe', label: 'Severe', color: 'text-error bg-error/10' },
  { value: 'critical', label: 'Critical', color: 'text-error bg-error/20' },
];

export default function InspectionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Inspection | null>(null);

  const [form, setForm] = useState({
    unit_id: '', inspection_type: 'damage', severity: 'minor',
    repair_estimate: '', notes: '',
    checklist: {} as Record<string, { ok: boolean; notes: string }>,
  });

  const { data: inspections, isLoading } = useQuery({
    queryKey: ['inspections', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inspections')
        .select('*, units!inner(unit_number, properties!inner(name))')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as any;
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units-all-inspections', user?.id],
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

  const saveInspection = useMutation({
    mutationFn: async () => {
      if (!form.unit_id) throw new Error('Please select a unit');
      const payload: any = {
        owner_id: user!.id,
        unit_id: form.unit_id,
        inspection_type: form.inspection_type,
        severity: form.severity,
        checklist: form.checklist,
        notes: form.notes || null,
        repair_estimate: form.repair_estimate ? Number(form.repair_estimate) : null,
        inspected_at: new Date().toISOString().split('T')[0],
      };
      if (editing) {
        const { error } = await supabase.from('inspections').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inspections').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inspections'] });
      setShowForm(false);
      setEditing(null);
      resetForm();
      toast.success(editing ? 'Inspection updated' : 'Inspection recorded');
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => setForm({
    unit_id: '', inspection_type: 'damage', severity: 'minor',
    repair_estimate: '', notes: '',
    checklist: {},
  });

  const initChecklist = () => {
    const cl: Record<string, { ok: boolean; notes: string }> = {};
    CHECKLIST_ITEMS.forEach((item) => { cl[item.key] = { ok: true, notes: '' }; });
    return cl;
  };

  const editInspection = (inspection: Inspection) => {
    const cl = inspection.checklist as Record<string, { ok: boolean; notes: string }> || {};
    setForm({
      unit_id: inspection.unit_id,
      inspection_type: inspection.inspection_type || 'damage',
      severity: inspection.severity || 'minor',
      repair_estimate: inspection.repair_estimate?.toString() ?? '',
      notes: inspection.notes ?? '',
      checklist: CHECKLIST_ITEMS.reduce((acc, item) => {
        acc[item.key] = cl[item.key] ?? { ok: true, notes: '' };
        return acc;
      }, {} as Record<string, { ok: boolean; notes: string }>),
    });
    setEditing(inspection);
    setShowForm(true);
  };

  const countIssues = (cl: Record<string, { ok: boolean; notes: string }>) =>
    Object.values(cl).filter((v) => !v.ok).length;

  const filtered = (inspections ?? []).filter((i) => {
    const q = search.toLowerCase();
    return i.units?.unit_number?.toLowerCase().includes(q) || i.units?.properties?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Inspections</h1>
          <p className="text-sm text-text-secondary mt-1">Track unit condition inspections and damage reports</p>
        </div>
        <button
          onClick={() => { setEditing(null); resetForm(); setForm((f) => ({ ...f, checklist: initChecklist() })); setShowForm(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Inspection
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text" placeholder="Search by unit or property..."
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
          <ClipboardList className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No inspections yet</h3>
          <p className="text-sm text-text-secondary">Conduct your first unit inspection.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inspection) => {
            const cl = inspection.checklist as Record<string, { ok: boolean; notes: string }> || {};
            const issues = countIssues(cl);
            return (
              <div
                key={inspection.id}
                className="rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => editInspection(inspection)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Unit {inspection.units?.unit_number}</h3>
                      <p className="text-xs text-text-secondary">{inspection.units?.properties?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {issues > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-error/10 text-error">
                        {issues} issue{issues > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      SEVERITY_OPTIONS.find((s) => s.value === inspection.severity)?.color ?? 'bg-surface-light text-text-secondary',
                    )}>
                      {inspection.severity}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-text-secondary">
                  <span>{formatDate(inspection.inspected_at)}</span>
                  {inspection.repair_estimate && (
                    <span>Est. repair: {formatCurrency(inspection.repair_estimate)}</span>
                  )}
                </div>
                {issues > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {CHECKLIST_ITEMS.filter((item) => cl[item.key] && !cl[item.key].ok).map((item) => (
                      <span key={item.key} className="text-[10px] px-2 py-0.5 rounded-full bg-error/5 text-error border border-error/20">
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inspection Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">{editing ? 'Edit Inspection' : 'New Inspection'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Unit *</label>
                  <select
                    value={form.unit_id}
                    onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select unit</option>
                    {units?.map((u) => (
                      <option key={u.id} value={u.id}>{u.unit_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="input-field">
                    {SEVERITY_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Repair Estimate (ZAR)</label>
                  <input type="number" value={form.repair_estimate} onChange={(e) => setForm({ ...form, repair_estimate: e.target.value })} className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Condition Checklist</label>
                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map((item) => (
                      <div key={item.key} className="flex items-center gap-3 p-2 rounded-lg bg-surface-light">
                        <button
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            checklist: {
                              ...form.checklist,
                              [item.key]: { ...form.checklist[item.key], ok: !form.checklist[item.key]?.ok },
                            },
                          })}
                          className={cn(
                            'grid h-6 w-6 place-items-center rounded border transition-colors',
                            form.checklist[item.key]?.ok
                              ? 'bg-success border-success text-white'
                              : 'bg-error/10 border-error/30 text-error',
                          )}
                        >
                          {form.checklist[item.key]?.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        </button>
                        <span className="text-sm flex-1">{item.label}</span>
                        {!form.checklist[item.key]?.ok && (
                          <input
                            type="text"
                            placeholder="Issue details..."
                            value={form.checklist[item.key]?.notes ?? ''}
                            onChange={(e) => setForm({
                              ...form,
                              checklist: {
                                ...form.checklist,
                                [item.key]: { ...form.checklist[item.key], notes: e.target.value },
                              },
                            })}
                            className="text-xs bg-transparent border-b border-border px-1 py-0.5 w-40 outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {countIssues(form.checklist) > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-warning">
                      <AlertTriangle className="h-3 w-3" />
                      {countIssues(form.checklist)} item{countIssues(form.checklist) > 1 ? 's' : ''} need{countIssues(form.checklist) === 1 ? 's' : ''} attention
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field min-h-[60px]" placeholder="Overall inspection notes..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => saveInspection.mutate()} className="btn-primary flex-1">
                  {editing ? 'Update' : 'Save Inspection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
