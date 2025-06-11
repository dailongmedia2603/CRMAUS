import requests
import json
from pprint import pprint
import sys

# Backend URL
BACKEND_URL = "http://localhost:8001/api"

def get_admin_token():
    """Get authentication token for admin user"""
    print("Step 1: Login with admin credentials (admin@example.com / admin123)")
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": "admin@example.com", "password": "admin123"}
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✅ Successfully logged in as admin")
        return token
    else:
        print(f"❌ Failed to get admin token: {response.status_code} - {response.text}")
        return None

def get_user_token(email, password):
    """Get authentication token for a specific user"""
    print(f"Step 3: Login as '{email}' with password '{password}'")
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": email, "password": password}
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✅ Successfully logged in as {email}")
        return token
    else:
        print(f"❌ Failed to get token for {email}: {response.status_code} - {response.text}")
        return None

def get_headers(token):
    """Get headers with authentication token"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_users_list(admin_token):
    """Get list of users to find Bé Kiều's user ID"""
    print("\nStep 2: Get the list of users with: GET /api/users/")
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers(admin_token)
    )
    
    if response.status_code == 200:
        users = response.json()
        print(f"✅ Successfully retrieved users list. Found {len(users)} users.")
        return users
    else:
        print(f"❌ Failed to get users list: {response.status_code} - {response.text}")
        return []

def find_user_by_name(users, name):
    """Find a user by name in the users list"""
    print(f"\nLooking for user '{name}' in the users list...")
    for user in users:
        if user.get("full_name") == name:
            print(f"✅ Found user '{name}' with ID: {user['id']}")
            return user
    print(f"❌ User '{name}' not found in users list")
    return None

def get_user_permissions(user_token):
    """Get permissions for the current user"""
    print("\nStep 4: Call GET /api/permissions/my-permissions to see what permissions this user actually has")
    response = requests.get(
        f"{BACKEND_URL}/permissions/my-permissions",
        headers=get_headers(user_token)
    )
    
    if response.status_code == 200:
        permissions = response.json()
        print(f"✅ Successfully retrieved user's permissions")
        return permissions
    else:
        print(f"❌ Failed to get user's permissions: {response.status_code} - {response.text}")
        return None

def get_user_permission_matrix(admin_token, user_id):
    """Get permission matrix for a specific user"""
    print(f"\nStep 5: Call GET /api/permissions/matrix/user/{user_id} to see the configured permissions for this user")
    response = requests.get(
        f"{BACKEND_URL}/permissions/matrix/user/{user_id}",
        headers=get_headers(admin_token)
    )
    
    if response.status_code == 200:
        matrix = response.json()
        print(f"✅ Successfully retrieved permission matrix for user ID: {user_id}")
        return matrix
    else:
        print(f"❌ Failed to get permission matrix: {response.status_code} - {response.text}")
        return None

def get_role_permission_matrix(admin_token, role):
    """Get permission matrix for a role"""
    print(f"\nGetting permission matrix for role '{role}' for comparison...")
    response = requests.get(
        f"{BACKEND_URL}/permissions/matrix/role/{role}",
        headers=get_headers(admin_token)
    )
    
    if response.status_code == 200:
        matrix = response.json()
        print(f"✅ Successfully retrieved permission matrix for role: {role}")
        return matrix
    else:
        print(f"❌ Failed to get role permission matrix: {response.status_code} - {response.text}")
        return None

