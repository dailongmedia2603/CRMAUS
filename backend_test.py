import requests
import json
import time
from datetime import datetime

# Base URL for API
BASE_URL = "http://localhost:8001"
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
    
    # Step 5: Test bulk delete with valid task IDs
    print("\n5. Testing bulk delete with valid task IDs...")
    # Select 3 tasks to delete
    tasks_to_delete = existing_tasks[:3]
    task_ids_to_delete = [task["id"] for task in tasks_to_delete]
    
    print(f"Attempting to delete {len(task_ids_to_delete)} tasks: {task_ids_to_delete}")
    
    # Try different ways to send the task_ids
    # Method 1: As JSON body
    response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, json=task_ids_to_delete)
    
    if response.status_code != 200:
        print(f"Method 1 failed with status code {response.status_code}: {response.text}")
        
        # Method 2: As form data
        form_data = {"task_ids": task_ids_to_delete}
        response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, data=form_data)
        
        if response.status_code != 200:
            print(f"Method 2 failed with status code {response.status_code}: {response.text}")
            
            # Method 3: As query parameters
            query_params = {"task_ids": ",".join(task_ids_to_delete)}
            response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, params=query_params)
            
            if response.status_code != 200:
                print(f"Method 3 failed with status code {response.status_code}: {response.text}")
                log_test("Bulk Delete Tasks", False, f"All methods failed to delete tasks", response)
            else:
                result = response.json()
                log_test("Bulk Delete Tasks", True, f"Method 3 succeeded: {result['deleted_count']} tasks deleted", response)
        else:
            result = response.json()
            log_test("Bulk Delete Tasks", True, f"Method 2 succeeded: {result['deleted_count']} tasks deleted", response)
    else:
        result = response.json()
        log_test("Bulk Delete Tasks", True, f"Method 1 succeeded: {result['deleted_count']} tasks deleted", response)
    
    # Verify tasks were deleted
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
    
    # Step 6: Test edge case - empty array
    print("\n6. Testing edge case - empty array...")
    
    # Try different ways to send empty array
    # Method 1: As JSON body
    response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, json=[])
    
    if response.status_code == 400:
        log_test("Empty Array Edge Case", True, "Successfully handled empty array case (returned 400 error)", response)
    else:
        print(f"Method 1 failed with status code {response.status_code}: {response.text}")
        
        # Method 2: As form data
        form_data = {"task_ids": []}
        response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, data=form_data)
        
        if response.status_code == 400:
            log_test("Empty Array Edge Case", True, "Method 2 succeeded: Successfully handled empty array case", response)
        else:
            print(f"Method 2 failed with status code {response.status_code}: {response.text}")
            
            # Method 3: As query parameters
            query_params = {"task_ids": ""}
            response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, params=query_params)
            
            if response.status_code == 400:
                log_test("Empty Array Edge Case", True, "Method 3 succeeded: Successfully handled empty array case", response)
            else:
                log_test("Empty Array Edge Case", False, f"All methods failed for empty array case", response)
    
    # Step 7: Test edge case - too many tasks
    print("\n7. Testing edge case - too many tasks (>50)...")
    # Generate 51 fake IDs
    fake_ids = [f"fake_id_{i}" for i in range(51)]
    
    # Method 1: As JSON body
    response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, json=fake_ids)
    
    if response.status_code == 400:
        log_test("Too Many Tasks Edge Case", True, "Successfully handled too many tasks case (returned 400 error)", response)
    else:
        print(f"Method 1 failed with status code {response.status_code}: {response.text}")
        
        # Method 2: As form data
        form_data = {"task_ids": fake_ids}
        response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, data=form_data)
        
        if response.status_code == 400:
            log_test("Too Many Tasks Edge Case", True, "Method 2 succeeded: Successfully handled too many tasks case", response)
        else:
            print(f"Method 2 failed with status code {response.status_code}: {response.text}")
            
            # Method 3: As query parameters
            query_params = {"task_ids": ",".join(fake_ids)}
            response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, params=query_params)
            
            if response.status_code == 400:
                log_test("Too Many Tasks Edge Case", True, "Method 3 succeeded: Successfully handled too many tasks case", response)
            else:
                log_test("Too Many Tasks Edge Case", False, f"All methods failed for too many tasks case", response)
    
    # Step 8: Test edge case - non-existent task IDs
    print("\n8. Testing edge case - non-existent task IDs...")
    non_existent_ids = ["non_existent_id_1", "non_existent_id_2", "non_existent_id_3"]
    
    # Method 1: As JSON body
    response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, json=non_existent_ids)
    
    if response.status_code == 200:
        result = response.json()
        if result["deleted_count"] == 0:
            log_test("Non-existent IDs Edge Case", True, "Successfully handled non-existent task IDs (returned 0 deleted_count)", response)
        else:
            log_test("Non-existent IDs Edge Case", False, f"Unexpected deleted_count for non-existent task IDs: {result['deleted_count']}", response)
    else:
        print(f"Method 1 failed with status code {response.status_code}: {response.text}")
        
        # Method 2: As form data
        form_data = {"task_ids": non_existent_ids}
        response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, data=form_data)
        
        if response.status_code == 200:
            result = response.json()
            if result["deleted_count"] == 0:
                log_test("Non-existent IDs Edge Case", True, "Method 2 succeeded: Successfully handled non-existent task IDs", response)
            else:
                log_test("Non-existent IDs Edge Case", False, f"Method 2: Unexpected deleted_count: {result['deleted_count']}", response)
        else:
            print(f"Method 2 failed with status code {response.status_code}: {response.text}")
            
            # Method 3: As query parameters
            query_params = {"task_ids": ",".join(non_existent_ids)}
            response = requests.delete(f"{BASE_URL}{API_PREFIX}/tasks/bulk", headers=headers, params=query_params)
            
            if response.status_code == 200:
                result = response.json()
                if result["deleted_count"] == 0:
                    log_test("Non-existent IDs Edge Case", True, "Method 3 succeeded: Successfully handled non-existent task IDs", response)
                else:
                    log_test("Non-existent IDs Edge Case", False, f"Method 3: Unexpected deleted_count: {result['deleted_count']}", response)
            else:
                log_test("Non-existent IDs Edge Case", False, f"All methods failed for non-existent task IDs", response)
    
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
    test_bulk_delete_tasks()
