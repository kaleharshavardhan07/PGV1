-- Aapka PG relational schema (PostgreSQL / Neon).
-- Idempotent: safe to run on every start. Every domain table carries pg_id, the
-- PG-owner foreign key that is the multi-tenancy boundary.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Identity ----------
CREATE TABLE IF NOT EXISTS pg_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_name             text NOT NULL,
  pg_username         text NOT NULL UNIQUE,
  description         text NOT NULL DEFAULT '',
  address             text NOT NULL,
  city                text NOT NULL,
  state               text NOT NULL DEFAULT '',
  pin_code            text NOT NULL DEFAULT '',
  pg_type             text NOT NULL DEFAULT 'Other' CHECK (pg_type IN ('Boys','Girls','Co-living','Other')),
  owner_name          text NOT NULL,
  owner_email         text NOT NULL UNIQUE,
  owner_mobile        text NOT NULL UNIQUE,
  password_hash       text NOT NULL,
  is_active           boolean NOT NULL DEFAULT true,
  is_discoverable     boolean NOT NULL DEFAULT true,
  approval_status     text NOT NULL DEFAULT 'Approved' CHECK (approval_status IN ('Pending','Approved','Rejected')),
  show_available_beds boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS managers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id         uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  email         text NOT NULL UNIQUE,
  mobile        text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS managers_pg_idx ON managers(pg_id);

-- One settings row per PG.
CREATE TABLE IF NOT EXISTS workspace_settings (
  pg_id                       uuid PRIMARY KEY REFERENCES pg_accounts(id) ON DELETE CASCADE,
  name                        text NOT NULL DEFAULT 'My PG',
  address                     text NOT NULL DEFAULT '',
  city                        text NOT NULL DEFAULT '',
  contact_email               text NOT NULL DEFAULT '',
  contact_phone               text NOT NULL DEFAULT '',
  owner_name                  text NOT NULL DEFAULT '',
  electricity_rate            numeric(8,2) NOT NULL DEFAULT 8.5 CHECK (electricity_rate >= 0),
  timezone                    text NOT NULL DEFAULT 'Asia/Kolkata',
  channel_whatsapp            boolean NOT NULL DEFAULT true,
  channel_sms                 boolean NOT NULL DEFAULT true,
  channel_email               boolean NOT NULL DEFAULT true,
  complaint_unresolved_hours  integer NOT NULL DEFAULT 48 CHECK (complaint_unresolved_hours >= 1),
  retry_attempts              integer NOT NULL DEFAULT 2 CHECK (retry_attempts >= 0)
);

-- ---------- Rooms, beds, tenants ----------
CREATE TABLE IF NOT EXISTS rooms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id             uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  room_number       text NOT NULL,
  floor             integer NOT NULL DEFAULT 0,
  sharing_type      integer NOT NULL DEFAULT 1 CHECK (sharing_type BETWEEN 1 AND 10),
  attached_bathroom boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pg_id, room_number)
);

CREATE TABLE IF NOT EXISTS beds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id        uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  room_id      uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number   integer NOT NULL CHECK (bed_number >= 1),
  label        text NOT NULL DEFAULT '',
  rent         numeric(10,2) CHECK (rent IS NULL OR rent >= 0),
  vacant_since date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, bed_number)
);
CREATE INDEX IF NOT EXISTS beds_pg_idx ON beds(pg_id);

