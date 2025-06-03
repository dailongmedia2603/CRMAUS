import requests
import json
from datetime import datetime, timedelta
import time
import uuid

# Backend URL
BACKEND_URL = "https://ff669921-0348-4c5c-8297-32b5df32c0fc.preview.emergentagent.com/api"

# Test user credentials
EMAIL = "admin@example.com"
PASSWORD = "admin123"

# Global variables
token = None
created_category_ids = []
created_folder_ids = []
created_expense_ids = []

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
        
        bulk_update_data = {
            "expense_ids": bulk_ids,
            "status": "approved"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/expenses/bulk-update-status",
            headers=get_headers(),
            json=bulk_update_data
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
            bulk_delete_data = {
                "expense_ids": temp_expense_ids
            }
            
            response = requests.post(
                f"{BACKEND_URL}/expenses/bulk-delete",
                headers=get_headers(),
                json=bulk_delete_data
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

def main():
    """Main test function"""
    print("=== Starting Expense Management System API Tests ===")
    
    # Get authentication token
    if not get_token():
        print("Failed to authenticate. Exiting tests.")
        return
    
    # Run tests
    category_ids = test_expense_categories()
    folder_ids = test_expense_folders()
    expense_ids = test_expenses(category_ids, folder_ids)
    test_expense_statistics()
    
    # Clean up
    cleanup()
    
    print("\n=== All tests completed ===")

if __name__ == "__main__":
    main()
