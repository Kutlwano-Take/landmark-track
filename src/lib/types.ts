export type AppRole = 'admin' | 'landlord' | 'manager';

export type PropertyStatus = 'active' | 'inactive' | 'sold';
export type OccupancyStatus = 'occupied' | 'vacant' | 'reserved' | 'maintenance';
export type ConditionStatus = 'excellent' | 'good' | 'needs_repair' | 'damaged' | 'uninhabitable';
export type TenantStatus = 'active' | 'notice_given' | 'evicted' | 'former';
export type LeaseStatus = 'active' | 'expired' | 'terminated' | 'pending';
export type RentSchedule = 'month_end' | 'day_25' | 'day_15' | 'day_1' | 'custom';
export type PaymentStatus = 'paid' | 'partial' | 'due' | 'overdue';
export type PaymentType = 'rent' | 'deposit' | 'utilities' | 'penalty' | 'discount' | 'other';
export type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_name: string | null;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  property_type: string;
  address: string;
  city: string;
  province: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  purchase_value: number | null;
  current_value: number | null;
  image_url: string | null;
  status: PropertyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  property_id: string;
  owner_id: string;
  name: string;
  floors: number | null;
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  building_id: string | null;
  owner_id: string;
  unit_number: string;
  floor: number | null;
  unit_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqm: number | null;
  rent_amount: number;
  deposit_amount: number | null;
  occupancy_status: OccupancyStatus;
  condition_status: ConditionStatus;
  vacant_since: string | null;
  ready_to_rent: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  owner_id: string;
  full_name: string;
  id_number: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  occupation: string | null;
  employer: string | null;
  monthly_income: number | null;
  status: TenantStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  owner_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number | null;
  schedule: RentSchedule;
  custom_day: number | null;
  special_terms: string | null;
  document_url: string | null;
  status: LeaseStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  owner_id: string;
  lease_id: string;
  payment_type: PaymentType;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  owner_id: string;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  photos: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  owner_id: string;
  unit_id: string;
  inspection_type: string;
  severity: string;
  checklist: Record<string, any>;
  notes: string | null;
  photos: string[];
  repair_estimate: number | null;
  inspected_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface DashboardStats {
  properties: number;
  totalUnits: number;
  occupied: number;
  vacant: number;
  damaged: number;
  activeTenants: number;
  monthlyRevenue: number;
  outstanding: number;
  occupancyRate: number;
  collectionRate: number;
  pendingMaintenance: number;
}
