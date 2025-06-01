import requests
import json
import time
from datetime import datetime

# Base URL for API
BASE_URL = "https://ff669921-0348-4c5c-8297-32b5df32c0fc.preview.emergentagent.com"
API_PREFIX = "/api"

# Admin credentials
admin_credentials = {
    "username": "admin@example.com",
    "password": "admin123"
}

# Test results
test_results = {
    "success": 0,
    "failure": 0,
    "tests": []
}

def log_test(name, success, message, response=None):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    test_results["tests"].append({
        "name": name,
        "success": success,
        "message": message,
        "response": response.json() if response and hasattr(response, 'json') else None,
        "status_code": response.status_code if response else None
    })
    
    if success:
        test_results["success"] += 1
    else:
        test_results["failure"] += 1
    
    print(f"{status} - {name}: {message}")

def get_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}{API_PREFIX}/token", data=admin_credentials)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Failed to get token: {response.text}")
        return None

def test_campaign_services():
    """Test campaign services functionality"""
    token = get_token()
    if not token:
        log_test("Authentication", False, "Failed to get authentication token")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Get list of campaigns to obtain a campaign_id
    print("\n1. Getting list of campaigns...")
    response = requests.get(f"{BASE_URL}/campaigns/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Campaigns", False, f"Failed to get campaigns: {response.text}", response)
        return
    
    campaigns = response.json()
    log_test("Get Campaigns", True, f"Successfully retrieved {len(campaigns)} campaigns", response)
    
    # If no campaigns exist, create one
    if len(campaigns) == 0:
        print("No campaigns found. Creating a new campaign...")
        campaign_data = {
            "name": "Test Campaign",
            "description": "Campaign for testing services"
        }
        response = requests.post(f"{BASE_URL}/campaigns/", headers=headers, json=campaign_data)
        
        if response.status_code != 200:
            log_test("Create Campaign", False, f"Failed to create campaign: {response.text}", response)
            return
        
        campaign = response.json()
        campaign_id = campaign["id"]
        log_test("Create Campaign", True, f"Successfully created campaign with ID: {campaign_id}", response)
    else:
        # Use the first campaign
        campaign_id = campaigns[0]["id"]
        print(f"Using existing campaign with ID: {campaign_id}")
    
    # Step 2: Create a new service
    print("\n2. Creating a new service - Facebook Ads...")
    service_data = {
        "name": "Facebook Ads",
        "sort_order": 1,
        "description": "Dịch vụ quảng cáo Facebook"
    }
    
    response = requests.post(
        f"{BASE_URL}/campaigns/{campaign_id}/services/", 
        headers=headers, 
        json=service_data
    )
    
    if response.status_code != 200:
        log_test("Create Service", False, f"Failed to create service: {response.text}", response)
        return
    
    service = response.json()
    service_id = service["id"]
    log_test("Create Service", True, f"Successfully created Facebook Ads service with ID: {service_id}", response)
    
    # Step 3: Create another service - Google Ads
    print("\n3. Creating another service - Google Ads...")
    service_data = {
        "name": "Google Ads",
        "sort_order": 2,
        "description": "Dịch vụ quảng cáo Google"
    }
    
    response = requests.post(
        f"{BASE_URL}/campaigns/{campaign_id}/services/", 
        headers=headers, 
        json=service_data
    )
    
    if response.status_code != 200:
        log_test("Create Second Service", False, f"Failed to create Google Ads service: {response.text}", response)
    else:
        second_service = response.json()
        second_service_id = second_service["id"]
        log_test("Create Second Service", True, f"Successfully created Google Ads service with ID: {second_service_id}", response)
    
    # Step 4: Create a third service - Content Marketing
    print("\n4. Creating a third service - Content Marketing...")
    service_data = {
        "name": "Content Marketing",
        "sort_order": 3,
        "description": "Dịch vụ Content Marketing"
    }
    
    response = requests.post(
        f"{BASE_URL}/campaigns/{campaign_id}/services/", 
        headers=headers, 
        json=service_data
    )
    
    if response.status_code != 200:
        log_test("Create Third Service", False, f"Failed to create Content Marketing service: {response.text}", response)
    else:
        third_service = response.json()
        third_service_id = third_service["id"]
        log_test("Create Third Service", True, f"Successfully created Content Marketing service with ID: {third_service_id}", response)
    
    # Step 5: Get list of services for the campaign
    print("\n5. Getting list of services for the campaign...")
    response = requests.get(f"{BASE_URL}/campaigns/{campaign_id}/services/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Services", False, f"Failed to get services: {response.text}", response)
    else:
        services = response.json()
        log_test("Get Services", True, f"Successfully retrieved {len(services)} services", response)
        
        # Print the services
        print("\nServices for campaign:")
        for idx, svc in enumerate(services, 1):
            print(f"{idx}. {svc['name']} (sort_order: {svc['sort_order']}) - {svc['description']}")
    
    # Step 6: Update a service
    if 'service_id' in locals():
        print("\n6. Updating the Facebook Ads service...")
        update_data = {
            "name": "Facebook Ads Premium",
            "description": "Dịch vụ quảng cáo Facebook cao cấp",
            "sort_order": 0  # Move to top
        }
        
        response = requests.put(
            f"{BASE_URL}/services/{service_id}", 
            headers=headers, 
            json=update_data
        )
        
        if response.status_code != 200:
            log_test("Update Service", False, f"Failed to update service: {response.text}", response)
        else:
            updated_service = response.json()
            log_test("Update Service", True, f"Successfully updated service: {updated_service['name']}", response)
        
        # Get services again to verify the update
        response = requests.get(f"{BASE_URL}/campaigns/{campaign_id}/services/", headers=headers)
        if response.status_code == 200:
            services = response.json()
            print("\nUpdated services for campaign:")
            for idx, svc in enumerate(services, 1):
                print(f"{idx}. {svc['name']} (sort_order: {svc['sort_order']}) - {svc['description']}")
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {test_results['success'] + test_results['failure']}")
    print(f"Passed: {test_results['success']}")
    print(f"Failed: {test_results['failure']}")
    
    if test_results['failure'] == 0:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. Check the logs above for details.")

