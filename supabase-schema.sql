-- Landmark Track Database Schema
-- Create tables for luxury property management system

-- Properties table (no dependencies)
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  landlord_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants table (no dependencies on other app tables)
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  monthly_rent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_day VARCHAR(10) NOT NULL CHECK (payment_day IN ('15', '25', 'month_end')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms table (depends on properties and tenants)
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'secured', 'damaged')),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  damage_description TEXT,
  damage_reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add room_id to tenants table after rooms table is created
ALTER TABLE tenants
ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Payments table (depends on tenants and rooms)
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending', 'overdue')),
  payment_method VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table (depends on rooms and tenants)
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('late_payment', 'damage_report', 'room_available')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_rooms_property_id ON rooms(property_id);
CREATE INDEX idx_rooms_tenant_id ON rooms(tenant_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_tenants_room_id ON tenants(room_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policies for properties
CREATE POLICY "Users can view their own properties" ON properties
  FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Users can insert their own properties" ON properties
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can update their own properties" ON properties
  FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Users can delete their own properties" ON properties
  FOR DELETE USING (auth.uid() = landlord_id);

-- Policies for rooms (through properties)
CREATE POLICY "Users can view rooms in their properties" ON rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = rooms.property_id 
      AND properties.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage rooms in their properties" ON rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = rooms.property_id 
      AND properties.landlord_id = auth.uid()
    )
  );

-- Similar policies for tenants, payments, and alerts
CREATE POLICY "Users can view tenants in their properties" ON tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = tenants.room_id
      AND EXISTS (
        SELECT 1 FROM properties 
        WHERE properties.id = rooms.property_id 
        AND properties.landlord_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage tenants in their properties" ON tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = tenants.room_id
      AND EXISTS (
        SELECT 1 FROM properties 
        WHERE properties.id = rooms.property_id 
        AND properties.landlord_id = auth.uid()
      )
    )
  );

-- Functions for automatic payment status updates
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update payment status based on current date
  IF NEW.payment_date IS NOT NULL AND NEW.payment_date <= NEW.due_date THEN
    NEW.status = 'paid';
  ELSIF NEW.payment_date IS NULL AND CURRENT_DATE > NEW.due_date THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_status
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_payment_status();

-- Function to create alerts for overdue payments
CREATE OR REPLACE FUNCTION create_overdue_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'overdue' AND OLD.status != 'overdue' THEN
    INSERT INTO alerts (type, title, message, tenant_id, room_id)
    VALUES (
      'late_payment',
      'Late Payment Alert',
      'Payment for ' || (SELECT name FROM tenants WHERE id = NEW.tenant_id) || 
      ' is overdue by ' || (CURRENT_DATE - NEW.due_date) || ' days',
      NEW.tenant_id,
      NEW.room_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_overdue_alert
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION create_overdue_alert();

-- Function to create damage alerts
CREATE OR REPLACE FUNCTION create_damage_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'damaged' AND OLD.status != 'damaged' THEN
    INSERT INTO alerts (type, title, message, room_id)
    VALUES (
      'damage_report',
      'Room Damage Reported',
      'Room ' || NEW.name || ' has been reported as damaged' ||
      CASE WHEN NEW.damage_description IS NOT NULL 
           THEN ': ' || NEW.damage_description 
           ELSE '' END,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_damage_alert
  AFTER UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION create_damage_alert();
