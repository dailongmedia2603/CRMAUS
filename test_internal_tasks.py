import requests
import json
from datetime import datetime, timedelta
import uuid

# Backend URL from review request - without /api suffix
BACKEND_URL = "https://d25f1ed3-bd7c-4b9f-9a59-7d2661b69383.preview.emergentagent.com"

# Test user credentials
EMAIL = "admin@example.com"
PASSWORD = "admin123"

# Global variables
token = None
created_task_ids = []

def get_token():
    """Get authentication token"""
    global token
    response = requests.post(
        f"{BACKEND_URL}/api/token",
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

def test_create_task():
    """Test creating a new internal task"""
    print("\n=== Testing POST /api/internal-tasks/ ===")
    
    # First, get a user ID to assign tasks to
    response = requests.get(
        f"{BACKEND_URL}/api/users/",
        headers=get_headers()
    )
    
    if response.status_code != 200 or len(response.json()) == 0:
        print("❌ Failed to get users or no users found")
        return False
    
    # Use the first user as the assignee
    users = response.json()
    assigned_to = users[0]["id"]
    
    # Create a new task
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
        f"{BACKEND_URL}/api/internal-tasks/",
        headers=get_headers(),
        json=task_data
    )
    
    success = print_test_result("Create Internal Task", response)
    if success:
        task_id = response.json()["id"]
        created_task_ids.append(task_id)
        print(f"Created internal task ID: {task_id}")
        
        # Verify task data
        task = response.json()
        for key in task_data:
            if key == "deadline":
                # Skip exact datetime comparison
                continue
            if task[key] != task_data[key]:
                print(f"❌ Mismatch in {key}: expected {task_data[key]}, got {task[key]}")
        
        # Verify enriched fields
        if "assigned_to_name" not in task:
            print("❌ Missing assigned_to_name field")
        if "assigned_by_name" not in task:
            print("❌ Missing assigned_by_name field")
    
    return success

def test_get_tasks():
    """Test getting internal tasks with various filters"""
    print("\n=== Testing GET /api/internal-tasks/ ===")
    
    # Get all tasks
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/",
        headers=get_headers()
    )
    
    success = print_test_result("Get All Internal Tasks", response)
    if success:
        tasks = response.json()
        print(f"Found {len(tasks)} internal tasks")
    
    # Create a high priority task for filter testing
    if len(created_task_ids) > 0:
        # Get the assigned_to from the first task
        response = requests.get(
            f"{BACKEND_URL}/api/internal-tasks/{created_task_ids[0]}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            assigned_to = response.json()["assigned_to"]
            
            # Create a high priority task
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
                f"{BACKEND_URL}/api/internal-tasks/",
                headers=get_headers(),
                json=high_priority_task
            )
            
            if response.status_code == 200:
                high_priority_task_id = response.json()["id"]
                created_task_ids.append(high_priority_task_id)
                print(f"Created high priority task ID: {high_priority_task_id}")
    
    # Test filters
    # Filter by status
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/?status=not_started",
        headers=get_headers()
    )
    
    success_status = print_test_result("Get Tasks by Status", response)
    if success_status:
        tasks = response.json()
        print(f"Found {len(tasks)} tasks with status 'not_started'")
        # Verify all tasks have the correct status
        for task in tasks:
            if task["status"] != "not_started":
                print(f"❌ Task {task['id']} has incorrect status: {task['status']}")
    
    # Filter by priority
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/?priority=high",
        headers=get_headers()
    )
    
    success_priority = print_test_result("Get Tasks by Priority", response)
    if success_priority:
        tasks = response.json()
        print(f"Found {len(tasks)} tasks with priority 'high'")
        # Verify all tasks have the correct priority
        for task in tasks:
            if task["priority"] != "high":
                print(f"❌ Task {task['id']} has incorrect priority: {task['priority']}")
    
    # Filter by assigned_to
    if len(created_task_ids) > 0:
        response = requests.get(
            f"{BACKEND_URL}/api/internal-tasks/{created_task_ids[0]}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            assigned_to = response.json()["assigned_to"]
            
            response = requests.get(
                f"{BACKEND_URL}/api/internal-tasks/?assigned_to={assigned_to}",
                headers=get_headers()
            )
            
            success_assigned = print_test_result("Get Tasks by Assignee", response)
            if success_assigned:
                tasks = response.json()
                print(f"Found {len(tasks)} tasks assigned to user {assigned_to}")
                # Verify all tasks have the correct assignee
                for task in tasks:
                    if task["assigned_to"] != assigned_to:
                        print(f"❌ Task {task['id']} has incorrect assignee: {task['assigned_to']}")
    
    # Search filter
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/?search=Test",
        headers=get_headers()
    )
    
    success_search = print_test_result("Search Tasks", response)
    if success_search:
        tasks = response.json()
        print(f"Found {len(tasks)} tasks matching search term 'Test'")
    
    # Date range filter
    start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
    end_date = (datetime.utcnow() + timedelta(days=14)).isoformat()
    
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/?start_date={start_date}&end_date={end_date}",
        headers=get_headers()
    )
    
    success_date = print_test_result("Get Tasks by Date Range", response)
    if success_date:
        tasks = response.json()
        print(f"Found {len(tasks)} tasks within date range")
    
    return success and success_status and success_priority and success_search and success_date