def test_task_creation():
    """Test task creation functionality"""
    token = get_token()
    if not token:
        log_test("Authentication", False, "Failed to get authentication token")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Get list of campaigns to obtain a campaign_id
    print("\n1. Getting list of campaigns...")
    response = requests.get(f"{BASE_URL}/campaigns/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Campaigns", False, f"Failed to get campaigns: {response.text}", response)
        return
    
    campaigns = response.json()
    log_test("Get Campaigns", True, f"Successfully retrieved {len(campaigns)} campaigns", response)
    
    # If no campaigns exist, create one
    if len(campaigns) == 0:
        print("No campaigns found. Creating a new campaign...")
        campaign_data = {
            "name": "Test Campaign",
            "description": "Campaign for testing tasks"
        }
        response = requests.post(f"{BASE_URL}/campaigns/", headers=headers, json=campaign_data)
        
        if response.status_code != 200:
            log_test("Create Campaign", False, f"Failed to create campaign: {response.text}", response)
            return
        
        campaign = response.json()
        campaign_id = campaign["id"]
        log_test("Create Campaign", True, f"Successfully created campaign with ID: {campaign_id}", response)
    else:
        # Use the first campaign
        campaign_id = campaigns[0]["id"]
        print(f"Using existing campaign with ID: {campaign_id}")
    
    # Step 2: Get list of services in the campaign
    print("\n2. Getting list of services for the campaign...")
    response = requests.get(f"{BASE_URL}/campaigns/{campaign_id}/services/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Services", False, f"Failed to get services: {response.text}", response)
        return
    
    services = response.json()
    log_test("Get Services", True, f"Successfully retrieved {len(services)} services", response)
    
    # If no services exist, create one
    if len(services) == 0:
        print("No services found. Creating a new service...")
        service_data = {
            "name": "Facebook Marketing",
            "sort_order": 1,
            "description": "Dịch vụ marketing trên Facebook"
        }
        response = requests.post(
            f"{BASE_URL}/campaigns/{campaign_id}/services/", 
            headers=headers, 
            json=service_data
        )
        
        if response.status_code != 200:
            log_test("Create Service", False, f"Failed to create service: {response.text}", response)
            return
        
        service = response.json()
        service_id = service["id"]
        log_test("Create Service", True, f"Successfully created service with ID: {service_id}", response)
    else:
        # Use the first service
        service_id = services[0]["id"]
        print(f"Using existing service with ID: {service_id}")
    
    # Step 3: Create a new task
    print("\n3. Creating a new task - Thiết kế banner Facebook...")
    task_data = {
        "name": "Thiết kế banner Facebook",
        "start_date": "2025-01-06T01:00:00Z",
        "end_date": "2025-01-08T02:00:00Z",
        "status": "not_started",
        "description": "Thiết kế banner cho chiến dịch quảng cáo Facebook"
    }
    
    response = requests.post(
        f"{BASE_URL}/services/{service_id}/tasks/", 
        headers=headers, 
        json=task_data
    )
    
    if response.status_code != 200:
        log_test("Create Task", False, f"Failed to create task: {response.text}", response)
        return
    
    task = response.json()
    task_id = task["id"]
    log_test("Create Task", True, f"Successfully created task with ID: {task_id}", response)
    
    # Step 4: Create more sample tasks
    print("\n4. Creating more sample tasks...")
    
    # Task 2: Viết nội dung bài đăng
    task_data = {
        "name": "Viết nội dung bài đăng",
        "start_date": "2025-01-07T01:00:00Z",
        "end_date": "2025-01-09T02:00:00Z",
        "status": "in_progress",
        "description": "Viết nội dung cho các bài đăng trên Facebook"
    }
    
    response = requests.post(
        f"{BASE_URL}/services/{service_id}/tasks/", 
        headers=headers, 
        json=task_data
    )
    
    if response.status_code != 200:
        log_test("Create Task 2", False, f"Failed to create task 2: {response.text}", response)
    else:
        task2 = response.json()
        task2_id = task2["id"]
        log_test("Create Task 2", True, f"Successfully created task 2 with ID: {task2_id}", response)
    
    # Task 3: Chạy ads Facebook
    task_data = {
        "name": "Chạy ads Facebook",
        "start_date": "2025-01-10T01:00:00Z",
        "end_date": "2025-01-20T02:00:00Z",
        "status": "not_started",
        "description": "Thiết lập và chạy quảng cáo trên Facebook"
    }
    
    response = requests.post(
        f"{BASE_URL}/services/{service_id}/tasks/", 
        headers=headers, 
        json=task_data
    )
    
    if response.status_code != 200:
        log_test("Create Task 3", False, f"Failed to create task 3: {response.text}", response)
    else:
        task3 = response.json()
        task3_id = task3["id"]
        log_test("Create Task 3", True, f"Successfully created task 3 with ID: {task3_id}", response)
    
    # Task 4: Báo cáo kết quả tuần
    task_data = {
        "name": "Báo cáo kết quả tuần",
        "start_date": "2025-01-21T01:00:00Z",
        "end_date": "2025-01-22T02:00:00Z",
        "status": "not_started",
        "description": "Tổng hợp và báo cáo kết quả chiến dịch trong tuần"
    }
    
    response = requests.post(
        f"{BASE_URL}/services/{service_id}/tasks/", 
        headers=headers, 
        json=task_data
    )
    
    if response.status_code != 200:
        log_test("Create Task 4", False, f"Failed to create task 4: {response.text}", response)
    else:
        task4 = response.json()
        task4_id = task4["id"]
        log_test("Create Task 4", True, f"Successfully created task 4 with ID: {task4_id}", response)
    
    # Step 5: Get list of tasks for the service
    print("\n5. Getting list of tasks for the service...")
    response = requests.get(f"{BASE_URL}/services/{service_id}/tasks/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Tasks", False, f"Failed to get tasks: {response.text}", response)
    else:
        tasks = response.json()
        log_test("Get Tasks", True, f"Successfully retrieved {len(tasks)} tasks", response)
        
        # Print the tasks
        print("\nTasks for service:")
        for idx, task in enumerate(tasks, 1):
            print(f"{idx}. {task['name']} (status: {task['status']}) - {task['description']}")
    
    # Step 6: Update a task
    if 'task_id' in locals():
        print("\n6. Updating a task...")
        update_data = {
            "name": "Thiết kế banner Facebook (Updated)",
            "status": "in_progress",
            "description": "Thiết kế banner cho chiến dịch quảng cáo Facebook - Đã cập nhật"
        }
        
        response = requests.put(
            f"{BASE_URL}/tasks/{task_id}", 
            headers=headers, 
            json=update_data
        )
        
        if response.status_code != 200:
            log_test("Update Task", False, f"Failed to update task: {response.text}", response)
        else:
            updated_task = response.json()
            log_test("Update Task", True, f"Successfully updated task: {updated_task['name']}", response)
        
        # Get tasks again to verify the update
        response = requests.get(f"{BASE_URL}/services/{service_id}/tasks/", headers=headers)
        if response.status_code == 200:
            tasks = response.json()
            print("\nUpdated tasks for service:")
            for idx, task in enumerate(tasks, 1):
                print(f"{idx}. {task['name']} (status: {task['status']}) - {task['description']}")
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {test_results['success'] + test_results['failure']}")
    print(f"Passed: {test_results['success']}")
    print(f"Failed: {test_results['failure']}")
    
    if test_results['failure'] == 0:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. Check the logs above for details.")

