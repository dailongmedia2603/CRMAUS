import requests
import json
from datetime import datetime, timedelta
import time
import uuid

# Backend URL - Updated from review request
BACKEND_URL = "http://localhost:8001/api"

# Test user credentials
EMAIL = "admin@example.com"
PASSWORD = "admin123"

# Global variables
token = None
created_category_ids = []
created_folder_ids = []
created_expense_ids = []
created_client_ids = []
created_internal_task_ids = []

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

def test_expense_categories():
    """Test Expense Categories API endpoints"""
    print("\n=== Testing Expense Categories API ===")
    
    # Test POST /api/expense-categories/
    category_data = {
        "name": f"Test Category {uuid.uuid4().hex[:8]}",
        "description": "Test category description",
        "color": "#FF5733",
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/expense-categories/",
        headers=get_headers(),
        json=category_data
    )
    
    success = print_test_result("Create Expense Category", response)
    if success:
        category_id = response.json()["id"]
        created_category_ids.append(category_id)
        print(f"Created category ID: {category_id}")
    
    # Test GET /api/expense-categories/
    response = requests.get(
        f"{BACKEND_URL}/expense-categories/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Expense Categories", response)
    if success:
        categories = response.json()
        print(f"Found {len(categories)} categories")
    
    # Test GET /api/expense-categories/ with is_active filter
    response = requests.get(
        f"{BACKEND_URL}/expense-categories/?is_active=true",
        headers=get_headers()
    )
    
    print_test_result("Get Active Expense Categories", response)
    
    if created_category_ids:
        category_id = created_category_ids[0]
        
        # Test PUT /api/expense-categories/{id}
        update_data = {
            "name": f"Updated Category {uuid.uuid4().hex[:8]}",
            "description": "Updated description",
            "color": "#33FF57"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/expense-categories/{category_id}",
            headers=get_headers(),
            json=update_data
        )
        
        print_test_result("Update Expense Category", response)
        
        # Test DELETE /api/expense-categories/{id}
        # We'll create a new category for deletion to avoid affecting other tests
        temp_category_data = {
            "name": f"Temp Category for Deletion {uuid.uuid4().hex[:8]}",
            "description": "This category will be deleted",
            "color": "#3357FF"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/expense-categories/",
            headers=get_headers(),
            json=temp_category_data
        )
        
        if response.status_code == 200:
            temp_category_id = response.json()["id"]
            
            # Now delete this category
            response = requests.delete(
                f"{BACKEND_URL}/expense-categories/{temp_category_id}",
                headers=get_headers()
            )
            
            print_test_result("Delete Expense Category", response)
            
            # Test deleting a category that has expenses (should fail)
            # We'll create this in the expense test and try to delete it there
    
    return created_category_ids

def test_expense_folders():
    """Test Expense Folders API endpoints"""
    print("\n=== Testing Expense Folders API ===")
    
    # Test POST /api/expense-folders/
    folder_data = {
        "name": f"Test Folder {uuid.uuid4().hex[:8]}",
        "description": "Test folder description",
        "color": "#5733FF",
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/expense-folders/",
        headers=get_headers(),
        json=folder_data
    )
    
    success = print_test_result("Create Expense Folder", response)
    if success:
        folder_id = response.json()["id"]
        created_folder_ids.append(folder_id)
        print(f"Created folder ID: {folder_id}")
    
    # Test GET /api/expense-folders/
    response = requests.get(
        f"{BACKEND_URL}/expense-folders/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Expense Folders", response)
    if success:
        folders = response.json()
        print(f"Found {len(folders)} folders")
    
    # Test GET /api/expense-folders/ with is_active filter
    response = requests.get(
        f"{BACKEND_URL}/expense-folders/?is_active=true",
        headers=get_headers()
    )
    
    print_test_result("Get Active Expense Folders", response)
    
    if created_folder_ids:
        folder_id = created_folder_ids[0]
        
        # Test PUT /api/expense-folders/{id}
        update_data = {
            "name": f"Updated Folder {uuid.uuid4().hex[:8]}",
            "description": "Updated folder description",
            "color": "#33FF57"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/expense-folders/{folder_id}",
            headers=get_headers(),
            json=update_data
        )
        
        print_test_result("Update Expense Folder", response)
        
        # Test DELETE /api/expense-folders/{id}
        # We'll create a new folder for deletion to avoid affecting other tests
        temp_folder_data = {
            "name": f"Temp Folder for Deletion {uuid.uuid4().hex[:8]}",
            "description": "This folder will be deleted",
            "color": "#3357FF"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/expense-folders/",
            headers=get_headers(),
            json=temp_folder_data
        )
        
        if response.status_code == 200:
            temp_folder_id = response.json()["id"]
            
            # Now delete this folder
            response = requests.delete(
                f"{BACKEND_URL}/expense-folders/{temp_folder_id}",
                headers=get_headers()
            )
            
            print_test_result("Delete Expense Folder", response)
            
            # Test deleting a folder that has expenses (should fail)
            # We'll create this in the expense test and try to delete it there
    
    return created_folder_ids

