import requests
import json

# Backend URL
BACKEND_URL = "http://localhost:8001/api"

# Admin credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

# Editor user credentials
EDITOR_EMAIL = "be.kieu@example.com"
EDITOR_PASSWORD = "password123"

def get_token(email, password):
    """Get authentication token"""
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to get token: {response.status_code} - {response.text}")
        return None

def get_headers(token):
    """Get headers with authentication token"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def print_test_result(test_name, response, expected_status=200):
    """Print test result"""
    if response.status_code == expected_status:
        print(f"✅ {test_name} - Status: {response.status_code}")
        return True
    else:
        print(f"❌ {test_name} - Status: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def ensure_editor_user_exists():
    """Create the editor user if it doesn't exist"""
    print("\n=== Ensuring Editor User Exists ===")
    
    # Login with admin credentials
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("Failed to login as admin. Exiting.")
        return False
    
    # Check if user already exists by trying to login
    editor_token = get_token(EDITOR_EMAIL, EDITOR_PASSWORD)
    if editor_token:
        print("✅ Editor user already exists")
        return True
    
    # Create the editor user
    new_user = {
        "email": EDITOR_EMAIL,
        "full_name": "Bé Kiều",
        "role": "editor",
        "password": EDITOR_PASSWORD
    }
    
    response = requests.post(
        f"{BACKEND_URL}/users/",
        headers=get_headers(admin_token),
        json=new_user
    )
    
    create_success = print_test_result("Create Editor User", response)
    if create_success:
        print(f"Successfully created editor user: {new_user['full_name']}")
    
    return create_success

def test_editor_role_permissions():
    """Test configuring editor role permissions"""
    print("\n=== Testing Editor Role Permissions ===")
    
    # 1. Login with admin credentials
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("Failed to login as admin. Exiting.")
        return False
    
    print("✅ Successfully logged in as admin")
    
    # 2. Set up basic permissions for the editor role
    permissions = [
        {
            "role": "editor",
            "permission_id": "dashboard_dashboard_view",
            "can_view": True,
            "can_edit": False,
            "can_delete": False
        },
        {
            "role": "editor",
            "permission_id": "clients_clients_view", 
            "can_view": True,
            "can_edit": False,
            "can_delete": False
        },
        {
            "role": "editor",
            "permission_id": "internal_tasks_internal_tasks_view",
            "can_view": True,
            "can_edit": True,
            "can_delete": False
        },
        {
            "role": "editor",
            "permission_id": "documents_documents_view",
            "can_view": True,
            "can_edit": False,
            "can_delete": False
        },
        {
            "role": "editor",
            "permission_id": "templates_templates_view",
            "can_view": True,
            "can_edit": False,
            "can_delete": False
        }
    ]
    
    # 3. Send the request to update editor role permissions
    response = requests.post(
        f"{BACKEND_URL}/permissions/role/editor/update",
        headers=get_headers(admin_token),
        json=permissions
    )
    
    update_success = print_test_result("Update Editor Role Permissions", response)
    if update_success:
        print("Successfully configured editor role permissions")
    
    # 4. Verify by calling GET /api/permissions/matrix/role/editor
    response = requests.get(
        f"{BACKEND_URL}/permissions/matrix/role/editor",
        headers=get_headers(admin_token)
    )
    
    verify_success = print_test_result("Verify Editor Role Permissions", response)
    if verify_success:
        matrix = response.json()
        current_permissions = matrix.get("current_permissions", [])
        
        print(f"Found {len(current_permissions)} permissions for editor role")
        
        # Check if our configured permissions are in the matrix
        configured_permission_ids = [p["permission_id"] for p in permissions]
        found_permission_ids = [p["permission_id"] for p in current_permissions]
        
        all_found = all(pid in found_permission_ids for pid in configured_permission_ids)
        if all_found:
            print("✅ All configured permissions found in the matrix")
            
            # Verify specific permissions
            for perm in permissions:
                for current_perm in current_permissions:
                    if current_perm["permission_id"] == perm["permission_id"]:
                        if (current_perm["can_view"] == perm["can_view"] and
                            current_perm["can_edit"] == perm["can_edit"] and
                            current_perm["can_delete"] == perm["can_delete"]):
                            print(f"✅ Permission {perm['permission_id']} configured correctly")
                        else:
                            print(f"❌ Permission {perm['permission_id']} not configured correctly")
                            verify_success = False
        else:
            missing = [pid for pid in configured_permission_ids if pid not in found_permission_ids]
            print(f"❌ Missing permissions in matrix: {missing}")
            verify_success = False
    
    # 5. Verify by calling GET /api/permissions/my-permissions as "Bé Kiều"
    editor_token = get_token(EDITOR_EMAIL, EDITOR_PASSWORD)
    if not editor_token:
        print("Failed to login as editor user. Skipping final verification.")
        return update_success and verify_success
    
    print("✅ Successfully logged in as editor user")
    
    response = requests.get(
        f"{BACKEND_URL}/permissions/my-permissions",
        headers=get_headers(editor_token)
    )
    
    user_verify_success = print_test_result("Verify Editor User Permissions", response)
    if user_verify_success:
        user_permissions = response.json()
        permissions_dict = user_permissions.get("permissions", {})
        
        print(f"User role: {user_permissions.get('user_role', 'N/A')}")
        print(f"Found {len(permissions_dict)} permissions for editor user")
        
        # Check specific permissions
        for perm in permissions:
            perm_id = perm["permission_id"]
            if perm_id in permissions_dict:
                user_perm = permissions_dict[perm_id]
                if (user_perm["can_view"] == perm["can_view"] and
                    user_perm["can_edit"] == perm["can_edit"] and
                    user_perm["can_delete"] == perm["can_delete"]):
                    print(f"✅ User permission {perm_id} matches role configuration")
                else:
                    print(f"❌ User permission {perm_id} does not match role configuration")
                    user_verify_success = False
            else:
                print(f"❌ Permission {perm_id} not found in user permissions")
                user_verify_success = False
    
    return update_success and verify_success and user_verify_success

if __name__ == "__main__":
    # First ensure the editor user exists
    if ensure_editor_user_exists():
        # Then test permissions
        test_editor_role_permissions()
    else:
        print("Failed to ensure editor user exists. Exiting.")
