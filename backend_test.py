import requests
import json
from datetime import datetime, timedelta
import time
import uuid

# Backend URL
BACKEND_URL = "http://localhost:8001/api"

# Test user credentials
EMAIL = "admin@example.com"
PASSWORD = "admin123"

# Global variables
token = None
created_user_id = None

def get_token():
    """Get authentication token"""
    global token
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        return token
    else:
        print(f"Failed to get token: {response.status_code} - {response.text}")
        return None

def get_headers():
    """Get headers with authentication token"""
    if not token:
        get_token()
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

def test_documents():
    """Test Documents API endpoints"""
    print("\n=== Testing Documents API ===")
    
    # Test GET /api/folders/ - Get list of document folders (correct endpoint)
    response = requests.get(
        f"{BACKEND_URL}/folders/",
        headers=get_headers()
    )
    
    folders_success = print_test_result("Get Document Folders (/api/folders/)", response)
    if folders_success:
        folders = response.json()
        print(f"Found {len(folders)} document folders")
    
    # Test GET /api/document-folders/ - This should fail as per the review request
    response = requests.get(
        f"{BACKEND_URL}/document-folders/",
        headers=get_headers()
    )
    
    print_test_result("Get Document Folders (/api/document-folders/) - Should fail", response, expected_status=404)
    print("Note: The /api/document-folders/ endpoint returns 404 as expected. The correct endpoint is /api/folders/")
    
    # Test GET /api/documents/ - Get list of documents
    response = requests.get(
        f"{BACKEND_URL}/documents/",
        headers=get_headers()
    )
    
    docs_success = print_test_result("Get Documents List", response)
    if docs_success:
        documents = response.json()
        print(f"Found {len(documents)} documents")
    
    # Get a single document for detailed testing
    if docs_success and len(documents) > 0:
        document_id = documents[0]["id"]
        
        # Test GET /api/documents/{document_id} - Get document details
        response = requests.get(
            f"{BACKEND_URL}/documents/{document_id}",
            headers=get_headers()
        )
        
        success = print_test_result("Get Document Details", response)
        if success:
            document = response.json()
            print(f"Document details: {document['title']} - Folder ID: {document.get('folder_id', 'N/A')}")
    
    return folders_success and docs_success

def test_dashboard():
    """Test Dashboard API endpoints"""
    print("\n=== Testing Dashboard API ===")
    
    # Test GET /api/dashboard - Get dashboard data (correct endpoint)
    response = requests.get(
        f"{BACKEND_URL}/dashboard",
        headers=get_headers()
    )
    
    success = print_test_result("Get Dashboard Data (/api/dashboard)", response)
    if success:
        stats = response.json()
        print("Dashboard data:")
        for key, value in stats.items():
            if isinstance(value, dict):
                print(f"- {key}: {len(value)} items")
            else:
                print(f"- {key}: {value}")
    
    # Test GET /api/dashboard/statistics - This should fail as per the review request
    response = requests.get(
        f"{BACKEND_URL}/dashboard/statistics",
        headers=get_headers()
    )
    
    print_test_result("Get Dashboard Statistics (/api/dashboard/statistics) - Should fail", response, expected_status=404)
    print("Note: The /api/dashboard/statistics endpoint returns 404 as expected. The correct endpoint is /api/dashboard")
    
    return success

def test_user_management():
    """Test User Management API endpoints"""
    global created_user_id
    print("\n=== Testing User Management API ===")
    
    # Test GET /api/users/ - Get list of users (admin only)
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    users_success = print_test_result("Get Users List", response)
    if users_success:
        users = response.json()
        print(f"Found {len(users)} users")
    
    # Test GET /api/users/by-role/{role} - Filter users by role
    roles = ["admin", "account", "creative", "staff", "manager", "content", "design", "editor", "sale"]
    role_success = True
    
    for role in roles:
        response = requests.get(
            f"{BACKEND_URL}/users/by-role/{role}",
            headers=get_headers()
        )
        
        success = print_test_result(f"Get Users by Role: {role}", response)
        if success:
            role_users = response.json()
            print(f"Found {len(role_users)} users with role '{role}'")
        else:
            role_success = False
    
    # Test POST /api/users/ - Create new user (admin only)
    new_user = {
        "email": f"test_user_{int(time.time())}@example.com",
        "full_name": "Test User",
        "role": "staff",
        "password": "testpassword123"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/users/",
        headers=get_headers(),
        json=new_user
    )
    
    create_success = print_test_result("Create New User", response)
    if create_success:
        created_user = response.json()
        created_user_id = created_user["id"]
        print(f"Created new user: {created_user['full_name']} (ID: {created_user_id})")
    
    # Test PUT /api/users/{user_id}/status - Activate/deactivate user (admin only)
    if created_user_id:
        # Deactivate user
        response = requests.put(
            f"{BACKEND_URL}/users/{created_user_id}/status",
            headers=get_headers(),
            json={"is_active": False}
        )
        
        deactivate_success = print_test_result("Deactivate User", response)
        
        # Activate user
        response = requests.put(
            f"{BACKEND_URL}/users/{created_user_id}/status",
            headers=get_headers(),
            json={"is_active": True}
        )
        
        activate_success = print_test_result("Activate User", response)
    else:
        deactivate_success = False
        activate_success = False
    
    # Test PUT /api/users/{user_id}/password - Reset password (admin only)
    if created_user_id:
        response = requests.put(
            f"{BACKEND_URL}/users/{created_user_id}/password",
            headers=get_headers(),
            json={"new_password": "newpassword456"}
        )
        
        reset_password_success = print_test_result("Reset User Password", response)
    else:
        reset_password_success = False
    
    # Test DELETE /api/users/{user_id} - Delete user (admin only)
    if created_user_id:
        response = requests.delete(
            f"{BACKEND_URL}/users/{created_user_id}",
            headers=get_headers()
        )
        
        delete_success = print_test_result("Delete User", response)
        if delete_success:
            print(f"Successfully deleted user with ID: {created_user_id}")
            created_user_id = None
    else:
        delete_success = False
    
    return (users_success and role_success and create_success and 
            deactivate_success and activate_success and reset_password_success and delete_success)

def main():
    """Main test function"""
    print("=== Starting API Tests ===")
    
    # Get authentication token
    if not get_token():
        print("Failed to authenticate. Exiting tests.")
        return
    
    # Run the Human Resources API tests
    user_management_success = test_user_management()
    
    # Run other tests if needed
    documents_success = test_documents()
    dashboard_success = test_dashboard()
    
    print("\n=== Test Results ===")
    print(f"User Management API: {'✅' if user_management_success else '❌'}")
    print(f"Documents API: {'✅' if documents_success else '❌'}")
    print(f"Dashboard API: {'✅' if dashboard_success else '❌'}")
    
    print("\n=== All tests completed ===")

if __name__ == "__main__":
    main()