def test_bulk_delete_tasks():
    """Test bulk delete tasks functionality"""
    token = get_token()
    if not token:
        log_test("Authentication", False, "Failed to get authentication token")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Get list of campaigns to obtain a campaign_id
    print("\n1. Getting list of campaigns...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/campaigns/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Campaigns", False, f"Failed to get campaigns: {response.text}", response)
        return
    
    campaigns = response.json()
    log_test("Get Campaigns", True, f"Successfully retrieved {len(campaigns)} campaigns", response)
    
    # If no campaigns exist, create one
    if len(campaigns) == 0:
        print("No campaigns found. Creating a new campaign...")
        campaign_data = {
            "name": "Test Campaign for Bulk Delete",
            "description": "Campaign for testing bulk delete tasks"
        }
        response = requests.post(f"{BASE_URL}{API_PREFIX}/campaigns/", headers=headers, json=campaign_data)
        
        if response.status_code != 200:
            log_test("Create Campaign", False, f"Failed to create campaign: {response.text}", response)
            return
        
        campaign = response.json()
        campaign_id = campaign["id"]
        log_test("Create Campaign", True, f"Successfully created campaign with ID: {campaign_id}", response)
    else:
        # Use the first campaign
        campaign_id = campaigns[0]["id"]
        print(f"Using existing campaign with ID: {campaign_id}")
    
    # Step 2: Get list of services in the campaign
    print("\n2. Getting list of services for the campaign...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/campaigns/{campaign_id}/services/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Services", False, f"Failed to get services: {response.text}", response)
        return
    
    services = response.json()
    log_test("Get Services", True, f"Successfully retrieved {len(services)} services", response)
    
    # If no services exist, create one
    if len(services) == 0:
        print("No services found. Creating a new service...")
        service_data = {
            "name": "Service for Bulk Delete Test",
            "sort_order": 1,
            "description": "Service for testing bulk delete tasks"
        }
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/campaigns/{campaign_id}/services/", 
            headers=headers, 
            json=service_data
        )
        
        if response.status_code != 200:
            log_test("Create Service", False, f"Failed to create service: {response.text}", response)
            return
        
        service = response.json()
        service_id = service["id"]
        log_test("Create Service", True, f"Successfully created service with ID: {service_id}", response)
    else:
        # Use the first service
        service_id = services[0]["id"]
        print(f"Using existing service with ID: {service_id}")
    
    # Step 3: Get existing tasks for the service
    print("\n3. Getting existing tasks for the service...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/services/{service_id}/tasks/", headers=headers)
    
    if response.status_code != 200:
        log_test("Get Tasks", False, f"Failed to get tasks: {response.text}", response)
        return
    
    existing_tasks = response.json()
    log_test("Get Tasks", True, f"Successfully retrieved {len(existing_tasks)} tasks", response)
    
    # Step 4: Create test tasks if needed
    if len(existing_tasks) < 5:
        print("\n4. Creating test tasks for bulk delete testing...")
        task_names = [
            "Task for Bulk Delete Test 1",
            "Task for Bulk Delete Test 2",
            "Task for Bulk Delete Test 3",
            "Task for Bulk Delete Test 4",
            "Task for Bulk Delete Test 5"
        ]
        
        created_tasks = []
        for name in task_names:
            task_data = {
                "name": name,
                "description": "This is a test task for bulk delete testing",
                "status": "not_started"
            }
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/services/{service_id}/tasks/", 
                headers=headers, 
                json=task_data
            )
            
            if response.status_code != 200:
                log_test(f"Create Task '{name}'", False, f"Failed to create task: {response.text}", response)
                continue
            
            task = response.json()
            created_tasks.append(task)
            log_test(f"Create Task '{name}'", True, f"Successfully created task with ID: {task['id']}", response)
        
        # Get updated task list
        response = requests.get(f"{BASE_URL}{API_PREFIX}/services/{service_id}/tasks/", headers=headers)
        if response.status_code != 200:
            log_test("Get Updated Tasks", False, f"Failed to get updated tasks: {response.text}", response)
            return
        
        existing_tasks = response.json()
        log_test("Get Updated Tasks", True, f"Successfully retrieved {len(existing_tasks)} tasks after creation", response)
    
    # Step 5: Test bulk delete with valid task IDs using POST /api/tasks/bulk-delete
    print("\n5. Testing bulk delete with valid task IDs using POST /api/tasks/bulk-delete...")
    # Select 2-3 tasks to delete
    tasks_to_delete = existing_tasks[:3] if len(existing_tasks) >= 3 else existing_tasks[:2]
    task_ids_to_delete = [task["id"] for task in tasks_to_delete]
    
    print(f"Attempting to delete {len(task_ids_to_delete)} tasks: {task_ids_to_delete}")
    
    # Use POST method to /api/tasks/bulk-delete as specified in the frontend
    response = requests.post(f"{BASE_URL}{API_PREFIX}/tasks/bulk-delete", headers=headers, json=task_ids_to_delete)
    
    if response.status_code == 200:
        result = response.json()
        log_test("Bulk Delete Tasks", True, f"Successfully deleted {result['deleted_count']} tasks using POST /api/tasks/bulk-delete", response)
    else:
        log_test("Bulk Delete Tasks", False, f"Failed to delete tasks using POST /api/tasks/bulk-delete: {response.text}", response)
        return
    
    # Verify tasks were deleted
    print("\n6. Verifying tasks were deleted...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/services/{service_id}/tasks/", headers=headers)
    if response.status_code == 200:
        remaining_tasks = response.json()
        remaining_ids = [task["id"] for task in remaining_tasks]
        
        all_deleted = True
        for task_id in task_ids_to_delete:
            if task_id in remaining_ids:
                print(f"Task {task_id} was not deleted!")
                all_deleted = False
        
        if all_deleted:
            log_test("Verify Deletion", True, "All tasks were successfully deleted", response)
        else:
            log_test("Verify Deletion", False, "Some tasks were not deleted", response)
    else:
        log_test("Verify Deletion", False, f"Failed to verify task deletion: {response.text}", response)
    
    # Step 7: Test edge case - empty array
    print("\n7. Testing edge case - empty array...")
    response = requests.post(f"{BASE_URL}{API_PREFIX}/tasks/bulk-delete", headers=headers, json=[])
    
    if response.status_code == 400:
        log_test("Empty Array Edge Case", True, "Successfully handled empty array case (returned 400 error)", response)
    else:
        log_test("Empty Array Edge Case", False, f"Failed to handle empty array case properly: {response.text}", response)
    
    # Step 8: Test edge case - too many tasks
    print("\n8. Testing edge case - too many tasks (>50)...")
    # Generate 51 fake IDs
    fake_ids = [f"fake_id_{i}" for i in range(51)]
    
    response = requests.post(f"{BASE_URL}{API_PREFIX}/tasks/bulk-delete", headers=headers, json=fake_ids)
    
    if response.status_code == 400:
        log_test("Too Many Tasks Edge Case", True, "Successfully handled too many tasks case (returned 400 error)", response)
    else:
        log_test("Too Many Tasks Edge Case", False, f"Failed to handle too many tasks case properly: {response.text}", response)
    
    # Step 9: Test edge case - non-existent task IDs
    print("\n9. Testing edge case - non-existent task IDs...")
    non_existent_ids = ["non_existent_id_1", "non_existent_id_2", "non_existent_id_3"]
    
    response = requests.post(f"{BASE_URL}{API_PREFIX}/tasks/bulk-delete", headers=headers, json=non_existent_ids)
    
    if response.status_code == 200:
        result = response.json()
        if result["deleted_count"] == 0:
            log_test("Non-existent IDs Edge Case", True, "Successfully handled non-existent task IDs (returned 0 deleted_count)", response)
        else:
            log_test("Non-existent IDs Edge Case", False, f"Unexpected deleted_count for non-existent task IDs: {result['deleted_count']}", response)
    else:
        log_test("Non-existent IDs Edge Case", False, f"Failed to handle non-existent task IDs properly: {response.text}", response)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {test_results['success'] + test_results['failure']}")
    print(f"Passed: {test_results['success']}")
    print(f"Failed: {test_results['failure']}")
    
    if test_results['failure'] == 0:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. Check the logs above for details.")

