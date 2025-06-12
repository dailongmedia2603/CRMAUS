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

def test_contracts_api():
    """Test Contracts API endpoints for ClientDetail page"""
    print("\n=== Testing Contracts API Endpoints ===")
    
    # Get authentication token
    if not token:
        get_token()
    
    headers = get_headers()
    
    # 1. First, get a list of clients to use a valid client_id
    print("\n--- Getting clients list ---")
    response = requests.get(
        f"{BACKEND_URL}/clients/",
        headers=headers
    )
    
    clients_success = print_test_result("Get Clients List", response)
    if not clients_success:
        print(f"Failed to get clients list: {response.text}")
        return False
    
    clients = response.json()
    if not clients:
        print("No clients found in the database. Cannot test contracts API.")
        return False
    
    # Use the first client for testing
    test_client = clients[0]
    client_id = test_client["id"]
    print(f"Using client: {test_client['name']} (ID: {client_id}) for testing")
    
    # 2. Test GET /api/contracts/client/{client_id} endpoint
    print(f"\n--- Testing GET /api/contracts/client/{client_id} ---")
    response = requests.get(
        f"{BACKEND_URL}/contracts/client/{client_id}",
        headers=headers
    )
    
    client_contracts_success = print_test_result("Get Client Contracts", response)
    if not client_contracts_success:
        print(f"Failed to get client contracts: {response.text}")
        return False
    
    client_contracts = response.json()
    print(f"Found {len(client_contracts)} contracts for client {test_client['name']}")
    
    # Verify the contracts data structure
    if client_contracts:
        print("\n--- Verifying client contracts data structure ---")
        contract = client_contracts[0]
        required_fields = ["title", "status", "value", "start_date", "end_date"]
        
        missing_fields = [field for field in required_fields if field not in contract]
        if missing_fields:
            print(f"❌ Contract data is missing required fields: {', '.join(missing_fields)}")
            return False
        else:
            print("✅ Contract data includes all required fields")
            print(f"Sample contract: {contract['title']} - Status: {contract['status']} - Value: {contract['value']}")
        
        # 3. Test GET /api/contracts/{contract_id} endpoint
        contract_id = contract["id"]
        print(f"\n--- Testing GET /api/contracts/{contract_id} ---")
        response = requests.get(
            f"{BACKEND_URL}/contracts/{contract_id}",
            headers=headers
        )
        
        contract_detail_success = print_test_result("Get Contract Detail", response)
        if not contract_detail_success:
            print(f"Failed to get contract detail: {response.text}")
            return False
        
        contract_detail = response.json()
        print(f"Successfully retrieved contract detail: {contract_detail['title']}")
        
        # Verify contract detail data structure
        print("\n--- Verifying contract detail data structure ---")
        missing_fields = [field for field in required_fields if field not in contract_detail]
        if missing_fields:
            print(f"❌ Contract detail is missing required fields: {', '.join(missing_fields)}")
            return False
        else:
            print("✅ Contract detail includes all required fields")
            
        # Print all fields in the contract detail for verification
        print("\nContract Detail Fields:")
        for key, value in contract_detail.items():
            print(f"  {key}: {value}")
    else:
        print("No contracts found for this client. Creating a test contract...")
        
        # Create a test contract for the client
        new_contract = {
            "client_id": client_id,
            "title": f"Test Contract {int(time.time())}",
            "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=335)).isoformat(),
            "value": 50000000,
            "status": "active",
            "terms": "Test contract terms for API testing"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/contracts/",
            headers=headers,
            json=new_contract
        )
        
        create_contract_success = print_test_result("Create Test Contract", response)
        if not create_contract_success:
            print(f"Failed to create test contract: {response.text}")
            return False
        
        created_contract = response.json()
        contract_id = created_contract["id"]
        print(f"Created test contract: {created_contract['title']} (ID: {contract_id})")
        
        # Test GET /api/contracts/{contract_id} endpoint with the newly created contract
        print(f"\n--- Testing GET /api/contracts/{contract_id} ---")
        response = requests.get(
            f"{BACKEND_URL}/contracts/{contract_id}",
            headers=headers
        )
        
        contract_detail_success = print_test_result("Get Contract Detail", response)
        if not contract_detail_success:
            print(f"Failed to get contract detail: {response.text}")
            return False
        
        contract_detail = response.json()
        print(f"Successfully retrieved contract detail: {contract_detail['title']}")
        
        # Verify contract detail data structure
        print("\n--- Verifying contract detail data structure ---")
        required_fields = ["title", "status", "value", "start_date", "end_date"]
        missing_fields = [field for field in required_fields if field not in contract_detail]
        if missing_fields:
            print(f"❌ Contract detail is missing required fields: {', '.join(missing_fields)}")
            return False
        else:
            print("✅ Contract detail includes all required fields")
            
        # Print all fields in the contract detail for verification
        print("\nContract Detail Fields:")
        for key, value in contract_detail.items():
            print(f"  {key}: {value}")
    
    print("\n=== Contracts API Tests Completed Successfully ===")
    return True

