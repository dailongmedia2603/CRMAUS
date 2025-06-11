import requests
import json
from pprint import pprint

# Backend URL
BACKEND_URL = "http://localhost:8001/api"

def get_admin_token():
    """Get authentication token for admin user"""
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
    for user in users:
        if user.get("full_name") == name:
            print(f"✅ Found user '{name}' with ID: {user['id']}")
            return user
    print(f"❌ User '{name}' not found in users list")
    return None

def get_user_permissions(user_token):
    """Get permissions for the current user"""
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

def analyze_permissions(user_permissions, permission_matrix):
    """Compare and analyze the user's permissions"""
    if not user_permissions or not permission_matrix:
        print("❌ Cannot analyze permissions - missing data")
        return
    
    # Extract the permissions from both sources
    my_permissions = user_permissions.get("permissions", {})
    configured_permissions = {
        perm["permission_id"]: perm 
        for perm in permission_matrix.get("current_permissions", [])
    }
    
    # Get all permission items for reference
    permission_items = {
        item["id"]: item
        for item in permission_matrix.get("items", [])
    }
    
    # Count permissions
    total_permissions = len(permission_items)
    configured_count = len(configured_permissions)
    
    print(f"\n=== Permission Analysis ===")
    print(f"Total available permissions: {total_permissions}")
    print(f"Specifically configured permissions: {configured_count}")
    
    # Check if user has any specific permissions configured
    if configured_count == 0:
        print("\n⚠️ User has no specific permissions configured - inheriting all from role")
    else:
        print(f"\n✅ User has {configured_count} specifically configured permissions")
        
        # Sample of configured permissions
        print("\nSample of configured permissions:")
        sample_count = min(5, configured_count)
        sample_perms = list(configured_permissions.items())[:sample_count]
        
        for perm_id, perm_data in sample_perms:
            item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
            print(f"- {item_name}: view={perm_data.get('can_view')}, edit={perm_data.get('can_edit')}, delete={perm_data.get('can_delete')}, override={perm_data.get('override_role', False)}")
    
    # Check for permissions that are in my-permissions but not in matrix
    print("\nChecking for permission mismatches...")
    
    # Count permissions by source
    role_permissions = sum(1 for perm in my_permissions.values() if perm.get("source") == "role")
    user_override_permissions = sum(1 for perm in my_permissions.values() if perm.get("source") == "user_override")
    
    print(f"Permissions from role: {role_permissions}")
    print(f"Permissions overridden by user: {user_override_permissions}")
    
    # Check for full access permissions
    full_access_count = sum(
        1 for perm in my_permissions.values() 
        if perm.get("can_view") and perm.get("can_edit") and perm.get("can_delete")
    )
    
    if full_access_count > 0:
        print(f"\n⚠️ User has full access (view+edit+delete) to {full_access_count} permissions")
        
        # List some of the full access permissions
        print("\nSample of full access permissions:")
        full_access_perms = [
            (perm_id, perm_data) 
            for perm_id, perm_data in my_permissions.items() 
            if perm_data.get("can_view") and perm_data.get("can_edit") and perm_data.get("can_delete")
        ]
        
        sample_count = min(5, len(full_access_perms))
        for perm_id, perm_data in full_access_perms[:sample_count]:
            item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
            print(f"- {item_name} (source: {perm_data.get('source')})")

def main():
    print("=== Testing Permissions for 'Bé Kiều' ===\n")
    
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
    print(f"Bé Kiều's email: {kieu_email}")
    
    # Step 3: Try to login as "Bé Kiều" with different password options
    passwords_to_try = ["kieu123", "password", "123456", "kieuaus", "kieu@aus.com"]
    kieu_token = None
    
    for password in passwords_to_try:
        print(f"\nTrying to login with password: {password}")
        token = get_user_token(kieu_email, password)
        if token:
            kieu_token = token
            print(f"Successfully logged in as 'Bé Kiều' with password: {password}")
            break
    
    if not kieu_token:
        print("\n❌ Failed to login as 'Bé Kiều' with any of the common passwords")
        print("Cannot proceed with testing user's actual permissions")
        return
    
    # Step 4: Get "Bé Kiều"'s permissions
    user_permissions = get_user_permissions(kieu_token)
    
    # Step 5: Get the configured permissions matrix for "Bé Kiều"
    permission_matrix = get_user_permission_matrix(admin_token, kieu_user_id)
    
    # Step 6: Analyze and compare the permissions
    analyze_permissions(user_permissions, permission_matrix)

if __name__ == "__main__":
    main()
