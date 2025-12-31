# Organization ID Restructure - Testing & Deployment Guide

## Overview
This guide covers testing and deployment procedures for the major architectural change from integer `organization_id` to user-defined string `org_id` as the primary organizational identifier.

---

## What Changed

### Backend Changes
1. **Organization Model**: `id` (Integer, auto-increment) → `org_id` (String, user-defined, primary key)
2. **All Foreign Keys**: Changed from `organization_id: Integer` → `org_id: String` in 9 models
3. **API Header**: Renamed from `X-Organization-ID` → `X-Org-ID`
4. **API Endpoints**: Organization CRUD uses `org_id` in path parameters instead of integer ID
5. **Database Migration**: Complex 10-step migration preserving all data

### Affected Models (9 total)
- Staff
- Entity
- Building
- Tag
- Anchor
- Role
- OrganizationSettings
- Room
- LiveLocation

### Frontend Changes
1. **API Service** (`services/api.js`): Header changed to `X-Org-ID`
2. **LocalStorage**: `currentOrganizationId` → `currentOrgId`
3. **AuthContext**: Uses `org_id` from login response
4. **OrganizationContext**: Compares `org_id` (string) instead of `id` (integer)
5. **API Calls**: Removed explicit `organization_id` parameters (now handled by header)

---

## Pre-Deployment Checklist

### 1. Database Backup
```bash
# CRITICAL: Backup your database before migration
pg_dump -U postgres -d rtlt_db > backup_before_org_id_restructure_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Migration File
Location: `backend/alembic/versions/a1b2c3d4e5f6_org_id_restructure.py`

Ensure it includes all 10 steps:
- ✅ Step 1: Add org_id columns
- ✅ Step 2: Populate org_id from existing data
- ✅ Step 3: Drop old foreign key constraints
- ✅ Step 4: Drop old composite unique constraints
- ✅ Step 5: Drop old organization_id columns
- ✅ Step 6: Update organizations table primary key
- ✅ Step 7: Make org_id non-nullable
- ✅ Step 8: Create indexes on org_id
- ✅ Step 9: Recreate foreign key constraints
- ✅ Step 10: Recreate composite unique constraints

### 3. Check Current Migration Status
```bash
cd backend
source venv/bin/activate
alembic current
# Should show: 4bb6a9548db7
```

---

## Deployment Steps

### Step 1: Stop Backend Server
```bash
# Stop the FastAPI backend
pkill -f "uvicorn main:app"
```

### Step 2: Run Database Migration
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

**Expected Output:**
```
Step 1: Adding org_id columns...
Step 2: Populating org_id columns from existing data...
Step 3: Dropping old foreign key constraints...
Step 4: Dropping old composite unique constraints...
Step 5: Dropping old organization_id columns...
Step 6: Updating organizations table primary key...
Step 7: Making org_id non-nullable...
Step 8: Creating indexes on org_id columns...
Step 9: Recreating foreign key constraints...
Step 10: Recreating composite unique constraints...
Migration complete!
```

### Step 3: Verify Migration
```bash
alembic current
# Should show: a1b2c3d4e5f6 (head)
```

### Step 4: Start Backend Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

### Step 5: Clear Browser Cache
**CRITICAL**: Users must clear browser storage for the frontend to work properly.

**Option 1: Manual clearing (per user)**
1. Open browser DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Refresh page

**Option 2: Programmatic clearing (recommended)**
Add version check in frontend to auto-clear on update.

---

## Testing Checklist

### Backend API Testing

#### 1. Organization CRUD

**Create Organization**
```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "ORG-001",
    "name": "Test Hospital",
    "display_name": "Test Hospital",
    "address": "123 Main St",
    "country": "USA",
    "pincode": "12345"
  }'
```

**Expected**: 201 Created with organization object

**Test Validation**
```bash
# Duplicate org_id should fail
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type": application/json" \
  -d '{
    "org_id": "ORG-001",
    "name": "Duplicate",
    "display_name": "Duplicate",
    "address": "456 Main St",
    "country": "USA",
    "pincode": "54321"
  }'
