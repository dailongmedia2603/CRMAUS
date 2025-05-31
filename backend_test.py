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

def test_campaign_crud(tokens):
    print("\n=== Testing Campaign CRUD Operations ===")
    
    # Test campaign creation
    campaign_names = [
        "Chiến dịch Marketing Q1 2024",
        "Chương trình khuyến mãi Tết",
        "Campaign Social Media",
        "Quảng cáo Google Ads"
    ]
    
    created_campaign_ids = []
    
    # Create multiple campaigns
    for name in campaign_names:
        campaign_data = {
            "name": name,
            "description": f"Mô tả cho {name}",
            "archived": False
        }
        
        response = make_request("POST", "/campaigns/", tokens["admin_token"], campaign_data)
        success = response.status_code == 200
        print_test_result(f"Create campaign: {name}", success)
        
        if success:
            campaign_id = response.json()["id"]
            created_campaign_ids.append(campaign_id)
            print(f"  Created campaign with ID: {campaign_id}")
    
    # Test get all campaigns
    response = make_request("GET", "/campaigns/", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Get all campaigns", success)
    
    if success:
        campaigns = response.json()
        print(f"  Retrieved {len(campaigns)} campaigns")
        
        # Verify all our created campaigns are in the list
        all_found = True
        for campaign_id in created_campaign_ids:
            if not any(c["id"] == campaign_id for c in campaigns):
                all_found = False
                break
        
        print_test_result("Verify all created campaigns are in the list", all_found)
    
    # Test get campaign by ID
    if created_campaign_ids:
        campaign_id = created_campaign_ids[0]
        response = make_request("GET", f"/campaigns/{campaign_id}", tokens["admin_token"])
        success = response.status_code == 200
        print_test_result("Get campaign by ID", success)
        
        if success:
            campaign = response.json()
            print(f"  Retrieved campaign: {campaign['name']}")
    
    # Test update campaign
    if created_campaign_ids:
        campaign_id = created_campaign_ids[0]
        update_data = {
            "name": "Updated Campaign Name",
            "description": "Updated description for testing"
        }
        
        response = make_request("PUT", f"/campaigns/{campaign_id}", tokens["admin_token"], update_data)
        success = response.status_code == 200
        print_test_result("Update campaign", success)
        
        if success:
            updated_campaign = response.json()
            success = updated_campaign["name"] == update_data["name"] and updated_campaign["description"] == update_data["description"]
            print_test_result("Verify campaign update", success)
    
    # Test archive campaign
    if len(created_campaign_ids) > 1:
        campaign_id = created_campaign_ids[1]
        archive_data = {
            "archived": True
        }
        
        response = make_request("PUT", f"/campaigns/{campaign_id}", tokens["admin_token"], archive_data)
        success = response.status_code == 200
        print_test_result("Archive campaign", success)
        
        if success:
            archived_campaign = response.json()
            success = archived_campaign["archived"] == True
            print_test_result("Verify campaign archived", success)
    
    # Test search functionality
    if created_campaign_ids:
        # Use a search term that will match existing campaigns
        search_term = "Google"
        response = make_request("GET", "/campaigns/", tokens["admin_token"], params={"search": search_term})
        success = response.status_code == 200
        print_test_result(f"Search campaigns with term: {search_term}", success)
        
        if success:
            search_results = response.json()
            print(f"  Search results for '{search_term}':")
            for campaign in search_results:
                print(f"    - {campaign['name']}")
            
            # Use case-insensitive comparison since the API uses case-insensitive regex
            found_match = any(search_term.lower() in campaign["name"].lower() for campaign in search_results)
            print_test_result(f"Verify search results contain '{search_term}'", found_match)
    
    # Test get archived campaigns
    response = make_request("GET", "/campaigns/", tokens["admin_token"], params={"archived": "true"})
    success = response.status_code == 200
    print_test_result("Get archived campaigns", success)
    
    if success:
        archived_campaigns = response.json()
        print(f"  Retrieved {len(archived_campaigns)} archived campaigns")
    
    # Test delete campaign with different roles
    if created_campaign_ids:
        # Test with staff (should fail)
        if "staff" in tokens["user_tokens"]:
            campaign_id = created_campaign_ids.pop()
            response = make_request("DELETE", f"/campaigns/{campaign_id}", tokens["user_tokens"]["staff"])
            success = response.status_code == 403  # Should be forbidden
            print_test_result("Delete campaign as staff (should be forbidden)", success)
        
        # Test with account (should succeed)
        if "account" in tokens["user_tokens"] and created_campaign_ids:
            campaign_id = created_campaign_ids.pop()
            response = make_request("DELETE", f"/campaigns/{campaign_id}", tokens["user_tokens"]["account"])
            success = response.status_code == 200
            print_test_result("Delete campaign as account", success)
        
        # Test with admin
        if created_campaign_ids:
            campaign_id = created_campaign_ids.pop()
            response = make_request("DELETE", f"/campaigns/{campaign_id}", tokens["admin_token"])
            success = response.status_code == 200
            print_test_result("Delete campaign as admin", success)
            
            # Verify campaign is deleted
            response = make_request("GET", f"/campaigns/{campaign_id}", tokens["admin_token"])
            success = response.status_code == 404
            print_test_result("Verify campaign deletion", success)
    
    return True

def test_campaign_bulk_actions(tokens):
    print("\n=== Testing Campaign Bulk Actions ===")
    
    # Create multiple test campaigns
    campaign_ids = []
    for i in range(3):
        campaign_data = {
            "name": f"Bulk Test Campaign {i} - {uuid.uuid4()}",
            "description": f"Test campaign for bulk operations {i}"
        }
        response = make_request("POST", "/campaigns/", tokens["admin_token"], campaign_data)
        if response.status_code == 200:
            campaign_ids.append(response.json()["id"])
    
    print(f"  Created {len(campaign_ids)} test campaigns for bulk operations")
    
    if len(campaign_ids) == 0:
        print_test_result("Create test campaigns for bulk operations", False)
        return False
    
    # Test bulk archive
    bulk_data = {
        "action": "archive",
        "campaign_ids": campaign_ids
    }
    response = make_request("POST", "/campaigns/bulk-action", tokens["admin_token"], bulk_data)
    success = response.status_code == 200
    print_test_result("Bulk archive campaigns", success)
    
    # Verify campaigns are archived
    all_archived = True
    for campaign_id in campaign_ids:
        response = make_request("GET", f"/campaigns/{campaign_id}", tokens["admin_token"])
        if response.status_code == 200:
            if not response.json()["archived"]:
                all_archived = False
                break
    
    print_test_result("Verify campaigns are archived", all_archived)
    
    # Test bulk restore
    bulk_data = {
        "action": "restore",
        "campaign_ids": campaign_ids
    }
    response = make_request("POST", "/campaigns/bulk-action", tokens["admin_token"], bulk_data)
    success = response.status_code == 200
    print_test_result("Bulk restore campaigns", success)
    
    # Verify campaigns are restored
    all_restored = True
    for campaign_id in campaign_ids:
        response = make_request("GET", f"/campaigns/{campaign_id}", tokens["admin_token"])
        if response.status_code == 200:
            if response.json()["archived"]:
                all_restored = False
                break
    
    print_test_result("Verify campaigns are restored", all_restored)
    
    # Test bulk delete
    bulk_data = {
        "action": "delete",
        "campaign_ids": campaign_ids
    }
    response = make_request("POST", "/campaigns/bulk-action", tokens["admin_token"], bulk_data)
    success = response.status_code == 200
    print_test_result("Bulk delete campaigns", success)
    
    # Verify campaigns are deleted
    all_deleted = True
    for campaign_id in campaign_ids:
        response = make_request("GET", f"/campaigns/{campaign_id}", tokens["admin_token"])
        if response.status_code != 404:
            all_deleted = False
            break
    
    print_test_result("Verify campaigns are deleted", all_deleted)
    
    return True

def test_service_crud(tokens):
    print("\n=== Testing Service CRUD Operations ===")
    
    # First, get or create a campaign to work with
    response = make_request("GET", "/campaigns/", tokens["admin_token"])
    campaign_id = None
    
    if response.status_code == 200 and len(response.json()) > 0:
        campaign_id = response.json()[0]["id"]
        print(f"  Using existing campaign with ID: {campaign_id}")
    else:
        # Create a new campaign
        campaign_data = {
            "name": f"Test Campaign for Services {uuid.uuid4()}",
            "description": "Campaign created for testing services"
        }
        response = make_request("POST", "/campaigns/", tokens["admin_token"], campaign_data)
        if response.status_code == 200:
            campaign_id = response.json()["id"]
            print(f"  Created new campaign with ID: {campaign_id}")
        else:
            print_test_result("Create campaign for service testing", False, 
                             f"Failed: {response.status_code} - {response.text}")
            return False
    
    # Create services with different sort_order values
    service_data = [
        {"name": "Service 1", "sort_order": 3, "description": "Third service", "campaign_id": campaign_id},
        {"name": "Service 2", "sort_order": 1, "description": "First service", "campaign_id": campaign_id},
        {"name": "Service 3", "sort_order": 2, "description": "Second service", "campaign_id": campaign_id}
    ]
    
    created_service_ids = []
    
    for data in service_data:
        response = make_request("POST", f"/campaigns/{campaign_id}/services/", tokens["admin_token"], data)
        success = response.status_code == 200
        print_test_result(f"Create service: {data['name']}", success)
        
        if success:
            service_id = response.json()["id"]
            created_service_ids.append(service_id)
            print(f"  Created service with ID: {service_id}")
    
    # Test get services (should be sorted by sort_order)
    response = make_request("GET", f"/campaigns/{campaign_id}/services/", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Get services for campaign", success)
    
    if success:
        services = response.json()
        print(f"  Retrieved {len(services)} services")
        
        # Verify services are sorted by sort_order
        is_sorted = True
        for i in range(1, len(services)):
            if services[i-1]["sort_order"] > services[i]["sort_order"]:
                is_sorted = False
                break
        
        print_test_result("Verify services are sorted by sort_order", is_sorted)
        
        # Print the order for debugging
        print("  Services in order:")
        for service in services:
            print(f"    - {service['name']} (sort_order: {service['sort_order']})")
    
    # Test update service
    if created_service_ids:
        service_id = created_service_ids[0]
        update_data = {
            "name": "Updated Service Name",
            "description": "Updated service description",
            "sort_order": 5
        }
        
        response = make_request("PUT", f"/services/{service_id}", tokens["admin_token"], update_data)
        success = response.status_code == 200
        print_test_result("Update service", success)
        
        if success:
            updated_service = response.json()
            success = (updated_service["name"] == update_data["name"] and 
                      updated_service["description"] == update_data["description"] and
                      updated_service["sort_order"] == update_data["sort_order"])
            print_test_result("Verify service update", success)
    
    # Test delete service with different roles
    if len(created_service_ids) >= 3:
        # Test with staff (should fail)
        if "staff" in tokens["user_tokens"]:
            service_id = created_service_ids[2]
            response = make_request("DELETE", f"/services/{service_id}", tokens["user_tokens"]["staff"])
            success = response.status_code == 403  # Should be forbidden
            print_test_result("Delete service as staff (should be forbidden)", success)
        
        # Test with account (should succeed)
        if "account" in tokens["user_tokens"]:
            service_id = created_service_ids[1]
            response = make_request("DELETE", f"/services/{service_id}", tokens["user_tokens"]["account"])
            success = response.status_code == 200
            print_test_result("Delete service as account", success)
        
        # Test with admin
        service_id = created_service_ids[0]
        response = make_request("DELETE", f"/services/{service_id}", tokens["admin_token"])
        success = response.status_code == 200
        print_test_result("Delete service as admin", success)
        
        # Verify service is deleted
        response = make_request("GET", f"/campaigns/{campaign_id}/services/", tokens["admin_token"])
        if response.status_code == 200:
            services = response.json()
            service_deleted = not any(s["id"] == service_id for s in services)
            print_test_result("Verify service deletion", service_deleted)
    
    return True

def test_task_crud(tokens):
    print("\n=== Testing Task CRUD Operations ===")
    
    # First, get or create a campaign and service to work with
    response = make_request("GET", "/campaigns/", tokens["admin_token"])
    campaign_id = None
    
    if response.status_code == 200 and len(response.json()) > 0:
        campaign_id = response.json()[0]["id"]
        print(f"  Using existing campaign with ID: {campaign_id}")
    else:
        # Create a new campaign
        campaign_data = {
            "name": f"Test Campaign for Tasks {uuid.uuid4()}",
            "description": "Campaign created for testing tasks"
        }
        response = make_request("POST", "/campaigns/", tokens["admin_token"], campaign_data)
        if response.status_code == 200:
            campaign_id = response.json()["id"]
            print(f"  Created new campaign with ID: {campaign_id}")
        else:
            print_test_result("Create campaign for task testing", False, 
                             f"Failed: {response.status_code} - {response.text}")
            return False
    
    # Create a service
    service_data = {
        "name": "Test Service for Tasks",
        "sort_order": 1,
        "description": "Service created for testing tasks",
        "campaign_id": campaign_id
    }
    
    response = make_request("POST", f"/campaigns/{campaign_id}/services/", tokens["admin_token"], service_data)
    if response.status_code != 200:
        print_test_result("Create service for task testing", False, 
                         f"Failed: {response.status_code} - {response.text}")
        return False
    
    service_id = response.json()["id"]
    print(f"  Created service with ID: {service_id}")
    
    # Create a template for tasks
    template_data = {
        "name": "Test Template",
        "content": '{"title": "Test Template", "steps": ["Step 1", "Step 2", "Step 3"]}',
        "template_type": "service"
    }
    
    response = make_request("POST", "/templates/", tokens["admin_token"], template_data)
    template_id = None
    if response.status_code == 200:
        template_id = response.json()["id"]
        print(f"  Created template with ID: {template_id}")
    else:
        print_test_result("Create template for task testing", False, 
                         f"Failed: {response.status_code} - {response.text}")
    
    # Create tasks with different statuses
    now = datetime.utcnow()
    task_data = [
        {
            "name": "Task 1 - Not Started",
            "service_id": service_id,
            "status": "not_started",
            "start_date": (now - timedelta(days=5)).isoformat(),
            "end_date": (now + timedelta(days=10)).isoformat(),
            "description": "Task that hasn't started yet"
        },
        {
            "name": "Task 2 - In Progress",
            "service_id": service_id,
            "status": "in_progress",
            "start_date": (now - timedelta(days=10)).isoformat(),
            "end_date": (now + timedelta(days=5)).isoformat(),
            "description": "Task that is in progress"
        },
        {
            "name": "Task 3 - Completed",
            "service_id": service_id,
            "status": "completed",
            "start_date": (now - timedelta(days=15)).isoformat(),
            "end_date": now.isoformat(),
            "description": "Task that is completed"
        }
    ]
    
    # Add template to one task
    if template_id:
        task_data[0]["template_id"] = template_id
    
    created_task_ids = []
    
    for data in task_data:
        response = make_request("POST", f"/services/{service_id}/tasks/", tokens["admin_token"], data)
        success = response.status_code == 200
        print_test_result(f"Create task: {data['name']}", success)
        
        if success:
            task_id = response.json()["id"]
            created_task_ids.append(task_id)
            print(f"  Created task with ID: {task_id}")
    
    # Test get tasks
    response = make_request("GET", f"/services/{service_id}/tasks/", tokens["admin_token"])
    success = response.status_code == 200
    print_test_result("Get tasks for service", success)
    
    if success:
        tasks = response.json()
        print(f"  Retrieved {len(tasks)} tasks")
        
        # Verify template enrichment
        if template_id:
            template_task = next((t for t in tasks if t.get("template_id") == template_id), None)
            if template_task:
                template_name_included = "template_name" in template_task
                print_test_result("Verify template_name enrichment", template_name_included)
                if template_name_included:
                    print(f"  Template name: {template_task['template_name']}")
    
    # Test update task
    if created_task_ids:
        task_id = created_task_ids[0]
        update_data = {
            "name": "Updated Task Name",
            "status": "in_progress",
            "description": "Updated task description"
        }
        
        response = make_request("PUT", f"/tasks/{task_id}", tokens["admin_token"], update_data)
        success = response.status_code == 200
        print_test_result("Update task", success)
        
        if success:
            updated_task = response.json()
            success = (updated_task["name"] == update_data["name"] and 
                      updated_task["status"] == update_data["status"] and
                      updated_task["description"] == update_data["description"])
            print_test_result("Verify task update", success)
    
    # Test task copy functionality
    if created_task_ids:
        task_id = created_task_ids[0]
        
        # Test with valid quantity
        copy_data = {"quantity": 3}
        response = make_request("POST", f"/tasks/{task_id}/copy", tokens["admin_token"], copy_data)
        success = response.status_code == 200
        print_test_result("Copy task with quantity=3", success)
        
        if success:
            result = response.json()
            print(f"  Copy task response: {result}")
            copied_tasks = result.get("copied_tasks", [])
            success = len(copied_tasks) == 3
            print_test_result("Verify 3 tasks were copied", success)
            
            # Check that all copies have status="not_started"
            all_not_started = all(task["status"] == "not_started" for task in copied_tasks)
            print_test_result("Verify all copied tasks have status='not_started'", all_not_started)
        
        # Test with invalid quantity (too high)
        copy_data = {"quantity": 25}  # Over the limit of 20
        response = make_request("POST", f"/tasks/{task_id}/copy", tokens["admin_token"], copy_data)
        success = response.status_code == 400  # Should fail with 400 Bad Request
        print_test_result("Copy task with invalid quantity=25 (should fail)", success)
    
    # Test delete task
    if created_task_ids:
        task_id = created_task_ids[0]
        response = make_request("DELETE", f"/tasks/{task_id}", tokens["admin_token"])
        success = response.status_code == 200
        print_test_result("Delete task", success)
        
        # Verify task is deleted
        response = make_request("GET", f"/services/{service_id}/tasks/", tokens["admin_token"])
        if response.status_code == 200:
            tasks = response.json()
            task_deleted = not any(t["id"] == task_id for t in tasks)
            print_test_result("Verify task deletion", task_deleted)
    
    return True

def test_template_crud(tokens):
    print("\n=== Testing Template CRUD Operations ===")
    
    # Create templates
    template_data = [
        {
            "name": "Service Template 1",
            "content": '{"title": "Service Template", "sections": ["Section 1", "Section 2"]}',
            "template_type": "service"
        },
        {
            "name": "Task Template 1",
            "content": '{"title": "Task Template", "steps": ["Step 1", "Step 2", "Step 3"]}',
            "template_type": "task"
        }
    ]
    
    created_template_ids = []
    
    for data in template_data:
        response = make_request("POST", "/templates/", tokens["admin_token"], data)
        success = response.status_code == 200
        print_test_result(f"Create template: {data['name']}", success)
        
        if success:
            template_id = response.json()["id"]
            created_template_ids.append(template_id)
            print(f"  Created template with ID: {template_id}")
    
    # Test get templates with filter by type
    for template_type in ["service", "task"]:
        response = make_request("GET", "/templates/", tokens["admin_token"], params={"template_type": template_type})
        success = response.status_code == 200
        print_test_result(f"Get templates with type={template_type}", success)
        
        if success:
            templates = response.json()
            print(f"  Retrieved {len(templates)} {template_type} templates")
            
            # Verify all templates have the correct type
            all_correct_type = all(t["template_type"] == template_type for t in templates)
            print_test_result(f"Verify all templates have type={template_type}", all_correct_type)
    
    # Test get template by ID
    if created_template_ids:
        template_id = created_template_ids[0]
        response = make_request("GET", f"/templates/{template_id}", tokens["admin_token"])
        success = response.status_code == 200
        print_test_result("Get template by ID", success)
        
        if success:
            template = response.json()
            print(f"  Retrieved template: {template['name']}")
    
    return True

def test_campaign_hierarchy_integration(tokens):
    print("\n=== Testing Campaign Hierarchy Integration ===")
    
    # Create a complete hierarchy: Campaign -> Services -> Tasks
    # 1. Create a campaign
    campaign_data = {
        "name": f"Hierarchy Test Campaign {uuid.uuid4()}",
        "description": "Campaign for testing the complete hierarchy"
    }
    
    response = make_request("POST", "/campaigns/", tokens["admin_token"], campaign_data)
    if response.status_code != 200:
        print_test_result("Create campaign for hierarchy testing", False, 
                         f"Failed: {response.status_code} - {response.text}")
        return False
    
    campaign_id = response.json()["id"]
    print(f"  Created campaign with ID: {campaign_id}")
    
    # 2. Create multiple services with different sort_order
    services_data = [
        {"name": "Design Service", "sort_order": 1, "description": "Design related tasks", "campaign_id": campaign_id},
        {"name": "Development Service", "sort_order": 2, "description": "Development related tasks", "campaign_id": campaign_id},
        {"name": "Testing Service", "sort_order": 3, "description": "Testing related tasks", "campaign_id": campaign_id}
    ]
    
    service_ids = []
    for data in services_data:
        response = make_request("POST", f"/campaigns/{campaign_id}/services/", tokens["admin_token"], data)
        if response.status_code == 200:
            service_id = response.json()["id"]
            service_ids.append(service_id)
            print(f"  Created service: {data['name']} with ID: {service_id}")
    
    if not service_ids:
        print_test_result("Create services for hierarchy testing", False, "Failed to create any services")
        return False
    
    # 3. Create a template
    template_data = {
        "name": "Task Checklist Template",
        "content": '{"title": "Task Checklist", "items": ["Item 1", "Item 2", "Item 3"]}',
        "template_type": "task"
    }
    
    response = make_request("POST", "/templates/", tokens["admin_token"], template_data)
    template_id = None
    if response.status_code == 200:
        template_id = response.json()["id"]
        print(f"  Created template with ID: {template_id}")
    
    # 4. Create tasks for each service
    now = datetime.utcnow()
    
    for i, service_id in enumerate(service_ids):
        # Create 2 tasks per service
        for j in range(2):
            task_data = {
                "name": f"Task {j+1} for Service {i+1}",
                "service_id": service_id,
                "status": ["not_started", "in_progress", "completed"][min(i, 2)],
                "start_date": (now - timedelta(days=5)).isoformat(),
                "end_date": (now + timedelta(days=10)).isoformat(),
                "description": f"Task {j+1} description for Service {i+1}"
            }
            
            # Add template to some tasks
            if template_id and j == 0:
                task_data["template_id"] = template_id
            
            response = make_request("POST", f"/services/{service_id}/tasks/", tokens["admin_token"], task_data)
            if response.status_code == 200:
                task_id = response.json()["id"]
                print(f"  Created task: {task_data['name']} with ID: {task_id}")
    
    # 5. Verify the complete hierarchy
    # Get campaign
    response = make_request("GET", f"/campaigns/{campaign_id}", tokens["admin_token"])
    if response.status_code != 200:
        print_test_result("Get campaign for hierarchy verification", False, 
                         f"Failed: {response.status_code} - {response.text}")
        return False
    
    campaign = response.json()
    print(f"\nVerifying hierarchy for campaign: {campaign['name']}")
    
    # Get services (should be sorted by sort_order)
    response = make_request("GET", f"/campaigns/{campaign_id}/services/", tokens["admin_token"])
    if response.status_code != 200:
        print_test_result("Get services for hierarchy verification", False, 
                         f"Failed: {response.status_code} - {response.text}")
        return False
    
    services = response.json()
    print(f"  Found {len(services)} services:")
    
    # Verify services are sorted by sort_order
    is_sorted = True
    for i in range(1, len(services)):
        if services[i-1]["sort_order"] > services[i]["sort_order"]:
            is_sorted = False
            break
    
    print_test_result("Verify services are sorted by sort_order", is_sorted)
    
    # Check tasks for each service
    for service in services:
        print(f"  Service: {service['name']} (sort_order: {service['sort_order']})")
        
        response = make_request("GET", f"/services/{service['id']}/tasks/", tokens["admin_token"])
        if response.status_code != 200:
            print_test_result(f"Get tasks for service {service['name']}", False, 
                             f"Failed: {response.status_code} - {response.text}")
            continue
        
        tasks = response.json()
        print(f"    Found {len(tasks)} tasks:")
        
        for task in tasks:
            template_info = f", Template: {task.get('template_name', 'None')}" if task.get('template_id') else ""
            print(f"    - {task['name']} (Status: {task['status']}{template_info})")
            
            # Verify template enrichment if task has a template
            if task.get('template_id') and not task.get('template_name'):
                print_test_result(f"Verify template enrichment for task {task['name']}", False, 
                                 "Template ID exists but template_name is missing")
    
    # 6. Test cascade delete of a service and its tasks
    if service_ids:
        service_id_to_delete = service_ids[0]
        
        # First, get all tasks for this service
        response = make_request("GET", f"/services/{service_id_to_delete}/tasks/", tokens["admin_token"])
        if response.status_code == 200:
            tasks_before_delete = response.json()
            
            # Now delete the service
            response = make_request("DELETE", f"/services/{service_id_to_delete}", tokens["admin_token"])
            success = response.status_code == 200
            print_test_result(f"Delete service with ID {service_id_to_delete}", success)
            
            if success:
                # Verify service is deleted
                response = make_request("GET", f"/campaigns/{campaign_id}/services/", tokens["admin_token"])
                if response.status_code == 200:
                    services_after = response.json()
                    service_deleted = not any(s["id"] == service_id_to_delete for s in services_after)
                    print_test_result("Verify service deletion", service_deleted)
                
                # Try to get tasks for the deleted service (should fail or return empty)
                response = make_request("GET", f"/services/{service_id_to_delete}/tasks/", tokens["admin_token"])
                if response.status_code == 404:
                    print_test_result("Verify service tasks endpoint returns 404 after service deletion", True)
                elif response.status_code == 200 and len(response.json()) == 0:
                    print_test_result("Verify service tasks are empty after service deletion", True)
                else:
                    print_test_result("Verify service tasks are deleted", False, 
                                     f"Unexpected response: {response.status_code}, tasks: {len(response.json())}")
                
                # Try to get each task directly by ID (should fail with 404)
                all_tasks_deleted = True
                for task in tasks_before_delete:
                    task_id = task["id"]
                    response = make_request("GET", f"/tasks/{task_id}", tokens["admin_token"])
                    if response.status_code != 404:
                        all_tasks_deleted = False
                        print(f"    Task {task_id} was not deleted with service")
                
                print_test_result("Verify all tasks are cascade deleted with service", all_tasks_deleted)
    
    return True

def run_all_tests():
    print("\n=== Starting Backend API Tests ===")
    
    # Setup test environment
    tokens = setup_test_environment()
    if not tokens:
        return False
    
    # Run tests
    test_results = [
        # Uncomment these if you want to run all tests
        # test_get_projects(tokens),
        # test_project_crud(tokens),
        # test_bulk_operations(tokens),
        # test_get_clients(tokens),
        # test_get_users(tokens),
        # test_project_search(tokens),
        # test_campaign_crud(tokens),
        # test_campaign_bulk_actions(tokens),
        
        # Campaign hierarchy tests
        test_service_crud(tokens),
        test_task_crud(tokens),
        test_template_crud(tokens),
        test_campaign_hierarchy_integration(tokens)
    ]
    
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
