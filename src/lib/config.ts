// Supabase configuration
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ariyvqlxthgrgfwrikyf.supabase.co'
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyaXl2cWx4dGhncmdmd3Jpa3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNDk4NjAsImV4cCI6MjA4NDcyNTg2MH0.0ZdpWHJOWC31dLZ3ZcmuuNQp-hxSZ2pb6NL0Nc8x9us'

// Database schema types
export interface Room {
  id: string
  name: string
  status: 'available' | 'secured' | 'damaged'
  tenant_id?: string
  property_id: string
  created_at: string
  updated_at: string
  damage_description?: string
  damage_reported_at?: string
}

export interface Tenant {
  id: string
  name: string
  email: string
  phone: string
  room_id?: string
  monthly_rent: number
  payment_day: 15 | 25 | 'month_end'
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  tenant_id: string
  room_id: string
  amount: number
  payment_date: string
  due_date: string
  status: 'paid' | 'pending' | 'overdue'
  payment_method?: string
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  name: string
  address: string
  total_rooms: number
  landlord_id: string
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  type: 'late_payment' | 'damage_report' | 'room_available'
  title: string
  message: string
  room_id?: string
  tenant_id?: string
  is_read: boolean
  created_at: string
}

// Luxury color palette
export const colors = {
  background: '#0F1117',
  surface: '#1A1D29',
  surfaceLight: '#252836',
  primary: '#C9A96E', // Gold
  primaryDark: '#B89B5F',
  success: '#0A6C74', // Emerald
  error: '#A83232', // Muted red
  warning: '#D4A574', // Amber
  text: {
    primary: '#F8F9FA',
    secondary: '#B8BCC8',
    muted: '#6B7280'
  },
  border: '#374151'
}

// Typography
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Playfair Display', 'serif']
  }
}
