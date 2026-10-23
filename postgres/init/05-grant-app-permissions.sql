-- Grant permissions on existing tables to application user
-- This runs after schema and seed data creation

-- Use environment variables directly in SQL
\set app_user `echo "${APP_DB_USER}"`

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :app_user;

-- Grant permissions on all existing sequences
GRANT SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO :app_user;

-- Specifically grant permissions on the tables we know exist
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON bullets TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_purposes TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON aircraft_sheets TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON pilot_aliases TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sheet_flights TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sheet_flight_issues TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sheet_sync_runs TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_log_web_entries TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_status_changes TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON aircraft_rates TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_fee_seasons TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_log_settings TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_periods TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_payers TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_lines TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON aircraft_year_totals TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_lines TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_outbox TO :app_user;

-- Grant usage on sequences for the IDENTITY columns
GRANT USAGE, SELECT ON SEQUENCE bullets_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE bookings_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE sheet_flight_issues_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE sheet_sync_runs_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE flight_status_changes_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE billing_periods_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE billing_lines_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE invoices_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE invoice_lines_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE email_outbox_id_seq TO :app_user;