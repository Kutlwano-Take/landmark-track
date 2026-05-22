-- ============================================================================
-- Landmark Track — Notification Triggers Migration
-- Apply this after migration-01-new-schema.sql
-- ============================================================================

-- ============ FUNCTION: Notify lease expiry ============
CREATE OR REPLACE FUNCTION public.notify_lease_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  days_left INTEGER;
  ntype TEXT;
  ntitle TEXT;
  nbody TEXT;
BEGIN
  days_left := (NEW.end_date - CURRENT_DATE);
  
  IF days_left = 30 THEN
    ntype := 'lease_expiring_30';
    ntitle := 'Lease expiring in 30 days';
    nbody := format('Lease for unit ends on %s', NEW.end_date);
  ELSIF days_left = 14 THEN
    ntype := 'lease_expiring_14';
    ntitle := 'Lease expiring in 14 days';
    nbody := format('Lease for unit ends on %s', NEW.end_date);
  ELSIF days_left = 7 THEN
    ntype := 'lease_expiring_7';
    ntitle := 'Lease expiring in 7 days';
    nbody := format('Lease for unit ends on %s', NEW.end_date);
  ELSIF days_left < 0 AND (OLD.status = 'active' OR OLD.status IS NULL) THEN
    ntype := 'lease_expired';
    ntitle := 'Lease has expired';
    nbody := format('Lease for unit expired on %s', NEW.end_date);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (NEW.owner_id, ntype, ntitle, nbody, '/dashboard/leases');

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_lease_expiry ON public.leases;
CREATE TRIGGER trg_notify_lease_expiry
  AFTER INSERT OR UPDATE OF end_date, status ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.notify_lease_expiry();

-- ============ FUNCTION: Notify payment overdue ============
CREATE OR REPLACE FUNCTION public.notify_payment_overdue()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'overdue' AND (OLD.status IS NULL OR OLD.status != 'overdue') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.owner_id,
      'payment_overdue',
      'Payment overdue',
      format('Payment of %s due %s is overdue', NEW.amount_due::text, NEW.due_date::text),
      '/dashboard/payments'
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_payment_overdue ON public.payments;
CREATE TRIGGER trg_notify_payment_overdue
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_overdue();

-- ============ FUNCTION: Notify maintenance update ============
CREATE OR REPLACE FUNCTION public.notify_maintenance_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.owner_id,
      'maintenance_status',
      format('Maintenance %s', NEW.status),
      format('Request "%s" is now %s', NEW.title, REPLACE(NEW.status::text, '_', ' ')),
      '/dashboard/maintenance'
    );
  END IF;
  IF NEW.priority = 'emergency' AND (OLD.priority IS NULL OR OLD.priority != 'emergency') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.owner_id,
      'maintenance_emergency',
      'Emergency maintenance request',
      format('Emergency: %s', NEW.title),
      '/dashboard/maintenance'
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_maintenance ON public.maintenance_requests;
CREATE TRIGGER trg_notify_maintenance
  AFTER UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_update();

-- ============ FUNCTION: Notify vacant unit ============
CREATE OR REPLACE FUNCTION public.notify_unit_vacant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.occupancy_status = 'vacant' AND (OLD.occupancy_status IS NULL OR OLD.occupancy_status != 'vacant') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      NEW.owner_id,
      'unit_vacant',
      'Unit is now vacant',
      format('Unit %s is vacant — potential loss of %s/month', NEW.unit_number, NEW.rent_amount::text),
      '/dashboard/properties'
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_unit_vacant ON public.units;
CREATE TRIGGER trg_notify_unit_vacant
  AFTER UPDATE OF occupancy_status ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.notify_unit_vacant();