def test_template_api():
    """Test template API functionality"""
    print("\n=== TESTING TEMPLATE API ===\n")
    
    # Step 1: Get admin token
    print("1. Getting admin authentication token...")
    admin_token = get_token()
    if not admin_token:
        log_test("Admin Authentication", False, "Failed to get admin authentication token")
        return
    
    admin_headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    log_test("Admin Authentication", True, "Successfully obtained admin authentication token")
    
    # Step 2: Create a new template (as admin)
    print("\n2. Creating a new template as admin...")
    template_data = {
        "name": "Marketing Email Template",
        "content": "This is a sample marketing email template content with {{variable}} placeholders.",
        "template_type": "service"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/templates/", 
        headers=admin_headers, 
        json=template_data
    )
    
    if response.status_code != 200:
        log_test("Create Template", False, f"Failed to create template: {response.text}", response)
        return
    
    template = response.json()
    template_id = template["id"]
    log_test("Create Template", True, f"Successfully created template with ID: {template_id}", response)
    
    # Step 3: Create another template for testing bulk operations
    print("\n3. Creating another template for bulk operations testing...")
    template_data = {
        "name": "Social Media Post Template",
        "content": "This is a sample social media post template with {{hashtags}} and {{content}}.",
        "template_type": "service"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/templates/", 
        headers=admin_headers, 
        json=template_data
    )
    
    if response.status_code != 200:
        log_test("Create Second Template", False, f"Failed to create second template: {response.text}", response)
    else:
        second_template = response.json()
        second_template_id = second_template["id"]
        log_test("Create Second Template", True, f"Successfully created second template with ID: {second_template_id}", response)
    
    # Step 4: Get list of templates
    print("\n4. Getting list of templates...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/templates/", headers=admin_headers)
    
    if response.status_code != 200:
        log_test("Get Templates", False, f"Failed to get templates: {response.text}", response)
    else:
        templates = response.json()
        log_test("Get Templates", True, f"Successfully retrieved {len(templates)} templates", response)
        
        # Print the templates
        print("\nTemplates:")
        for idx, tmpl in enumerate(templates, 1):
            print(f"{idx}. {tmpl['name']} (type: {tmpl['template_type']}) - Created by: {tmpl.get('creator_name', 'Unknown')}")
    
    # Step 5: Test search functionality
    print("\n5. Testing search functionality...")
    search_term = "Marketing"
    response = requests.get(f"{BASE_URL}{API_PREFIX}/templates/?search={search_term}", headers=admin_headers)
    
    if response.status_code != 200:
        log_test("Search Templates", False, f"Failed to search templates: {response.text}", response)
    else:
        search_results = response.json()
        if any(search_term.lower() in template['name'].lower() for template in search_results):
            log_test("Search Templates", True, f"Successfully found templates matching '{search_term}'", response)
        else:
            log_test("Search Templates", False, f"Search returned results but none match '{search_term}'", response)
    
    # Step 6: Get specific template
    if 'template_id' in locals():
        print(f"\n6. Getting specific template with ID: {template_id}...")
        response = requests.get(f"{BASE_URL}{API_PREFIX}/templates/{template_id}", headers=admin_headers)
        
        if response.status_code != 200:
            log_test("Get Specific Template", False, f"Failed to get template: {response.text}", response)
        else:
            template_details = response.json()
            log_test("Get Specific Template", True, f"Successfully retrieved template: {template_details['name']}", response)
    
    # Step 7: Update template
    if 'template_id' in locals():
        print(f"\n7. Updating template with ID: {template_id}...")
        update_data = {
            "name": "Updated Marketing Email Template",
            "content": "This is an updated marketing email template with improved {{variable}} placeholders."
        }
        
        response = requests.put(
            f"{BASE_URL}{API_PREFIX}/templates/{template_id}", 
            headers=admin_headers, 
            json=update_data
        )
        
        if response.status_code != 200:
            log_test("Update Template", False, f"Failed to update template: {response.text}", response)
        else:
            updated_template = response.json()
            log_test("Update Template", True, f"Successfully updated template: {updated_template['name']}", response)
    
    # Step 8: Test template duplication
    if 'template_id' in locals():
        print(f"\n8. Duplicating template with ID: {template_id}...")
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/templates/{template_id}/duplicate", 
            headers=admin_headers
        )
        
        if response.status_code != 200:
            log_test("Duplicate Template", False, f"Failed to duplicate template: {response.text}", response)
        else:
            duplicated_template = response.json()
            duplicated_template_id = duplicated_template["id"]
            log_test("Duplicate Template", True, f"Successfully duplicated template with new ID: {duplicated_template_id}", response)
            
            # Verify the duplicated template has "(Copy)" in the name
            if "(Copy)" in duplicated_template["name"]:
                log_test("Verify Duplicate Name", True, f"Duplicated template has correct name format: {duplicated_template['name']}", response)
            else:
                log_test("Verify Duplicate Name", False, f"Duplicated template does not have '(Copy)' in name: {duplicated_template['name']}", response)
    
    # Step 9: Test bulk archive
    print("\n9. Testing bulk archive functionality...")
    template_ids_to_archive = []
    
    # Collect template IDs to archive
    if 'template_id' in locals():
        template_ids_to_archive.append(template_id)
    if 'second_template_id' in locals():
        template_ids_to_archive.append(second_template_id)
    
    if template_ids_to_archive:
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/templates/bulk-archive", 
            headers=admin_headers, 
            json=template_ids_to_archive
        )
        
        if response.status_code != 200:
            log_test("Bulk Archive", False, f"Failed to bulk archive templates: {response.text}", response)
        else:
            result = response.json()
            log_test("Bulk Archive", True, f"Successfully archived {result.get('message', 'templates')}", response)
    
    # Step 10: Get archived templates
    print("\n10. Getting archived templates...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/templates/?archived=true", headers=admin_headers)
    
    if response.status_code != 200:
        log_test("Get Archived Templates", False, f"Failed to get archived templates: {response.text}", response)
    else:
        archived_templates = response.json()
        log_test("Get Archived Templates", True, f"Successfully retrieved {len(archived_templates)} archived templates", response)
        
        # Verify our templates are in the archived list
        archived_ids = [t["id"] for t in archived_templates]
        all_archived = all(tid in archived_ids for tid in template_ids_to_archive)
        
        if all_archived:
            log_test("Verify Archived Status", True, "All templates were successfully archived", response)
        else:
            log_test("Verify Archived Status", False, "Some templates were not archived correctly", response)
    
    # Step 11: Test bulk restore
    print("\n11. Testing bulk restore functionality...")
    if template_ids_to_archive:
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/templates/bulk-restore", 
            headers=admin_headers, 
            json=template_ids_to_archive
        )
        
        if response.status_code != 200:
            log_test("Bulk Restore", False, f"Failed to bulk restore templates: {response.text}", response)
        else:
            result = response.json()
            log_test("Bulk Restore", True, f"Successfully restored {result.get('message', 'templates')}", response)
    
    # Step 12: Verify templates are restored
    print("\n12. Verifying templates are restored...")
    response = requests.get(f"{BASE_URL}{API_PREFIX}/templates/?archived=false", headers=admin_headers)
    
    if response.status_code != 200:
        log_test("Verify Restored Templates", False, f"Failed to get active templates: {response.text}", response)
    else:
        active_templates = response.json()
        active_ids = [t["id"] for t in active_templates]
        all_restored = all(tid in active_ids for tid in template_ids_to_archive)
        
        if all_restored:
            log_test("Verify Restored Status", True, "All templates were successfully restored", response)
        else:
            log_test("Verify Restored Status", False, "Some templates were not restored correctly", response)
    
    # Step 13: Test error case - get non-existent template
    print("\n13. Testing error case - get non-existent template...")
    non_existent_id = "non_existent_template_id"
    response = requests.get(f"{BASE_URL}{API_PREFIX}/templates/{non_existent_id}", headers=admin_headers)
    
    if response.status_code == 404:
        log_test("Error Case - Non-existent Template", True, "Correctly returned 404 for non-existent template", response)
    else:
        log_test("Error Case - Non-existent Template", False, f"Did not correctly handle non-existent template: {response.status_code}", response)
    
    # Step 14: Test bulk delete as admin
    print("\n14. Testing bulk delete as admin...")
    # Only delete the duplicated template to keep the original ones for other tests
    templates_to_delete = []
    if 'duplicated_template_id' in locals():
        templates_to_delete.append(duplicated_template_id)
    
    if templates_to_delete:
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/templates/bulk-delete", 
            headers=admin_headers,
            json=templates_to_delete
        )
        
        if response.status_code != 200:
            log_test("Bulk Delete", False, f"Failed to bulk delete templates: {response.text}", response)
        else:
            result = response.json()
            log_test("Bulk Delete", True, f"Successfully deleted templates: {result.get('message', '')}", response)
    
    # Step 15: Clean up - delete all test templates
    print("\n15. Cleaning up - deleting all test templates...")
    templates_to_delete = []
    
    # Get all templates
    response = requests.get(f"{BASE_URL}{API_PREFIX}/templates/", headers=admin_headers)
    if response.status_code == 200:
        all_templates = response.json()
        
        # Find templates created during this test
        test_template_names = [
            "Marketing Email Template", 
            "Updated Marketing Email Template",
            "Social Media Post Template"
        ]
        
        for template in all_templates:
            if any(test_name in template["name"] for test_name in test_template_names) or "(Copy)" in template["name"]:
                templates_to_delete.append(template["id"])
        
        if templates_to_delete:
            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/templates/bulk-delete", 
                headers=admin_headers,
                json=templates_to_delete
            )
            
            if response.status_code != 200:
                log_test("Clean Up", False, f"Failed to clean up test templates: {response.text}", response)
            else:
                result = response.json()
                log_test("Clean Up", True, f"Successfully cleaned up test templates: {result.get('message', '')}", response)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {test_results['success'] + test_results['failure']}")
    print(f"Passed: {test_results['success']}")
    print(f"Failed: {test_results['failure']}")
    
    if test_results['failure'] == 0:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. Check the logs above for details.")

