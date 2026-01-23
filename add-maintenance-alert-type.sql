-- Add 'maintenance' as a valid alert type
ALTER TABLE alerts 
DROP CONSTRAINT alerts_type_check;

ALTER TABLE alerts 
ADD CONSTRAINT alerts_type_check 
CHECK (type IN ('late_payment', 'damage_report', 'room_available', 'maintenance'));

-- Verify the constraint was added
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'alerts'::regclass 
AND contype = 'c';