def test_get_task_statistics():
    """Test getting internal task statistics"""
    print("\n=== Testing GET /api/internal-tasks/statistics ===")
    
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/statistics",
        headers=get_headers()
    )
    
    success = print_test_result("Get Task Statistics", response)
    if success:
        stats = response.json()
        print("Task Statistics:")
        print(f"- Total tasks: {stats['total_tasks']}")
        print(f"- Not started: {stats['not_started']}")
        print(f"- In progress: {stats['in_progress']}")
        print(f"- Completed: {stats['completed']}")
        print(f"- High priority: {stats['high_priority']}")
        print(f"- Normal priority: {stats['normal_priority']}")
        print(f"- Low priority: {stats['low_priority']}")
        
        # Verify statistics add up
        if stats['not_started'] + stats['in_progress'] + stats['completed'] != stats['total_tasks']:
            print("❌ Status counts don't add up to total tasks")
        
        if stats['high_priority'] + stats['normal_priority'] + stats['low_priority'] != stats['total_tasks']:
            print("❌ Priority counts don't add up to total tasks")
    
    return success

def test_get_task_details():
    """Test getting details of a specific task"""
    print("\n=== Testing GET /api/internal-tasks/{task_id} ===")
    
    if not created_task_ids:
        print("❌ No tasks created to test")
        return False
    
    task_id = created_task_ids[0]
    
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/{task_id}",
        headers=get_headers()
    )
    
    success = print_test_result("Get Task Details", response)
    if success:
        task = response.json()
        print(f"Task details: {task['name']} - Status: {task['status']}")
        
        # Verify enriched fields
        if "assigned_to_name" not in task:
            print("❌ Missing assigned_to_name field")
        if "assigned_by_name" not in task:
            print("❌ Missing assigned_by_name field")
    
    # Test with invalid task ID
    invalid_id = str(uuid.uuid4())
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/{invalid_id}",
        headers=get_headers()
    )
    
    print_test_result("Get Invalid Task", response, expected_status=404)
    
    return success

def test_update_task():
    """Test updating a task"""
    print("\n=== Testing PUT /api/internal-tasks/{task_id} ===")
    
    if not created_task_ids:
        print("❌ No tasks created to test")
        return False
    
    task_id = created_task_ids[0]
    
    update_data = {
        "name": f"Updated Task {uuid.uuid4().hex[:8]}",
        "description": "This task was updated by the API test",
        "priority": "high",
        "document_links": ["https://example.com/updated-doc"]
    }
    
    response = requests.put(
        f"{BACKEND_URL}/api/internal-tasks/{task_id}",
        headers=get_headers(),
        json=update_data
    )
    
    success = print_test_result("Update Task", response)
    if success:
        updated_task = response.json()
        print(f"Updated task: {updated_task['name']} - Priority: {updated_task['priority']}")
        
        # Verify updated fields
        for key, value in update_data.items():
            if updated_task[key] != value:
                print(f"❌ Field {key} not updated correctly. Expected: {value}, Got: {updated_task[key]}")
    
    return success