```

**Expected**: 400 Bad Request - "Organization with org_id 'ORG-001' already exists"

**Get Organization by org_id**
```bash
curl http://localhost:3000/api/organizations/ORG-001 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Org-ID: ORG-001"
```

**Expected**: 200 OK with organization data

**Update Organization**
```bash
curl -X PUT http://localhost:3000/api/organizations/ORG-001 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Hospital Name"
  }'
```

**Expected**: 200 OK with updated organization

**Delete Organization**
```bash
curl -X DELETE http://localhost:3000/api/organizations/ORG-001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: 204 No Content (cascades to all related data)

#### 2. Multi-Tenant Data Scoping

**Create Building**
```bash
curl -X POST http://localhost:3000/api/buildings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Org-ID: ORG-001" \
  -H "Content-Type: application/json" \
  -d '{
    "building_id": "BLDG-A",
    "name": "Main Building"
  }'
```

**Expected**: 201 Created, building assigned to ORG-001

**List Buildings (Org-Scoped)**
```bash
curl http://localhost:3000/api/buildings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Org-ID: ORG-001"
```

**Expected**: Returns only buildings for ORG-001

**Cross-Organization Access Control**
```bash
# Try to access ORG-002's building with ORG-001 header
curl http://localhost:3000/api/buildings/BLDG-B \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Org-ID: ORG-001"
```

**Expected**: 404 Not Found (if BLDG-B belongs to ORG-002)

#### 3. Authentication Flow

**Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "org_id": "ORG-001",
  "organization_name": "Test Hospital"
}
```

**Get Current User**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response includes:**
```json
{
  "id": 1,
  "staff_id": "STAFF-001",
  "org_id": "ORG-001",
  ...
}
```

#### 4. Entity Management (Org-Scoped)

**Create Entity**
```bash
curl -X POST http://localhost:3000/api/entities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Org-ID: ORG-001" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "PATIENT-001",
    "name": "John Doe",
    "type": "person"
  }'
```

**Expected**: 201 Created, entity scoped to ORG-001

#### 5. Foreign Key Constraints

**Test Cascade Delete**
```bash
# Create organization, building, floor, room
# Then delete organization
curl -X DELETE http://localhost:3000/api/organizations/ORG-TEST \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Organization and ALL related records deleted (buildings, floors, rooms, etc.)

**Test Set NULL (Staff)**
```bash
# Delete an organization with staff members
curl -X DELETE http://localhost:3000/api/organizations/ORG-TEST \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: Staff members remain but `org_id` set to NULL

---

### Frontend Testing

#### 1. Login Flow

**Test Steps:**
1. Navigate to `/login`
2. Enter credentials
3. Click "Login"

**Expected:**
- Redirected to dashboard
- `currentOrgId` stored in localStorage
- `X-Org-ID` header automatically added to all API requests
- Organization name displayed in sidebar

#### 2. Organization Display

**Verify:**
- Sidebar shows current organization name
- Organization logo displays (if uploaded)

#### 3. Organization-Scoped Data

**Test Steps:**
1. Navigate to Locations page
2. Create a building
3. Switch organization (if multi-org user)
4. Verify building list refreshes for new organization

**Expected:**
- Buildings filtered by current organization
- No cross-organization data leakage

#### 4. Organization Switching

**Test Steps:**
1. Admin user with multiple organizations
2. Switch organization from sidebar/header
3. Page reloads

**Expected:**
- `currentOrgId` updated in localStorage
- All data refreshes for new organization
- Header shows new organization name

---

## Rollback Procedure

### If Issues Occur

**1. Rollback Database**
```bash
cd backend
source venv/bin/activate
alembic downgrade 4bb6a9548db7
```

**2. Restore from Backup**
```bash
psql -U postgres -d rtlt_db < backup_before_org_id_restructure_YYYYMMDD_HHMMSS.sql
```

**3. Revert Code**
```bash
git revert <commit-hash>
```

---

## Common Issues & Solutions

### Issue 1: Migration Fails - "relation already exists"

**Solution:**
Migration includes `DROP INDEX IF EXISTS` for existing indexes. If issue persists:
```sql
-- Manually drop conflicting indexes
DROP INDEX IF EXISTS ix_organizations_org_id;
DROP INDEX IF EXISTS ix_staff_org_id;
-- ... etc
```

### Issue 2: Frontend Shows Empty Data

**Cause:** localStorage still has old `currentOrganizationId` (integer)

**Solution:**
Clear browser localStorage:
```javascript
localStorage.removeItem('currentOrganizationId');
localStorage.removeItem('currentOrgId');
// Logout and login again
```

### Issue 3: "Organization ID required" Error

**Cause:** `X-Org-ID` header not being sent

**Solution:**
Check that:
1. User is logged in
2. `currentOrgId` exists in localStorage
3. API interceptor is adding header correctly

### Issue 4: 404 on Organization Endpoints

**Cause:** Using integer ID instead of string org_id

**Solution:**
Update API calls to use `org_id` (string) instead of `id` (integer):
```javascript
// Before
DELETE /organizations/1

