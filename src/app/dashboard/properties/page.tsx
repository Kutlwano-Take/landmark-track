'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Building2, Home, MapPin, AlertTriangle,
  Eye, Pencil, Trash2, X, ChevronDown, Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, cn, SA_PROVINCES, PROPERTY_TYPES } from '@/lib/utils';
import { toast } from 'sonner';
import type { Property, Unit, OccupancyStatus, ConditionStatus } from '@/lib/types';

export default function PropertiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [showUnits, setShowUnits] = useState<string | null>(null);
  const [showUnitForm, setShowUnitForm] = useState<string | null>(null);
  const [vacantFilter, setVacantFilter] = useState(false);
  const [damagedFilter, setDamagedFilter] = useState(false);

  const [form, setForm] = useState({
    name: '', property_type: 'Apartment', address: '', city: '',
    province: '', postal_code: '', purchase_value: '', current_value: '',
    notes: '', image_url: '',
  });

  const [unitForm, setUnitForm] = useState({
    unit_number: '', floor: '', unit_type: 'Apartment', bedrooms: '1',
    bathrooms: '1', rent_amount: '', deposit_amount: '',
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as Property[];
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as Unit[];
    },
    enabled: !!user,
  });

  const saveProperty = useMutation({
    mutationFn: async () => {
      const payload = {
        owner_id: user!.id,
        name: form.name,
        property_type: form.property_type,
        address: form.address,
        city: form.city,
        province: form.province || null,
        postal_code: form.postal_code || null,
        purchase_value: form.purchase_value ? Number(form.purchase_value) : null,
        current_value: form.current_value ? Number(form.current_value) : null,
        notes: form.notes || null,
        image_url: form.image_url || null,
      };
      if (editing) {
        const { error } = await supabase.from('properties').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('properties').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      setShowForm(false);
      setEditing(null);
      resetForm();
      toast.success(editing ? 'Property updated' : 'Property created');
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const saveUnit = useMutation({
    mutationFn: async (propertyId: string) => {
      const payload = {
        owner_id: user!.id,
        property_id: propertyId,
        unit_number: unitForm.unit_number,
        floor: unitForm.floor ? Number(unitForm.floor) : null,
        unit_type: unitForm.unit_type,
        bedrooms: Number(unitForm.bedrooms),
        bathrooms: Number(unitForm.bathrooms),
        rent_amount: Number(unitForm.rent_amount),
        deposit_amount: unitForm.deposit_amount ? Number(unitForm.deposit_amount) : null,
      };
      const { error } = await supabase.from('units').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      setShowUnitForm(null);
      resetUnitForm();
      toast.success('Unit added');
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => setForm({
    name: '', property_type: 'Apartment', address: '', city: '',
    province: '', postal_code: '', purchase_value: '', current_value: '',
    notes: '', image_url: '',
  });

  const resetUnitForm = () => setUnitForm({
    unit_number: '', floor: '', unit_type: 'Apartment', bedrooms: '1',
    bathrooms: '1', rent_amount: '', deposit_amount: '',
  });

  const editProperty = (p: Property) => {
    setForm({
      name: p.name, property_type: p.property_type, address: p.address,
      city: p.city, province: p.province ?? '', postal_code: p.postal_code ?? '',
      purchase_value: p.purchase_value?.toString() ?? '',
      current_value: p.current_value?.toString() ?? '',
      notes: p.notes ?? '', image_url: p.image_url ?? '',
    });
    setEditing(p);
    setShowForm(true);
  };

  const filtered = (properties ?? []).filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const unitsForProperty = (propId: string) => (units ?? []).filter((u) => u.property_id === propId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display">Properties</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your property portfolio
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Property
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={vacantFilter}
            onChange={() => { setVacantFilter(!vacantFilter); setDamagedFilter(false); }}
            className="rounded border-border"
          />
          Vacant Units
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={damagedFilter}
            onChange={() => { setDamagedFilter(!damagedFilter); setVacantFilter(false); }}
            className="rounded border-border"
          />
          Damaged Units
        </label>
      </div>

      {/* Property Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-6 animate-pulse">
              <div className="h-6 bg-surface-light rounded w-2/3 mb-4" />
              <div className="h-4 bg-surface-light rounded w-1/2 mb-3" />
              <div className="h-4 bg-surface-light rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Building2 className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No properties yet</h3>
          <p className="text-sm text-text-secondary">Add your first property to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((property) => {
            const propUnits = unitsForProperty(property.id);
            const vacantUnits = propUnits.filter((u) => u.occupancy_status === 'vacant');
            const damagedUnits = propUnits.filter((u) =>
              ['damaged', 'uninhabitable'].includes(u.condition_status),
            );

            if (vacantFilter && vacantUnits.length === 0) return null;
            if (damagedFilter && damagedUnits.length === 0) return null;

            return (
              <div key={property.id} className="rounded-xl border border-border bg-surface overflow-hidden group">
                <div className="h-40 bg-gradient-to-br from-primary/20 to-surface-light flex items-center justify-center relative">
                  {property.image_url ? (
                    <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-12 w-12 text-text-muted" />
                  )}
                  <span className={cn(
                    'absolute top-3 right-3 status-badge',
                    property.status === 'active' ? 'status-occupied' : property.status === 'inactive' ? 'status-pending' : '',
                  )}>
                    {property.status}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{property.name}</h3>
                  <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {property.city}
                    {property.province && `, ${property.province}`}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span>{propUnits.length} units</span>
                    <span className="text-success">{propUnits.filter((u) => u.occupancy_status === 'occupied').length} occupied</span>
                    <span className="text-info">{vacantUnits.length} vacant</span>
                  </div>
                  {property.current_value && (
                    <p className="text-sm mt-2">
                      Value: <span className="font-medium">{formatCurrency(property.current_value)}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => setShowUnits(showUnits === property.id ? null : property.id)}
                      className="btn-secondary text-xs py-1.5 flex-1"
                    >
                      {showUnits === property.id ? 'Hide Units' : 'View Units'}
                    </button>
                    <button onClick={() => editProperty(property)} className="p-1.5 rounded-lg hover:bg-surface-light">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this property?')) deleteProperty.mutate(property.id); }}
                      className="p-1.5 rounded-lg hover:bg-surface-light text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Expandable Units */}
                  {showUnits === property.id && (
                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                      {propUnits.length === 0 ? (
                        <p className="text-sm text-text-secondary">No units yet.</p>
                      ) : (
                        propUnits.map((unit) => (
                          <div key={unit.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-light text-sm">
                            <div>
                              <span className="font-medium">{unit.unit_number}</span>
                              <span className="text-text-muted ml-2">
                                {unit.bedrooms} bed &middot; {formatCurrency(unit.rent_amount)}
                              </span>
                            </div>
                            <span className={cn(
                              'text-[10px] font-medium px-2 py-0.5 rounded-full',
                              unit.occupancy_status === 'occupied' ? 'bg-success/10 text-success' :
                              unit.occupancy_status === 'vacant' ? 'bg-info/10 text-info' :
                              'bg-error/10 text-error',
                            )}>
                              {unit.occupancy_status}
                            </span>
                          </div>
                        ))
                      )}
                      <button
                        onClick={() => { setShowUnitForm(property.id); resetUnitForm(); }}
                        className="text-sm text-primary hover:text-primary-light flex items-center gap-1 mt-2"
                      >
                        <Plus className="h-3 w-3" /> Add unit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Property Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">{editing ? 'Edit Property' : 'Add Property'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Property Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Sunset Apartments" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className="input-field">
                    {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select className="input-field" defaultValue="active">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Address *</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="123 Main St" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" placeholder="Cape Town" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Province</label>
                  <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="input-field">
                    <option value="">Select province</option>
                    {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Postal Code</label>
                  <input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="input-field" placeholder="8001" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Value (ZAR)</label>
                  <input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field min-h-[60px]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => saveProperty.mutate()} className="btn-primary flex-1">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showUnitForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Add Unit</h2>
              <button onClick={() => setShowUnitForm(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Number *</label>
                  <input value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} className="input-field" placeholder="A101" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Floor</label>
                  <input type="number" value={unitForm.floor} onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={unitForm.unit_type} onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value })} className="input-field">
                    <option value="Studio">Studio</option>
                    <option value="One Bedroom">1 Bedroom</option>
                    <option value="Two Bedroom">2 Bedroom</option>
                    <option value="Three Bedroom">3 Bedroom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bedrooms</label>
                  <select value={unitForm.bedrooms} onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value })} className="input-field">
                    {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bathrooms</label>
                  <select value={unitForm.bathrooms} onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value })} className="input-field">
                    {[1, 1.5, 2, 2.5, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rent (ZAR) *</label>
                  <input type="number" value={unitForm.rent_amount} onChange={(e) => setUnitForm({ ...unitForm, rent_amount: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deposit (ZAR)</label>
                  <input type="number" value={unitForm.deposit_amount} onChange={(e) => setUnitForm({ ...unitForm, deposit_amount: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowUnitForm(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => showUnitForm && saveUnit.mutate(showUnitForm)} className="btn-primary flex-1">Add Unit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
