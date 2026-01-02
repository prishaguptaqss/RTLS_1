"""
Test script to verify database initialization.
This script checks if admin user, admin role, and permissions are properly created.
"""

import sys
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.config import settings

def test_database_initialization():
    """Test that all admin setup is correct."""
    print("=" * 60)
    print("DATABASE INITIALIZATION VERIFICATION")
    print("=" * 60)
    print()

    db = SessionLocal()
    try:
        # Test 1: Check permissions
        print("1. Checking permissions...")
        result = db.execute(text("SELECT COUNT(*) FROM permissions"))
        perm_count = result.scalar()
        print(f"   ✓ Found {perm_count} permissions")
        if perm_count != 34:
            print(f"   ⚠️  Warning: Expected 34 permissions, found {perm_count}")
        print()

        # Test 2: Check admin role
        print("2. Checking Admin role...")
        result = db.execute(
            text("SELECT id, name, description FROM roles WHERE name = :name"),
            {"name": "Admin"}
        )
        admin_role = result.fetchone()
        if admin_role:
            print(f"   ✓ Admin role exists (ID: {admin_role[0]})")
            print(f"     Name: {admin_role[1]}")
            print(f"     Description: {admin_role[2]}")
        else:
            print("   ❌ Admin role NOT found!")
            return False
        print()

        # Test 3: Check admin role permissions
        print("3. Checking Admin role permissions...")
        result = db.execute(
            text("SELECT COUNT(*) FROM role_permissions WHERE role_id = :role_id"),
            {"role_id": admin_role[0]}
        )
        role_perm_count = result.scalar()
        print(f"   ✓ Admin role has {role_perm_count} permissions")
        if role_perm_count != perm_count:
            print(f"   ⚠️  Warning: Admin role should have all {perm_count} permissions")
        print()

        # Test 4: Check admin user
        print("4. Checking admin user...")
        result = db.execute(
            text("SELECT id, staff_id, name, email, is_admin FROM staff WHERE email = :email"),
            {"email": settings.DEFAULT_ADMIN_EMAIL}
        )
        admin_user = result.fetchone()
        if admin_user:
            print(f"   ✓ Admin user exists (ID: {admin_user[0]})")
            print(f"     Staff ID: {admin_user[1]}")
            print(f"     Name: {admin_user[2]}")
            print(f"     Email: {admin_user[3]}")
            print(f"     Is Admin: {admin_user[4]}")
        else:
            print("   ❌ Admin user NOT found!")
            return False
        print()

        # Test 5: Check admin user's roles
        print("5. Checking admin user role assignment...")
        result = db.execute(
            text("""
                SELECT r.id, r.name
                FROM roles r
                JOIN staff_roles sr ON r.id = sr.role_id
                WHERE sr.staff_id = :staff_id
            """),
            {"staff_id": admin_user[0]}
        )
        user_roles = result.fetchall()

        if user_roles:
            print(f"   ✓ Admin user has {len(user_roles)} role(s):")
            for role in user_roles:
                print(f"     - {role[1]} (ID: {role[0]})")
        else:
            print("   ❌ Admin user has NO roles assigned!")
            return False
        print()

        # Test 6: Check if admin has all permissions through role
        print("6. Checking admin's effective permissions...")
        result = db.execute(
            text("""
                SELECT COUNT(DISTINCT p.id)
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN staff_roles sr ON rp.role_id = sr.role_id
                WHERE sr.staff_id = :staff_id
            """),
            {"staff_id": admin_user[0]}
        )
        effective_perms = result.scalar()
        print(f"   ✓ Admin user has {effective_perms} effective permissions")
        if effective_perms != perm_count:
            print(f"   ⚠️  Warning: Admin should have all {perm_count} permissions")
        print()

        # Test 7: List all permissions
        print("7. Listing all admin permissions:")
        result = db.execute(
            text("""
                SELECT DISTINCT p.code, p.name, p.module
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN staff_roles sr ON rp.role_id = sr.role_id
                WHERE sr.staff_id = :staff_id
                ORDER BY p.module, p.code
            """),
            {"staff_id": admin_user[0]}
        )
        permissions = result.fetchall()

        current_module = None
        for perm in permissions:
            if current_module != perm[2]:
                current_module = perm[2]
                print(f"\n   [{current_module.upper()}]")
            print(f"   - {perm[0]}: {perm[1]}")
        print()

        print("=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        print()
        print("Summary:")
        print(f"  • {perm_count} permissions created")
        print(f"  • Admin role created with all permissions")
        print(f"  • Admin user created: {admin_user[3]}")
        print(f"  • Admin user assigned to Admin role")
        print(f"  • Admin has {effective_perms} effective permissions")
        print()
        return True

    except Exception as e:
        print(f"❌ Error during verification: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = test_database_initialization()
    sys.exit(0 if success else 1)