def test_client_chat_api():
    """Test Client Chat API endpoints for ClientDetail page"""
    print("\n=== Testing Client Chat API Endpoints ===")
    
    # Get authentication token
    if not token:
        get_token()
    
    headers = get_headers()
    
    # 1. First, get a list of clients to use a valid client_id
    print("\n--- Getting clients list ---")
    response = requests.get(
        f"{BACKEND_URL}/clients/",
        headers=headers
    )
    
    clients_success = print_test_result("Get Clients List", response)
    if not clients_success:
        print(f"Failed to get clients list: {response.text}")
        return False
    
    clients = response.json()
    if not clients:
        print("No clients found in the database. Cannot test client chat API.")
        return False
    
    # Use the first client for testing
    test_client = clients[0]
    client_id = test_client["id"]
    print(f"Using client: {test_client['name']} (ID: {client_id}) for testing")
    
    # 2. Test GET /api/clients/{client_id}/chat/ endpoint (initial state)
    print(f"\n--- Testing GET /api/clients/{client_id}/chat/ (initial state) ---")
    response = requests.get(
        f"{BACKEND_URL}/clients/{client_id}/chat/",
        headers=headers
    )
    
    get_chat_success = print_test_result("Get Client Chat Messages (Initial)", response)
    if not get_chat_success:
        print(f"Failed to get client chat messages: {response.text}")
        return False
    
    initial_messages = response.json()
    print(f"Found {len(initial_messages)} initial chat messages for client {test_client['name']}")
    
    # 3. Test POST /api/clients/{client_id}/chat/ endpoint
    print(f"\n--- Testing POST /api/clients/{client_id}/chat/ ---")
    
    # Create a test message
    test_message = {
        "message": f"Test message from API test at {datetime.now().isoformat()}"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/clients/{client_id}/chat/",
        headers=headers,
        json=test_message
    )
    
    send_message_success = print_test_result("Send Client Chat Message", response)
    if not send_message_success:
        print(f"Failed to send client chat message: {response.text}")
        return False
    
    sent_message = response.json()
    print(f"Successfully sent chat message: {sent_message['message']}")
    
    # Verify the message data structure
    print("\n--- Verifying chat message data structure ---")
    required_fields = ["id", "client_id", "user_id", "message", "created_at", "user_name", "user_email"]
    
    missing_fields = [field for field in required_fields if field not in sent_message]
    if missing_fields:
        print(f"❌ Chat message is missing required fields: {', '.join(missing_fields)}")
        return False
    else:
        print("✅ Chat message includes all required fields")
        
    # Print all fields in the message for verification
    print("\nChat Message Fields:")
    for key, value in sent_message.items():
        print(f"  {key}: {value}")
    
    # 4. Test GET /api/clients/{client_id}/chat/ endpoint (after sending message)
    print(f"\n--- Testing GET /api/clients/{client_id}/chat/ (after sending message) ---")
    response = requests.get(
        f"{BACKEND_URL}/clients/{client_id}/chat/",
        headers=headers
    )
    
    get_updated_chat_success = print_test_result("Get Client Chat Messages (Updated)", response)
    if not get_updated_chat_success:
        print(f"Failed to get updated client chat messages: {response.text}")
        return False
    
    updated_messages = response.json()
    print(f"Found {len(updated_messages)} chat messages after sending new message")
    
    # Verify that the number of messages has increased
    if len(updated_messages) <= len(initial_messages):
        print(f"❌ Number of messages did not increase after sending a new message")
        return False
    else:
        print(f"✅ Number of messages increased from {len(initial_messages)} to {len(updated_messages)}")
    
    # Verify that the sent message is in the list
    message_found = False
    for message in updated_messages:
        if message.get("id") == sent_message["id"]:
            message_found = True
            break
    
    if not message_found:
        print(f"❌ Sent message not found in the updated messages list")
        return False
    else:
        print(f"✅ Sent message found in the updated messages list")
    
    # 5. Send a second message to verify persistence
    print(f"\n--- Sending a second test message ---")
    
    # Create another test message
    second_test_message = {
        "message": f"Second test message from API test at {datetime.now().isoformat()}"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/clients/{client_id}/chat/",
        headers=headers,
        json=second_test_message
    )
    
    send_second_message_success = print_test_result("Send Second Client Chat Message", response)
    if not send_second_message_success:
        print(f"Failed to send second client chat message: {response.text}")
        return False
    
    second_sent_message = response.json()
    print(f"Successfully sent second chat message: {second_sent_message['message']}")
    
    # 6. Verify that both messages are in the list
    print(f"\n--- Verifying both messages are in the list ---")
    response = requests.get(
        f"{BACKEND_URL}/clients/{client_id}/chat/",
        headers=headers
    )
    
    get_final_chat_success = print_test_result("Get Client Chat Messages (Final)", response)
    if not get_final_chat_success:
        print(f"Failed to get final client chat messages: {response.text}")
        return False
    
    final_messages = response.json()
    print(f"Found {len(final_messages)} chat messages in final check")
    
    # Verify that both sent messages are in the list
    first_message_found = False
    second_message_found = False
    
    for message in final_messages:
        if message.get("id") == sent_message["id"]:
            first_message_found = True
        if message.get("id") == second_sent_message["id"]:
            second_message_found = True
    
    if not first_message_found:
        print(f"❌ First sent message not found in the final messages list")
        return False
    else:
        print(f"✅ First sent message found in the final messages list")
    
    if not second_message_found:
        print(f"❌ Second sent message not found in the final messages list")
        return False
    else:
        print(f"✅ Second sent message found in the final messages list")
    
    # 7. Verify chronological ordering (oldest first)
    print(f"\n--- Verifying chronological ordering of messages ---")
    
    # Check if messages are sorted by created_at in ascending order
    is_chronological = True
    prev_created_at = None
    
    for message in final_messages:
        current_created_at = datetime.fromisoformat(message["created_at"].replace("Z", "+00:00"))
        if prev_created_at and current_created_at < prev_created_at:
            is_chronological = False
            break
        prev_created_at = current_created_at
    
    if not is_chronological:
        print(f"❌ Messages are not in chronological order (oldest first)")
        return False
    else:
        print(f"✅ Messages are correctly ordered chronologically (oldest first)")
    
    print("\n=== Client Chat API Tests Completed Successfully ===")
    return True