def test_project_management_changes():
    """Test the Project management changes"""
    print("\n=== TESTING PROJECT MANAGEMENT CHANGES ===\n")
    
    # Step 1: Get admin token
    print("1. Getting admin authentication token...")
    admin_token = get_token()
    if not admin_token:
        log_test("Admin Authentication", False, "Failed to get admin authentication token")
        return
    
    admin_headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    log_test("Admin Authentication", True, "Successfully obtained admin authentication token")
    
    # Step 2: Test GET /api/users/by-role/{role} endpoint
    print("\n2. Testing GET /api/users/by-role/{role} endpoint...")
    roles = ["manager", "account", "content", "design", "editor", "sale"]
    
    for role in roles:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/users/by-role/{role}", headers=admin_headers)
        
        if response.status_code == 200:
            users = response.json()
            log_test(
                f"Get users by role: {role}",
                True,
                f"Successfully retrieved users with role {role}",
                response
            )
        else:
            log_test(
                f"Get users by role: {role}",
                False,
                f"Failed to retrieve users with role {role}",
                response
            )
    
    # Test invalid role
    response = requests.get(f"{BASE_URL}{API_PREFIX}/users/by-role/invalid_role", headers=admin_headers)
    if response.status_code == 400:
        log_test(
            "Get users by invalid role",
            True,
            "Correctly rejected invalid role with 400 status code",
            response
        )
    else:
        log_test(
            "Get users by invalid role",
            False,
            f"Expected 400 status code, got {response.status_code}",
            response
        )
    
    # Step 3: Create a test client for project testing
    print("\n3. Creating a test client for project testing...")
    client_data = {
        "name": f"Test Client {int(time.time())}",
        "company": "Test Company",
        "industry": "Technology",
        "contact_name": "Test Contact",
        "contact_email": "test@example.com"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/clients/",
        headers=admin_headers,
        json=client_data
    )
    
    if response.status_code != 200:
        log_test("Create Test Client", False, "Failed to create test client", response)
        return
    
    client = response.json()
    client_id = client["id"]
    log_test("Create Test Client", True, f"Successfully created test client with ID: {client_id}", response)
    
    # Step 4: Create a test campaign for project testing
    print("\n4. Creating a test campaign for project testing...")
    campaign_data = {
        "name": f"Test Campaign {int(time.time())}",
        "description": "Campaign created for testing project integration"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/campaigns/",
        headers=admin_headers,
        json=campaign_data
    )
    
    if response.status_code != 200:
        log_test("Create Test Campaign", False, "Failed to create test campaign", response)
        return
    
    campaign = response.json()
    campaign_id = campaign["id"]
    log_test("Create Test Campaign", True, f"Successfully created test campaign with ID: {campaign_id}", response)
    
    # Step 5: Test creating a project with campaign_id and staff role assignments
    print("\n5. Testing creating a project with campaign_id and staff role assignments...")
    project_data = {
        "name": f"Test Project {int(time.time())}",
        "client_id": client_id,
        "campaign_id": campaign_id,
        "description": "Project created for testing new fields",
        "status": "planning",
        "manager_ids": ["manager1", "manager2"],
        "account_ids": ["account1"],
        "content_ids": ["content1", "content2"],
        "design_ids": ["design1"],
        "editor_ids": [],
        "sale_ids": ["sale1"]
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/projects/",
        headers=admin_headers,
        json=project_data
    )
    
    if response.status_code != 200:
        log_test("Create Project with New Fields", False, "Failed to create project with new fields", response)
        return
    
    project = response.json()
    project_id = project["id"]
    log_test("Create Project with New Fields", True, f"Successfully created project with ID: {project_id}", response)
    
    # Verify all fields were saved correctly
    for field in ["campaign_id", "manager_ids", "account_ids", "content_ids", "design_ids", "editor_ids", "sale_ids"]:
        if project[field] == project_data[field]:
            log_test(
                f"Project field verification: {field}",
                True,
                f"Field {field} was saved correctly",
                None
            )
        else:
            log_test(
                f"Project field verification: {field}",
                False,
                f"Field {field} was not saved correctly. Expected: {project_data[field]}, Got: {project[field]}",
                None
            )
    
    # Step 6: Test updating a project with new fields
    print("\n6. Testing updating a project with new fields...")
    update_data = {
        "name": f"Updated Project {int(time.time())}",
        "client_id": client_id,
        "campaign_id": campaign_id,
        "description": "Updated project description",
        "status": "in_progress",
        "manager_ids": ["manager3"],
        "account_ids": ["account2", "account3"],
        "content_ids": [],
        "design_ids": ["design2", "design3"],
        "editor_ids": ["editor1"],
        "sale_ids": []
    }
    
    response = requests.put(
        f"{BASE_URL}{API_PREFIX}/projects/{project_id}",
        headers=admin_headers,
        json=update_data
    )
    
    if response.status_code != 200:
        log_test("Update Project with New Fields", False, "Failed to update project with new fields", response)
    else:
        updated_project = response.json()
        log_test("Update Project with New Fields", True, "Successfully updated project with new fields", response)
        
        # Verify all fields were updated correctly
        for field in ["campaign_id", "manager_ids", "account_ids", "content_ids", "design_ids", "editor_ids", "sale_ids"]:
            if updated_project[field] == update_data[field]:
                log_test(
                    f"Project update verification: {field}",
                    True,
                    f"Field {field} was updated correctly",
                    None
                )
            else:
                log_test(
                    f"Project update verification: {field}",
                    False,
                    f"Field {field} was not updated correctly. Expected: {update_data[field]}, Got: {updated_project[field]}",
                    None
                )
    
    # Step 7: Test that budget field is no longer accepted
    print("\n7. Testing that budget field is no longer accepted...")
    project_with_budget = {
        "name": f"Budget Test Project {int(time.time())}",
        "client_id": client_id,
        "description": "Project with budget field",
        "budget": 10000  # This field should be ignored
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/projects/",
        headers=admin_headers,
        json=project_with_budget
    )
    
    if response.status_code != 200:
        log_test("Budget Field Removal Test", False, "Failed to create project for budget test", response)
    else:
        budget_project = response.json()
        budget_project_id = budget_project["id"]
        
        # Check if budget field is present in the response
        if "budget" not in budget_project:
            log_test(
                "Budget Field Removal",
                True,
                "Budget field is correctly not included in the project model",
                response
            )
        else:
            log_test(
                "Budget Field Removal",
                False,
                f"Budget field is still present in the project model with value: {budget_project.get('budget')}",
                response
            )
    
    # Step 8: Test campaign_id validation
    print("\n8. Testing campaign_id validation...")
    invalid_campaign_project = {
        "name": f"Invalid Campaign Project {int(time.time())}",
        "client_id": client_id,
        "campaign_id": "non_existent_campaign_id",
        "description": "Project with invalid campaign_id"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/projects/",
        headers=admin_headers,
        json=invalid_campaign_project
    )
    
    if response.status_code == 404:
        log_test(
            "Campaign ID Validation",
            True,
            "Correctly rejected project with invalid campaign_id",
            response
        )
    else:
        log_test(
            "Campaign ID Validation",
            False,
            f"Expected 404 status code for invalid campaign_id, got {response.status_code}",
            response
        )
    
    # Step 9: Test that existing project API functionality still works
    print("\n9. Testing that existing project API functionality still works...")
    
    # Get project by ID
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/projects/{project_id}",
        headers=admin_headers
    )
    
    if response.status_code == 200:
        log_test("Get Project by ID", True, "Successfully retrieved project by ID", response)
    else:
        log_test("Get Project by ID", False, "Failed to retrieve project by ID", response)
    
    # Get projects list
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/projects/",
        headers=admin_headers
    )
    
    if response.status_code == 200:
        projects = response.json()
        log_test("Get Projects List", True, f"Successfully retrieved projects list with {len(projects)} projects", response)
    else:
        log_test("Get Projects List", False, "Failed to retrieve projects list", response)
    
    # Test project filters
    filters = [
        {"name": "Status filter", "params": {"status": "in_progress"}},
        {"name": "Archived filter", "params": {"archived": "false"}},
        {"name": "Search filter", "params": {"search": "Test"}}
    ]
    
    for filter_info in filters:
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/projects/",
            headers=admin_headers,
            params=filter_info["params"]
        )
        
        if response.status_code == 200:
            log_test(f"Project filter: {filter_info['name']}", True, f"Successfully filtered projects with {filter_info['name']}", response)
        else:
            log_test(f"Project filter: {filter_info['name']}", False, f"Failed to filter projects with {filter_info['name']}", response)
    
    # Step 10: Test that campaigns API endpoint works
    print("\n10. Testing that campaigns API endpoint works...")
    
    # Get campaigns list
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/campaigns/",
        headers=admin_headers
    )
    
    if response.status_code == 200:
        campaigns = response.json()
        log_test("Get Campaigns List", True, f"Successfully retrieved campaigns list with {len(campaigns)} campaigns", response)
    else:
        log_test("Get Campaigns List", False, "Failed to retrieve campaigns list", response)
    
    # Get campaign by ID
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/campaigns/{campaign_id}",
        headers=admin_headers
    )
    
    if response.status_code == 200:
        campaign_detail = response.json()
        log_test("Get Campaign by ID", True, f"Successfully retrieved campaign by ID: {campaign_detail['name']}", response)
    else:
        log_test("Get Campaign by ID", False, "Failed to retrieve campaign by ID", response)
    
    # Step 11: Clean up - delete test projects and campaign
    print("\n11. Cleaning up - deleting test projects and campaign...")
    
    # Delete the test projects
    if 'project_id' in locals():
        response = requests.delete(
            f"{BASE_URL}{API_PREFIX}/projects/{project_id}",
            headers=admin_headers
        )
        
        if response.status_code == 200:
            log_test("Delete Test Project", True, "Successfully deleted test project", response)
        else:
            log_test("Delete Test Project", False, "Failed to delete test project", response)
    
    if 'budget_project_id' in locals():
        response = requests.delete(
            f"{BASE_URL}{API_PREFIX}/projects/{budget_project_id}",
            headers=admin_headers
        )
        
        if response.status_code == 200:
            log_test("Delete Budget Test Project", True, "Successfully deleted budget test project", response)
        else:
            log_test("Delete Budget Test Project", False, "Failed to delete budget test project", response)
    
    # Delete the test campaign
    response = requests.delete(
        f"{BASE_URL}{API_PREFIX}/campaigns/{campaign_id}",
        headers=admin_headers
    )
    
    if response.status_code == 200:
        log_test("Delete Test Campaign", True, "Successfully deleted test campaign", response)
    else:
        log_test("Delete Test Campaign", False, "Failed to delete test campaign", response)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {test_results['success'] + test_results['failure']}")
    print(f"Passed: {test_results['success']}")
    print(f"Failed: {test_results['failure']}")
    
    if test_results['failure'] == 0:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. Check the logs above for details.")

