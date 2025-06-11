import requests
import json
import os

# Get backend URL from environment or use default
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001') + "/api"

# Admin credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

# Bé Kiều credentials
KIEU_EMAIL = "kieu@aus.com"
KIEU_PASSWORD = "kieu123"

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

def main():
    print("\n=== Checking Permissions for 'Bé Kiều' User ===")
    
    # 1. Login with admin credentials
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("Failed to authenticate as admin. Exiting test.")
        return
    
    admin_headers = get_headers(admin_token)
    
    # 2. Get the user list and find "Bé Kiều" user ID
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=admin_headers
    )
    
    users_success = print_test_result("Get Users List", response)
    if not users_success:
        print("Failed to get users list. Exiting test.")
        return
    
    users = response.json()
    print(f"Found {len(users)} users")
    
    # Find the "Bé Kiều" user
    be_kieu_user = None
    for user in users:
        if user.get("full_name") == "Bé Kiều":
            be_kieu_user = user
            break
    
    if not be_kieu_user:
        print("❌ 'Bé Kiều' user not found in the users list")
        return
    
    kieu_user_id = be_kieu_user["id"]
    print(f"✅ Found 'Bé Kiều' user with ID: {kieu_user_id}")
    
    # 3. Call GET /api/permissions/matrix/user/{kieu_user_id} to see configured permissions
    response = requests.get(
        f"{BACKEND_URL}/permissions/matrix/user/{kieu_user_id}",
        headers=admin_headers
    )
    
    matrix_success = print_test_result("Get 'Bé Kiều' User Permission Matrix", response)
    if not matrix_success:
        print("Failed to get user permission matrix. Exiting test.")
        return
    
    matrix = response.json()
    print(f"Permission matrix for 'Bé Kiều' user:")
    print(f"- Categories: {len(matrix.get('categories', []))} categories")
    print(f"- Items: {len(matrix.get('items', []))} items")
    print(f"- Current permissions: {len(matrix.get('current_permissions', []))} permissions")
    
    # Check if "internal_tasks_internal_tasks_view" permission is in the matrix
    internal_tasks_view_perm = None
    for perm in matrix.get('current_permissions', []):
        if perm.get('permission_id') == 'internal_tasks_internal_tasks_view':
            internal_tasks_view_perm = perm
            break
    
    if internal_tasks_view_perm:
        print(f"✅ Found 'internal_tasks_internal_tasks_view' permission in the matrix:")
        print(f"- Can View: {internal_tasks_view_perm.get('can_view', False)}")
        print(f"- Can Edit: {internal_tasks_view_perm.get('can_edit', False)}")
        print(f"- Can Delete: {internal_tasks_view_perm.get('can_delete', False)}")
        if 'override_role' in internal_tasks_view_perm:
            print(f"- Override Role: {internal_tasks_view_perm.get('override_role', False)}")
    else:
        print("❌ 'internal_tasks_internal_tasks_view' permission not found in the matrix")
    
    # 4. Login as "Bé Kiều" user
    kieu_token = get_token(KIEU_EMAIL, KIEU_PASSWORD)
    if not kieu_token:
        print("Failed to authenticate as 'Bé Kiều'. Exiting test.")
        return
    
    kieu_headers = get_headers(kieu_token)
    
    # 5. Call GET /api/permissions/my-permissions to see runtime permissions
    response = requests.get(
        f"{BACKEND_URL}/permissions/my-permissions",
        headers=kieu_headers
    )
    
    my_perms_success = print_test_result("Get 'Bé Kiều' Runtime Permissions", response)
    if not my_perms_success:
        print("Failed to get runtime permissions. Exiting test.")
        return
    
    permissions_data = response.json()
    
    # 6. Check if "internal_tasks_internal_tasks_view" permission is present
    permissions = permissions_data.get('permissions', {})
    has_internal_tasks_view = False
    internal_tasks_view_details = None
    
    if 'internal_tasks_internal_tasks_view' in permissions:
        internal_tasks_view_details = permissions['internal_tasks_internal_tasks_view']
        has_internal_tasks_view = internal_tasks_view_details.get('can_view', False)
    
    if has_internal_tasks_view:
        print("❌ 'internal_tasks_internal_tasks_view' permission is still present and enabled")
        print(f"Permission details: {internal_tasks_view_details}")
    else:
        if internal_tasks_view_details:
            print("✅ 'internal_tasks_internal_tasks_view' permission is present but disabled")
            print(f"Permission details: {internal_tasks_view_details}")
        else:
            print("✅ 'internal_tasks_internal_tasks_view' permission is not present in runtime permissions")
    
    # 7. Compare the results
    print("\n=== Comparison Results ===")
    
    if internal_tasks_view_perm:
        print("Configured Permission (from matrix):")
        print(f"- Can View: {internal_tasks_view_perm.get('can_view', False)}")
    else:
        print("Configured Permission: Not found in matrix")
    
    if internal_tasks_view_details:
        print("Runtime Permission (from my-permissions):")
        print(f"- Can View: {internal_tasks_view_details.get('can_view', False)}")
        print(f"- Source: {internal_tasks_view_details.get('source', 'N/A')}")
    else:
        print("Runtime Permission: Not found in my-permissions")
    
    # Check for mismatch
    if internal_tasks_view_perm and internal_tasks_view_details:
        configured_can_view = internal_tasks_view_perm.get('can_view', False)
        runtime_can_view = internal_tasks_view_details.get('can_view', False)
        
        if configured_can_view == runtime_can_view:
            print("✅ No mismatch between configured and runtime permissions")
        else:
            print("❌ Mismatch between configured and runtime permissions")
            print(f"- Configured can_view: {configured_can_view}")
            print(f"- Runtime can_view: {runtime_can_view}")
    elif internal_tasks_view_perm and not internal_tasks_view_details:
        print("❌ Permission exists in configuration but not in runtime")
    elif not internal_tasks_view_perm and internal_tasks_view_details:
        print("❌ Permission exists in runtime but not in configuration")
    else:
        print("✅ Permission is not present in both configuration and runtime")
    
    print("\n=== Conclusion ===")
    if has_internal_tasks_view:
        print("The 'Công việc' menu is still visible because the 'internal_tasks_internal_tasks_view' permission is still enabled.")
    else:
        print("The 'internal_tasks_internal_tasks_view' permission has been removed or disabled, but the 'Công việc' menu might still be visible due to other reasons.")

if __name__ == "__main__":
    main()
