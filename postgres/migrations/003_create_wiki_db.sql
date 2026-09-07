-- Migration: create the Wiki.js database and user on an existing cluster.
--
-- postgres/init/*.sql only runs when the data directory is empty, so an
-- already-provisioned server needs this migration instead. It is idempotent
-- and safe to re-run; the deploy-monitoring workflow applies it on every run.
--
-- Run against the "salko" database as the superuser, e.g.:
--   docker exec -i salko-postgres-prod psql -v ON_ERROR_STOP=1 \
--     -U salko_admin -d salko \
--     -v wiki_user="wiki_app" -v wiki_pass="$WIKI_DB_PASSWORD" \
--     < 003_create_wiki_db.sql

\set ON_ERROR_STOP on

-- Create the wiki role only if it does not exist yet
SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'wiki_user', :'wiki_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'wiki_user')
\gexec

-- Keep the password in sync with the deployment secret
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'wiki_user', :'wiki_pass')
\gexec

-- Create the wiki database only if it does not exist yet
SELECT format('CREATE DATABASE wiki OWNER %I', :'wiki_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'wiki')
\gexec

-- Grant all privileges on the wiki database to the wiki user
SELECT format('GRANT ALL PRIVILEGES ON DATABASE wiki TO %I', :'wiki_user')
\gexec