def test_delete_task():
    """Test deleting a task"""
    print("\n=== Testing DELETE /api/internal-tasks/{task_id} ===")
    
    # Create a temporary task for deletion
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    if response.status_code != 200 or len(response.json()) == 0:
        print("❌ Failed to get users or no users found")
        return False
    
    assigned_to = response.json()[0]["id"]
    
    temp_task = {
        "name": f"Temp Task for Deletion {uuid.uuid4().hex[:8]}",
        "description": "This task will be deleted",
        "assigned_to": assigned_to,
        "deadline": (datetime.utcnow() + timedelta(days=5)).isoformat(),
        "priority": "low",
        "status": "not_started"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/api/internal-tasks/",
        headers=get_headers(),
        json=temp_task
    )
    
    if response.status_code != 200:
        print("❌ Failed to create temporary task for deletion test")
        return False
    
    temp_task_id = response.json()["id"]
    print(f"Created temporary task ID: {temp_task_id}")
    
    # Delete the task
    response = requests.delete(
        f"{BACKEND_URL}/api/internal-tasks/{temp_task_id}",
        headers=get_headers()
    )
    
    success = print_test_result("Delete Task", response)
    
    # Verify task was deleted
    if success:
        response = requests.get(
            f"{BACKEND_URL}/api/internal-tasks/{temp_task_id}",
            headers=get_headers()
        )
        
        if response.status_code == 404:
            print("✅ Task deletion verified - Task not found")
        else:
            print("❌ Task still exists after deletion")
            success = False
    
    return success

def test_bulk_delete_tasks():
    """Test bulk deleting tasks"""
    print("\n=== Testing POST /api/internal-tasks/bulk-delete ===")
    
    # Create temporary tasks for bulk deletion
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    if response.status_code != 200 or len(response.json()) == 0:
        print("❌ Failed to get users or no users found")
        return False
    
    assigned_to = response.json()[0]["id"]
    
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
            f"{BACKEND_URL}/api/internal-tasks/",
            headers=get_headers(),
            json=temp_task
        )
        
        if response.status_code == 200:
            temp_task_ids.append(response.json()["id"])
    
    if not temp_task_ids:
        print("❌ Failed to create temporary tasks for bulk deletion test")
        return False
    
    print(f"Created {len(temp_task_ids)} temporary tasks for bulk deletion")
    
    # Bulk delete the tasks
    response = requests.post(
        f"{BACKEND_URL}/api/internal-tasks/bulk-delete",
        headers=get_headers(),
        json=temp_task_ids
    )
    
    success = print_test_result("Bulk Delete Tasks", response)
    
    # Verify tasks were deleted
    if success:
        all_deleted = True
        for task_id in temp_task_ids:
            response = requests.get(
                f"{BACKEND_URL}/api/internal-tasks/{task_id}",
                headers=get_headers()
            )
            
            if response.status_code != 404:
                print(f"❌ Task {task_id} still exists after bulk deletion")
                all_deleted = False
        
        if all_deleted:
            print("✅ All tasks successfully deleted in bulk operation")
        else:
            success = False
    
    return success

