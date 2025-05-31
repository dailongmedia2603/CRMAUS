import requests
import json
import time
from datetime import datetime, timedelta
import uuid

# Configuration
BACKEND_URL = "https://b3e10cfb-dcad-4f9b-8473-d7104a7ee54b.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

# Test users with different roles
TEST_USERS = [
    {"email": "admin_test@example.com", "password": "password123", "full_name": "Admin Test", "role": "admin"},
    {"email": "account_test@example.com", "password": "password123", "full_name": "Account Test", "role": "account"},
    {"email": "staff_test@example.com", "password": "password123", "full_name": "Staff Test", "role": "staff"},
]

# Helper functions
def get_token(email, password):
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": email, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to get token for {email}: {response.status_code} - {response.text}")
        return None

def make_request(method, endpoint, token=None, data=None, params=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{BACKEND_URL}{endpoint}"
    
    if method == "GET":
        response = requests.get(url, headers=headers, params=params)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    elif method == "PUT":
        response = requests.put(url, headers=headers, json=data)
    elif method == "DELETE":
        response = requests.delete(url, headers=headers)
    else:
        raise ValueError(f"Unsupported method: {method}")
    
    return response

def print_test_result(test_name, success, message=""):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"{status} - {test_name}")
    if message:
        print(f"  {message}")

# Setup test environment
def setup_test_environment():
    print("\n=== Setting up test environment ===")
    
    # Initialize the application if needed
    response = requests.post(f"{BACKEND_URL}/setup")
    print(f"Setup response: {response.status_code} - {response.json()}")
    
    # Get admin token
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("Failed to get admin token. Exiting tests.")
        return None
    
    # Create test users
    user_tokens = {}
    for user_data in TEST_USERS:
        # Check if user exists
        response = make_request("POST", "/users/", admin_token, user_data)
        if response.status_code == 200:
            print(f"Created test user: {user_data['email']}")
        elif response.status_code == 400 and "Email already registered" in response.text:
            print(f"Test user already exists: {user_data['email']}")
        else:
            print(f"Failed to create test user {user_data['email']}: {response.status_code} - {response.text}")
        
        # Get token for the user
        user_token = get_token(user_data["email"], user_data["password"])
        if user_token:
            user_tokens[user_data["role"]] = user_token
    
    return {"admin_token": admin_token, "user_tokens": user_tokens}