def test_expenses(category_ids, folder_ids):
    """Test Expenses API endpoints"""
    print("\n=== Testing Expenses API ===")
    
    if not category_ids or not folder_ids:
        print("❌ Cannot test expenses without categories and folders")
        return []
    
    category_id = category_ids[0]
    folder_id = folder_ids[0]
    
    # Test POST /api/expenses/
    expense_data = {
        "title": f"Test Expense {uuid.uuid4().hex[:8]}",
        "amount": 150.75,
        "category_id": category_id,
        "folder_id": folder_id,
        "expense_date": datetime.now().isoformat(),
        "description": "Test expense description",
        "vendor": "Test Vendor",
        "payment_method": "credit_card",
        "status": "pending",
        "tags": ["test", "api"]
    }
    
    response = requests.post(
        f"{BACKEND_URL}/expenses/",
        headers=get_headers(),
        json=expense_data
    )
    
    success = print_test_result("Create Expense", response)
    if success:
        expense_id = response.json()["id"]
        created_expense_ids.append(expense_id)
        print(f"Created expense ID: {expense_id}")
        print(f"Expense number: {response.json()['expense_number']}")
    
    # Create a few more expenses for testing filters and bulk operations
    for i in range(3):
        expense_data = {
            "title": f"Test Expense {i+1} {uuid.uuid4().hex[:6]}",
            "amount": 100 + (i * 50),
            "category_id": category_id,
            "folder_id": folder_id,
            "expense_date": (datetime.now() - timedelta(days=i)).isoformat(),
            "description": f"Test expense description {i+1}",
            "vendor": f"Vendor {i+1}",
            "payment_method": ["cash", "credit_card", "bank_transfer"][i % 3],
            "status": ["pending", "approved", "paid"][i % 3],
            "tags": ["test", f"tag{i+1}"]
        }
        
        response = requests.post(
            f"{BACKEND_URL}/expenses/",
            headers=get_headers(),
            json=expense_data
        )
        
        if response.status_code == 200:
            created_expense_ids.append(response.json()["id"])
    
    # Test GET /api/expenses/
    response = requests.get(
        f"{BACKEND_URL}/expenses/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Expenses", response)
    if success:
        expenses = response.json()
        print(f"Found {len(expenses)} expenses")
    
    # Test GET /api/expenses/ with filters
    # Filter by category
    response = requests.get(
        f"{BACKEND_URL}/expenses/?category_id={category_id}",
        headers=get_headers()
    )
    
    print_test_result("Get Expenses by Category", response)
    
    # Filter by folder
    response = requests.get(
        f"{BACKEND_URL}/expenses/?folder_id={folder_id}",
        headers=get_headers()
    )
    
    print_test_result("Get Expenses by Folder", response)
    
    # Filter by status
    response = requests.get(
        f"{BACKEND_URL}/expenses/?status=pending",
        headers=get_headers()
    )
    
    print_test_result("Get Expenses by Status", response)
    
    # Filter by payment method
    response = requests.get(
        f"{BACKEND_URL}/expenses/?payment_method=credit_card",
        headers=get_headers()
    )
    
    print_test_result("Get Expenses by Payment Method", response)
    
    # Filter by date range
    start_date = (datetime.now() - timedelta(days=7)).isoformat()
    end_date = datetime.now().isoformat()
    
    response = requests.get(
        f"{BACKEND_URL}/expenses/?start_date={start_date}&end_date={end_date}",
        headers=get_headers()
    )
    
    print_test_result("Get Expenses by Date Range", response)
    
    # Search
    response = requests.get(
        f"{BACKEND_URL}/expenses/?search=Test",
        headers=get_headers()
    )
    
    print_test_result("Search Expenses", response)
    
    if created_expense_ids:
        expense_id = created_expense_ids[0]
        
        # Test GET /api/expenses/{id}
        response = requests.get(
            f"{BACKEND_URL}/expenses/{expense_id}",
            headers=get_headers()
        )
        
        print_test_result("Get Expense by ID", response)
        
        # Test PUT /api/expenses/{id}
        update_data = {
            "title": f"Updated Expense {uuid.uuid4().hex[:8]}",
            "amount": 200.50,
            "description": "Updated expense description",
            "status": "approved"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/expenses/{expense_id}",
            headers=get_headers(),
            json=update_data
        )
        
        print_test_result("Update Expense", response)
        
        # Test DELETE /api/expenses/{id}
        # We'll create a new expense for deletion to avoid affecting other tests
        temp_expense_data = {
            "title": f"Temp Expense for Deletion {uuid.uuid4().hex[:8]}",
            "amount": 75.25,
            "category_id": category_id,
            "folder_id": folder_id,
            "expense_date": datetime.now().isoformat(),
            "description": "This expense will be deleted",
            "vendor": "Temp Vendor",
            "payment_method": "cash",
            "status": "pending"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/expenses/",
            headers=get_headers(),
            json=temp_expense_data
        )
        
        if response.status_code == 200:
            temp_expense_id = response.json()["id"]
            
            # Now delete this expense
            response = requests.delete(
                f"{BACKEND_URL}/expenses/{temp_expense_id}",
                headers=get_headers()
            )
            
            print_test_result("Delete Expense", response)
    
    # Test bulk operations
    if len(created_expense_ids) >= 2:
        # Test POST /api/expenses/bulk-update-status
        bulk_ids = created_expense_ids[1:3]  # Use the 2nd and 3rd expenses
        
        response = requests.post(
            f"{BACKEND_URL}/expenses/bulk-update-status?status=approved",
            headers=get_headers(),
            json=bulk_ids
        )
        
        print_test_result("Bulk Update Expense Status", response)
        
        # Create temporary expenses for bulk delete test
        temp_expense_ids = []
        for i in range(2):
            temp_data = {
                "title": f"Temp Expense for Bulk Delete {i} {uuid.uuid4().hex[:6]}",
                "amount": 50.00,
                "category_id": category_id,
                "folder_id": folder_id,
                "expense_date": datetime.now().isoformat(),
                "description": "This expense will be bulk deleted",
                "vendor": "Temp Vendor",
                "payment_method": "cash",
                "status": "pending"
            }
            
            response = requests.post(
                f"{BACKEND_URL}/expenses/",
                headers=get_headers(),
                json=temp_data
            )
            
            if response.status_code == 200:
                temp_expense_ids.append(response.json()["id"])
        
        if temp_expense_ids:
            # Test POST /api/expenses/bulk-delete
            response = requests.post(
                f"{BACKEND_URL}/expenses/bulk-delete",
                headers=get_headers(),
                json=temp_expense_ids
            )
            
            print_test_result("Bulk Delete Expenses", response)
    
    # Test deleting a category that has expenses (should fail)
    if category_id and created_expense_ids:
        response = requests.delete(
            f"{BACKEND_URL}/expense-categories/{category_id}",
            headers=get_headers()
        )
        
        print_test_result("Delete Category with Expenses (should fail)", response, expected_status=400)
    
    # Test deleting a folder that has expenses (should fail)
    if folder_id and created_expense_ids:
        response = requests.delete(
            f"{BACKEND_URL}/expense-folders/{folder_id}",
            headers=get_headers()
        )
        
        print_test_result("Delete Folder with Expenses (should fail)", response, expected_status=400)
    
    return created_expense_ids

def test_expense_statistics():
    """Test Expense Statistics API endpoint"""
    print("\n=== Testing Expense Statistics API ===")
    
    # Test GET /api/expenses/statistics
    response = requests.get(
        f"{BACKEND_URL}/expenses/statistics",
        headers=get_headers()
    )
    
    success = print_test_result("Get Expense Statistics", response)
    if success:
        stats = response.json()
        print("Statistics summary:")
        print(f"- Total expenses: {stats['total_expenses']}")
        print(f"- Total amount: {stats['amounts']['total']}")
        print(f"- By status: {stats['counts']}")
        print(f"- Categories: {len(stats['by_category'])}")
        if 'monthly_trends' in stats:
            print(f"- Monthly trends: {len(stats['monthly_trends'])}")
    
    # Test with filters
    current_year = datetime.now().year
    
    # Filter by year
    response = requests.get(
        f"{BACKEND_URL}/expenses/statistics?year={current_year}",
        headers=get_headers()
    )
    
    print_test_result("Get Expense Statistics by Year", response)
    
    # Filter by quarter
    current_quarter = (datetime.now().month - 1) // 3 + 1
    
    response = requests.get(
        f"{BACKEND_URL}/expenses/statistics?year={current_year}&quarter={current_quarter}",
        headers=get_headers()
    )
    
    print_test_result("Get Expense Statistics by Quarter", response)
    
    # Filter by month
    current_month = datetime.now().month
    
    response = requests.get(
        f"{BACKEND_URL}/expenses/statistics?year={current_year}&month={current_month}",
        headers=get_headers()
    )
    
    print_test_result("Get Expense Statistics by Month", response)
    
    # Filter by category
    if created_category_ids:
        category_id = created_category_ids[0]
        
        response = requests.get(
            f"{BACKEND_URL}/expenses/statistics?category_id={category_id}",
            headers=get_headers()
        )
        
        print_test_result("Get Expense Statistics by Category", response)

