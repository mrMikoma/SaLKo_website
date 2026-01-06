-- Create Umami database and user for analytics
-- Note: Environment variables UMAMI_DB_USER and UMAMI_DB_PASSWORD must be set

-- Use environment variables directly in SQL
\set umami_user `echo "${UMAMI_DB_USER}"`
\set umami_pass `echo "${UMAMI_DB_PASSWORD}"`

-- Create the umami user
CREATE USER :umami_user WITH PASSWORD :'umami_pass';

-- Create the umami database
CREATE DATABASE umami OWNER :umami_user;

-- Grant all privileges on the umami database to the umami user
GRANT ALL PRIVILEGES ON DATABASE umami TO :umami_user;
