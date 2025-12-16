#!/bin/bash
# Script to initialize database with Alembic migrations

set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -U rtls_user -d rtls_db; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - running migrations"
alembic upgrade head

echo "Database initialization complete"
