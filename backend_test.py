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
        
        # The is_paid parameter should be in the query string, not in the request body
        response = requests.patch(
            f"{BACKEND_URL}/payment-schedules/{schedule_id}/mark-paid?is_paid=true",
            headers=headers
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

def test_contracts_list_endpoint():
    """Test the GET /api/contracts/ endpoint specifically"""
    print("\n=== Testing GET /api/contracts/ Endpoint ===")
    
    # Get authentication token
    if not token:
        get_token()
    
    headers = get_headers()
    
    # Test GET /api/contracts/ - List all contracts
    print("\n--- Testing GET /api/contracts/ ---")
    response = requests.get(
        f"{BACKEND_URL}/contracts/",
        headers=headers
    )
    
    list_contracts_success = print_test_result("List All Contracts", response)
    if not list_contracts_success:
        print(f"Failed to list contracts: {response.text}")
        return False
    
    contracts = response.json()
    print(f"Successfully retrieved {len(contracts)} contracts")
    
    # Check if contracts have the expected fields
    if contracts:
        contract = contracts[0]
        print("\nContract fields:")
        for key, value in contract.items():
            print(f"  {key}: {type(value).__name__}")
        
        # Check if payment_schedules are included and properly formatted
        if "payment_schedules" in contract:
            print(f"\nPayment schedules: {len(contract['payment_schedules'])}")
            if contract['payment_schedules']:
                schedule = contract['payment_schedules'][0]
                print("Payment schedule fields:")
                for key, value in schedule.items():
                    print(f"  {key}: {type(value).__name__}")
    
    return True

def test_contracts_statistics_endpoint():
    """Test the GET /api/contracts/statistics endpoint"""
    print("\n=== Testing GET /api/contracts/statistics Endpoint ===")
    
    # Get authentication token
    if not token:
        get_token()
    
    headers = get_headers()
    
    # Test GET /api/contracts/statistics - Get contract statistics
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
    
    # Test with time filters
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
    
    return True

def test_payment_schedule_management():
    """Test the payment schedule management functionality"""
    print("\n=== Testing Payment Schedule Management ===")
    
    # Get authentication token
    if not token:
        get_token()
    
    headers = get_headers()
    
    # First, get a list of clients to use a valid client_id
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
    
    # Create a test contract with payment schedules
    print("\n--- Creating test contract with payment schedules ---")
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
    
    # Test GET /api/contracts/{contract_id}/payment-schedules/ - Get contract payment schedules
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
        
        # Test PATCH /api/payment-schedules/{schedule_id}/mark-paid - Mark payment as paid
        print(f"\n--- Testing PATCH /api/payment-schedules/{schedule_id}/mark-paid ---")
        
        response = requests.patch(
            f"{BACKEND_URL}/payment-schedules/{schedule_id}/mark-paid?is_paid=true",
            headers=headers
        )
        
        mark_paid_success = print_test_result("Mark Payment as Paid", response)
        if not mark_paid_success:
            print(f"Failed to mark payment as paid: {response.text}")
            return False
        
        mark_paid_result = response.json()
        print(f"Mark paid result: {mark_paid_result}")
    
    # Clean up - Delete the test contract
    print("\n--- Cleaning up test data ---")
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
    
    return True

if __name__ == "__main__":
    print("Starting backend API tests...")
    
    # Test specific endpoints for the Contracts API
    print("\n=== VERIFICATION TESTS FOR CONTRACTS API ===")
    
    # Test GET /api/contracts/ endpoint
    contracts_list_result = test_contracts_list_endpoint()
    
    # Test GET /api/contracts/statistics endpoint
    contracts_statistics_result = test_contracts_statistics_endpoint()
    
    # Test contract creation and payment schedule management
    payment_schedule_result = test_payment_schedule_management()
    
    # Print overall results
    print("\n=== VERIFICATION TEST RESULTS ===")
    print(f"GET /api/contracts/: {'✅ PASSED' if contracts_list_result else '❌ FAILED'}")
    print(f"GET /api/contracts/statistics: {'✅ PASSED' if contracts_statistics_result else '❌ FAILED'}")
    print(f"Contract creation and payment schedule management: {'✅ PASSED' if payment_schedule_result else '❌ FAILED'}")
