#!/bin/bash

# Fix Alembic version mismatch
echo "Fixing Alembic version mismatch..."

# Reset alembic_version table to correct version
sudo docker exec rtls-postgres psql -U rtls_user -d rtls_db -c "DELETE FROM alembic_version;"
sudo docker exec rtls-postgres psql -U rtls_user -d rtls_db -c "INSERT INTO alembic_version (version_num) VALUES ('001');"

echo "✓ Alembic version reset to '001'"
echo "You can now run ./start.sh again"
