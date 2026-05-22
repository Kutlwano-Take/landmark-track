-- ============================================================================
-- Landmark Track — Full Production Schema Migration
-- Apply this to your Supabase project via SQL Editor
-- ============================================================================

-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'landlord', 'manager');
CREATE TYPE public.property_status AS ENUM ('active', 'inactive', 'sold');
CREATE TYPE public.occupancy_status AS ENUM ('occupied', 'vacant', 'reserved', 'maintenance');
CREATE TYPE public.condition_status AS ENUM ('excellent', 'good', 'needs_repair', 'damaged', 'uninhabitable');
CREATE TYPE public.tenant_status AS ENUM ('active', 'notice_given', 'evicted', 'former');
CREATE TYPE public.lease_status AS ENUM ('active', 'expired', 'terminated', 'pending');
CREATE TYPE public.rent_schedule AS ENUM ('month_end', 'day_25', 'day_15', 'day_1', 'custom');
CREATE TYPE public.payment_status AS ENUM ('paid', 'partial', 'due', 'overdue');
CREATE TYPE public.payment_type AS ENUM ('rent', 'deposit', 'utilities', 'penalty', 'discount', 'other');
CREATE TYPE public.maintenance_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.maintenance_priority AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE public.inspection_severity AS ENUM ('minor', 'moderate', 'severe', 'critical');

-- ============ PROFILES (extends auth.users) ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ PROPERTIES ============
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'apartment',
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  purchase_value NUMERIC,
  current_value NUMERIC,
  image_url TEXT,
  status public.property_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);

-- ============ BUILDINGS ============
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floors INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_buildings_property ON public.buildings(property_id);

-- ============ UNITS ============
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor INTEGER,
  unit_type TEXT DEFAULT 'apartment',
  bedrooms INTEGER DEFAULT 1,
  bathrooms NUMERIC DEFAULT 1,
  size_sqm NUMERIC,
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  occupancy_status public.occupancy_status NOT NULL DEFAULT 'vacant',
  condition_status public.condition_status NOT NULL DEFAULT 'good',
  vacant_since DATE,
  ready_to_rent BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_units_property ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_owner ON public.units(owner_id);
CREATE INDEX IF NOT EXISTS idx_units_occupancy ON public.units(occupancy_status);

-- ============ TENANTS ============
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  id_number TEXT,
  phone TEXT,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  occupation TEXT,
  employer TEXT,
  monthly_income NUMERIC,
  status public.tenant_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);

-- ============ LEASES ============
CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC DEFAULT 0,
  schedule public.rent_schedule NOT NULL DEFAULT 'month_end',
  custom_day INTEGER,
  special_terms TEXT,
  document_url TEXT,
  status public.lease_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_leases_unit ON public.leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_owner ON public.leases(owner_id);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON public.leases(end_date);

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  payment_type public.payment_type NOT NULL DEFAULT 'rent',
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status public.payment_status NOT NULL DEFAULT 'due',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payments_lease ON public.payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ============ MAINTENANCE ============
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority public.maintenance_priority NOT NULL DEFAULT 'medium',
  status public.maintenance_status NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_maintenance_owner ON public.maintenance_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);

-- ============ INSPECTIONS ============
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  inspection_type TEXT DEFAULT 'damage',
  severity public.inspection_severity DEFAULT 'minor',
  checklist JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  repair_estimate NUMERIC,
  inspected_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inspections_unit ON public.inspections(unit_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);

-- ============ DOCUMENTS ============
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  related_type TEXT NOT NULL,
  related_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- Drop old-style policies if they exist
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON public.properties;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'rooms' AND relnamespace = 'public'::regnamespace) THEN
  DROP POLICY IF EXISTS "Users can view rooms in their properties" ON public.rooms;
  DROP POLICY IF EXISTS "Users can manage rooms in their properties" ON public.rooms;
END IF; END $$;
DROP POLICY IF EXISTS "Users can view tenants in their properties" ON public.tenants;
DROP POLICY IF EXISTS "Users can manage tenants in their properties" ON public.tenants;

-- Helper: has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Owner-based policies for all resource tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['properties','buildings','units','tenants','leases','payments','maintenance_requests','inspections','documents']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner select %1$I" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner insert %1$I" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner update %1$I" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "owner delete %1$I" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "owner select %1$I" ON public.%1$I FOR SELECT USING (auth.uid() = owner_id OR public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "owner insert %1$I" ON public.%1$I FOR INSERT WITH CHECK (auth.uid() = owner_id)', t);
    EXECUTE format('CREATE POLICY "owner update %1$I" ON public.%1$I FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), ''admin''))', t);
    EXECUTE format('CREATE POLICY "owner delete %1$I" ON public.%1$I FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

-- Notifications
DROP POLICY IF EXISTS "user read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "user update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "user insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "user delete own notifications" ON public.notifications;
CREATE POLICY "user read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Audit logs
DROP POLICY IF EXISTS "admin read audit" ON public.audit_logs;
DROP POLICY IF EXISTS "auth insert audit" ON public.audit_logs;
CREATE POLICY "admin read audit" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','properties','units','tenants','leases','payments','maintenance_requests']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$I_updated ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_%1$I_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- New user trigger: create profile + assign landlord role
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'landlord');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Payment status auto-updater
CREATE OR REPLACE FUNCTION public.update_payment_status() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status = 'paid';
    IF NEW.paid_date IS NULL THEN NEW.paid_date = CURRENT_DATE; END IF;
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status = 'partial';
  ELSIF NEW.due_date < CURRENT_DATE THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'due';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payment_status ON public.payments;
CREATE TRIGGER trg_payment_status BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_payment_status();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('property-images', 'property-images', true),
  ('lease-documents', 'lease-documents', false),
  ('maintenance-photos', 'maintenance-photos', true),
  ('inspection-photos', 'inspection-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read property images" ON storage.objects;
DROP POLICY IF EXISTS "auth upload property images" ON storage.objects;
DROP POLICY IF EXISTS "owner delete property images" ON storage.objects;
DROP POLICY IF EXISTS "public read maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "auth upload maintenance photos" ON storage.objects;
DROP POLICY IF EXISTS "public read inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "auth upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "owner read lease docs" ON storage.objects;
DROP POLICY IF EXISTS "owner upload lease docs" ON storage.objects;
DROP POLICY IF EXISTS "owner delete lease docs" ON storage.objects;

CREATE POLICY "public read property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "auth upload property images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owner delete property images" ON storage.objects FOR DELETE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "public read maintenance photos" ON storage.objects FOR SELECT USING (bucket_id = 'maintenance-photos');
CREATE POLICY "auth upload maintenance photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'maintenance-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "public read inspection photos" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-photos');
CREATE POLICY "auth upload inspection photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspection-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owner read lease docs" ON storage.objects FOR SELECT USING (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owner upload lease docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "owner delete lease docs" ON storage.objects FOR DELETE USING (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