-- A tenant account is created by the PG owner/manager (no self-registration).
-- bed_id is the only occupancy link: a bed is occupied iff a non-Left tenant
-- references it, so occupancy can never drift out of sync.
CREATE TABLE IF NOT EXISTS tenants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id               uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  bed_id              uuid REFERENCES beds(id) ON DELETE SET NULL,
  full_name           text NOT NULL,
  mobile              text NOT NULL,
  email               text NOT NULL DEFAULT '',
  gender              text CHECK (gender IN ('Male','Female','Other')),
  emergency_contact   text NOT NULL DEFAULT '',
  password_hash       text NOT NULL,
  password_changed_at timestamptz,
  created_by          text,
  monthly_rent        numeric(10,2) NOT NULL CHECK (monthly_rent >= 0),
  security_deposit    numeric(10,2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  joining_date        date NOT NULL,
  police_verification text NOT NULL DEFAULT 'Pending' CHECK (police_verification IN ('Pending','Verified','Not Required')),
  status              text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Notice Period','Left')),
  notice_date         date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenants_pg_idx ON tenants(pg_id);
-- One bed holds at most one tenant; a mobile number logs in to one live account.
CREATE UNIQUE INDEX IF NOT EXISTS tenants_bed_uniq ON tenants(bed_id) WHERE bed_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_live_mobile_uniq ON tenants(mobile) WHERE status <> 'Left';

-- ---------- Documents ----------
CREATE TABLE IF NOT EXISTS documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id            uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type             text NOT NULL DEFAULT 'Other' CHECK (type IN ('ID Proof','Photograph','Rental Agreement','Police Verification','Other')),
  title            text NOT NULL DEFAULT '',
  file_name        text NOT NULL,
  mime_type        text NOT NULL,
  size             integer NOT NULL CHECK (size > 0),
  uploaded_by_id   text NOT NULL,
  uploaded_by_role text NOT NULL CHECK (uploaded_by_role IN ('owner','manager','tenant')),
  uploaded_by_name text NOT NULL DEFAULT '',
  data             bytea NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_tenant_idx ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS documents_pg_idx ON documents(pg_id);

-- ---------- Operations ----------
CREATE TABLE IF NOT EXISTS meter_readings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id             uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  room_id           uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  month             char(7) NOT NULL,
  previous_reading  numeric(12,2) NOT NULL CHECK (previous_reading >= 0),
  current_reading   numeric(12,2) NOT NULL CHECK (current_reading >= 0),
  units             numeric(12,2) NOT NULL DEFAULT 0,
  rate_per_unit     numeric(8,2) NOT NULL CHECK (rate_per_unit >= 0),
  total_amount      numeric(12,2) NOT NULL DEFAULT 0,
  occupants         integer NOT NULL DEFAULT 1 CHECK (occupants >= 1),
  per_tenant_amount numeric(12,2) NOT NULL DEFAULT 0,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  published         boolean NOT NULL DEFAULT false,
  UNIQUE (room_id, month)
);
CREATE INDEX IF NOT EXISTS meter_pg_idx ON meter_readings(pg_id);

CREATE TABLE IF NOT EXISTS complaints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id        uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category     text NOT NULL CHECK (category IN ('AC','WiFi','Water','Cleaning','Electrical','Plumbing','Other')),
  description  text NOT NULL,
  room_number  text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted','Seen','In Progress','Resolved')),
  remarks      text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
CREATE INDEX IF NOT EXISTS complaints_pg_idx ON complaints(pg_id);

CREATE TABLE IF NOT EXISTS food_menu_items (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id     uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  day       text NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Dinner')),
  items     text[] NOT NULL DEFAULT '{}',
  timing    text NOT NULL DEFAULT '',
  UNIQUE (pg_id, day, meal_type)
);

CREATE TABLE IF NOT EXISTS meal_opt_outs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id     uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date      date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Dinner')),
  UNIQUE (tenant_id, date, meal_type)
);

CREATE TABLE IF NOT EXISTS food_ratings (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id     uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date      date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast','Lunch','Dinner')),
  rating    integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review    text NOT NULL DEFAULT '',
  UNIQUE (tenant_id, date, meal_type)
);

-- ---------- Notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id      uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  user_id    text NOT NULL,           -- tenant id, 'manager', 'owner' or 'all'
  user_role  text NOT NULL CHECK (user_role IN ('tenant','manager','owner')),
  title      text NOT NULL,
  message    text NOT NULL,
  type       text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  read       boolean NOT NULL DEFAULT false,
  link       text,
  category   text,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pg_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS notifications_pg_role_idx ON notifications(pg_id, user_role);

