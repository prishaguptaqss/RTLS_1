#!/bin/bash
# Script to check and apply database migrations

cd /home/qss/Desktop/RTLS/backend

echo "=== Current Migration Status ==="
source venv/bin/activate 2>/dev/null || true

# Check current revision
echo "Current database revision:"
PYTHONPATH=. python3 -c "
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from app.database import engine

cfg = Config('alembic.ini')

# Get current revision
with engine.connect() as connection:
    context = MigrationContext.configure(connection)
    current = context.get_current_revision()
    print(f'Current: {current}')

# Get head revision
script = ScriptDirectory.from_config(cfg)
head = script.get_current_head()
print(f'Head: {head}')

if current != head:
    print('\n⚠️  Database is NOT up to date!')
    print('Pending migrations need to be applied.')
else:
    print('\n✅ Database is up to date!')
"

echo ""
echo "=== Available Migration Commands ==="
echo "To apply pending migrations, run:"
echo "  cd /home/qss/Desktop/RTLS/backend"
echo "  source venv/bin/activate"
echo "  alembic upgrade head"