def test_update_task_status():
    """Test updating task status"""
    print("\n=== Testing PATCH /api/internal-tasks/{task_id}/status ===")
    
    if not created_task_ids:
        print("❌ No tasks created to test")
        return False
    
    task_id = created_task_ids[0]
    
    # Test workflow: not_started -> in_progress
    status_data = {
        "status": "in_progress"
    }
    
    response = requests.patch(
        f"{BACKEND_URL}/api/internal-tasks/{task_id}/status",
        headers=get_headers(),
        json=status_data
    )
    
    success_in_progress = print_test_result("Update Status to In Progress", response)
    
    # Verify status was updated
    if success_in_progress:
        response = requests.get(
            f"{BACKEND_URL}/api/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            task = response.json()
            if task["status"] != "in_progress":
                print(f"❌ Status not updated correctly. Expected: in_progress, Got: {task['status']}")
                success_in_progress = False
    
    # Test workflow: in_progress -> completed (with report_link)
    status_data = {
        "status": "completed",
        "report_link": "https://example.com/task-report"
    }
    
    response = requests.patch(
        f"{BACKEND_URL}/api/internal-tasks/{task_id}/status",
        headers=get_headers(),
        json=status_data
    )
    
    success_completed = print_test_result("Update Status to Completed", response)
    
    # Verify status and report_link were updated
    if success_completed:
        response = requests.get(
            f"{BACKEND_URL}/api/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            task = response.json()
            if task["status"] != "completed":
                print(f"❌ Status not updated correctly. Expected: completed, Got: {task['status']}")
                success_completed = False
            if task["report_link"] != "https://example.com/task-report":
                print(f"❌ Report link not updated correctly. Expected: https://example.com/task-report, Got: {task['report_link']}")
                success_completed = False
    
    # Test invalid status update (should fail without report_link)
    if len(created_task_ids) > 1:
        task_id = created_task_ids[1]
        
        # First set to in_progress
        requests.patch(
            f"{BACKEND_URL}/api/internal-tasks/{task_id}/status",
            headers=get_headers(),
            json={"status": "in_progress"}
        )
        
        # Then try to set to completed without report_link
        status_data = {
            "status": "completed"
        }
        
        response = requests.patch(
            f"{BACKEND_URL}/api/internal-tasks/{task_id}/status",
            headers=get_headers(),
            json=status_data
        )
        
        success_invalid = print_test_result("Update to Completed without Report Link (should fail)", response, expected_status=400)
    else:
        success_invalid = True
    
    return success_in_progress and success_completed and success_invalid

def test_task_feedback():
    """Test task feedback functionality"""
    print("\n=== Testing Task Feedback API ===")
    
    if not created_task_ids:
        print("❌ No tasks created to test")
        return False
    
    task_id = created_task_ids[0]
    
    # Test POST /api/internal-tasks/{task_id}/feedback/
    feedback_data = {
        "message": f"Test feedback for task {task_id} - {uuid.uuid4().hex[:8]}"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/api/internal-tasks/{task_id}/feedback/",
        headers=get_headers(),
        json=feedback_data
    )
    
    success_create = print_test_result("Create Task Feedback", response)
    if success_create:
        feedback = response.json()
        print(f"Created feedback: {feedback['message']}")
        
        # Verify feedback data
        if feedback["message"] != feedback_data["message"]:
            print(f"❌ Feedback message mismatch. Expected: {feedback_data['message']}, Got: {feedback['message']}")
            success_create = False
        
        if "user_name" not in feedback:
            print("❌ Missing user_name field in feedback")
            success_create = False
    
    # Add a second feedback
    feedback_data2 = {
        "message": f"Second feedback for task {task_id} - {uuid.uuid4().hex[:8]}"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/api/internal-tasks/{task_id}/feedback/",
        headers=get_headers(),
        json=feedback_data2
    )
    
    if response.status_code == 200:
        print("✅ Created second feedback")
    
    # Test GET /api/internal-tasks/{task_id}/feedback/
    response = requests.get(
        f"{BACKEND_URL}/api/internal-tasks/{task_id}/feedback/",
        headers=get_headers()
    )
    
    success_get = print_test_result("Get Task Feedback", response)
    if success_get:
        feedbacks = response.json()
        print(f"Found {len(feedbacks)} feedback items for task {task_id}")
        
        # Verify we have at least the feedbacks we created
        if len(feedbacks) < 2:
            print(f"❌ Expected at least 2 feedbacks, got {len(feedbacks)}")
            success_get = False
        
        # Verify feedback fields
        for feedback in feedbacks:
            if "message" not in feedback:
                print("❌ Missing message field in feedback")
                success_get = False
            if "user_name" not in feedback:
                print("❌ Missing user_name field in feedback")
                success_get = False
            if "created_at" not in feedback:
                print("❌ Missing created_at field in feedback")
                success_get = False
    
    return success_create and success_get

def cleanup():
    """Clean up created test data"""
    print("\n=== Cleaning up test data ===")
    
    for task_id in created_task_ids:
        response = requests.delete(
            f"{BACKEND_URL}/api/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            print(f"Deleted task ID: {task_id}")
        else:
            print(f"Failed to delete task ID: {task_id}")
    
    print(f"Attempted to delete {len(created_task_ids)} tasks")

def main():
    """Main test function"""
    print("=== Starting Internal Task Management API Tests ===")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Get authentication token
    if not get_token():
        print("Failed to authenticate. Exiting tests.")
        return
    
    # Run tests
    create_success = test_create_task()
    get_success = test_get_tasks()
    stats_success = test_get_task_statistics()
    details_success = test_get_task_details()
    update_success = test_update_task()
    status_success = test_update_task_status()
    feedback_success = test_task_feedback()
    delete_success = test_delete_task()
    bulk_delete_success = test_bulk_delete_tasks()
    
    # Clean up
    cleanup()
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Create Task: {'✅' if create_success else '❌'}")
    print(f"Get Tasks with Filters: {'✅' if get_success else '❌'}")
    print(f"Get Task Statistics: {'✅' if stats_success else '❌'}")
    print(f"Get Task Details: {'✅' if details_success else '❌'}")
    print(f"Update Task: {'✅' if update_success else '❌'}")
    print(f"Update Task Status: {'✅' if status_success else '❌'}")
    print(f"Task Feedback: {'✅' if feedback_success else '❌'}")
    print(f"Delete Task: {'✅' if delete_success else '❌'}")
    print(f"Bulk Delete Tasks: {'✅' if bulk_delete_success else '❌'}")
    
    print("\n=== All tests completed ===")

if __name__ == "__main__":
    main()