def test_clients():
    """Test Clients API endpoints"""
    print("\n=== Testing Clients API ===")
    
    # Test GET /api/clients/ - Get list of clients
    response = requests.get(
        f"{BACKEND_URL}/clients/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Clients List", response)
    if success:
        clients = response.json()
        print(f"Found {len(clients)} clients")
        
        # Check if demo clients exist
        demo_clients = [client for client in clients if client["name"] == "Test Client" or client["name"] == "Công ty ABC"]
        if demo_clients:
            print(f"✅ Demo clients found: {len(demo_clients)}")
            for client in demo_clients:
                print(f"  - {client['name']} ({client['company']})")
        else:
            print("❌ Demo clients not found")
    
    # Test POST /api/clients/ - Create a new client
    client_data = {
        "name": f"Test Client {uuid.uuid4().hex[:8]}",
        "company": "Test Company Ltd.",
        "industry": "Technology",
        "size": "Medium",
        "website": "https://testcompany.com",
        "phone": "+84 123 456 789",
        "contact_name": "John Doe",
        "contact_email": "john.doe@testcompany.com",
        "contact_phone": "+84 987 654 321",
        "notes": "This is a test client created by the API test",
        "address": "123 Test Street, Test City",
        "tags": ["test", "api", "client"]
    }
    
    response = requests.post(
        f"{BACKEND_URL}/clients/",
        headers=get_headers(),
        json=client_data
    )
    
    success = print_test_result("Create Client", response)
    if success:
        client_id = response.json()["id"]
        created_client_ids.append(client_id)
        print(f"Created client ID: {client_id}")
    
    # Test GET /api/clients/{client_id} - Get client details
    if created_client_ids:
        client_id = created_client_ids[0]
        
        response = requests.get(
            f"{BACKEND_URL}/clients/{client_id}",
            headers=get_headers()
        )
        
        success = print_test_result("Get Client Details", response)
        if success:
            client = response.json()
            print(f"Client details: {client['name']} - {client['company']}")
            
            # Verify client data matches what we created
            for key, value in client_data.items():
                if client[key] != value:
                    print(f"❌ Mismatch in {key}: expected {value}, got {client[key]}")
    
    # Test PUT /api/clients/{client_id} - Update client
    if created_client_ids:
        client_id = created_client_ids[0]
        
        update_data = {
            "name": f"Updated Client {uuid.uuid4().hex[:8]}",
            "company": "Updated Company Ltd.",
            "industry": "Software",
            "notes": "This client was updated by the API test"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/clients/{client_id}",
            headers=get_headers(),
            json={**client_data, **update_data}  # Merge original data with updates
        )
        
        success = print_test_result("Update Client", response)
        if success:
            updated_client = response.json()
            print(f"Updated client: {updated_client['name']} - {updated_client['company']}")
            
            # Verify client data was updated
            for key, value in update_data.items():
                if updated_client[key] != value:
                    print(f"❌ Update failed for {key}: expected {value}, got {updated_client[key]}")
    
    # Test DELETE /api/clients/{client_id} - Delete client
    if len(created_client_ids) > 0:
        # Create a temporary client for deletion
        temp_client_data = {
            "name": f"Temp Client for Deletion {uuid.uuid4().hex[:6]}",
            "company": "Temp Company",
            "industry": "Testing"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/clients/",
            headers=get_headers(),
            json=temp_client_data
        )
        
        if response.status_code == 200:
            temp_client_id = response.json()["id"]
            
            # Now delete this client
            response = requests.delete(
                f"{BACKEND_URL}/clients/{temp_client_id}",
                headers=get_headers()
            )
            
            print_test_result("Delete Client", response)
            
            # Verify client was deleted
            response = requests.get(
                f"{BACKEND_URL}/clients/{temp_client_id}",
                headers=get_headers()
            )
            
            print_test_result("Verify Client Deletion", response, expected_status=404)
    
    return created_client_ids

created_project_ids = []

def cleanup():
    """Clean up created test data"""
    print("\n=== Cleaning up test data ===")
    
    # Delete expenses
    for expense_id in created_expense_ids:
        requests.delete(
            f"{BACKEND_URL}/expenses/{expense_id}",
            headers=get_headers()
        )
    
    print(f"Deleted {len(created_expense_ids)} expenses")
    
    # Delete projects
    for project_id in created_project_ids:
        requests.delete(
            f"{BACKEND_URL}/projects/{project_id}",
            headers=get_headers()
        )
    
    print(f"Deleted {len(created_project_ids)} projects")
    
    # Delete categories and folders
    # Note: We can only delete categories and folders that don't have expenses
    # So we need to delete all expenses first
    
    for category_id in created_category_ids:
        requests.delete(
            f"{BACKEND_URL}/expense-categories/{category_id}",
            headers=get_headers()
        )
    
    print(f"Deleted {len(created_category_ids)} categories")
    
    for folder_id in created_folder_ids:
        requests.delete(
            f"{BACKEND_URL}/expense-folders/{folder_id}",
            headers=get_headers()
        )
    
    print(f"Deleted {len(created_folder_ids)} folders")
    
    # Delete clients
    for client_id in created_client_ids:
        requests.delete(
            f"{BACKEND_URL}/clients/{client_id}",
            headers=get_headers()
        )
    
    print(f"Deleted {len(created_client_ids)} clients")

