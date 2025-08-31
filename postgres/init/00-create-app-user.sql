-- Create application user for NextJS project with limited permissions
-- Note: Environment variables APP_DB_USER and APP_DB_PASSWORD must be set as environment variables

-- Use environment variables directly in SQL
\set app_user `echo "${APP_DB_USER:-salko_app}"`
\set app_pass `echo "$APP_DB_PASSWORD"`

-- Create the user with dynamic values
CREATE USER :app_user WITH PASSWORD :'app_pass';

-- Grant connection to the database
GRANT CONNECT ON DATABASE salko TO :app_user;

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO :app_user;

-- Grant permissions on future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO :app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, UPDATE ON SEQUENCES TO :app_user;