def analyze_permissions(user, user_permissions, user_matrix, role_matrix):
    """Compare and analyze the user's permissions"""
    if not user or not user_permissions or not user_matrix or not role_matrix:
        print("❌ Cannot analyze permissions - missing data")
        return
    
    user_id = user["id"]
    user_name = user["full_name"]
    user_role = user["role"]
    
    # Extract the permissions from all sources
    my_permissions = user_permissions.get("permissions", {})
    user_configured_permissions = {
        perm["permission_id"]: perm 
        for perm in user_matrix.get("current_permissions", [])
    }
    
    role_configured_permissions = {
        perm["permission_id"]: perm 
        for perm in role_matrix.get("current_permissions", [])
    }
    
    # Get all permission items for reference
    permission_items = {
        item["id"]: item
        for item in user_matrix.get("items", [])
    }
    
    # Count permissions
    total_permissions = len(permission_items)
    user_configured_count = len(user_configured_permissions)
    role_configured_count = len(role_configured_permissions)
    
    print(f"\n\n=== Step 6: Permission Analysis for {user_name} (Role: {user_role}) ===")
    print(f"Total available permissions: {total_permissions}")
    print(f"User-specific configured permissions: {user_configured_count}")
    print(f"Role-based configured permissions: {role_configured_count}")
    
    # Check if user has any specific permissions configured
    if user_configured_count == 0:
        print("\n⚠️ User has no specific permissions configured - inheriting all from role")
    else:
        print(f"\n✅ User has {user_configured_count} specifically configured permissions")
        
        # Check for overrides
        override_count = sum(1 for perm in user_configured_permissions.values() if perm.get("override_role", False))
        print(f"Permissions overriding role: {override_count}")
        
        # Sample of configured permissions
        print("\nUser-configured permissions:")
        for perm_id, perm_data in user_configured_permissions.items():
            item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
            print(f"- {item_name}: view={perm_data.get('can_view')}, edit={perm_data.get('can_edit')}, delete={perm_data.get('can_delete')}, override={perm_data.get('override_role', False)}")
    
    # Check for full access permissions in user's actual permissions
    full_access_count = sum(
        1 for perm in my_permissions.values() 
        if perm.get("can_view") and perm.get("can_edit") and perm.get("can_delete")
    )
    
    if full_access_count > 0:
        print(f"\n⚠️ User has full access (view+edit+delete) to {full_access_count} permissions")
        
        # List the full access permissions
        print("\nFull access permissions:")
        full_access_perms = [
            (perm_id, perm_data) 
            for perm_id, perm_data in my_permissions.items() 
            if perm_data.get("can_view") and perm_data.get("can_edit") and perm_data.get("can_delete")
        ]
        
        for perm_id, perm_data in full_access_perms:
            item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
            print(f"- {item_name} (source: {perm_data.get('source')})")
    
    # Check for permissions that are in my-permissions but not in matrix
    print("\nPermission source breakdown:")
    role_permissions_count = sum(1 for perm in my_permissions.values() if perm.get("source") == "role")
    user_override_permissions_count = sum(1 for perm in my_permissions.values() if perm.get("source") == "user_override")
    
    print(f"Permissions from role: {role_permissions_count}")
    print(f"Permissions overridden by user: {user_override_permissions_count}")
    
    # Check if role has full access permissions
    role_full_access_count = 0
    role_full_access_perms = []
    
    for perm_id, perm_data in role_configured_permissions.items():
        if perm_data.get("can_view") and perm_data.get("can_edit") and perm_data.get("can_delete"):
            role_full_access_count += 1
            role_full_access_perms.append((perm_id, perm_data))
    
    if role_full_access_count > 0:
        print(f"\n⚠️ Role '{user_role}' has full access (view+edit+delete) to {role_full_access_count} permissions")
        
        # List the full access permissions
        print("\nRole's full access permissions:")
        for perm_id, perm_data in role_full_access_perms:
            item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
            print(f"- {item_name}")
    
    # Check for admin-like permissions
    admin_like_permissions = []
    for perm_id, perm_data in my_permissions.items():
        if perm_data.get("can_view") and perm_data.get("can_edit") and perm_data.get("can_delete"):
            admin_like_permissions.append((perm_id, perm_data))
    
    if admin_like_permissions:
        print(f"\n⚠️ User has admin-like permissions (view+edit+delete) for {len(admin_like_permissions)} items")
    
    # Final analysis
    print("\n=== CONCLUSION ===")
    if user_configured_count > 0 and override_count > 0:
        print(f"1. User '{user_name}' has {user_configured_count} specifically configured permissions with {override_count} overriding their role.")
    else:
        print(f"1. User '{user_name}' has no specific permissions configured and inherits all from their '{user_role}' role.")
    
    if full_access_count > 0:
        print(f"2. User has full access (view+edit+delete) to {full_access_count} permissions, which gives them admin-like capabilities.")
    
    if user_configured_permissions:
        dashboard_perm = next((perm for perm_id, perm in user_configured_permissions.items() if "dashboard" in perm_id.lower()), None)
        if dashboard_perm and dashboard_perm.get("can_view") and dashboard_perm.get("can_edit") and dashboard_perm.get("can_delete"):
            print("3. User has been specifically granted full access to the Dashboard, which may be causing the issue.")
    
    print("\nPossible reasons for full access despite permissions being configured:")
    print("1. The user has specific permissions configured that override their role permissions")
    print("2. The role itself may have admin-like permissions")
    print("3. There might be a bug in the permission checking logic")
    print("4. The frontend might not be correctly checking permissions before showing UI elements")

def main():
    print("=== Comprehensive Permission Test for 'Bé Kiều' ===\n")
    
    # Step 1: Login with admin credentials
    admin_token = get_admin_token()
    if not admin_token:
        print("Cannot proceed without admin access")
        return
    
    # Step 2: Get the list of users to find "Bé Kiều"
    users = get_users_list(admin_token)
    if not users:
        print("Cannot proceed without users list")
        return
    
    # Find "Bé Kiều" user
    kieu_user = find_user_by_name(users, "Bé Kiều")
    if not kieu_user:
        print("Cannot proceed without finding 'Bé Kiều' user")
        return
    
    kieu_user_id = kieu_user["id"]
    kieu_email = kieu_user["email"]
    kieu_role = kieu_user["role"]
    
    print(f"Bé Kiều's details:")
    print(f"- Email: {kieu_email}")
    print(f"- Role: {kieu_role}")
    print(f"- ID: {kieu_user_id}")
    
    # Step 3: Login as "Bé Kiều" with the reset password
    kieu_token = get_user_token(kieu_email, "testpassword123")
    if not kieu_token:
        print("Cannot proceed without logging in as 'Bé Kiều'")
        return
    
    # Step 4: Get "Bé Kiều"'s permissions
    user_permissions = get_user_permissions(kieu_token)
    
    # Step 5: Get the configured permissions matrix for "Bé Kiều"
    user_matrix = get_user_permission_matrix(admin_token, kieu_user_id)
    
    # Get the role permissions for comparison
    role_matrix = get_role_permission_matrix(admin_token, kieu_role)
    
    # Step 6: Analyze the permissions
    analyze_permissions(kieu_user, user_permissions, user_matrix, role_matrix)

if __name__ == "__main__":
    main()
