-- Sample Data for Landmark Track (without user authentication for now)

-- Insert sample tenants first
INSERT INTO tenants (id, name, email, phone, monthly_rent, payment_day) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john.smith@email.com', '+27 83 123 4567', 2500.00, '15'),
('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', 'sarah.j@email.com', '+27 72 987 6543', 3200.00, '15'),
('550e8400-e29b-41d4-a716-446655440003', 'Mike Wilson', 'mike.wilson@email.com', '+27 76 456 7890', 2600.00, '25'),
('550e8400-e29b-41d4-a716-446655440004', 'Emma Davis', 'emma.davis@email.com', '+27 79 234 5678', 3500.00, '25'),
('550e8400-e29b-41d4-a716-446655440005', 'James Brown', 'james.brown@email.com', '+27 74 345 6789', 2800.00, 'month_end')
ON CONFLICT (id) DO NOTHING;

-- Insert sample rooms (without property for now)
INSERT INTO rooms (id, name, status, tenant_id, property_id) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'Room 101', 'secured', '550e8400-e29b-41d4-a716-446655440001', NULL),
('550e8400-e29b-41d4-a716-446655440102', 'Room 102', 'available', NULL, NULL),
('550e8400-e29b-41d4-a716-446655440103', 'Room 103', 'secured', '550e8400-e29b-41d4-a716-446655440002', NULL),
('550e8400-e29b-41d4-a716-446655440104', 'Room 104', 'available', NULL, NULL),
('550e8400-e29b-41d4-a716-446655440105', 'Room 105', 'damaged', NULL, NULL),
('550e8400-e29b-41d4-a716-446655440201', 'Room 201', 'secured', '550e8400-e29b-41d4-a716-446655440003', NULL),
('550e8400-e29b-41d4-a716-446655440202', 'Room 202', 'secured', '550e8400-e29b-41d4-a716-446655440004', NULL),
('550e8400-e29b-41d4-a716-446655440203', 'Room 203', 'available', NULL, NULL),
('550e8400-e29b-41d4-a716-446655440204', 'Room 204', 'secured', '550e8400-e29b-41d4-a716-446655440005', NULL),
('550e8400-e29b-41d4-a716-446655440205', 'Room 205', 'available', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Update room_id in tenants table
UPDATE tenants SET room_id = '550e8400-e29b-41d4-a716-446655440101' WHERE id = '550e8400-e29b-41d4-a716-446655440001';
UPDATE tenants SET room_id = '550e8400-e29b-41d4-a716-446655440103' WHERE id = '550e8400-e29b-41d4-a716-446655440002';
UPDATE tenants SET room_id = '550e8400-e29b-41d4-a716-446655440201' WHERE id = '550e8400-e29b-41d4-a716-446655440003';
UPDATE tenants SET room_id = '550e8400-e29b-41d4-a716-446655440202' WHERE id = '550e8400-e29b-41d4-a716-446655440004';
UPDATE tenants SET room_id = '550e8400-e29b-41d4-a716-446655440204' WHERE id = '550e8400-e29b-41d4-a716-446655440005';

-- Insert sample payments
INSERT INTO payments (id, tenant_id, room_id, amount, payment_date, due_date, status, payment_method) VALUES
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440101', 2500.00, '2024-01-14', '2024-01-15', 'paid', 'Bank Transfer'),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440103', 3200.00, '2024-01-13', '2024-01-15', 'paid', 'Credit Card'),
('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440201', 2600.00, NULL, '2024-01-25', 'pending', NULL),
('550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440202', 3500.00, NULL, '2024-01-25', 'overdue', NULL),
('550e8400-e29b-41d4-a716-446655440505', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440204', 2800.00, NULL, '2024-01-31', 'pending', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert sample alerts
INSERT INTO alerts (id, type, title, message, room_id, tenant_id, is_read) VALUES
('550e8400-e29b-41d4-a716-446655440601', 'late_payment', 'Late Payment Alert', 'Emma Davis - Room 202 payment is 5 days overdue', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440004', false),
('550e8400-e29b-41d4-a716-446655440602', 'damage_report', 'Damage Reported', 'Room 105 - Water leak in bathroom reported', '550e8400-e29b-41d4-a716-446655440105', NULL, false),
('550e8400-e29b-41d4-a716-446655440603', 'room_available', 'Room Available', 'Room 102 is now available for new tenant', '550e8400-e29b-41d4-a716-446655440102', NULL, true),
('550e8400-e29b-41d4-a716-446655440604', 'late_payment', 'Payment Due Tomorrow', 'Mike Wilson - Room 201 payment due tomorrow (25th)', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440003', false),
('550e8400-e29b-41d4-a716-446655440605', 'damage_report', 'Maintenance Required', 'Room 105 - Water leak in bathroom reported', '550e8400-e29b-41d4-a716-446655440105', NULL, false)
ON CONFLICT (id) DO NOTHING;

-- Update damage info for damaged room
UPDATE rooms SET damage_description = 'Water leak in bathroom - needs immediate attention', damage_reported_at = '2024-01-17T16:45:00Z' WHERE id = '550e8400-e29b-41d4-a716-446655440105';