def test_projects(client_ids=None):
    """Test Projects API endpoints"""
    print("\n=== Testing Projects API ===")
    
    global created_project_ids
    
    # Create a client if none provided
    if not client_ids or len(client_ids) == 0:
        client_data = {
            "name": f"Test Client for Projects {uuid.uuid4().hex[:8]}",
            "company": "Test Company Ltd.",
            "industry": "Technology",
            "size": "Medium",
            "website": "https://testcompany.com",
            "phone": "+84 123 456 789",
            "contact_name": "John Doe",
            "contact_email": "john.doe@testcompany.com"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/clients/",
            headers=get_headers(),
            json=client_data
        )
        
        if response.status_code == 200:
            client_id = response.json()["id"]
            created_client_ids.append(client_id)
            print(f"Created client ID for projects: {client_id}")
        else:
            print(f"❌ Failed to create client for projects: {response.status_code} - {response.text}")
            return []
    else:
        client_id = client_ids[0]
    
    created_project_ids = []
    
    # Test POST /api/projects/ - Create a new project
    project_data = {
        "name": f"Test Project {uuid.uuid4().hex[:8]}",
        "client_id": client_id,
        "description": "This is a test project created by the API test",
        "start_date": (datetime.utcnow() - timedelta(days=7)).isoformat(),
        "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        "status": "in_progress",
        "team": [],
        "contract_value": 10000.0,
        "debt": 0.0,
        "manager_ids": [],
        "account_ids": [],
        "content_ids": [],
        "design_ids": [],
        "editor_ids": [],
        "sale_ids": []
    }
    
    response = requests.post(
        f"{BACKEND_URL}/projects/",
        headers=get_headers(),
        json=project_data
    )
    
    success = print_test_result("Create Project", response)
    if success:
        project_id = response.json()["id"]
        created_project_ids.append(project_id)
        print(f"Created project ID: {project_id}")
    
    # Test GET /api/projects/ - Get list of projects
    response = requests.get(
        f"{BACKEND_URL}/projects/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Projects List", response)
    if success:
        projects = response.json()
        print(f"Found {len(projects)} projects")
    
    # Test GET /api/projects/ with filters
    response = requests.get(
        f"{BACKEND_URL}/projects/?status=in_progress&client_id={client_id}",
        headers=get_headers()
    )
    
    success = print_test_result("Get Projects with Filters", response)
    if success:
        filtered_projects = response.json()
        print(f"Found {len(filtered_projects)} projects with filters")
    
    # Test GET /api/projects/client/{client_id} - Get projects by client
    response = requests.get(
        f"{BACKEND_URL}/projects/client/{client_id}",
        headers=get_headers()
    )
    
    success = print_test_result("Get Projects by Client", response)
    if success:
        client_projects = response.json()
        print(f"Found {len(client_projects)} projects for client")
    
    # Test GET /api/projects/statistics - Get project statistics
    response = requests.get(
        f"{BACKEND_URL}/projects/statistics",
        headers=get_headers()
    )
    
    success = print_test_result("Get Project Statistics", response)
    if success:
        stats = response.json()
        print(f"Project statistics: {stats}")
    
    # Test GET /api/projects/{project_id} - Get project details
    if created_project_ids:
        project_id = created_project_ids[0]
        
        response = requests.get(
            f"{BACKEND_URL}/projects/{project_id}",
            headers=get_headers()
        )
        
        success = print_test_result("Get Project Details", response)
        if success:
            project = response.json()
            print(f"Project details: {project['name']} - Status: {project['status']}")
    
    # Test PUT /api/projects/{project_id} - Update project
    if created_project_ids:
        project_id = created_project_ids[0]
        
        update_data = {
            "name": f"Updated Project {uuid.uuid4().hex[:8]}",
            "client_id": client_id,
            "description": "This project was updated by the API test",
            "status": "on_hold",
            "contract_value": 15000.0,
            "debt": 5000.0,
            "start_date": project_data["start_date"],
            "end_date": project_data["end_date"]
        }
        
        response = requests.put(
            f"{BACKEND_URL}/projects/{project_id}",
            headers=get_headers(),
            json=update_data
        )
        
        success = print_test_result("Update Project", response)
        if success:
            updated_project = response.json()
            print(f"Updated project: {updated_project['name']} - Status: {updated_project['status']}")
    
    # Create additional projects for bulk operations
    additional_project_ids = []
    for i in range(2):
        project_data = {
            "name": f"Bulk Test Project {i+1} {uuid.uuid4().hex[:6]}",
            "client_id": client_id,
            "description": f"This is a test project {i+1} for bulk operations",
            "status": "planning"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/projects/",
            headers=get_headers(),
            json=project_data
        )
        
        if response.status_code == 200:
            project_id = response.json()["id"]
            additional_project_ids.append(project_id)
            created_project_ids.append(project_id)
            print(f"Created additional project {i+1} ID: {project_id}")
    
    # Test bulk operations
    if additional_project_ids:
        # Test POST /api/projects/bulk-archive
        response = requests.post(
            f"{BACKEND_URL}/projects/bulk-archive",
            headers=get_headers(),
            json=additional_project_ids
        )
        
        print_test_result("Bulk Archive Projects", response)
        
        # Test POST /api/projects/bulk-restore
        response = requests.post(
            f"{BACKEND_URL}/projects/bulk-restore",
            headers=get_headers(),
            json=additional_project_ids
        )
        
        print_test_result("Bulk Restore Projects", response)
        
        # Test POST /api/projects/bulk-delete
        response = requests.post(
            f"{BACKEND_URL}/projects/bulk-delete",
            headers=get_headers(),
            json=additional_project_ids
        )
        
        print_test_result("Bulk Delete Projects", response)
        
        # Remove deleted project IDs from our tracking list
        for project_id in additional_project_ids:
            if project_id in created_project_ids:
                created_project_ids.remove(project_id)
    
    # Test DELETE /api/projects/{project_id} - Delete project
    if created_project_ids:
        project_id = created_project_ids[0]
        
        response = requests.delete(
            f"{BACKEND_URL}/projects/{project_id}",
            headers=get_headers()
        )
        
        print_test_result("Delete Project", response)
        
        # Verify project was deleted
        response = requests.get(
            f"{BACKEND_URL}/projects/{project_id}",
            headers=get_headers()
        )
        
        print_test_result("Verify Project Deletion", response, expected_status=404)
        
        # Remove deleted project ID from our tracking list
        created_project_ids.remove(project_id)
    
    return created_project_ids

def main():
    """Main test function"""
    print("=== Starting API Tests ===")
    
    # Get authentication token
    if not get_token():
        print("Failed to authenticate. Exiting tests.")
        return
    
    # Run tests
    category_ids = test_expense_categories()
    folder_ids = test_expense_folders()
    expense_ids = test_expenses(category_ids, folder_ids)
    test_expense_statistics()
    client_ids = test_clients()
    project_ids = test_projects(client_ids)
    
    # Clean up
    cleanup()
    
    print("\n=== All tests completed ===")

def test_projects_api():
    """Test projects API"""
    print("\n=== Testing Projects API ===")
    
    # Get projects list
    response = requests.get(
        f"{BACKEND_URL}/projects/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Projects List", response)
    if success:
        projects = response.json()
        print(f"Found {len(projects)} projects")
    
    return success

def test_campaigns_api():
    """Test campaigns API"""
    print("\n=== Testing Campaigns API ===")
    
    # Get campaigns list
    response = requests.get(
        f"{BACKEND_URL}/campaigns/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Campaigns List", response)
    if success:
        campaigns = response.json()
        print(f"Found {len(campaigns)} campaigns")
    
    return success

def test_templates_api():
    """Test templates API"""
    print("\n=== Testing Templates API ===")
    
    # Get templates list
    response = requests.get(
        f"{BACKEND_URL}/templates/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Templates List", response)
    if success:
        templates = response.json()
        print(f"Found {len(templates)} templates")
    
    return success