CREATE TABLE IF NOT EXISTS notification_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id          uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  dedupe_key     text,
  category       text,
  title          text NOT NULL,
  recipient      text NOT NULL,
  recipient_role text NOT NULL,
  channel        text NOT NULL,
  status         text NOT NULL,
  attempts       integer NOT NULL DEFAULT 1,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_logs_pg_idx ON notification_logs(pg_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_prefs (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  pg_id     uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  whatsapp  boolean NOT NULL DEFAULT true,
  sms       boolean NOT NULL DEFAULT true,
  email     boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id     uuid REFERENCES pg_accounts(id) ON DELETE CASCADE,
  actor     text NOT NULL,
  action    text NOT NULL,
  entity    text NOT NULL,
  entity_id text NOT NULL,
  details   text NOT NULL DEFAULT '',
  ts        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_pg_idx ON audit_logs(pg_id, ts DESC);

-- =====================================================================
-- v2: roles & permissions, feature toggles, location, expenses, invoices,
--     enquiries, document links. Idempotent upgrade of an existing database.
-- =====================================================================

-- Electricity is replaced by general expenses.
DROP TABLE IF EXISTS meter_readings;
ALTER TABLE workspace_settings DROP COLUMN IF EXISTS electricity_rate;

CREATE TABLE IF NOT EXISTS platform_admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pg_accounts
  ADD COLUMN IF NOT EXISTS area             text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS latitude         double precision CHECK (latitude  BETWEEN -90  AND 90),
  ADD COLUMN IF NOT EXISTS longitude        double precision CHECK (longitude BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS contact_public   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_status  text NOT NULL DEFAULT 'Approved' CHECK (approval_status IN ('Pending','Approved','Rejected')),
  -- features_allowed is set by the platform admin; features_enabled by the owner.
  -- A feature is usable only when both are true. Missing keys default to true.
  ADD COLUMN IF NOT EXISTS features_allowed jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS features_enabled jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS pg_accounts_city_idx ON pg_accounts (lower(city));

CREATE TABLE IF NOT EXISTS pg_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id       uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  file_name   text NOT NULL,
  mime_type   text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size        integer NOT NULL CHECK (size > 0),
  sort_order  integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 1),
  data        bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pg_id, sort_order)
);
CREATE INDEX IF NOT EXISTS pg_photos_pg_idx ON pg_photos(pg_id, sort_order);

ALTER TABLE managers
  ADD COLUMN IF NOT EXISTS permissions jsonb   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true;

ALTER TABLE beds ADD COLUMN IF NOT EXISTS unavailable boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS expenses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id              uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  title              text NOT NULL,
  description        text NOT NULL DEFAULT '',
  amount             numeric(12,2) NOT NULL CHECK (amount >= 0),
  expense_date       date NOT NULL,
  category           text NOT NULL CHECK (category IN ('Maintenance','Utilities','Groceries','Cleaning','Repairs','Salaries','Supplies','Other')),
  status             text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Settled')),
  visible_to_tenants boolean NOT NULL DEFAULT true,
  proof_required     boolean NOT NULL DEFAULT false,
  created_by_id      text NOT NULL,
  created_by_role    text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_pg_idx ON expenses(pg_id, expense_date DESC);

-- Invoices are records only: there is no online payment. Staff mark them paid manually.
CREATE TABLE IF NOT EXISTS invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id          uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number         text NOT NULL,
  billing_period text NOT NULL CHECK (billing_period ~ '^\d{4}-\d{2}$'),
  description    text NOT NULL DEFAULT '',
  amount         numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date       date NOT NULL,
  status         text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Issued','Paid','Cancelled')),
  paid_on        date,
  payment_note   text NOT NULL DEFAULT '',
  created_by_id  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pg_id, number)
);
CREATE INDEX IF NOT EXISTS invoices_pg_idx ON invoices(pg_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_tenant_idx ON invoices(tenant_id);

CREATE TABLE IF NOT EXISTS enquiries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id      uuid NOT NULL REFERENCES pg_accounts(id) ON DELETE CASCADE,
  name       text NOT NULL,
  mobile     text NOT NULL,
  email      text NOT NULL DEFAULT '',
  message    text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'New' CHECK (status IN ('New','Contacted','Closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiries_pg_idx ON enquiries(pg_id, created_at DESC);

-- Documents can now belong to a tenant, an expense, an invoice, or just the PG.
ALTER TABLE documents ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN ('ID Proof','Photograph','Rental Agreement','Police Verification','Receipt','Invoice','Other'));
CREATE INDEX IF NOT EXISTS documents_expense_idx ON documents(expense_id) WHERE expense_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_invoice_idx ON documents(invoice_id) WHERE invoice_id IS NOT NULL;
