import requests
import json
from datetime import datetime, timedelta
import time
import uuid
import os

# Get backend URL from environment or use default
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001') + "/api"

# Test user credentials
EMAIL = "admin@example.com"
PASSWORD = "admin123"

# Global variables
token = None
created_user_id = None
be_kieu_user_id = None

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

def test_task_cost_management():
    """Test Task Cost Management APIs"""
    print("\n=== Testing Task Cost Management APIs ===")
    
    # Login with admin credentials
    print("\n--- Login with admin credentials ---")
    admin_email = "admin@example.com"
    admin_password = "admin123"
    
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": admin_email, "password": admin_password}
    )
    
    admin_login_success = print_test_result("Login as Admin", response)
    if not admin_login_success:
        print(f"Failed to login as admin: {response.text}")
        return False
    
    admin_token = response.json()["access_token"]
    admin_headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Login with non-admin credentials (for permission testing)
    print("\n--- Login with non-admin credentials ---")
    editor_email = "kieu@aus.com"
    editor_password = "kieu123"
    
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": editor_email, "password": editor_password}
    )
    
    editor_login_success = print_test_result("Login as Editor", response)
    if not editor_login_success:
        print(f"Failed to login as editor: {response.text}")
        print("Continuing tests with admin user only...")
    else:
        editor_token = response.json()["access_token"]
        editor_headers = {
            "Authorization": f"Bearer {editor_token}",
            "Content-Type": "application/json"
        }
    
    # 1. Test Task Cost Types APIs
    print("\n--- Testing Task Cost Types APIs ---")
    
    # 1.1 Test GET /api/task-cost-types/ - Get list of task cost types
    print("\n1.1 Test GET /api/task-cost-types/")
    response = requests.get(
        f"{BACKEND_URL}/task-cost-types/",
        headers=admin_headers
    )
    
    get_types_success = print_test_result("Get Task Cost Types", response)
    if not get_types_success:
        print(f"Failed to get task cost types: {response.text}")
        return False
    
    initial_types = response.json()
    print(f"Found {len(initial_types)} task cost types")
    
    # 1.2 Test POST /api/task-cost-types/ - Create new task cost type
    print("\n1.2 Test POST /api/task-cost-types/")
    new_type = {
        "name": f"Test Type {int(time.time())}",
        "description": "Test task cost type for API testing",
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/task-cost-types/",
        headers=admin_headers,
        json=new_type
    )
    
    create_type_success = print_test_result("Create Task Cost Type", response)
    if not create_type_success:
        print(f"Failed to create task cost type: {response.text}")
        return False
    
    created_type = response.json()
    type_id = created_type["id"]
    print(f"Created task cost type: {created_type['name']} (ID: {type_id})")
    
    # 1.3 Test PUT /api/task-cost-types/{id} - Update task cost type
    print(f"\n1.3 Test PUT /api/task-cost-types/{type_id}")
    update_type = {
        "name": f"Updated Type {int(time.time())}",
        "description": "Updated description for testing"
    }
    
    response = requests.put(
        f"{BACKEND_URL}/task-cost-types/{type_id}",
        headers=admin_headers,
        json=update_type
    )
    
    update_type_success = print_test_result("Update Task Cost Type", response)
    if not update_type_success:
        print(f"Failed to update task cost type: {response.text}")
        return False
    
    updated_type = response.json()
    print(f"Updated task cost type: {updated_type['name']} (ID: {type_id})")
    
    # 1.4 Test non-admin access to POST /api/task-cost-types/ (should fail with 403)
    if editor_login_success:
        print("\n1.4 Test non-admin access to POST /api/task-cost-types/")
        non_admin_type = {
            "name": "Non-admin Type",
            "description": "This should fail with 403",
            "is_active": True
        }
        
        response = requests.post(
            f"{BACKEND_URL}/task-cost-types/",
            headers=editor_headers,
            json=non_admin_type
        )
        
        non_admin_create_result = print_test_result("Non-admin Create Task Cost Type", response, expected_status=403)
        if response.status_code != 403:
            print("❌ Non-admin user was able to create task cost type, but should be forbidden")
            return False
        else:
            print("✅ Non-admin user was correctly forbidden from creating task cost type")
    
    # 2. Test Task Cost Rates APIs
    print("\n--- Testing Task Cost Rates APIs ---")
    
    # 2.1 Test GET /api/task-cost-rates/ - Get list of task cost rates
    print("\n2.1 Test GET /api/task-cost-rates/")
    response = requests.get(
        f"{BACKEND_URL}/task-cost-rates/",
        headers=admin_headers
    )
    
    get_rates_success = print_test_result("Get Task Cost Rates", response)
    if not get_rates_success:
        print(f"Failed to get task cost rates: {response.text}")
        return False
    
    initial_rates = response.json()
    print(f"Found {len(initial_rates)} task cost rates")
    
    # 2.2 Test POST /api/task-cost-rates/ - Create new task cost rate
    print("\n2.2 Test POST /api/task-cost-rates/")
    new_rate = {
        "task_type_id": type_id,
        "cost_per_hour": 75000,
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/task-cost-rates/",
        headers=admin_headers,
        json=new_rate
    )
    
    create_rate_success = print_test_result("Create Task Cost Rate", response)
    if not create_rate_success:
        print(f"Failed to create task cost rate: {response.text}")
        return False
    
    created_rate = response.json()
    rate_id = created_rate["id"]
    print(f"Created task cost rate: {created_rate['cost_per_hour']} VND/hour for type: {created_rate['task_type_name']} (ID: {rate_id})")
    
    # 2.3 Test PUT /api/task-cost-rates/{id} - Update task cost rate
    print(f"\n2.3 Test PUT /api/task-cost-rates/{rate_id}")
    update_rate = {
        "cost_per_hour": 85000
    }
    
    response = requests.put(
        f"{BACKEND_URL}/task-cost-rates/{rate_id}",
        headers=admin_headers,
        json=update_rate
    )
    
    update_rate_success = print_test_result("Update Task Cost Rate", response)
    if not update_rate_success:
        print(f"Failed to update task cost rate: {response.text}")
        return False
    
    updated_rate = response.json()
    print(f"Updated task cost rate: {updated_rate['cost_per_hour']} VND/hour (ID: {rate_id})")
    
    # 2.4 Test search functionality in task cost rates endpoint
    print("\n2.4 Test search functionality in task cost rates endpoint")
    search_term = updated_type["name"][:10]  # Use part of the type name as search term
    
    response = requests.get(
        f"{BACKEND_URL}/task-cost-rates/?search={search_term}",
        headers=admin_headers
    )
    
    search_success = print_test_result("Search Task Cost Rates", response)
    if not search_success:
        print(f"Failed to search task cost rates: {response.text}")
        return False
    
    search_results = response.json()
    print(f"Found {len(search_results)} task cost rates matching search term '{search_term}'")
    
    # 2.5 Test non-admin access to POST /api/task-cost-rates/ (should fail with 403)
    if editor_login_success:
        print("\n2.5 Test non-admin access to POST /api/task-cost-rates/")
        non_admin_rate = {
            "task_type_id": type_id,
            "cost_per_hour": 65000,
            "is_active": True
        }
        
        response = requests.post(
            f"{BACKEND_URL}/task-cost-rates/",
            headers=editor_headers,
            json=non_admin_rate
        )
        
        non_admin_create_result = print_test_result("Non-admin Create Task Cost Rate", response, expected_status=403)
        if response.status_code != 403:
            print("❌ Non-admin user was able to create task cost rate, but should be forbidden")
            return False
        else:
            print("✅ Non-admin user was correctly forbidden from creating task cost rate")
    
    # 2.6 Test creating task cost rate with non-existent task type (should fail with 400)
    print("\n2.6 Test creating task cost rate with non-existent task type")
    invalid_rate = {
        "task_type_id": str(uuid.uuid4()),  # Random non-existent ID
        "cost_per_hour": 55000,
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/task-cost-rates/",
        headers=admin_headers,
        json=invalid_rate
    )
    
    invalid_rate_result = print_test_result("Create Task Cost Rate with Invalid Type", response, expected_status=400)
    if response.status_code != 400:
        print("❌ Was able to create task cost rate with non-existent task type, but should fail")
        return False
    else:
        print("✅ Correctly rejected task cost rate with non-existent task type")
    
    # 3. Test Task Cost Settings APIs
    print("\n--- Testing Task Cost Settings APIs ---")
    
    # 3.1 Test GET /api/task-cost-settings/ - Get current task cost settings
    print("\n3.1 Test GET /api/task-cost-settings/")
    response = requests.get(
        f"{BACKEND_URL}/task-cost-settings/",
        headers=admin_headers
    )
    
    get_settings_success = print_test_result("Get Task Cost Settings", response)
    if not get_settings_success:
        print(f"Failed to get task cost settings: {response.text}")
        return False
    
    initial_settings = response.json()
    print(f"Initial settings: cost_per_hour={initial_settings.get('cost_per_hour', 'N/A')}, is_enabled={initial_settings.get('is_enabled', 'N/A')}")
    
    # 3.2 Test PUT /api/task-cost-settings/ - Update task cost settings
    print("\n3.2 Test PUT /api/task-cost-settings/")
    updated_settings = {
        "cost_per_hour": 50000,  # 50,000 VND/hour
        "is_enabled": True
    }
    
    response = requests.put(
        f"{BACKEND_URL}/task-cost-settings/",
        headers=admin_headers,
        json=updated_settings
    )
    
    update_settings_success = print_test_result("Update Task Cost Settings", response)
    if not update_settings_success:
        print(f"Failed to update task cost settings: {response.text}")
        return False
    
    updated_settings_response = response.json()
    print(f"Updated settings: cost_per_hour={updated_settings_response.get('cost_per_hour', 'N/A')}, is_enabled={updated_settings_response.get('is_enabled', 'N/A')}")
    
    # 3.3 Test non-admin access to PUT /api/task-cost-settings/ (should fail with 403)
    if editor_login_success:
        print("\n3.3 Test non-admin access to PUT /api/task-cost-settings/")
        non_admin_settings = {
            "cost_per_hour": 60000,
            "is_enabled": True
        }
        
        response = requests.put(
            f"{BACKEND_URL}/task-cost-settings/",
            headers=editor_headers,
            json=non_admin_settings
        )
        
        non_admin_update_result = print_test_result("Non-admin Update Task Cost Settings", response, expected_status=403)
        if response.status_code != 403:
            print("❌ Non-admin user was able to update task cost settings, but should be forbidden")
            return False
        else:
            print("✅ Non-admin user was correctly forbidden from updating task cost settings")
        
        # 3.4 Test non-admin access to GET /api/task-cost-settings/ (should succeed)
        print("\n3.4 Test non-admin access to GET /api/task-cost-settings/")
        response = requests.get(
            f"{BACKEND_URL}/task-cost-settings/",
            headers=editor_headers
        )
        
        non_admin_get_result = print_test_result("Non-admin Get Task Cost Settings", response)
        if not non_admin_get_result:
            print(f"Non-admin user failed to get task cost settings: {response.text}")
            return False
        
        non_admin_settings = response.json()
        print(f"Non-admin user sees settings: cost_per_hour={non_admin_settings.get('cost_per_hour', 'N/A')}, is_enabled={non_admin_settings.get('is_enabled', 'N/A')}")
    
    # 4. Test DELETE endpoints
    print("\n--- Testing DELETE endpoints ---")
    
    # 4.1 Test DELETE /api/task-cost-rates/{id} - Delete task cost rate
    print(f"\n4.1 Test DELETE /api/task-cost-rates/{rate_id}")
    response = requests.delete(
        f"{BACKEND_URL}/task-cost-rates/{rate_id}",
        headers=admin_headers
    )
    
    delete_rate_success = print_test_result("Delete Task Cost Rate", response)
    if not delete_rate_success:
        print(f"Failed to delete task cost rate: {response.text}")
        return False
    
    print(f"Successfully deleted task cost rate with ID: {rate_id}")
    
    # 4.2 Test DELETE /api/task-cost-types/{id} - Delete task cost type
    print(f"\n4.2 Test DELETE /api/task-cost-types/{type_id}")
    response = requests.delete(
        f"{BACKEND_URL}/task-cost-types/{type_id}",
        headers=admin_headers
    )
    
    delete_type_success = print_test_result("Delete Task Cost Type", response)
    if not delete_type_success:
        print(f"Failed to delete task cost type: {response.text}")
        return False
    
    print(f"Successfully deleted task cost type with ID: {type_id}")
    
    # 4.3 Test prevention of deleting task types used in rates
    print("\n4.3 Test prevention of deleting task types used in rates")
    
    # Create a new type
    new_type_for_delete_test = {
        "name": f"Type for Delete Test {int(time.time())}",
        "description": "Testing deletion prevention",
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/task-cost-types/",
        headers=admin_headers,
        json=new_type_for_delete_test
    )
    
    if response.status_code != 200:
        print(f"Failed to create task cost type for delete test: {response.text}")
        return False
    
    new_type_id = response.json()["id"]
    print(f"Created task cost type for delete test: {new_type_for_delete_test['name']} (ID: {new_type_id})")
    
    # Create a rate using this type
    new_rate_for_delete_test = {
        "task_type_id": new_type_id,
        "cost_per_hour": 45000,
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/task-cost-rates/",
        headers=admin_headers,
        json=new_rate_for_delete_test
    )
    
    if response.status_code != 200:
        print(f"Failed to create task cost rate for delete test: {response.text}")
        return False
    
    new_rate_id = response.json()["id"]
    print(f"Created task cost rate for delete test: {new_rate_for_delete_test['cost_per_hour']} VND/hour (ID: {new_rate_id})")
    
    # Try to delete the type (should fail with 400)
    response = requests.delete(
        f"{BACKEND_URL}/task-cost-types/{new_type_id}",
        headers=admin_headers
    )
    
    delete_prevention_result = print_test_result("Delete Task Cost Type Used in Rates", response, expected_status=400)
    if response.status_code != 400:
        print("❌ Was able to delete task cost type used in rates, but should be prevented")
        return False
    else:
        print("✅ Correctly prevented deletion of task cost type used in rates")
    
    # Clean up: Delete the rate first, then the type
    response = requests.delete(
        f"{BACKEND_URL}/task-cost-rates/{new_rate_id}",
        headers=admin_headers
    )
    
    if response.status_code != 200:
        print(f"Failed to delete task cost rate during cleanup: {response.text}")
        return False
    
    response = requests.delete(
        f"{BACKEND_URL}/task-cost-types/{new_type_id}",
        headers=admin_headers
    )
    
    if response.status_code != 200:
        print(f"Failed to delete task cost type during cleanup: {response.text}")
        return False
    
    print("✅ Successfully cleaned up test data")
    
    print("\n=== Task Cost Management API Tests Completed Successfully ===")
    return True

if __name__ == "__main__":
    print("Starting backend API tests...")
    
    # Test Task Cost Management APIs
    test_task_cost_management()
