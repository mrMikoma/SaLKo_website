-- Migration: Invoices
-- Date: 2026-10-23
-- Description: The website sends the club's bills: a closed billing period's
--              flights, and other charges such as membership, equipment and
--              hangar fees. Each email in email_outbox can belong to one.
-- init/01-schema.sql already has these.

-- Invoices (laskut) the website sends: a closed billing period's flights for
-- one payer, or other charges such as membership, equipment and hangar fees.
-- A sent invoice doesn't change; it is paid or cancelled. Kept for the
-- bookkeeping (six years), also after the member leaves.
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  -- Given when the invoice is sent: the year and a running number, 20260001
  number INT UNIQUE,
  reference TEXT UNIQUE, -- viitenumero: the number and its check digit
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'cancelled')),
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  -- The recipient as on the invoice
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_address TEXT NOT NULL DEFAULT '', -- street, postcode and city, one per line
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  -- A closed billing period's bill to one payer (billing_payers)
  period_id INT REFERENCES billing_periods (id) ON DELETE RESTRICT,
  payer_key TEXT,
  issue_date DATE,
  due_date DATE,
  total_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  sent_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  paid_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  cancel_reason TEXT,
  CHECK ((period_id IS NULL) = (payer_key IS NULL)),
  CHECK (status = 'draft' OR (number IS NOT NULL AND reference IS NOT NULL AND issue_date IS NOT NULL AND due_date IS NOT NULL))
);

-- One invoice per payer of a period; a cancelled one can be replaced
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_period_payer ON invoices (period_id, payer_key)
  WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  position INT NOT NULL,
  -- flight: from the billing period, as billed; other: typed in
  source TEXT NOT NULL DEFAULT 'other' CHECK (source IN ('flight', 'other')),
  line_date DATE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'kpl',
  unit_cents INT, -- NULL when the amount isn't quantity × price (corrections)
  amount_cents INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines (invoice_id, position);

ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS invoice_id INT REFERENCES invoices (id) ON DELETE SET NULL; -- the invoice it sends
CREATE INDEX IF NOT EXISTS idx_email_outbox_invoice ON email_outbox (invoice_id);

-- Same grants as init/05-grant-app-permissions.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_lines TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE invoices_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE invoice_lines_id_seq TO :app_user;
