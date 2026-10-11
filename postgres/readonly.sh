#!/bin/sh

set -eu

export PGPASSWORD="$POSTGRES_PASSWORD"

psql \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1 \
    --set=ro_user="$POSTGRES_RO_USER" \
    --set=ro_password="$POSTGRES_RO_PASSWORD" \
    --set=admin_user="$POSTGRES_USER" \
    <<'SQL'

-- Создаём роль, если её ещё нет.
SELECT format(
    'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
    :'ro_user',
    :'ro_password'
)
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = :'ro_user'
)\gexec


-- На каждом запуске приводим роль к ожидаемому состоянию.
SELECT format(
    'ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
    :'ro_user',
    :'ro_password'
)\gexec


-- Убираем существующие права на БД
-- и оставляем только CONNECT.
SELECT format(
    'REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I',
    current_database(),
    :'ro_user'
)\gexec

SELECT format(
    'GRANT CONNECT ON DATABASE %I TO %I',
    current_database(),
    :'ro_user'
)\gexec


-- На schema public оставляем только USAGE.
SELECT format(
    'REVOKE ALL PRIVILEGES ON SCHEMA public FROM %I',
    :'ro_user'
)\gexec

SELECT format(
    'GRANT USAGE ON SCHEMA public TO %I',
    :'ro_user'
)\gexec


-- На существующие таблицы оставляем только SELECT.
SELECT format(
    'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
    :'ro_user'
)\gexec

SELECT format(
    'GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I',
    :'ro_user'
)\gexec


-- И автоматически выдаём SELECT на таблицы,
-- которые в дальнейшем создаст postgres.
SELECT format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
    :'admin_user',
    :'ro_user'
)\gexec

SELECT format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO %I',
    :'admin_user',
    :'ro_user'
)\gexec

SQL

unset PGPASSWORD

echo "readonly role configured successfully"