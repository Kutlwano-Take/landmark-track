import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey, Room, Tenant, Payment, Alert } from './config'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database helper functions
export const roomsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        tenants:tenant_id(name, email, monthly_rent, payment_day),
        properties:property_id(name, address)
      `)
    return { data, error }
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        tenants:tenant_id(*),
        properties:property_id(*)
      `)
      .eq('id', id)
      .single()
    return { data, error }
  },

  async create(room: Partial<Room>) {
    const { data, error } = await supabase
      .from('rooms')
      .insert(room)
      .select()
    return { data, error }
  },

  async update(id: string, updates: Partial<Room>) {
    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const tenantsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        *,
        rooms:room_id(name, status)
      `)
    return { data, error }
  },

  async create(tenant: Partial<Tenant>) {
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select()
    return { data, error }
  },

  async update(id: string, updates: Partial<Tenant>) {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
    return { data, error }
  }
}

export const paymentsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        tenants:tenant_id(name, email),
        rooms:room_id(name, status)
      `)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(payment: Partial<Payment>) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
    return { data, error }
  },

  async getOverdue() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        tenants:tenant_id(name, email, phone),
        rooms:room_id(name)
      `)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
    return { data, error }
  }
}

export const alertsAPI = {
  async getAll() {
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        rooms:room_id(name),
        tenants:tenant_id(name)
      `)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async create(alert: Partial<Alert>) {
    const { data, error } = await supabase
      .from('alerts')
      .insert(alert)
      .select()
    return { data, error }
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', id)
    return { error }
  }
}

// Real-time subscriptions
export const subscribeToRoomChanges = (callback: (payload: any) => void) => {
  return supabase
    .channel('room_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'rooms' },
      callback
    )
    .subscribe()
}

export const subscribeToPaymentChanges = (callback: (payload: any) => void) => {
  return supabase
    .channel('payment_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'payments' },
      callback
    )
    .subscribe()
}