def test_project_detail_workflow():
    """Test the complete Project Detail workflow"""
    print("\n=== TESTING PROJECT DETAIL WORKFLOW ===\n")
    
    # Step 1: Get admin token
    print("1. Getting admin authentication token...")
    admin_token = get_token()
    if not admin_token:
        log_test("Admin Authentication", False, "Failed to get admin authentication token")
        return
    
    admin_headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    log_test("Admin Authentication", True, "Successfully obtained admin authentication token")
    
    # Step 1.5: Get all projects to find available project IDs
    print("\n1.5. Getting all projects to find available project IDs...")
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/projects/",
        headers=admin_headers
    )
    
    if response.status_code != 200:
        log_test("Get All Projects", False, f"Failed to get all projects: {response.text}", response)
        return
    
    projects = response.json()
    log_test("Get All Projects", True, f"Successfully retrieved {len(projects)} projects", response)
    
    if not projects:
        log_test("Available Projects", False, "No projects found in the database", None)
        return
    
    print("Available projects:")
    for p in projects:
        print(f"- ID: {p.get('id')}, Name: {p.get('name')}")
    
    # Step 2: Test GET /api/projects/{project_id} for a specific project
    # Use the first project from the list or the specified one if it exists
    project_id = next((p["id"] for p in projects if p["id"] == "3babc6e7-1c1f-459e-b64e-b2b9aa36c45b"), projects[0]["id"])
    print(f"\n2. Testing GET /api/projects/{project_id}...")
    
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/projects/{project_id}",
        headers=admin_headers
    )
    
    if response.status_code != 200:
        log_test("Get Project Details", False, f"Failed to get project details: {response.text}", response)
        return
    
    project = response.json()
    log_test("Get Project Details", True, f"Successfully retrieved project: {project['name']}", response)
    
    # Verify project has campaign_id and staff assignments
    if not project.get("campaign_id"):
        log_test("Project Campaign ID", False, "Project does not have a campaign_id", None)
    else:
        log_test("Project Campaign ID", True, f"Project has campaign_id: {project['campaign_id']}", None)
    
    # Check staff assignments
    staff_fields = ["manager_ids", "account_ids", "content_ids", "design_ids", "editor_ids", "sale_ids"]
    for field in staff_fields:
        if field in project and isinstance(project[field], list):
            log_test(f"Project {field}", True, f"Project has {field}: {project[field]}", None)
        else:
            log_test(f"Project {field}", False, f"Project does not have valid {field}", None)
    
    # Step 3: Test GET /api/clients/{client_id} for associated client
    client_id = project.get("client_id")
    if not client_id:
        log_test("Project Client ID", False, "Project does not have a client_id", None)
    else:
        print(f"\n3. Testing GET /api/clients/{client_id}...")
        
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/clients/{client_id}",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            log_test("Get Client Details", False, f"Failed to get client details: {response.text}", response)
        else:
            client = response.json()
            log_test("Get Client Details", True, f"Successfully retrieved client: {client['name']}", response)
    
    # Step 4: Test GET /api/campaigns/{campaign_id} for associated campaign
    campaign_id = project.get("campaign_id")
    if not campaign_id:
        log_test("Project Campaign ID", False, "Project does not have a campaign_id", None)
    else:
        print(f"\n4. Testing GET /api/campaigns/{campaign_id}...")
        
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/campaigns/{campaign_id}",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            log_test("Get Campaign Details", False, f"Failed to get campaign details: {response.text}", response)
            return
        
        campaign = response.json()
        log_test("Get Campaign Details", True, f"Successfully retrieved campaign: {campaign['name']}", response)
        
        # Step 5: Test GET /api/campaigns/{campaign_id}/services/ to get services
        print(f"\n5. Testing GET /api/campaigns/{campaign_id}/services/...")
        
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/campaigns/{campaign_id}/services/",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            log_test("Get Campaign Services", False, f"Failed to get campaign services: {response.text}", response)
            return
        
        services = response.json()
        log_test("Get Campaign Services", True, f"Successfully retrieved {len(services)} services", response)
        
        # Verify campaign has 3 services (Thiết kế UI/UX, Phát triển Frontend, Tạo nội dung)
        expected_services = ["Thiết kế UI/UX", "Phát triển Frontend", "Tạo nội dung"]
        found_services = [service["name"] for service in services]
        
        if all(service in found_services for service in expected_services):
            log_test("Campaign Services Verification", True, f"Campaign has all expected services: {expected_services}", None)
        else:
            log_test("Campaign Services Verification", False, f"Campaign is missing some expected services. Found: {found_services}, Expected: {expected_services}", None)
        
        # Step 6: Test GET /api/services/{service_id}/tasks/ for each service to get tasks
        print("\n6. Testing GET /api/services/{service_id}/tasks/ for each service...")
        
        for service in services:
            service_id = service["id"]
            service_name = service["name"]
            
            print(f"   Testing tasks for service: {service_name} (ID: {service_id})...")
            
            response = requests.get(
                f"{BASE_URL}{API_PREFIX}/services/{service_id}/tasks/",
                headers=admin_headers
            )
            
            if response.status_code != 200:
                log_test(f"Get Tasks for Service '{service_name}'", False, f"Failed to get tasks: {response.text}", response)
                continue
            
            tasks = response.json()
            log_test(f"Get Tasks for Service '{service_name}'", True, f"Successfully retrieved {len(tasks)} tasks", response)
            
            # Verify tasks have different statuses
            if tasks:
                statuses = set(task["status"] for task in tasks)
                log_test(f"Task Statuses for Service '{service_name}'", True, f"Tasks have {len(statuses)} different statuses: {statuses}", None)
            else:
                log_test(f"Task Statuses for Service '{service_name}'", False, "No tasks found for this service", None)
    
    # Step 7: Test documents API filtering by project name
    print("\n7. Testing GET /api/documents/ with filtering by project name...")
    
    # Get project name for filtering
    project_name = project.get("name", "")
    if not project_name:
        log_test("Project Name for Document Filtering", False, "Project does not have a name", None)
    else:
        response = requests.get(
            f"{BASE_URL}{API_PREFIX}/documents/?search={project_name}",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            log_test("Get Documents by Project Name", False, f"Failed to get documents: {response.text}", response)
        else:
            documents = response.json()
            log_test("Get Documents by Project Name", True, f"Successfully retrieved {len(documents)} documents related to project '{project_name}'", response)
    
    # Step 8: Test error handling - Invalid project ID
    print("\n8. Testing error handling - Invalid project ID...")
    
    invalid_project_id = "invalid-project-id"
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/projects/{invalid_project_id}",
        headers=admin_headers
    )
    
    if response.status_code == 404:
        log_test("Invalid Project ID Error Handling", True, "Correctly returned 404 for invalid project ID", response)
    else:
        log_test("Invalid Project ID Error Handling", False, f"Expected 404 status code for invalid project ID, got {response.status_code}", response)
    
    # Step 9: Test error handling - Missing campaign/client references
    print("\n9. Testing error handling - Missing campaign/client references...")
    
    # Test with non-existent campaign ID
    non_existent_campaign_id = "non-existent-campaign-id"
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/campaigns/{non_existent_campaign_id}",
        headers=admin_headers
    )
    
    if response.status_code == 404:
        log_test("Non-existent Campaign ID Error Handling", True, "Correctly returned 404 for non-existent campaign ID", response)
    else:
        log_test("Non-existent Campaign ID Error Handling", False, f"Expected 404 status code for non-existent campaign ID, got {response.status_code}", response)
    
    # Test with non-existent client ID
    non_existent_client_id = "non-existent-client-id"
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/clients/{non_existent_client_id}",
        headers=admin_headers
    )
    
    if response.status_code == 404:
        log_test("Non-existent Client ID Error Handling", True, "Correctly returned 404 for non-existent client ID", response)
    else:
        log_test("Non-existent Client ID Error Handling", False, f"Expected 404 status code for non-existent client ID, got {response.status_code}", response)
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total tests: {test_results['success'] + test_results['failure']}")
    print(f"Passed: {test_results['success']}")
    print(f"Failed: {test_results['failure']}")
    
    if test_results['failure'] == 0:
        print("\n✅ All tests passed successfully!")
    else:
        print("\n❌ Some tests failed. Check the logs above for details.")

if __name__ == "__main__":
    # Reset test results
    test_results = {
        "success": 0,
        "failure": 0,
        "tests": []
    }
    
    # Run the tests
    # test_task_creation()
    # test_bulk_delete_tasks()
    # test_template_api()
    # test_project_management_changes()
    test_project_detail_workflow()