def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check Endpoint ===")
    
    response = requests.get(f"{BACKEND_URL}/health")
    
    success = print_test_result("Health Check", response)
    if success:
        data = response.json()
        print(f"Health status: {data['status']}")
        print(f"Timestamp: {data['timestamp']}")
    
    return success

def test_setup_system():
    """Test setup system endpoint"""
    print("\n=== Testing Setup System Endpoint ===")
    
    response = requests.post(f"{BACKEND_URL}/setup")
    
    success = print_test_result("Setup System", response)
    if success:
        data = response.json()
        print(f"Setup response: {data}")
    
    return success

def test_authentication():
    """Test authentication system with token endpoint"""
    print("\n=== Testing Authentication System ===")
    
    # Test with valid credentials
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": EMAIL, "password": PASSWORD}
    )
    
    success = print_test_result("Authentication with Valid Credentials", response)
    if success:
        data = response.json()
        print(f"Token type: {data['token_type']}")
        print(f"Access token received: {data['access_token'][:10]}...")
    
    # Test with invalid credentials
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": "invalid@example.com", "password": "wrongpassword"}
    )
    
    print_test_result("Authentication with Invalid Credentials", response, expected_status=401)
    
    return success

def test_user_info():
    """Test user info retrieval"""
    print("\n=== Testing User Info Retrieval ===")
    
    response = requests.get(
        f"{BACKEND_URL}/users/me/",
        headers=get_headers()
    )
    
    success = print_test_result("Get User Info", response)
    if success:
        user = response.json()
        print(f"User info: {user['email']} - {user['full_name']}")
    
    return success

def create_test_user():
    """Create a test user account"""
    print("\n=== Creating Test User Account ===")
    
    # Generate a unique email
    test_email = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
    
    user_data = {
        "email": test_email,
        "password": "TestPassword123!",
        "full_name": "Test User",
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/users/",
        headers=get_headers(),
        json=user_data
    )
    
    success = print_test_result("Create Test User", response)
    if success:
        user = response.json()
        print(f"Created test user: {user['email']}")
        
        # Test login with new user
        login_response = requests.post(
            f"{BACKEND_URL}/token",
            data={"username": test_email, "password": "TestPassword123!"}
        )
        
        login_success = print_test_result("Login with Test User", login_response)
        if login_success:
            print("✅ Test user login successful")
        
        # Clean up - delete test user
        delete_response = requests.delete(
            f"{BACKEND_URL}/users/{user['id']}",
            headers=get_headers()
        )
        
        print_test_result("Delete Test User", delete_response)
    
    return success

def test_invoices():
    """Test Invoices API endpoints"""
    print("\n=== Testing Invoices API ===")
    
    # Test GET /api/invoices/ - Get list of invoices
    response = requests.get(
        f"{BACKEND_URL}/invoices/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Invoices List", response)
    if success:
        invoices = response.json()
        print(f"Found {len(invoices)} invoices")
    
    # Test GET /api/invoices/statistics - Get invoice statistics
    response = requests.get(
        f"{BACKEND_URL}/invoices/statistics",
        headers=get_headers()
    )
    
    success = print_test_result("Get Invoice Statistics", response)
    if success:
        stats = response.json()
        print(f"Invoice statistics: {stats}")
    
    # Get a single invoice for detailed testing
    if success and len(invoices) > 0:
        invoice_id = invoices[0]["id"]
        
        # Test GET /api/invoices/{invoice_id} - Get invoice details
        response = requests.get(
            f"{BACKEND_URL}/invoices/{invoice_id}",
            headers=get_headers()
        )
        
        success = print_test_result("Get Invoice Details", response)
        if success:
            invoice = response.json()
            print(f"Invoice details: {invoice['invoice_number']} - Amount: {invoice['amount']}")
    
    return success

def test_contracts():
    """Test Contracts API endpoints"""
    print("\n=== Testing Contracts API ===")
    
    # Test GET /api/contracts/ - Get list of contracts
    response = requests.get(
        f"{BACKEND_URL}/contracts/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Contracts List", response)
    if success:
        contracts = response.json()
        print(f"Found {len(contracts)} contracts")
    
    # Get a single contract for detailed testing
    if success and len(contracts) > 0:
        contract_id = contracts[0]["id"]
        
        # Test GET /api/contracts/{contract_id} - Get contract details
        response = requests.get(
            f"{BACKEND_URL}/contracts/{contract_id}",
            headers=get_headers()
        )
        
        success = print_test_result("Get Contract Details", response)
        if success:
            contract = response.json()
            print(f"Contract details: {contract['title']} - Value: {contract.get('value', 'N/A')}")
    
    return success

def test_documents():
    """Test Documents API endpoints"""
    print("\n=== Testing Documents API ===")
    
    # Test GET /api/document-folders/ - Get list of document folders
    response = requests.get(
        f"{BACKEND_URL}/document-folders/",
        headers=get_headers()
    )
    
    folders_success = print_test_result("Get Document Folders", response)
    if folders_success:
        folders = response.json()
        print(f"Found {len(folders)} document folders")
    
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
            print(f"Document details: {document['title']} - Type: {document.get('document_type', 'N/A')}")
    
    return folders_success and docs_success

def test_dashboard():
    """Test Dashboard API endpoints"""
    print("\n=== Testing Dashboard API ===")
    
    # Test GET /api/dashboard/statistics - Get dashboard statistics
    response = requests.get(
        f"{BACKEND_URL}/dashboard/statistics",
        headers=get_headers()
    )
    
    success = print_test_result("Get Dashboard Statistics", response)
    if success:
        stats = response.json()
        print("Dashboard statistics:")
        for key, value in stats.items():
            if isinstance(value, dict):
                print(f"- {key}: {len(value)} items")
            else:
                print(f"- {key}: {value}")
    
    return success

def test_services():
    """Test Services API endpoints"""
    print("\n=== Testing Services API ===")
    
    # First get campaigns to find a campaign ID
    response = requests.get(
        f"{BACKEND_URL}/campaigns/",
        headers=get_headers()
    )
    
    if response.status_code == 200:
        campaigns = response.json()
        if len(campaigns) > 0:
            campaign_id = campaigns[0]["id"]
            
            # Test GET /api/campaigns/{campaign_id}/services/ - Get services for a campaign
            response = requests.get(
                f"{BACKEND_URL}/campaigns/{campaign_id}/services/",
                headers=get_headers()
            )
            
            success = print_test_result("Get Campaign Services", response)
            if success:
                services = response.json()
                print(f"Found {len(services)} services for campaign {campaign_id}")
                
                # If services exist, test getting tasks for a service
                if len(services) > 0:
                    service_id = services[0]["id"]
                    
                    # Test GET /api/services/{service_id}/tasks/ - Get tasks for a service
                    response = requests.get(
                        f"{BACKEND_URL}/services/{service_id}/tasks/",
                        headers=get_headers()
                    )
                    
                    success = print_test_result("Get Service Tasks", response)
                    if success:
                        tasks = response.json()
                        print(f"Found {len(tasks)} tasks for service {service_id}")
        else:
            print("❌ No campaigns found to test services")
            return False
    else:
        print(f"❌ Failed to get campaigns: {response.status_code} - {response.text}")
        return False
    
    return success

