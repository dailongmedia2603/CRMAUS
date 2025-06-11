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

def reset_user_password(admin_token, user_id, new_password):
    """Reset a user's password (admin only)"""
    response = requests.put(
        f"{BACKEND_URL}/users/{user_id}/password",
        headers=get_headers(admin_token),
        json={"new_password": new_password}
    )
    
    if response.status_code == 200:
        print(f"✅ Successfully reset password for user ID: {user_id}")
        return True
    else:
        print(f"❌ Failed to reset password: {response.status_code} - {response.text}")
        return False

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

def get_role_permission_matrix(admin_token, role):
    """Get permission matrix for a role"""
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

def analyze_user_permissions(user, user_matrix, role_matrix):
    """Analyze a user's permissions compared to their role"""
    if not user or not user_matrix or not role_matrix:
        print("❌ Cannot analyze permissions - missing data")
        return
    
    user_id = user["id"]
    user_name = user["full_name"]
    user_role = user["role"]
    
    # Extract the permissions from both sources
    user_permissions = {
        perm["permission_id"]: perm 
        for perm in user_matrix.get("current_permissions", [])
    }
    
    role_permissions = {
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
    user_configured_count = len(user_permissions)
    role_configured_count = len(role_permissions)
    
    print(f"\n=== Permission Analysis for {user_name} (Role: {user_role}) ===")
    print(f"Total available permissions: {total_permissions}")
    print(f"User-specific configured permissions: {user_configured_count}")
    print(f"Role-based configured permissions: {role_configured_count}")
    
    # Check if user has any specific permissions configured
    if user_configured_count == 0:
        print("\n⚠️ User has no specific permissions configured - inheriting all from role")
        
        # Check role permissions for full access
        full_access_count = sum(
            1 for perm in role_permissions.values() 
            if perm.get("can_view") and perm.get("can_edit") and perm.get("can_delete")
        )
        
        if full_access_count > 0:
            print(f"\n⚠️ Role '{user_role}' has full access (view+edit+delete) to {full_access_count} permissions")
            
            # List some of the full access permissions
            print("\nSample of full access permissions from role:")
            full_access_perms = [
                (perm_id, perm_data) 
                for perm_id, perm_data in role_permissions.items() 
                if perm_data.get("can_view") and perm_data.get("can_edit") and perm_data.get("can_delete")
            ]
            
            sample_count = min(5, len(full_access_perms))
            for perm_id, perm_data in full_access_perms[:sample_count]:
                item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
                print(f"- {item_name}")
    else:
        print(f"\n✅ User has {user_configured_count} specifically configured permissions")
        
        # Check for overrides
        override_count = sum(1 for perm in user_permissions.values() if perm.get("override_role", False))
        print(f"Permissions overriding role: {override_count}")
        
        # Sample of configured permissions
        print("\nSample of user-configured permissions:")
        sample_count = min(5, user_configured_count)
        sample_perms = list(user_permissions.items())[:sample_count]
        
        for perm_id, perm_data in sample_perms:
            item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
            print(f"- {item_name}: view={perm_data.get('can_view')}, edit={perm_data.get('can_edit')}, delete={perm_data.get('can_delete')}, override={perm_data.get('override_role', False)}")
        
        # Check for full access permissions
        full_access_count = sum(
            1 for perm in user_permissions.values() 
            if perm.get("can_view") and perm.get("can_edit") and perm.get("can_delete")
        )
        
        if full_access_count > 0:
            print(f"\n⚠️ User has full access (view+edit+delete) to {full_access_count} permissions")
            
            # List some of the full access permissions
            print("\nSample of full access permissions:")
            full_access_perms = [
                (perm_id, perm_data) 
                for perm_id, perm_data in user_permissions.items() 
                if perm_data.get("can_view") and perm_data.get("can_edit") and perm_data.get("can_delete")
            ]
            
            sample_count = min(5, len(full_access_perms))
            for perm_id, perm_data in full_access_perms[:sample_count]:
                item_name = permission_items.get(perm_id, {}).get("display_name", perm_id)
                print(f"- {item_name} (override: {perm_data.get('override_role', False)})")

def main():
    print("=== Testing Permissions for 'Bé Kiều' (Admin Perspective) ===\n")
    
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
    
    # Step 3: Get the configured permissions matrix for "Bé Kiều"
    user_matrix = get_user_permission_matrix(admin_token, kieu_user_id)
    
    # Step 4: Get the role permissions for comparison
    role_matrix = get_role_permission_matrix(admin_token, kieu_role)
    
    # Step 5: Analyze the permissions
    analyze_user_permissions(kieu_user, user_matrix, role_matrix)
    
    # Optional: Reset password if needed
    # reset_password = input("\nDo you want to reset Bé Kiều's password? (y/n): ")
    # if reset_password.lower() == 'y':
    #     new_password = "newpassword123"
    #     reset_user_password(admin_token, kieu_user_id, new_password)
    #     print(f"Password reset to: {new_password}")

if __name__ == "__main__":
    main()
