import requests
import json
import time
from datetime import datetime, timedelta
import sys

# Import functions from the main test file
sys.path.append('/app')
from backend_test import BASE_URL, API_PREFIX, get_token, log_test, test_results

def test_work_items_api():
    """Test the Work Items API endpoints"""
    print("\n=== TESTING WORK ITEMS API ===\n")
    
    # Reset test results
    global test_results
    test_results = {
        "success": 0,
        "failure": 0,
        "tests": []
    }
    
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
    
    # Step 2: Get the specified project ID or use an existing one
    print("\n2. Getting project for work items testing...")
    specified_project_id = "3babc6e7-1c1f-459e-b64e-b2b9aa36c45b"  # From the test request
    
    response = requests.get(f"{BASE_URL}{API_PREFIX}/projects/{specified_project_id}", headers=admin_headers)
    
    if response.status_code != 200:
        print(f"Specified project ID {specified_project_id} not found. Trying to get an existing project...")
        
        # Get list of projects
        response = requests.get(f"{BASE_URL}{API_PREFIX}/projects/", headers=admin_headers)
        
        if response.status_code != 200 or not response.json():
            log_test("Get Project", False, "Failed to get any projects", response)
            return
        
        projects = response.json()
        project = projects[0]
        project_id = project["id"]
        log_test("Get Project", True, f"Using existing project with ID: {project_id}", response)
    else:
        project = response.json()
        project_id = specified_project_id
        log_test("Get Project", True, f"Using specified project with ID: {project_id}", response)
    
    # Step 3: Get services and tasks for linking
    print("\n3. Getting services and tasks for linking...")
    
    # Get services for the project's campaign
    campaign_id = project.get("campaign_id")
    service_id = None
    task_id = None
    
    if campaign_id:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/campaigns/{campaign_id}/services/", headers=admin_headers)
        
        if response.status_code == 200 and response.json():
            services = response.json()
            service = services[0]
            service_id = service["id"]
            log_test("Get Service", True, f"Found service with ID: {service_id}", response)
            
            # Get tasks for the service
            response = requests.get(f"{BASE_URL}{API_PREFIX}/services/{service_id}/tasks/", headers=admin_headers)
            
            if response.status_code == 200 and response.json():
                tasks = response.json()
                task = tasks[0]
                task_id = task["id"]
                log_test("Get Task", True, f"Found task with ID: {task_id}", response)
            else:
                log_test("Get Task", False, "No tasks found for the service", response)
        else:
            log_test("Get Service", False, "No services found for the project's campaign", response)
    else:
        log_test("Get Campaign", False, "Project does not have a campaign_id", None)
    
    # Step 4: Test creating a work item (POST /api/projects/{project_id}/work-items/)
    print("\n4. Testing POST /api/projects/{project_id}/work-items/...")
    
    work_item_data = {
        "name": "Test Work Item",
        "description": "<p>This is a <strong>rich text</strong> description for testing the work items API.</p>",
        "project_id": project_id,
        "service_id": service_id,
        "task_id": task_id,
        "assigned_by": "admin",  # Will be overridden by the current user's ID
        "assigned_to": None,  # Will test assigning later
        "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "priority": "normal",
        "status": "not_started"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/projects/{project_id}/work-items/",
        headers=admin_headers,
        json=work_item_data
    )
    
    if response.status_code != 200:
        log_test("Create Work Item", False, f"Failed to create work item: {response.text}", response)
        return
    
    work_item = response.json()
    work_item_id = work_item["id"]
    log_test("Create Work Item", True, f"Successfully created work item with ID: {work_item_id}", response)
    
    # Step 5: Test creating work items with different priorities
    print("\n5. Testing creating work items with different priorities...")
    
    priorities = ["high", "urgent"]
    priority_work_item_ids = []
    
    for priority in priorities:
        work_item_data = {
            "name": f"Test Work Item - {priority.capitalize()} Priority",
            "description": f"<p>This is a work item with {priority} priority.</p>",
            "project_id": project_id,
            "service_id": service_id,
            "assigned_by": "admin",
            "priority": priority,
            "status": "not_started"
        }
        
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/projects/{project_id}/work-items/",
            headers=admin_headers,
            json=work_item_data
        )
        
        if response.status_code != 200:
            log_test(f"Create {priority.capitalize()} Priority Work Item", False, f"Failed to create work item: {response.text}", response)
            continue
        
        priority_item = response.json()
        priority_work_item_ids.append(priority_item["id"])
        log_test(f"Create {priority.capitalize()} Priority Work Item", True, f"Successfully created {priority} priority work item with ID: {priority_item['id']}", response)
    
    # Step 6: Test listing work items for a project (GET /api/projects/{project_id}/work-items/)
    print("\n6. Testing GET /api/projects/{project_id}/work-items/...")
    
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/projects/{project_id}/work-items/",
        headers=admin_headers
    )
    
    if response.status_code != 200:
        log_test("List Project Work Items", False, f"Failed to list work items: {response.text}", response)
    else:
        work_items = response.json()
        log_test("List Project Work Items", True, f"Successfully retrieved {len(work_items)} work items", response)
        
        # Verify enriched response data
        if work_items:
            enriched_fields = ["assigned_by_name", "assigned_to_name", "service_name", "task_name"]
            enriched_data_present = any(field in work_items[0] for field in enriched_fields)
            
            if enriched_data_present:
                log_test("Enriched Response Data", True, "Work items contain enriched data fields", None)
                print("Enriched data fields present:")
                for field in enriched_fields:
                    if field in work_items[0]:
                        print(f"- {field}: {work_items[0][field]}")
            else:
                log_test("Enriched Response Data", False, "Work items do not contain enriched data fields", None)
    
    # Step 7: Test getting a specific work item (GET /api/work-items/{work_item_id})
    print(f"\n7. Testing GET /api/work-items/{work_item_id}...")
    
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/work-items/{work_item_id}",
        headers=admin_headers
    )
    
    if response.status_code != 200:
        log_test("Get Work Item", False, f"Failed to get work item: {response.text}", response)
    else:
        work_item_detail = response.json()
        log_test("Get Work Item", True, f"Successfully retrieved work item: {work_item_detail['name']}", response)
    
    # Step 8: Test updating a work item (PUT /api/work-items/{work_item_id})
    print(f"\n8. Testing PUT /api/work-items/{work_item_id}...")
    
    update_data = {
        "name": "Updated Work Item",
        "description": "<p>This is an <em>updated</em> description.</p>",
        "priority": "high"
    }
    
    response = requests.put(
        f"{BASE_URL}{API_PREFIX}/work-items/{work_item_id}",
        headers=admin_headers,
        json=update_data
    )
    
    if response.status_code != 200:
        log_test("Update Work Item", False, f"Failed to update work item: {response.text}", response)
    else:
        updated_item = response.json()
        log_test("Update Work Item", True, f"Successfully updated work item: {updated_item['name']}", response)
        
        # Verify the update was applied
        if updated_item["name"] == update_data["name"] and updated_item["priority"] == update_data["priority"]:
            log_test("Verify Update", True, "Work item was correctly updated", None)
        else:
            log_test("Verify Update", False, "Work item was not correctly updated", None)
    
    # Step 9: Test updating work item status (PATCH /api/work-items/{work_item_id}/status)
    print(f"\n9. Testing PATCH /api/work-items/{work_item_id}/status...")
    
    # Test status transition: not_started → in_progress
    response = requests.patch(
        f"{BASE_URL}{API_PREFIX}/work-items/{work_item_id}/status",
        headers=admin_headers,
        params={"status": "in_progress"}
    )
    
    if response.status_code != 200:
        log_test("Update Status to in_progress", False, f"Failed to update status: {response.text}", response)
    else:
        status_result = response.json()
        log_test("Update Status to in_progress", True, f"Successfully updated status to in_progress", response)
    
    # Verify the status was updated
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/work-items/{work_item_id}",
        headers=admin_headers
    )
    
    if response.status_code == 200:
        current_item = response.json()
        if current_item["status"] == "in_progress":
            log_test("Verify Status Update", True, "Status was correctly updated to in_progress", None)
        else:
            log_test("Verify Status Update", False, f"Status was not correctly updated. Expected: in_progress, Got: {current_item['status']}", None)
    
    # Test status transition: in_progress → completed
    response = requests.patch(
        f"{BASE_URL}{API_PREFIX}/work-items/{work_item_id}/status",
        headers=admin_headers,
        params={"status": "completed"}
    )
    
    if response.status_code != 200:
        log_test("Update Status to completed", False, f"Failed to update status: {response.text}", response)
    else:
        status_result = response.json()
        log_test("Update Status to completed", True, f"Successfully updated status to completed", response)
    
    # Step 10: Test validation
    print("\n10. Testing validation...")
    
    # Test required fields validation
    missing_fields_data = {
        "description": "Missing required fields"
        # Missing name and project_id
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/projects/{project_id}/work-items/",
        headers=admin_headers,
        json=missing_fields_data
    )
    
    if response.status_code == 422:  # Validation error
        log_test("Required Fields Validation", True, "Correctly rejected request with missing required fields", response)
    else:
        log_test("Required Fields Validation", False, f"Failed to validate required fields. Expected 422, got {response.status_code}", response)
    
    # Test project existence validation
    invalid_project_data = {
        "name": "Invalid Project Work Item",
        "project_id": "non-existent-project-id",
        "assigned_by": "admin"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/projects/non-existent-project-id/work-items/",
        headers=admin_headers,
        json=invalid_project_data
    )
    
    if response.status_code == 404:
        log_test("Project Existence Validation", True, "Correctly rejected request with non-existent project", response)
    else:
        log_test("Project Existence Validation", False, f"Failed to validate project existence. Expected 404, got {response.status_code}", response)
    
    # Test service/task linking validation
    invalid_service_data = {
        "name": "Invalid Service Work Item",
        "project_id": project_id,
        "service_id": "non-existent-service-id",
        "assigned_by": "admin"
    }
    
    response = requests.post(
        f"{BASE_URL}{API_PREFIX}/projects/{project_id}/work-items/",
        headers=admin_headers,
        json=invalid_service_data
    )
    
    if response.status_code == 404:
        log_test("Service Linking Validation", True, "Correctly rejected request with non-existent service", response)
    else:
        log_test("Service Linking Validation", False, f"Failed to validate service linking. Expected 404, got {response.status_code}", response)
    
    # Step 11: Test deleting a work item (DELETE /api/work-items/{work_item_id})
    print(f"\n11. Testing DELETE /api/work-items/{work_item_id}...")
    
    response = requests.delete(
        f"{BASE_URL}{API_PREFIX}/work-items/{work_item_id}",
        headers=admin_headers
    )
    
    if response.status_code != 200:
        log_test("Delete Work Item", False, f"Failed to delete work item: {response.text}", response)
    else:
        delete_result = response.json()
        log_test("Delete Work Item", True, "Successfully deleted work item", response)
    
    # Verify the item was deleted
    response = requests.get(
        f"{BASE_URL}{API_PREFIX}/work-items/{work_item_id}",
        headers=admin_headers
    )
    
    if response.status_code == 404:
        log_test("Verify Deletion", True, "Work item was successfully deleted", response)
    else:
        log_test("Verify Deletion", False, f"Work item was not deleted. Expected 404, got {response.status_code}", response)
    
    # Clean up - delete any remaining test work items
    print("\n12. Cleaning up - deleting remaining test work items...")
    
    for item_id in priority_work_item_ids:
        response = requests.delete(
            f"{BASE_URL}{API_PREFIX}/work-items/{item_id}",
            headers=admin_headers
        )
        
        if response.status_code == 200:
            log_test(f"Delete Work Item {item_id}", True, f"Successfully deleted work item {item_id}", response)
        else:
            log_test(f"Delete Work Item {item_id}", False, f"Failed to delete work item {item_id}: {response.text}", response)
    
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
    test_work_items_api()