def test_work_items():
    """Test Work Items API endpoints"""
    print("\n=== Testing Work Items API ===")
    
    # First get projects to find a project ID
    response = requests.get(
        f"{BACKEND_URL}/projects/",
        headers=get_headers()
    )
    
    if response.status_code == 200:
        projects = response.json()
        if len(projects) > 0:
            project_id = projects[0]["id"]
            
            # Test GET /api/projects/{project_id}/work-items/ - Get work items for a project
            response = requests.get(
                f"{BACKEND_URL}/projects/{project_id}/work-items/",
                headers=get_headers()
            )
            
            success = print_test_result("Get Project Work Items", response)
            if success:
                work_items = response.json()
                print(f"Found {len(work_items)} work items for project {project_id}")
                
                # If work items exist, test getting a specific work item
                if len(work_items) > 0:
                    work_item_id = work_items[0]["id"]
                    
                    # Test GET /api/work-items/{work_item_id} - Get work item details
                    response = requests.get(
                        f"{BACKEND_URL}/work-items/{work_item_id}",
                        headers=get_headers()
                    )
                    
                    success = print_test_result("Get Work Item Details", response)
                    if success:
                        work_item = response.json()
                        print(f"Work item details: {work_item['name']} - Status: {work_item['status']}")
        else:
            print("❌ No projects found to test work items")
            return False
    else:
        print(f"❌ Failed to get projects: {response.status_code} - {response.text}")
        return False
    
    return success

def test_users():
    """Test Users API endpoints"""
    print("\n=== Testing Users API ===")
    
    # Test GET /api/users/ - Get list of users
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Users List", response)
    if success:
        users = response.json()
        print(f"Found {len(users)} users")
    
    # Test GET /api/users/by-role/{role} - Get users by role
    roles = ["manager", "account", "content", "design", "editor", "sale"]
    role_results = {}
    
    for role in roles:
        response = requests.get(
            f"{BACKEND_URL}/users/by-role/{role}",
            headers=get_headers()
        )
        
        role_success = print_test_result(f"Get Users by Role: {role}", response)
        role_results[role] = role_success
        
        if role_success:
            role_users = response.json()
            print(f"Found {len(role_users)} users with role '{role}'")
    
    # Test invalid role
    response = requests.get(
        f"{BACKEND_URL}/users/by-role/invalid_role",
        headers=get_headers()
    )
    
    print_test_result("Get Users by Invalid Role", response, expected_status=400)
    
    return success and all(role_results.values())

