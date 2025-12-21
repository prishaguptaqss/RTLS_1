# Database Auto-Initialization

The RTLS backend now features **automatic database initialization** that runs on application startup.

## 🚀 Features

When you start the application with a **new/blank database**, it will automatically:

1. ✅ **Run all database migrations** (create tables, indexes, constraints)
2. ✅ **Seed 34 default permissions** across 9 modules
3. ✅ **Create default admin user** with credentials
4. ✅ **Set up admin access rights** (full admin permissions)

## 🔧 How It Works

The initialization happens automatically when you start the backend:

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --port 3000 --host 0.0.0.0 --reload
```

### Startup Process

1. **Check Database State**: Verifies if critical tables exist
2. **Run Migrations**: If tables don't exist, runs Alembic migrations
3. **Seed Permissions**: Inserts 34 default permissions if missing
4. **Create Admin**: Creates default admin user if not exists

### Smart Detection

The system is smart enough to:
- ✅ Skip initialization if database is already set up
- ✅ Seed missing permissions even if database exists
- ✅ Create admin user if accidentally deleted
- ✅ Never duplicate data or cause conflicts

## 👤 Default Admin Credentials

After initialization, you can login with:

```
Email:    admin@rtls.com
Password: admin123
```

⚠️ **IMPORTANT**: Change this password immediately in production!

## 🔑 Default Permissions (34 Total)

### Dashboard (1)
- View Dashboard

### Buildings (10)
- View Buildings
- Create/Edit/Delete Building
- Add/Edit/Delete Floor
- Add/Edit/Delete Room

### Entities (5)
- View Entities
- Admit/Edit/Discharge/Delete Entity

### Devices (4)
- View/Create/Edit/Delete Devices

### Live Positions (1)
- View Live Positions

### Organizations (4)
- View/Create/Edit/Delete Organizations

### Staff Management (4)
- View/Create/Edit/Delete Staff

### Role Management (4)
- View/Create/Edit/Delete Roles

### Settings (1)
- View Settings

## 🔄 Resetting to Blank Database

If you want to start fresh with a blank database:

### Option 1: Drop and Recreate Database (PostgreSQL)

```bash
# Stop the backend server first
PGPASSWORD=admin psql -h localhost -U qss_user -d postgres -c "DROP DATABASE rtls_db;"
PGPASSWORD=admin psql -h localhost -U qss_user -d postgres -c "CREATE DATABASE rtls_db;"

# Start the backend - it will auto-initialize
uvicorn app.main:app --port 3000 --host 0.0.0.0 --reload
```

### Option 2: Manual Reset with Alembic

```bash
cd backend
source venv/bin/activate

# Downgrade to remove all migrations
alembic downgrade base

# Start the backend - it will auto-initialize
uvicorn app.main:app --port 3000 --host 0.0.0.0 --reload
```

## 🔐 Changing Default Credentials

To change the default admin credentials, update your `.env` file or `app/config.py`:

```python
# In app/config.py or .env
DEFAULT_ADMIN_EMAIL: str = "your-email@company.com"
DEFAULT_ADMIN_PASSWORD: str = "your-secure-password"
DEFAULT_ADMIN_NAME: str = "Your Name"
```

These settings are only used when creating the initial admin user.

## 📝 Logs

During initialization, you'll see logs like:

```
INFO - ============================================================
INFO - DATABASE INITIALIZATION CHECK
INFO - ============================================================
INFO - Database not initialized. Starting setup...

INFO - Running database migrations...
INFO - ✓ Database migrations completed successfully

INFO - Seeding permissions...
INFO - ✓ Successfully seeded 34 permissions

INFO - Creating default admin user...
INFO - ✓ Default admin created successfully
INFO -   Email: admin@rtls.com
INFO -   Password: admin123
INFO -   ⚠️  IMPORTANT: Change this password in production!

INFO - ============================================================
INFO - ✓ DATABASE INITIALIZATION COMPLETED SUCCESSFULLY
INFO - ============================================================
```

If database is already initialized:

```
INFO - ============================================================
INFO - DATABASE INITIALIZATION CHECK
INFO - ============================================================
INFO - ✓ Database already initialized
INFO - ============================================================
```

## 🐛 Troubleshooting

### Issue: Migrations fail with "table already exists"

**Solution**: The migration tracking table is out of sync. Stamp the current revision:

```bash
alembic stamp head
```

### Issue: Permissions table is empty

**Solution**: The initialization will detect this and auto-seed permissions. Just restart the backend.

### Issue: Admin user missing

**Solution**: The initialization will detect this and recreate the admin. Just restart the backend.

### Issue: Want to manually run initialization

```bash
source venv/bin/activate
python3 -c "from app.db_init import initialize_database; initialize_database()"
```

## 🏗️ For Developers

The initialization logic is in `/backend/app/db_init.py`.

Key functions:
- `initialize_database()` - Main entry point
- `check_database_initialized()` - Checks if tables exist
- `run_migrations()` - Executes Alembic migrations
- `seed_permissions()` - Inserts default permissions
- `create_default_admin()` - Creates admin user

Called from: `app/main.py` in the lifespan startup event.

## 📦 Production Deployment

For production deployments:

1. **Set secure admin password** in environment variables
2. **Use production database** (not the development database)
3. **First deployment**: Auto-initialization will set up everything
4. **Subsequent deployments**: Only new migrations will run
5. **Monitor logs**: Check that initialization completes successfully

## ✅ Verification

After initialization, verify everything is set up:

```bash
# Check tables exist
PGPASSWORD=admin psql -h localhost -U qss_user -d rtls_db -c "\dt"

# Check permissions count (should be 34)
PGPASSWORD=admin psql -h localhost -U qss_user -d rtls_db -c "SELECT COUNT(*) FROM permissions;"

# Check admin user exists
PGPASSWORD=admin psql -h localhost -U qss_user -d rtls_db -c "SELECT * FROM staff WHERE email='admin@rtls.com';"
```

Or test via API:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rtls.com","password":"admin123"}'

# Should return: {"access_token":"...","token_type":"bearer"}
```
