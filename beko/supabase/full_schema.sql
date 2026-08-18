-- ==========================================================
-- BEKO WHOLESALE AUTO PARTS - CLEAN SUPABASE SCHEMA
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DROP UNUSED / OBSOLETE TABLES
DROP TABLE IF EXISTS public.trip_shops CASCADE;
DROP TABLE IF EXISTS public.trip_payments CASCADE;

-- 3. PROFILES TABLE (Linked with Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales')),
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "delete_profiles" ON public.profiles;

CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 4. AUTO CREATE PROFILE ON SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  INSERT INTO public.profiles (id, name, email, role, is_blocked)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.email, ''),
    CASE WHEN user_count = 0 THEN 'admin' ELSE 'sales' END,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, profiles.email),
      name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user TO anon, authenticated;

-- 5. SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  opening_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_shops" ON public.shops;
CREATE POLICY "allow_all_shops" ON public.shops FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'bank', 'mixed')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_payments" ON public.payments;
CREATE POLICY "allow_all_payments" ON public.payments FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 7. SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL,
  departure_date date,
  arrival_date date,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'shipping', 'customs', 'arrived', 'received')),
  total_cost_cny numeric NOT NULL DEFAULT 0,
  total_shipping_cny numeric NOT NULL DEFAULT 0,
  cny_to_lyd_rate numeric NOT NULL DEFAULT 1,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_shipments" ON public.shipments;
CREATE POLICY "allow_all_shipments" ON public.shipments FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 8. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oem text NOT NULL DEFAULT '',
  description text NOT NULL,
  car_model text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  shelf text NOT NULL DEFAULT '',
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  purchase_price numeric NOT NULL DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_inventory" ON public.inventory;
CREATE POLICY "allow_all_inventory" ON public.inventory FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 9. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plate_number text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'van',
  model text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_vehicles" ON public.vehicles;
CREATE POLICY "allow_all_vehicles" ON public.vehicles FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 10. TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name text NOT NULL DEFAULT '',
  vehicle text NOT NULL DEFAULT '',
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  departure_at date NOT NULL DEFAULT CURRENT_DATE,
  return_at date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'loading', 'pending_approval', 'active', 'completed', 'cancelled', 'rejected')),
  total_sales numeric NOT NULL DEFAULT 0,
  city text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_trips" ON public.trips;
CREATE POLICY "allow_all_trips" ON public.trips FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 11. TRIP ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.trip_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.inventory(id) ON DELETE RESTRICT,
  oem text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  loaded_qty integer NOT NULL DEFAULT 0,
  sold_qty integer NOT NULL DEFAULT 0,
  returned_qty integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_trip_items" ON public.trip_items;
CREATE POLICY "allow_all_trip_items" ON public.trip_items FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 12. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE RESTRICT,
  shop_name text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'credit')),
  paid_amount numeric NOT NULL DEFAULT 0,
  cash_amount numeric,
  bank_amount numeric,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  trip_name text,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'partial', 'unpaid')),
  created_by text NOT NULL DEFAULT '',
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_invoices" ON public.invoices;
CREATE POLICY "allow_all_invoices" ON public.invoices FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 13. INVOICE LINES TABLE
CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.inventory(id) ON DELETE RESTRICT,
  oem text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  line_cost numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_invoice_lines" ON public.invoice_lines;
CREATE POLICY "allow_all_invoice_lines" ON public.invoice_lines FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 14. CAPITAL & EXPENSES TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.capital_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('capital_initial', 'capital_injection', 'expense')),
  category text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  vehicle_name text NOT NULL DEFAULT '',
  balance_before numeric NOT NULL DEFAULT 0,
  balance_after numeric NOT NULL DEFAULT 0,
  total_capital_before numeric NOT NULL DEFAULT 0,
  total_capital_after numeric NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT '',
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_capital_transactions" ON public.capital_transactions;
CREATE POLICY "allow_all_capital_transactions" ON public.capital_transactions FOR ALL
  TO public USING (true) WITH CHECK (true);

-- 15. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_payments_shop_id ON public.payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shipment_id ON public.inventory(shipment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_shop_id ON public.invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON public.invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_items_trip_id ON public.trip_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_date ON public.capital_transactions(date);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_type ON public.capital_transactions(type);
CREATE INDEX IF NOT EXISTS idx_capital_transactions_created_at ON public.capital_transactions(created_at);