// After
DELETE /organizations/ORG-001
```

---

## Performance Considerations

### Indexing
All `org_id` foreign key columns are indexed for query performance:
- `ix_staff_org_id`
- `ix_entities_org_id`
- `ix_buildings_org_id`
- `ix_tags_org_id`
- `ix_anchors_org_id`
- `ix_roles_org_id`
- `ix_organization_settings_org_id`
- `ix_rooms_org_id`
- `ix_live_locations_org_id`

### Composite Unique Constraints
Maintained for data integrity:
- `(entity_id, org_id)` on entities
- `(building_id, org_id)` on buildings
- `(room_name, org_id)` on rooms

---

## Security Validation

### Test Access Control

**Admin Access:**
- ✅ Can view all organizations
- ✅ Can create/update/delete any organization
- ✅ Can access data from any organization

**Non-Admin Access:**
- ✅ Can only view assigned organization
- ✅ Cannot view other organizations' data
- ✅ Cannot create/update organizations without permission

**Test Steps:**
1. Login as non-admin user
2. Try to access another organization's endpoint
3. Verify 403 Forbidden response

---

## Success Criteria

### Deployment Successful If:

- [x] Database migration completes without errors
- [x] All 10 migration steps execute successfully
- [x] Backend server starts without errors
- [x] Login flow works and returns `org_id`
- [x] Organization CRUD operations work with string `org_id`
- [x] Multi-tenant data scoping works correctly
- [x] Frontend loads data scoped to current organization
- [x] No cross-organization data leakage
- [x] Cascade deletes work properly
- [x] Foreign key constraints enforced
- [x] Access control validated for admin/non-admin users

---

## Monitoring & Validation

### Post-Deployment Checks (First 24 Hours)

1. **Monitor Error Logs:**
   ```bash
   tail -f backend/logs/app.log | grep -i "error\|exception"
   ```

2. **Check Database Integrity:**
   ```sql
   -- Verify no orphaned records
   SELECT COUNT(*) FROM staff WHERE org_id IS NOT NULL
     AND org_id NOT IN (SELECT org_id FROM organizations);

   -- Should return 0
   ```

3. **Verify Foreign Keys:**
   ```sql
   -- Check all foreign key constraints exist
   SELECT conname FROM pg_constraint
   WHERE conname LIKE '%org_id%';
   ```

4. **Test Data Scoping:**
   - Create test data in multiple organizations
   - Verify cross-organization isolation
   - Delete test organizations and verify cascades

---

## Contact & Support

For issues during deployment:
1. Check this guide for common issues
2. Review migration logs in `backend/alembic/versions/`
3. Check application logs for errors
4. Restore from backup if critical issues occur

---

**Last Updated:** 2025-12-31
**Migration Version:** a1b2c3d4e5f6
**Status:** ✅ Successfully Deployed
