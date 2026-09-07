-- Create Wiki.js database and user for the club wiki
-- Note: Environment variables WIKI_DB_USER and WIKI_DB_PASSWORD must be set
--
-- This script only runs on a fresh data directory. An already-provisioned
-- cluster is handled by postgres/migrations/003_create_wiki_db.sql, which the
-- deploy-monitoring workflow applies on every run.
--
-- The wiki only exists in production, so every statement is guarded on
-- WIKI_DB_USER being set. Environments that do not provide the variable
-- (e.g. dev) skip this script instead of aborting database initialisation.

-- Use environment variables directly in SQL
\set wiki_user `echo "${WIKI_DB_USER}"`
\set wiki_pass `echo "${WIKI_DB_PASSWORD}"`

-- Create the wiki user
SELECT format('CREATE USER %I WITH PASSWORD %L', :'wiki_user', :'wiki_pass')
WHERE :'wiki_user' <> ''
\gexec

-- Create the wiki database
SELECT format('CREATE DATABASE wiki OWNER %I', :'wiki_user')
WHERE :'wiki_user' <> ''
\gexec

-- Grant all privileges on the wiki database to the wiki user
SELECT format('GRANT ALL PRIVILEGES ON DATABASE wiki TO %I', :'wiki_user')
WHERE :'wiki_user' <> ''
\gexec
