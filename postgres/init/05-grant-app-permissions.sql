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
GRANT SELECT, INSERT, UPDATE, DELETE ON billable_items TO :app_user;

-- Grant usage on sequences for the IDENTITY columns
GRANT USAGE, SELECT ON SEQUENCE bullets_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE bookings_id_seq TO :app_user;