# Test functions
def test_get_projects(tokens):
    print("\n=== Testing GET /api/projects/ ===")
    
    # Test with admin token
    response = make_request("GET", "/projects/", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Get projects as admin", success)
    if success:
        projects = response.json()
        print(f"  Retrieved {len(projects)} projects")
    
    # Test with account token
    if "account" in tokens["user_tokens"]:
        response = make_request("GET", "/projects/", tokens["user_tokens"]["account"])
        success = response.status_code == 200
        print_test_result("Get projects as account", success)
    
    # Test with staff token
    if "staff" in tokens["user_tokens"]:
        response = make_request("GET", "/projects/", tokens["user_tokens"]["staff"])
        success = response.status_code == 200
        print_test_result("Get projects as staff", success)
    
    # Test filters
    filter_tests = [
        {"name": "Filter by archived", "params": {"archived": "true"}},
        {"name": "Filter by status", "params": {"status": "in_progress"}},
        {"name": "Filter by year", "params": {"year": datetime.now().year}},
        {"name": "Filter by search", "params": {"search": "test"}},
    ]
    
    for test in filter_tests:
        response = make_request("GET", "/projects/", tokens["admin_token"], params=test["params"])
        success = response.status_code == 200
        print_test_result(test["name"], success)
    
    return True

def test_project_crud(tokens):
    print("\n=== Testing Project CRUD Operations ===")
    
    # First, get a client for the project
    response = make_request("GET", "/clients/", tokens["admin_token"])
    if response.status_code != 200 or len(response.json()) == 0:
        # Create a client if none exists
        client_data = {
            "name": "Test Client",
            "company": "Test Company",
            "industry": "Technology",
            "contact_email": "contact@testclient.com"
        }
        response = make_request("POST", "/clients/", tokens["admin_token"], client_data)
        if response.status_code != 200:
            print_test_result("Create test client", False, f"Failed to create client: {response.status_code} - {response.text}")
            return False
        client_id = response.json()["id"]
    else:
        client_id = response.json()[0]["id"]
    
    # Create a test project
    project_data = {
        "name": f"Test Project {uuid.uuid4()}",
        "client_id": client_id,
        "description": "This is a test project for API testing",
        "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
        "end_date": (datetime.now() + timedelta(days=60)).isoformat(),
        "budget": 10000,
        "status": "planning",
        "contract_value": 15000
    }
    
    # Test project creation
    response = make_request("POST", "/projects/", tokens["admin_token"], project_data)
    success = response.status_code == 200
    print_test_result("Create project", success)
    if not success:
        print(f"  Failed to create project: {response.status_code} - {response.text}")
        return False
    
    project_id = response.json()["id"]
    print(f"  Created project with ID: {project_id}")
    
    # Test get project by ID
    response = make_request("GET", f"/projects/{project_id}", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Get project by ID", success)
    
    # Test update project
    update_data = {
        "name": f"Updated Test Project {uuid.uuid4()}",
        "client_id": client_id,
        "status": "in_progress",
        "budget": 12000
    }
    response = make_request("PUT", f"/projects/{project_id}", tokens["admin_token"], update_data)
    success = response.status_code == 200
    print_test_result("Update project", success)
    if success:
        updated_project = response.json()
        success = updated_project["name"] == update_data["name"] and updated_project["status"] == update_data["status"]
        print_test_result("Verify project update", success)
    
    # Test archive project (using PUT with archived=True)
    archive_data = {
        "name": project_data["name"],
        "client_id": client_id,
        "archived": True
    }
    response = make_request("PUT", f"/projects/{project_id}", tokens["admin_token"], archive_data)
    success = response.status_code == 200
    print_test_result("Archive project", success)
    if success:
        archived_project = response.json()
        success = archived_project["archived"] == True
        print_test_result("Verify project archived", success)
    
    # Test restore project (using PUT with archived=False)
    restore_data = {
        "name": project_data["name"],
        "client_id": client_id,
        "archived": False
    }
    response = make_request("PUT", f"/projects/{project_id}", tokens["admin_token"], restore_data)
    success = response.status_code == 200
    print_test_result("Restore project", success)
    if success:
        restored_project = response.json()
        success = restored_project["archived"] == False
        print_test_result("Verify project restored", success)
    
    # Test delete project with different roles
    # First with staff (should fail)
    if "staff" in tokens["user_tokens"]:
        response = make_request("DELETE", f"/projects/{project_id}", tokens["user_tokens"]["staff"])
        success = response.status_code == 403  # Should be forbidden
        print_test_result("Delete project as staff (should be forbidden)", success)
    
    # Then with account (should succeed)
    if "account" in tokens["user_tokens"]:
        # Create another project for account to delete
        response = make_request("POST", "/projects/", tokens["admin_token"], project_data)
        if response.status_code == 200:
            account_project_id = response.json()["id"]
            response = make_request("DELETE", f"/projects/{account_project_id}", tokens["user_tokens"]["account"])
            success = response.status_code == 200
            print_test_result("Delete project as account", success)
    
    # Finally with admin
    response = make_request("DELETE", f"/projects/{project_id}", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Delete project as admin", success)
    
    # Verify project is deleted
    response = make_request("GET", f"/projects/{project_id}", tokens["admin_token"])
    success = response.status_code == 404
    print_test_result("Verify project deletion", success)
    
    return True

def test_bulk_operations(tokens):
    print("\n=== Testing Project Bulk Operations ===")
    
    # Get a client ID
    response = make_request("GET", "/clients/", tokens["admin_token"])
    if response.status_code != 200 or len(response.json()) == 0:
        print_test_result("Get client for bulk operations", False, "No clients available")
        return False
    
    client_id = response.json()[0]["id"]
    
    # Create multiple test projects
    project_ids = []
    for i in range(3):
        project_data = {
            "name": f"Bulk Test Project {i} - {uuid.uuid4()}",
            "client_id": client_id,
            "status": "planning"
        }
        response = make_request("POST", "/projects/", tokens["admin_token"], project_data)
        if response.status_code == 200:
            project_ids.append(response.json()["id"])
    
    print(f"  Created {len(project_ids)} test projects for bulk operations")
    
    if len(project_ids) == 0:
        print_test_result("Create test projects for bulk operations", False)
        return False
    
    # Test bulk archive
    response = make_request("POST", "/projects/bulk-archive", tokens["admin_token"], project_ids)
    success = response.status_code == 200
    print_test_result("Bulk archive projects", success)
    
    # Verify projects are archived
    for project_id in project_ids:
        response = make_request("GET", f"/projects/{project_id}", tokens["admin_token"])
        if response.status_code == 200:
            if not response.json()["archived"]:
                success = False
                break
    
    print_test_result("Verify projects are archived", success)
    
    # Test bulk restore
    response = make_request("POST", "/projects/bulk-restore", tokens["admin_token"], project_ids)
    success = response.status_code == 200
    print_test_result("Bulk restore projects", success)
    
    # Verify projects are restored
    for project_id in project_ids:
        response = make_request("GET", f"/projects/{project_id}", tokens["admin_token"])
        if response.status_code == 200:
            if response.json()["archived"]:
                success = False
                break
    
    print_test_result("Verify projects are restored", success)
    
    # Test bulk delete
    response = make_request("POST", "/projects/bulk-delete", tokens["admin_token"], project_ids)
    success = response.status_code == 200
    print_test_result("Bulk delete projects", success)
    
    # Verify projects are deleted
    all_deleted = True
    for project_id in project_ids:
        response = make_request("GET", f"/projects/{project_id}", tokens["admin_token"])
        if response.status_code != 404:
            all_deleted = False
            break
    
    print_test_result("Verify projects are deleted", all_deleted)
    
    return True

def test_get_clients(tokens):
    print("\n=== Testing GET /api/clients/ ===")
    
    # Test with admin token
    response = make_request("GET", "/clients/", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Get clients as admin", success)
    if success:
        clients = response.json()
        print(f"  Retrieved {len(clients)} clients")
    
    # Test with account token
    if "account" in tokens["user_tokens"]:
        response = make_request("GET", "/clients/", tokens["user_tokens"]["account"])
        success = response.status_code == 200
        print_test_result("Get clients as account", success)
    
    # Test with staff token
    if "staff" in tokens["user_tokens"]:
        response = make_request("GET", "/clients/", tokens["user_tokens"]["staff"])
        success = response.status_code == 200
        print_test_result("Get clients as staff", success)
    
    return True

def test_get_users(tokens):
    print("\n=== Testing GET /api/users/ ===")
    
    # Test with admin token (should succeed)
    response = make_request("GET", "/users/", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Get users as admin", success)
    if success:
        users = response.json()
        print(f"  Retrieved {len(users)} users")
    
    # Test with account token (should fail - only admin can access)
    if "account" in tokens["user_tokens"]:
        response = make_request("GET", "/users/", tokens["user_tokens"]["account"])
        success = response.status_code == 403  # Should be forbidden
        print_test_result("Get users as account (should be forbidden)", success)
    
    # Test with staff token (should fail - only admin can access)
    if "staff" in tokens["user_tokens"]:
        response = make_request("GET", "/users/", tokens["user_tokens"]["staff"])
        success = response.status_code == 403  # Should be forbidden
        print_test_result("Get users as staff (should be forbidden)", success)
    
    return True

def test_project_search(tokens):
    print("\n=== Testing Project Search Functionality ===")
    
    # First, ensure we have the test data
    # Get a client ID for "Dai Long" and "Test Client 093010"
    response = make_request("GET", "/clients/", tokens["admin_token"])
    if response.status_code != 200:
        print_test_result("Get clients for search test", False, f"Failed to get clients: {response.status_code}")
        return False
    
    clients = response.json()
    dai_long_client = None
    test_client = None
    
    for client in clients:
        if "Dai Long" in client["name"]:
            dai_long_client = client
        elif "Test Client 093010" in client["name"]:
            test_client = client
    
    # Create test clients if they don't exist
    if not dai_long_client:
        client_data = {
            "name": "Dai Long",
            "company": "Dai Long Company",
            "contact_email": "dai.long@example.com"
        }
        response = make_request("POST", "/clients/", tokens["admin_token"], client_data)
        if response.status_code == 200:
            dai_long_client = response.json()
            print(f"  Created 'Dai Long' client with ID: {dai_long_client['id']}")
    
    if not test_client:
        client_data = {
            "name": "Test Client 093010",
            "company": "Test Company",
            "contact_email": "test.client@example.com"
        }
        response = make_request("POST", "/clients/", tokens["admin_token"], client_data)
        if response.status_code == 200:
            test_client = response.json()
            print(f"  Created 'Test Client 093010' client with ID: {test_client['id']}")
    
    # Check if we have the required clients
    if not dai_long_client or not test_client:
        print_test_result("Setup clients for search test", False, "Failed to find or create required clients")
        return False
    
    # Check if we have the test projects, create them if not
    # First, check for "Say Hi" project
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "Say Hi"})
    say_hi_exists = False
    if response.status_code == 200:
        projects = response.json()
        for project in projects:
            if project["name"] == "Say Hi":
                say_hi_exists = True
                break
    
    if not say_hi_exists:
        project_data = {
            "name": "Say Hi",
            "client_id": dai_long_client["id"],
            "description": "A project to say hi to everyone",
            "status": "in_progress"
        }
        response = make_request("POST", "/projects/", tokens["admin_token"], project_data)
        if response.status_code == 200:
            print(f"  Created 'Say Hi' project for 'Dai Long' client")
        else:
            print_test_result("Create 'Say Hi' project", False, f"Failed: {response.status_code} - {response.text}")
    
    # Check for "vvv" project
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "vvv"})
    vvv_exists = False
    if response.status_code == 200:
        projects = response.json()
        for project in projects:
            if project["name"] == "vvv":
                vvv_exists = True
                break
    
    if not vvv_exists:
        project_data = {
            "name": "vvv",
            "client_id": test_client["id"],
            "description": "A test project with a unique name",
            "status": "planning"
        }
        response = make_request("POST", "/projects/", tokens["admin_token"], project_data)
        if response.status_code == 200:
            print(f"  Created 'vvv' project for 'Test Client 093010' client")
        else:
            print_test_result("Create 'vvv' project", False, f"Failed: {response.status_code} - {response.text}")
    
    # Now run the search tests
    
    # Test Case 1: Search by project name "Say"
    print("\n  Test Case 1: Search by project name 'Say'")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "Say"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        found_say_hi = any(project["name"] == "Say Hi" for project in projects)
        print_test_result("Search for 'Say'", found_say_hi, 
                         f"Found {len(projects)} projects, 'Say Hi' project {'found' if found_say_hi else 'not found'}")
    else:
        print_test_result("Search for 'Say'", False, f"API call failed: {response.status_code}")
    
    # Test Case 2: Search by project name "vvv"
    print("\n  Test Case 2: Search by project name 'vvv'")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "vvv"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        found_vvv = any(project["name"] == "vvv" for project in projects)
        print_test_result("Search for 'vvv'", found_vvv, 
                         f"Found {len(projects)} projects, 'vvv' project {'found' if found_vvv else 'not found'}")
    else:
        print_test_result("Search for 'vvv'", False, f"API call failed: {response.status_code}")
    
    # Test Case 3: Search by client name "Dai"
    print("\n  Test Case 3: Search by client name 'Dai'")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "Dai"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        found_dai_long_project = any(project["client_id"] == dai_long_client["id"] for project in projects)
        print_test_result("Search for 'Dai'", found_dai_long_project, 
                         f"Found {len(projects)} projects, project for 'Dai Long' client {'found' if found_dai_long_project else 'not found'}")
    else:
        print_test_result("Search for 'Dai'", False, f"API call failed: {response.status_code}")
    
    # Test Case 4: Search by client name "Test"
    print("\n  Test Case 4: Search by client name 'Test'")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "Test"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        found_test_client_project = any(project["client_id"] == test_client["id"] for project in projects)
        print_test_result("Search for 'Test'", found_test_client_project, 
                         f"Found {len(projects)} projects, project for 'Test Client 093010' {'found' if found_test_client_project else 'not found'}")
    else:
        print_test_result("Search for 'Test'", False, f"API call failed: {response.status_code}")
    
    # Test Case 5: Case-insensitive search - lowercase
    print("\n  Test Case 5: Case-insensitive search - lowercase")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "say"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        found_say_hi = any(project["name"] == "Say Hi" for project in projects)
        print_test_result("Case-insensitive search - lowercase 'say'", found_say_hi, 
                         f"Found {len(projects)} projects, 'Say Hi' project {'found' if found_say_hi else 'not found'}")
    else:
        print_test_result("Case-insensitive search - lowercase 'say'", False, f"API call failed: {response.status_code}")
    
    # Test Case 6: Case-insensitive search - uppercase
    print("\n  Test Case 6: Case-insensitive search - uppercase")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "VVV"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        found_vvv = any(project["name"] == "vvv" for project in projects)
        print_test_result("Case-insensitive search - uppercase 'VVV'", found_vvv, 
                         f"Found {len(projects)} projects, 'vvv' project {'found' if found_vvv else 'not found'}")
    else:
        print_test_result("Case-insensitive search - uppercase 'VVV'", False, f"API call failed: {response.status_code}")
    
    # Test Case 7: Search with no results
    print("\n  Test Case 7: Search with no results")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "xyz123"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        no_results = len(projects) == 0
        print_test_result("Search with no results 'xyz123'", no_results, 
                         f"Found {len(projects)} projects, expected 0")
    else:
        print_test_result("Search with no results 'xyz123'", False, f"API call failed: {response.status_code}")
    
    # Test Case 8: Search with other filters
    print("\n  Test Case 8: Search with other filters")
    response = make_request("GET", "/projects/", tokens["admin_token"], 
                           params={"search": "Say", "status": "in_progress"})
    success = response.status_code == 200
    if success:
        projects = response.json()
        found_say_hi_with_status = any(project["name"] == "Say Hi" and project["status"] == "in_progress" 
                                      for project in projects)
        print_test_result("Search with other filters", found_say_hi_with_status, 
                         f"Found {len(projects)} projects with search='Say' and status='in_progress'")
    else:
        print_test_result("Search with other filters", False, f"API call failed: {response.status_code}")
    
    return True

def run_all_tests():
    print("\n=== Starting Backend API Tests ===")
    
    # Setup test environment
    tokens = setup_test_environment()
    if not tokens:
        return False
    
    # Run tests
    test_results = [
        test_get_projects(tokens),
        test_project_crud(tokens),
        test_bulk_operations(tokens),
        test_get_clients(tokens),
        test_get_users(tokens),
        test_project_search(tokens)
    ]
    
    # Debug the search issue
    debug_project_search(tokens)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {len(test_results)}")
    print(f"Passed: {test_results.count(True)}")
    print(f"Failed: {test_results.count(False)}")
    
    return all(test_results)

def debug_project_search(tokens):
    print("\n=== Debugging Project Search by Client Name ===")
    
    # Get all clients
    response = make_request("GET", "/clients/", tokens["admin_token"])
    if response.status_code != 200:
        print(f"Failed to get clients: {response.status_code}")
        return
    
    clients = response.json()
    print(f"Found {len(clients)} clients:")
    for client in clients:
        print(f"  Client ID: {client['id']}, Name: {client['name']}")
    
    # Find Dai Long client
    dai_long_client = None
    for client in clients:
        if "Dai Long" in client["name"]:
            dai_long_client = client
            break
    
    if not dai_long_client:
        print("Dai Long client not found!")
        return
    
    print(f"\nDai Long client details:")
    print(f"  ID: {dai_long_client['id']}")
    print(f"  Name: {dai_long_client['name']}")
    
    # Get all projects
    response = make_request("GET", "/projects/", tokens["admin_token"])
    if response.status_code != 200:
        print(f"Failed to get projects: {response.status_code}")
        return
    
    projects = response.json()
    print(f"\nFound {len(projects)} projects:")
    for project in projects:
        print(f"  Project ID: {project['id']}, Name: {project['name']}, Client ID: {project['client_id']}")
    
    # Check if any project is associated with Dai Long client
    dai_long_projects = [p for p in projects if p["client_id"] == dai_long_client["id"]]
    print(f"\nProjects associated with Dai Long client: {len(dai_long_projects)}")
    for project in dai_long_projects:
        print(f"  Project ID: {project['id']}, Name: {project['name']}")
    
    # Try to create a new project for Dai Long client
    project_data = {
        "name": "Dai Long Test Project",
        "client_id": dai_long_client["id"],
        "description": "A test project for Dai Long client",
        "status": "planning"
    }
    
    response = make_request("POST", "/projects/", tokens["admin_token"], project_data)
    if response.status_code == 200:
        new_project = response.json()
        print(f"\nCreated new project for Dai Long client:")
        print(f"  Project ID: {new_project['id']}, Name: {new_project['name']}, Client ID: {new_project['client_id']}")
    else:
        print(f"\nFailed to create new project: {response.status_code} - {response.text}")
    
    # Now try searching for "Dai" again
    print("\nSearching for 'Dai'...")
    response = make_request("GET", "/projects/", tokens["admin_token"], params={"search": "Dai"})
    if response.status_code == 200:
        search_results = response.json()
        print(f"Found {len(search_results)} projects in search results:")
        for project in search_results:
            print(f"  Project ID: {project['id']}, Name: {project['name']}, Client ID: {project['client_id']}")
    else:
        print(f"Search failed: {response.status_code} - {response.text}")
    
    # Try direct MongoDB query to see what's happening
    print("\nTrying direct search for 'Dai Long' client...")
    response = make_request("GET", "/clients/", tokens["admin_token"], params={"search": "Dai"})
    if response.status_code == 200:
        client_search_results = response.json()
        print(f"Found {len(client_search_results)} clients in search results:")
        for client in client_search_results:
            print(f"  Client ID: {client['id']}, Name: {client['name']}")
    else:
        print(f"Client search failed: {response.status_code} - {response.text}")

if __name__ == "__main__":
    run_all_tests()