def test_internal_tasks():
    """Test Internal Tasks API endpoints"""
    print("\n=== Testing Internal Tasks API ===")
    
    # First, get a user ID to assign tasks to
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    if response.status_code != 200 or len(response.json()) == 0:
        print("❌ Failed to get users or no users found")
        return False
    
    # Use the first user as the assignee
    users = response.json()
    assigned_to = users[0]["id"]
    
    # 1. Test POST /api/internal-tasks/ - Create a new task
    task_data = {
        "name": f"Test Internal Task {uuid.uuid4().hex[:8]}",
        "description": "This is a test internal task created by the API test",
        "document_links": ["https://example.com/doc1", "https://example.com/doc2"],
        "assigned_to": assigned_to,
        "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "priority": "normal",
        "status": "not_started"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/internal-tasks/",
        headers=get_headers(),
        json=task_data
    )
    
    success = print_test_result("Create Internal Task", response)
    if success:
        task_id = response.json()["id"]
        created_internal_task_ids.append(task_id)
        print(f"Created internal task ID: {task_id}")
        print(f"Task details: {response.json()}")
        
        # Create a second task with high priority
        high_priority_task = {
            "name": f"High Priority Task {uuid.uuid4().hex[:8]}",
            "description": "This is a high priority task",
            "document_links": ["https://example.com/important-doc"],
            "assigned_to": assigned_to,
            "deadline": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "priority": "high",
            "status": "not_started"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/internal-tasks/",
            headers=get_headers(),
            json=high_priority_task
        )
        
        if response.status_code == 200:
            high_priority_task_id = response.json()["id"]
            created_internal_task_ids.append(high_priority_task_id)
            print(f"Created high priority task ID: {high_priority_task_id}")
            
        # Create a third task with low priority
        low_priority_task = {
            "name": f"Low Priority Task {uuid.uuid4().hex[:8]}",
            "description": "This is a low priority task",
            "document_links": ["https://example.com/low-priority-doc"],
            "assigned_to": assigned_to,
            "deadline": (datetime.utcnow() + timedelta(days=10)).isoformat(),
            "priority": "low",
            "status": "not_started"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/internal-tasks/",
            headers=get_headers(),
            json=low_priority_task
        )
        
        if response.status_code == 200:
            low_priority_task_id = response.json()["id"]
            created_internal_task_ids.append(low_priority_task_id)
            print(f"Created low priority task ID: {low_priority_task_id}")
    
    # 2. Test GET /api/internal-tasks/ - Get list of tasks
    response = requests.get(
        f"{BACKEND_URL}/internal-tasks/",
        headers=get_headers()
    )
    
    success = print_test_result("Get Internal Tasks List", response)
    if success:
        tasks = response.json()
        print(f"Found {len(tasks)} internal tasks")
        
        # Verify enriched fields (user names)
        for task in tasks:
            if "assigned_to_name" not in task or not task["assigned_to_name"]:
                print("❌ Missing enriched field: assigned_to_name")
            if "assigned_by_name" not in task or not task["assigned_by_name"]:
                print("❌ Missing enriched field: assigned_by_name")
    
    # 3. Test GET /api/internal-tasks/ with filters
    # Filter by status
    response = requests.get(
        f"{BACKEND_URL}/internal-tasks/?status=not_started",
        headers=get_headers()
    )
    
    status_filter_success = print_test_result("Get Internal Tasks by Status", response)
    if status_filter_success:
        tasks = response.json()
        for task in tasks:
            if task["status"] != "not_started":
                print(f"❌ Task with incorrect status found: {task['status']}")
    
    # Filter by priority
    response = requests.get(
        f"{BACKEND_URL}/internal-tasks/?priority=high",
        headers=get_headers()
    )
    
    priority_filter_success = print_test_result("Get Internal Tasks by Priority", response)
    if priority_filter_success:
        tasks = response.json()
        for task in tasks:
            if task["priority"] != "high":
                print(f"❌ Task with incorrect priority found: {task['priority']}")
    
    # Filter by assigned_to
    response = requests.get(
        f"{BACKEND_URL}/internal-tasks/?assigned_to={assigned_to}",
        headers=get_headers()
    )
    
    print_test_result("Get Internal Tasks by Assignee", response)
    
    # Search filter
    response = requests.get(
        f"{BACKEND_URL}/internal-tasks/?search=Test",
        headers=get_headers()
    )
    
    print_test_result("Search Internal Tasks", response)
    
    # Date range filter
    start_date = (datetime.utcnow() - timedelta(days=1)).isoformat()
    end_date = (datetime.utcnow() + timedelta(days=14)).isoformat()
    
    response = requests.get(
        f"{BACKEND_URL}/internal-tasks/?start_date={start_date}&end_date={end_date}",
        headers=get_headers()
    )
    
    print_test_result("Get Internal Tasks by Date Range", response)
    
    # 4. Test GET /api/internal-tasks/statistics - Get task statistics
    response = requests.get(
        f"{BACKEND_URL}/internal-tasks/statistics",
        headers=get_headers()
    )
    
    stats_success = print_test_result("Get Internal Tasks Statistics", response)
    if stats_success:
        stats = response.json()
        print("Internal Tasks Statistics:")
        print(f"- Total tasks: {stats['total_tasks']}")
        print(f"- Not started: {stats['not_started']}")
        print(f"- In progress: {stats['in_progress']}")
        print(f"- Completed: {stats['completed']}")
        print(f"- High priority: {stats['high_priority']}")
        print(f"- Normal priority: {stats['normal_priority']}")
        print(f"- Low priority: {stats['low_priority']}")
        
        # Verify statistics calculation
        if stats['total_tasks'] != stats['not_started'] + stats['in_progress'] + stats['completed']:
            print("❌ Statistics calculation error: total_tasks != sum of status counts")
        if stats['total_tasks'] != stats['high_priority'] + stats['normal_priority'] + stats['low_priority']:
            print("❌ Statistics calculation error: total_tasks != sum of priority counts")
    
    # 5. Test GET /api/internal-tasks/{task_id} - Get task details
    if created_internal_task_ids:
        task_id = created_internal_task_ids[0]
        
        response = requests.get(
            f"{BACKEND_URL}/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        success = print_test_result("Get Internal Task Details", response)
        if success:
            task = response.json()
            print(f"Task details: {task['name']} - Status: {task['status']}")
            
            # Verify all fields are present
            required_fields = ["id", "name", "description", "document_links", "assigned_to", 
                              "assigned_by", "deadline", "priority", "status", "created_at", 
                              "updated_at", "assigned_to_name", "assigned_by_name"]
            
            for field in required_fields:
                if field not in task:
                    print(f"❌ Missing field in task details: {field}")
    
    # 6. Test PUT /api/internal-tasks/{task_id} - Update task
    if created_internal_task_ids:
        task_id = created_internal_task_ids[0]
        
        update_data = {
            "name": f"Updated Task {uuid.uuid4().hex[:8]}",
            "description": "This task was updated by the API test",
            "priority": "high",
            "document_links": ["https://example.com/updated-doc1", "https://example.com/updated-doc2"]
        }
        
        response = requests.put(
            f"{BACKEND_URL}/internal-tasks/{task_id}",
            headers=get_headers(),
            json=update_data
        )
        
        success = print_test_result("Update Internal Task", response)
        if success:
            updated_task = response.json()
            print(f"Updated task: {updated_task['name']} - Priority: {updated_task['priority']}")
            
            # Verify update was applied correctly
            for key, value in update_data.items():
                if updated_task[key] != value:
                    print(f"❌ Update failed for {key}: expected {value}, got {updated_task[key]}")
    
    # 7. Test PATCH /api/internal-tasks/{task_id}/status - Update task status
    if created_internal_task_ids:
        task_id = created_internal_task_ids[0]
        
        # Test workflow: not_started -> in_progress
        status_data = {
            "status": "in_progress"
        }
        
        response = requests.patch(
            f"{BACKEND_URL}/internal-tasks/{task_id}/status",
            headers=get_headers(),
            json=status_data
        )
        
        in_progress_success = print_test_result("Update Task Status to In Progress", response)
        if in_progress_success:
            # Verify status was updated
            response = requests.get(
                f"{BACKEND_URL}/internal-tasks/{task_id}",
                headers=get_headers()
            )
            
            if response.status_code == 200:
                task = response.json()
                if task["status"] != "in_progress":
                    print(f"❌ Status update failed: expected 'in_progress', got '{task['status']}'")
        
        # Test workflow: in_progress -> completed (with report_link)
        status_data = {
            "status": "completed",
            "report_link": "https://example.com/task-report"
        }
        
        response = requests.patch(
            f"{BACKEND_URL}/internal-tasks/{task_id}/status",
            headers=get_headers(),
            json=status_data
        )
        
        completed_success = print_test_result("Update Task Status to Completed", response)
        if completed_success:
            # Verify status was updated and report_link was saved
            response = requests.get(
                f"{BACKEND_URL}/internal-tasks/{task_id}",
                headers=get_headers()
            )
            
            if response.status_code == 200:
                task = response.json()
                if task["status"] != "completed":
                    print(f"❌ Status update failed: expected 'completed', got '{task['status']}'")
                if task["report_link"] != "https://example.com/task-report":
                    print(f"❌ Report link update failed: expected 'https://example.com/task-report', got '{task.get('report_link')}'")
        
        # Test invalid status update (should fail without report_link)
        if len(created_internal_task_ids) > 1:
            # Use the second task for this test
            task_id = created_internal_task_ids[1]
            
            # First set it to in_progress
            requests.patch(
                f"{BACKEND_URL}/internal-tasks/{task_id}/status",
                headers=get_headers(),
                json={"status": "in_progress"}
            )
            
            # Then try to complete without report_link
            status_data = {
                "status": "completed"
            }
            
            response = requests.patch(
                f"{BACKEND_URL}/internal-tasks/{task_id}/status",
                headers=get_headers(),
                json=status_data
            )
            
            print_test_result("Update Task Status to Completed without Report Link (should fail)", response, expected_status=400)
    
    # 8. Test POST /api/internal-tasks/{task_id}/feedback/ - Create feedback
    if created_internal_task_ids:
        task_id = created_internal_task_ids[0]
        
        feedback_data = {
            "message": f"Test feedback for task {task_id}"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/internal-tasks/{task_id}/feedback/",
            headers=get_headers(),
            json=feedback_data
        )
        
        success = print_test_result("Create Task Feedback", response)
        if success:
            feedback = response.json()
            print(f"Created feedback: {feedback['message']}")
            
            # Create a second feedback
            feedback_data = {
                "message": f"Second feedback for task {task_id}"
            }
            
            response = requests.post(
                f"{BACKEND_URL}/internal-tasks/{task_id}/feedback/",
                headers=get_headers(),
                json=feedback_data
            )
            
            print_test_result("Create Second Task Feedback", response)
    
    # 9. Test GET /api/internal-tasks/{task_id}/feedback/ - Get feedback
    if created_internal_task_ids:
        task_id = created_internal_task_ids[0]
        
        response = requests.get(
            f"{BACKEND_URL}/internal-tasks/{task_id}/feedback/",
            headers=get_headers()
        )
        
        success = print_test_result("Get Task Feedback", response)
        if success:
            feedbacks = response.json()
            print(f"Found {len(feedbacks)} feedback items for task {task_id}")
            
            # Verify feedback fields
            for feedback in feedbacks:
                required_fields = ["id", "task_id", "user_id", "message", "created_at", "user_name"]
                for field in required_fields:
                    if field not in feedback:
                        print(f"❌ Missing field in feedback: {field}")
    
    # 10. Test DELETE /api/internal-tasks/{task_id} - Delete task
    if len(created_internal_task_ids) > 2:
        # Delete the third task
        task_id = created_internal_task_ids[2]
        
        response = requests.delete(
            f"{BACKEND_URL}/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        success = print_test_result("Delete Internal Task", response)
        if success:
            # Verify task was deleted
            response = requests.get(
                f"{BACKEND_URL}/internal-tasks/{task_id}",
                headers=get_headers()
            )
            
            print_test_result("Verify Task Deletion", response, expected_status=404)
            
            if task_id in created_internal_task_ids:
                created_internal_task_ids.remove(task_id)
                print(f"Deleted task ID: {task_id}")
    
    # 11. Test POST /api/internal-tasks/bulk-delete - Bulk delete tasks
    # Create temporary tasks for bulk delete
    temp_task_ids = []
    for i in range(2):
        temp_task = {
            "name": f"Temp Task for Bulk Delete {i} {uuid.uuid4().hex[:6]}",
            "description": "This task will be bulk deleted",
            "assigned_to": assigned_to,
            "deadline": (datetime.utcnow() + timedelta(days=5)).isoformat(),
            "priority": "low",
            "status": "not_started"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/internal-tasks/",
            headers=get_headers(),
            json=temp_task
        )
        
        if response.status_code == 200:
            temp_task_ids.append(response.json()["id"])
    
    if temp_task_ids:
        response = requests.post(
            f"{BACKEND_URL}/internal-tasks/bulk-delete",
            headers=get_headers(),
            json=temp_task_ids
        )
        
        bulk_delete_success = print_test_result("Bulk Delete Internal Tasks", response)
        if bulk_delete_success:
            # Verify tasks were deleted
            for temp_id in temp_task_ids:
                response = requests.get(
                    f"{BACKEND_URL}/internal-tasks/{temp_id}",
                    headers=get_headers()
                )
                
                if response.status_code != 404:
                    print(f"❌ Bulk delete failed for task ID: {temp_id}")
    
    print("\n=== Internal Tasks API Testing Summary ===")
    print(f"Created {len(created_internal_task_ids)} tasks for testing")
    print(f"Tested all required endpoints for Internal Task Management")
    print(f"Verified data validation, status transitions, and enriched fields")
    
    return created_internal_task_ids

def cleanup_internal_tasks():
    """Clean up created internal tasks"""
    print("\n=== Cleaning up internal tasks ===")
    
    for task_id in created_internal_task_ids:
        response = requests.delete(
            f"{BACKEND_URL}/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            print(f"Deleted internal task ID: {task_id}")
        else:
            print(f"Failed to delete internal task ID: {task_id}")
    
    print(f"Attempted to delete {len(created_internal_task_ids)} internal tasks")

def main_auth_test():
    """Main test function for authentication and basic APIs"""
    print("=== Starting CRM Backend Tests ===")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Test health check endpoint
    health_check_success = test_health_check()
    
    # Test setup system endpoint
    setup_success = test_setup_system()
    
    # Test authentication system
    auth_success = test_authentication()
    
    # If authentication successful, test other endpoints
    if auth_success:
        # Test user info retrieval
        user_info_success = test_user_info()
        
        # Test users API
        users_success = test_users()
        
        # Test main APIs
        projects_success = test_projects_api()
        campaigns_success = test_campaigns_api()
        clients_success = test_clients()
        templates_success = test_templates_api()
        
        # Test expense management
        expense_categories_success = test_expense_categories()
        expense_folders_success = test_expense_folders()
        expenses_success = test_expenses(expense_categories_success, expense_folders_success)
        expense_statistics_success = test_expense_statistics()
        
        # Test financial management
        invoices_success = test_invoices()
        contracts_success = test_contracts()
        
        # Test document management
        documents_success = test_documents()
        
        # Test services and work items
        services_success = test_services()
        work_items_success = test_work_items()
        
        # Test dashboard
        dashboard_success = test_dashboard()
        
        # Test internal tasks
        internal_tasks_success = test_internal_tasks()
        
        # Create and test a new user account
        create_user_success = create_test_user()
        
        # Clean up internal tasks
        cleanup_internal_tasks()
        
        # Print summary
        print("\n=== Test Summary ===")
        print(f"Health Check: {'✅' if health_check_success else '❌'}")
        print(f"Setup System: {'✅' if setup_success else '❌'}")
        print(f"Authentication: {'✅' if auth_success else '❌'}")
        print(f"User Info: {'✅' if user_info_success else '❌'}")
        print(f"Users API: {'✅' if users_success else '❌'}")
        print(f"Projects API: {'✅' if projects_success else '❌'}")
        print(f"Campaigns API: {'✅' if campaigns_success else '❌'}")
        print(f"Clients API: {'✅' if clients_success else '❌'}")
        print(f"Templates API: {'✅' if templates_success else '❌'}")
        print(f"Expense Categories: {'✅' if expense_categories_success else '❌'}")
        print(f"Expense Folders: {'✅' if expense_folders_success else '❌'}")
        print(f"Expenses: {'✅' if expenses_success else '❌'}")
        print(f"Expense Statistics: {'✅' if expense_statistics_success else '❌'}")
        print(f"Invoices: {'✅' if invoices_success else '❌'}")
        print(f"Contracts: {'✅' if contracts_success else '❌'}")
        print(f"Documents: {'✅' if documents_success else '❌'}")
        print(f"Services: {'✅' if services_success else '❌'}")
        print(f"Work Items: {'✅' if work_items_success else '❌'}")
        print(f"Dashboard: {'✅' if dashboard_success else '❌'}")
        print(f"Internal Tasks: {'✅' if internal_tasks_success else '❌'}")
        print(f"Create Test User: {'✅' if create_user_success else '❌'}")
    else:
        print("\n❌ Authentication failed. Skipping other tests.")
        
    print("\n=== All tests completed ===")

if __name__ == "__main__":
    print("=== Starting Internal Task Management API Tests ===")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Get authentication token
    if not get_token():
        print("Failed to authenticate. Exiting tests.")
    else:
        # Test internal tasks
        internal_tasks_ids = test_internal_tasks()
        
        # Clean up internal tasks
        cleanup_internal_tasks()
        
        print("\n=== All tests completed ===")