def test_contracts_module():
    """Test the complete Contracts module backend API"""
    print("\n=== Testing Contracts Module Backend API ===")
    
    # Get authentication token
    if not token:
        get_token()
    
    headers = get_headers()
    
    # 1. First, get a list of clients to use a valid client_id
    print("\n--- Getting clients list ---")
    response = requests.get(
        f"{BACKEND_URL}/clients/",
        headers=headers
    )
    
    clients_success = print_test_result("Get Clients List", response)
    if not clients_success:
        print(f"Failed to get clients list: {response.text}")
        return False
    
    clients = response.json()
    if not clients:
        print("No clients found in the database. Creating a test client...")
        
        # Create a test client
        test_client_data = {
            "name": f"Test Client {int(time.time())}",
            "company": "Test Company Ltd.",
            "industry": "Technology",
            "contact_name": "John Doe",
            "contact_email": "john.doe@example.com",
            "contact_phone": "+84 123 456 789"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/clients/",
            headers=headers,
            json=test_client_data
        )
        
        create_client_success = print_test_result("Create Test Client", response)
        if not create_client_success:
            print(f"Failed to create test client: {response.text}")
            return False
        
        test_client = response.json()
        client_id = test_client["id"]
        print(f"Created test client: {test_client['name']} (ID: {client_id})")
    else:
        # Use the first client for testing
        test_client = clients[0]
        client_id = test_client["id"]
        print(f"Using client: {test_client['name']} (ID: {client_id}) for testing")
    
    # 2. Test Contract CRUD Operations
    print("\n=== Testing Contract CRUD Operations ===")
    
    # 2.1 Test POST /api/contracts/ - Create new contract with payment schedules
    print("\n--- Testing POST /api/contracts/ ---")
    
    # Create a test contract with payment schedules
    new_contract = {
        "client_id": client_id,
        "title": f"Test Contract {int(time.time())}",
        "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=335)).isoformat(),
        "value": 100000000,  # 100 million VND
        "status": "active",
        "terms": "Test contract terms for API testing",
        "payment_schedules": [
            {
                "amount": 30000000,  # 30 million VND
                "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "description": "First payment"
            },
            {
                "amount": 40000000,  # 40 million VND
                "due_date": (datetime.now() + timedelta(days=120)).isoformat(),
                "description": "Second payment"
            },
            {
                "amount": 30000000,  # 30 million VND
                "due_date": (datetime.now() + timedelta(days=300)).isoformat(),
                "description": "Final payment"
            }
        ]
    }
    
    response = requests.post(
        f"{BACKEND_URL}/contracts/",
        headers=headers,
        json=new_contract
    )
    
    create_contract_success = print_test_result("Create Contract with Payment Schedules", response)
    if not create_contract_success:
        print(f"Failed to create contract: {response.text}")
        return False
    
    created_contract = response.json()
    contract_id = created_contract["id"]
    print(f"Created contract: {created_contract['title']} (ID: {contract_id})")
    print(f"Payment schedules: {len(created_contract['payment_schedules'])}")
    
    # 2.2 Test GET /api/contracts/ - List contracts with filters
    print("\n--- Testing GET /api/contracts/ ---")
    
    # Test basic listing
    response = requests.get(
        f"{BACKEND_URL}/contracts/",
        headers=headers
    )
    
    list_contracts_success = print_test_result("List Contracts", response)
    if not list_contracts_success:
        print(f"Failed to list contracts: {response.text}")
        return False
    
    contracts = response.json()
    print(f"Found {len(contracts)} contracts")
    
    # Test with status filter
    print("\n--- Testing GET /api/contracts/ with status filter ---")
    response = requests.get(
        f"{BACKEND_URL}/contracts/?status=active",
        headers=headers
    )
    
    status_filter_success = print_test_result("List Contracts with Status Filter", response)
    if not status_filter_success:
        print(f"Failed to list contracts with status filter: {response.text}")
        return False
    
    active_contracts = response.json()
    print(f"Found {len(active_contracts)} active contracts")
    
    # Test with search filter
    print("\n--- Testing GET /api/contracts/ with search filter ---")
    search_term = "Test Contract"
    response = requests.get(
        f"{BACKEND_URL}/contracts/?search={search_term}",
        headers=headers
    )
    
    search_filter_success = print_test_result("List Contracts with Search Filter", response)
    if not search_filter_success:
        print(f"Failed to list contracts with search filter: {response.text}")
        return False
    
    search_contracts = response.json()
    print(f"Found {len(search_contracts)} contracts matching search term '{search_term}'")
    
    # Test with time filter (current year)
    print("\n--- Testing GET /api/contracts/ with time filter (year) ---")
    current_year = datetime.now().year
    response = requests.get(
        f"{BACKEND_URL}/contracts/?year={current_year}",
        headers=headers
    )
    
    year_filter_success = print_test_result("List Contracts with Year Filter", response)
    if not year_filter_success:
        print(f"Failed to list contracts with year filter: {response.text}")
        return False
    
    year_contracts = response.json()
    print(f"Found {len(year_contracts)} contracts for year {current_year}")
    
    # 2.3 Test GET /api/contracts/{contract_id} - Get specific contract
    print(f"\n--- Testing GET /api/contracts/{contract_id} ---")
    response = requests.get(
        f"{BACKEND_URL}/contracts/{contract_id}",
        headers=headers
    )
    
    get_contract_success = print_test_result("Get Contract Detail", response)
    if not get_contract_success:
        print(f"Failed to get contract detail: {response.text}")
        return False
    
    contract_detail = response.json()
    print(f"Successfully retrieved contract detail: {contract_detail['title']}")
    
    # 2.4 Test PUT /api/contracts/{contract_id} - Update contract
    print(f"\n--- Testing PUT /api/contracts/{contract_id} ---")
    
    update_contract = {
        "client_id": client_id,
        "title": f"Updated Contract {int(time.time())}",
        "start_date": created_contract["start_date"],
        "end_date": created_contract["end_date"],
        "value": 120000000,  # Increased value to 120 million VND
        "status": "active",
        "terms": "Updated contract terms for API testing"
    }
    
    response = requests.put(
        f"{BACKEND_URL}/contracts/{contract_id}",
        headers=headers,
        json=update_contract
    )
    
    update_contract_success = print_test_result("Update Contract", response)
    if not update_contract_success:
        print(f"Failed to update contract: {response.text}")
        return False
    
    updated_contract = response.json()
    print(f"Updated contract: {updated_contract['title']} (Value: {updated_contract['value']})")
    
    # 3. Test Contract Statistics API
    print("\n=== Testing Contract Statistics API ===")
    
    # 3.1 Test GET /api/contracts/statistics - Get contract statistics
    print("\n--- Testing GET /api/contracts/statistics ---")
    response = requests.get(
        f"{BACKEND_URL}/contracts/statistics",
        headers=headers
    )
    
    statistics_success = print_test_result("Get Contract Statistics", response)
    if not statistics_success:
        print(f"Failed to get contract statistics: {response.text}")
        return False
    
    statistics = response.json()
    print("Contract Statistics:")
    for key, value in statistics.items():
        print(f"  {key}: {value}")
    
    # 3.2 Test with time filters
    print("\n--- Testing GET /api/contracts/statistics with time filters ---")
    
    # Year filter
    current_year = datetime.now().year
    response = requests.get(
        f"{BACKEND_URL}/contracts/statistics?year={current_year}",
        headers=headers
    )
    
    year_statistics_success = print_test_result("Get Contract Statistics with Year Filter", response)
    if not year_statistics_success:
        print(f"Failed to get contract statistics with year filter: {response.text}")
        return False
    
    year_statistics = response.json()
    print(f"Contract Statistics for year {current_year}:")
    for key, value in year_statistics.items():
        print(f"  {key}: {value}")
    
    # Quarter filter
    current_quarter = (datetime.now().month - 1) // 3 + 1
    response = requests.get(
        f"{BACKEND_URL}/contracts/statistics?year={current_year}&quarter={current_quarter}",
        headers=headers
    )
    
    quarter_statistics_success = print_test_result("Get Contract Statistics with Quarter Filter", response)
    if not quarter_statistics_success:
        print(f"Failed to get contract statistics with quarter filter: {response.text}")
        return False
    
    quarter_statistics = response.json()
    print(f"Contract Statistics for Q{current_quarter} {current_year}:")
    for key, value in quarter_statistics.items():
        print(f"  {key}: {value}")
    
    # 4. Test Payment Schedule Management
    print("\n=== Testing Payment Schedule Management ===")
    
    # 4.1 Test GET /api/contracts/{contract_id}/payment-schedules/ - Get contract payment schedules
    print(f"\n--- Testing GET /api/contracts/{contract_id}/payment-schedules/ ---")
    response = requests.get(
        f"{BACKEND_URL}/contracts/{contract_id}/payment-schedules/",
        headers=headers
    )
    
    get_schedules_success = print_test_result("Get Contract Payment Schedules", response)
    if not get_schedules_success:
        print(f"Failed to get contract payment schedules: {response.text}")
        return False
    
    payment_schedules = response.json()
    print(f"Found {len(payment_schedules)} payment schedules for contract {contract_id}")
    
    if payment_schedules:
        schedule_id = payment_schedules[0]["id"]
        
        # 4.2 Test POST /api/contracts/{contract_id}/payment-schedules/ - Add payment schedule
        print(f"\n--- Testing POST /api/contracts/{contract_id}/payment-schedules/ ---")
        
        new_schedule = {
            "amount": 10000000,  # 10 million VND
            "due_date": (datetime.now() + timedelta(days=200)).isoformat(),
            "description": "Additional payment"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/contracts/{contract_id}/payment-schedules/",
            headers=headers,
            json=new_schedule
        )
        
        add_schedule_success = print_test_result("Add Payment Schedule", response)
        if not add_schedule_success:
            print(f"Failed to add payment schedule: {response.text}")
            return False
        
        added_schedule = response.json()
        new_schedule_id = added_schedule["id"]
        print(f"Added payment schedule: {added_schedule['description']} (ID: {new_schedule_id})")
        
        # 4.3 Test PATCH /api/payment-schedules/{schedule_id}/mark-paid - Mark payment as paid
        print(f"\n--- Testing PATCH /api/payment-schedules/{schedule_id}/mark-paid ---")
        
        response = requests.patch(
            f"{BACKEND_URL}/payment-schedules/{schedule_id}/mark-paid",
            headers=headers,
            json={"is_paid": True}
        )
        
        mark_paid_success = print_test_result("Mark Payment as Paid", response)
        if not mark_paid_success:
            print(f"Failed to mark payment as paid: {response.text}")
            return False
        
        mark_paid_result = response.json()
        print(f"Mark paid result: {mark_paid_result}")
        
        # 4.4 Test PUT /api/payment-schedules/{schedule_id} - Update payment schedule
        print(f"\n--- Testing PUT /api/payment-schedules/{new_schedule_id} ---")
        
        update_schedule = {
            "amount": 15000000,  # Increased to 15 million VND
            "description": "Updated additional payment"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/payment-schedules/{new_schedule_id}",
            headers=headers,
            json=update_schedule
        )
        
        update_schedule_success = print_test_result("Update Payment Schedule", response)
        if not update_schedule_success:
            print(f"Failed to update payment schedule: {response.text}")
            return False
        
        updated_schedule = response.json()
        print(f"Updated payment schedule: {updated_schedule['description']} (Amount: {updated_schedule['amount']})")
        
        # 4.5 Test DELETE /api/payment-schedules/{schedule_id} - Delete payment schedule
        print(f"\n--- Testing DELETE /api/payment-schedules/{new_schedule_id} ---")
        
        response = requests.delete(
            f"{BACKEND_URL}/payment-schedules/{new_schedule_id}",
            headers=headers
        )
        
        delete_schedule_success = print_test_result("Delete Payment Schedule", response)
        if not delete_schedule_success:
            print(f"Failed to delete payment schedule: {response.text}")
            return False
        
        print(f"Successfully deleted payment schedule with ID: {new_schedule_id}")
    
    # 5. Test Bulk Operations
    print("\n=== Testing Bulk Operations ===")
    
    # Create additional test contracts for bulk operations
    bulk_contract_ids = []
    
    for i in range(3):
        bulk_contract = {
            "client_id": client_id,
            "title": f"Bulk Test Contract {i+1} - {int(time.time())}",
            "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=335)).isoformat(),
            "value": 50000000,  # 50 million VND
            "status": "draft",
            "terms": f"Bulk test contract {i+1} for API testing"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/contracts/",
            headers=headers,
            json=bulk_contract
        )
        
        if response.status_code == 200:
            bulk_contract_id = response.json()["id"]
            bulk_contract_ids.append(bulk_contract_id)
            print(f"Created bulk test contract {i+1} with ID: {bulk_contract_id}")
    
    if bulk_contract_ids:
        # 5.1 Test POST /api/contracts/bulk-archive - Archive multiple contracts
        print("\n--- Testing POST /api/contracts/bulk-archive ---")
        
        response = requests.post(
            f"{BACKEND_URL}/contracts/bulk-archive",
            headers=headers,
            json=bulk_contract_ids
        )
        
        bulk_archive_success = print_test_result("Bulk Archive Contracts", response)
        if not bulk_archive_success:
            print(f"Failed to bulk archive contracts: {response.text}")
            return False
        
        bulk_archive_result = response.json()
        print(f"Bulk archive result: {bulk_archive_result}")
        
        # 5.2 Test POST /api/contracts/bulk-restore - Restore multiple contracts
        print("\n--- Testing POST /api/contracts/bulk-restore ---")
        
        response = requests.post(
            f"{BACKEND_URL}/contracts/bulk-restore",
            headers=headers,
            json=bulk_contract_ids
        )
        
        bulk_restore_success = print_test_result("Bulk Restore Contracts", response)
        if not bulk_restore_success:
            print(f"Failed to bulk restore contracts: {response.text}")
            return False
        
        bulk_restore_result = response.json()
        print(f"Bulk restore result: {bulk_restore_result}")
        
        # 5.3 Test POST /api/contracts/bulk-delete - Delete multiple contracts
        print("\n--- Testing POST /api/contracts/bulk-delete ---")
        
        response = requests.post(
            f"{BACKEND_URL}/contracts/bulk-delete",
            headers=headers,
            json=bulk_contract_ids
        )
        
        bulk_delete_success = print_test_result("Bulk Delete Contracts", response)
        if not bulk_delete_success:
            print(f"Failed to bulk delete contracts: {response.text}")
            return False
        
        bulk_delete_result = response.json()
        print(f"Bulk delete result: {bulk_delete_result}")
    
    # 6. Test Advanced Filtering
    print("\n=== Testing Advanced Filtering ===")
    
    # 6.1 Test contract listing with search terms
    print("\n--- Testing contract listing with search terms ---")
    search_term = "Contract"
    response = requests.get(
        f"{BACKEND_URL}/contracts/?search={search_term}",
        headers=headers
    )
    
    search_filter_success = print_test_result("Contract Listing with Search Terms", response)
    if not search_filter_success:
        print(f"Failed to list contracts with search terms: {response.text}")
        return False
    
    search_results = response.json()
    print(f"Found {len(search_results)} contracts matching search term '{search_term}'")
    
    # 6.2 Test status filters
    print("\n--- Testing contract listing with status filters ---")
    for status in ["active", "draft", "completed"]:
        response = requests.get(
            f"{BACKEND_URL}/contracts/?status={status}",
            headers=headers
        )
        
        status_filter_success = print_test_result(f"Contract Listing with Status Filter '{status}'", response)
        if not status_filter_success:
            print(f"Failed to list contracts with status filter '{status}': {response.text}")
            return False
        
        status_results = response.json()
        print(f"Found {len(status_results)} contracts with status '{status}'")
    
    # 6.3 Test debt filter
    print("\n--- Testing contract listing with debt filter ---")
    for has_debt in [True, False]:
        response = requests.get(
            f"{BACKEND_URL}/contracts/?has_debt={str(has_debt).lower()}",
            headers=headers
        )
        
        debt_filter_success = print_test_result(f"Contract Listing with Debt Filter '{has_debt}'", response)
        if not debt_filter_success:
            print(f"Failed to list contracts with debt filter '{has_debt}': {response.text}")
            return False
        
        debt_results = response.json()
        print(f"Found {len(debt_results)} contracts with has_debt={has_debt}")
    
    # 6.4 Test time-based filters
    print("\n--- Testing contract listing with time-based filters ---")
    
    # Year filter
    current_year = datetime.now().year
    response = requests.get(
        f"{BACKEND_URL}/contracts/?year={current_year}",
        headers=headers
    )
    
    year_filter_success = print_test_result("Contract Listing with Year Filter", response)
    if not year_filter_success:
        print(f"Failed to list contracts with year filter: {response.text}")
        return False
    
    year_results = response.json()
    print(f"Found {len(year_results)} contracts for year {current_year}")
    
    # Quarter filter
    current_quarter = (datetime.now().month - 1) // 3 + 1
    response = requests.get(
        f"{BACKEND_URL}/contracts/?year={current_year}&quarter={current_quarter}",
        headers=headers
    )
    
    quarter_filter_success = print_test_result("Contract Listing with Quarter Filter", response)
    if not quarter_filter_success:
        print(f"Failed to list contracts with quarter filter: {response.text}")
        return False
    
    quarter_results = response.json()
    print(f"Found {len(quarter_results)} contracts for Q{current_quarter} {current_year}")
    
    # Month filter
    current_month = datetime.now().month
    response = requests.get(
        f"{BACKEND_URL}/contracts/?year={current_year}&month={current_month}",
        headers=headers
    )
    
    month_filter_success = print_test_result("Contract Listing with Month Filter", response)
    if not month_filter_success:
        print(f"Failed to list contracts with month filter: {response.text}")
        return False
    
    month_results = response.json()
    print(f"Found {len(month_results)} contracts for month {current_month}/{current_year}")
    
    # Week filter
    current_week = datetime.now().isocalendar()[1]  # ISO week number
    response = requests.get(
        f"{BACKEND_URL}/contracts/?year={current_year}&week={current_week}",
        headers=headers
    )
    
    week_filter_success = print_test_result("Contract Listing with Week Filter", response)
    if not week_filter_success:
        print(f"Failed to list contracts with week filter: {response.text}")
        return False
    
    week_results = response.json()
    print(f"Found {len(week_results)} contracts for week {current_week}/{current_year}")
    
    # 6.5 Test archived/active toggle
    print("\n--- Testing contract listing with archived/active toggle ---")
    for archived in [True, False]:
        response = requests.get(
            f"{BACKEND_URL}/contracts/?archived={str(archived).lower()}",
            headers=headers
        )
        
        archived_filter_success = print_test_result(f"Contract Listing with Archived Filter '{archived}'", response)
        if not archived_filter_success:
            print(f"Failed to list contracts with archived filter '{archived}': {response.text}")
            return False
        
        archived_results = response.json()
        print(f"Found {len(archived_results)} {'archived' if archived else 'active'} contracts")
    
    # 7. Clean up - Delete the test contract
    print("\n=== Cleaning up test data ===")
    
    # Delete the main test contract
    print(f"\n--- Deleting test contract {contract_id} ---")
    response = requests.delete(
        f"{BACKEND_URL}/contracts/{contract_id}",
        headers=headers
    )
    
    delete_contract_success = print_test_result("Delete Test Contract", response)
    if not delete_contract_success:
        print(f"Failed to delete test contract: {response.text}")
        print("Continuing with tests...")
    else:
        print(f"Successfully deleted test contract with ID: {contract_id}")
    
    print("\n=== Contracts Module API Tests Completed Successfully ===")
    return True

if __name__ == "__main__":
    print("Starting backend API tests...")
    
    # Test Contracts Module API
    test_contracts_module()
    
    # Test Client Chat API endpoints
    # test_client_chat_api()
    
    # Test Contracts API endpoints
    # test_contracts_api()
    
    # Test Task Cost Management APIs
    # test_task_cost_management()
