import requests
import json
from datetime import datetime, timedelta
import time
import uuid

# Backend URL
BACKEND_URL = "http://localhost:8001/api"

# Test user credentials
EMAIL = "admin@example.com"
PASSWORD = "admin123"

# Global variables
token = None
created_user_id = None

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

def test_documents():
    """Test Documents API endpoints"""
    print("\n=== Testing Documents API ===")
    
    # Test GET /api/folders/ - Get list of document folders (correct endpoint)
    response = requests.get(
        f"{BACKEND_URL}/folders/",
        headers=get_headers()
    )
    
    folders_success = print_test_result("Get Document Folders (/api/folders/)", response)
    if folders_success:
        folders = response.json()
        print(f"Found {len(folders)} document folders")
    
    # Test GET /api/document-folders/ - This should fail as per the review request
    response = requests.get(
        f"{BACKEND_URL}/document-folders/",
        headers=get_headers()
    )
    
    print_test_result("Get Document Folders (/api/document-folders/) - Should fail", response, expected_status=404)
    print("Note: The /api/document-folders/ endpoint returns 404 as expected. The correct endpoint is /api/folders/")
    
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
            print(f"Document details: {document['title']} - Folder ID: {document.get('folder_id', 'N/A')}")
    
    return folders_success and docs_success

def test_dashboard():
    """Test Dashboard API endpoints"""
    print("\n=== Testing Dashboard API ===")
    
    # Test GET /api/dashboard - Get dashboard data (correct endpoint)
    response = requests.get(
        f"{BACKEND_URL}/dashboard",
        headers=get_headers()
    )
    
    success = print_test_result("Get Dashboard Data (/api/dashboard)", response)
    if success:
        stats = response.json()
        print("Dashboard data:")
        for key, value in stats.items():
            if isinstance(value, dict):
                print(f"- {key}: {len(value)} items")
            else:
                print(f"- {key}: {value}")
    
    # Test GET /api/dashboard/statistics - This should fail as per the review request
    response = requests.get(
        f"{BACKEND_URL}/dashboard/statistics",
        headers=get_headers()
    )
    
    print_test_result("Get Dashboard Statistics (/api/dashboard/statistics) - Should fail", response, expected_status=404)
    print("Note: The /api/dashboard/statistics endpoint returns 404 as expected. The correct endpoint is /api/dashboard")
    
    return success

def test_user_management():
    """Test User Management API endpoints"""
    global created_user_id
    print("\n=== Testing User Management API ===")
    
    # Test GET /api/users/ - Get list of users (admin only)
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    users_success = print_test_result("Get Users List", response)
    if users_success:
        users = response.json()
        print(f"Found {len(users)} users")
    
    # Test GET /api/users/by-role/{role} - Filter users by role
    roles = ["admin", "account", "creative", "staff", "manager", "content", "design", "editor", "sale"]
    role_success = True
    
    for role in roles:
        response = requests.get(
            f"{BACKEND_URL}/users/by-role/{role}",
            headers=get_headers()
        )
        
        success = print_test_result(f"Get Users by Role: {role}", response)
        if success:
            role_users = response.json()
            print(f"Found {len(role_users)} users with role '{role}'")
        else:
            role_success = False
    
    # Test POST /api/users/ - Create new user (admin only)
    new_user = {
        "email": f"test_user_{int(time.time())}@example.com",
        "full_name": "Test User",
        "role": "staff",
        "password": "testpassword123"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/users/",
        headers=get_headers(),
        json=new_user
    )
    
    create_success = print_test_result("Create New User", response)
    if create_success:
        created_user = response.json()
        created_user_id = created_user["id"]
        print(f"Created new user: {created_user['full_name']} (ID: {created_user_id})")
    
    # Test PUT /api/users/{user_id}/status - Activate/deactivate user (admin only)
    if created_user_id:
        # Deactivate user
        response = requests.put(
            f"{BACKEND_URL}/users/{created_user_id}/status",
            headers=get_headers(),
            json={"is_active": False}
        )
        
        deactivate_success = print_test_result("Deactivate User", response)
        
        # Activate user
        response = requests.put(
            f"{BACKEND_URL}/users/{created_user_id}/status",
            headers=get_headers(),
            json={"is_active": True}
        )
        
        activate_success = print_test_result("Activate User", response)
    else:
        deactivate_success = False
        activate_success = False
    
    # Test PUT /api/users/{user_id}/password - Reset password (admin only)
    if created_user_id:
        response = requests.put(
            f"{BACKEND_URL}/users/{created_user_id}/password",
            headers=get_headers(),
            json={"new_password": "newpassword456"}
        )
        
        reset_password_success = print_test_result("Reset User Password", response)
    else:
        reset_password_success = False
    
    # Test DELETE /api/users/{user_id} - Delete user (admin only)
    if created_user_id:
        response = requests.delete(
            f"{BACKEND_URL}/users/{created_user_id}",
            headers=get_headers()
        )
        
        delete_success = print_test_result("Delete User", response)
        if delete_success:
            print(f"Successfully deleted user with ID: {created_user_id}")
            created_user_id = None
    else:
        delete_success = False
    
    return (users_success and role_success and create_success and 
            deactivate_success and activate_success and reset_password_success and delete_success)

def test_internal_task_management():
    """Test Internal Task Management API endpoints"""
    print("\n=== Testing Internal Task Management API ===")
    
    # Get an active user ID for assignment
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    if response.status_code != 200:
        print("❌ Failed to get users list")
        print(f"Response: {response.text}")
        return False
    
    users = response.json()
    active_users = [user for user in users if user["is_active"]]
    
    if not active_users:
        print("❌ No active users found for task assignment")
        return False
    
    assigned_user = active_users[0]
    assigned_user_id = assigned_user["id"]
    print(f"Using user for assignment: {assigned_user['full_name']} (ID: {assigned_user_id})")
    
    # Test POST /api/internal-tasks/ - Create new internal task
    future_date = (datetime.utcnow() + timedelta(days=7)).isoformat()
    
    new_task = {
        "name": "Test task",
        "description": "Test description",
        "assigned_to": assigned_user_id,
        "deadline": future_date,
        "priority": "normal",
        "document_links": ["https://example.com"]
    }
    
    response = requests.post(
        f"{BACKEND_URL}/internal-tasks/",
        headers=get_headers(),
        json=new_task
    )
    
    create_success = print_test_result("Create New Internal Task", response)
    
    if create_success:
        created_task = response.json()
        task_id = created_task["id"]
        print(f"Created new task: {created_task['name']} (ID: {task_id})")
        print(f"Task details: Priority: {created_task['priority']}, Status: {created_task['status']}")
        print(f"Assigned to: {created_task['assigned_to_name']} (ID: {created_task['assigned_to']})")
        print(f"Document links: {created_task['document_links']}")
        
        # Test GET /api/internal-tasks/ - Get list of tasks
        response = requests.get(
            f"{BACKEND_URL}/internal-tasks/",
            headers=get_headers()
        )
        
        list_success = print_test_result("Get Internal Tasks List", response)
        
        if list_success:
            tasks = response.json()
            print(f"Found {len(tasks)} internal tasks")
            
            # Verify our created task is in the list
            found = any(task["id"] == task_id for task in tasks)
            if found:
                print("✅ Created task found in tasks list")
            else:
                print("❌ Created task not found in tasks list")
                list_success = False
        
        # Test GET /api/internal-tasks/{task_id} - Get task details
        response = requests.get(
            f"{BACKEND_URL}/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        get_success = print_test_result("Get Internal Task Details", response)
        
        if get_success:
            task = response.json()
            print(f"Task details: {task['name']} - {task['description']}")
            
            # Verify task details match what we created
            if (task["name"] == new_task["name"] and 
                task["description"] == new_task["description"] and
                task["assigned_to"] == new_task["assigned_to"] and
                task["priority"] == new_task["priority"] and
                task["document_links"] == new_task["document_links"]):
                print("✅ Task details match created task")
            else:
                print("❌ Task details do not match created task")
                get_success = False
        
        # Test POST /api/internal-tasks/{task_id}/feedback/ - Add feedback to task
        feedback_message = "Test feedback message"
        feedback_data = {
            "message": feedback_message
        }
        
        response = requests.post(
            f"{BACKEND_URL}/internal-tasks/{task_id}/feedback/",
            headers=get_headers(),
            json=feedback_data
        )
        
        add_feedback_success = print_test_result("Add Feedback to Task", response)
        
        if add_feedback_success:
            feedback = response.json()
            print(f"Added feedback: {feedback['message']}")
            print(f"Feedback by: {feedback['user_name']} (ID: {feedback['user_id']})")
            
            # Verify feedback message matches what we sent
            if feedback["message"] == feedback_message:
                print("✅ Feedback message matches")
            else:
                print("❌ Feedback message does not match")
                add_feedback_success = False
        
        # Test GET /api/internal-tasks/{task_id}/feedback/ - Get task feedback
        response = requests.get(
            f"{BACKEND_URL}/internal-tasks/{task_id}/feedback/",
            headers=get_headers()
        )
        
        get_feedback_success = print_test_result("Get Task Feedback", response)
        
        if get_feedback_success:
            feedbacks = response.json()
            print(f"Found {len(feedbacks)} feedback items")
            
            # Verify our feedback is in the list
            if len(feedbacks) > 0:
                found_feedback = feedbacks[0]  # Should be the first one since we just added it
                print(f"Feedback: {found_feedback['message']} by {found_feedback['user_name']}")
                
                # Check if user_name is properly displayed
                if found_feedback["user_name"]:
                    print(f"✅ User name is displayed: {found_feedback['user_name']}")
                else:
                    print("❌ User name is not displayed")
                    get_feedback_success = False
                
                # Verify feedback message matches what we sent
                if found_feedback["message"] == feedback_message:
                    print("✅ Feedback message in list matches")
                else:
                    print("❌ Feedback message in list does not match")
                    get_feedback_success = False
            else:
                print("❌ No feedback found")
                get_feedback_success = False
        
        # Test DELETE /api/internal-tasks/{task_id} - Delete task
        response = requests.delete(
            f"{BACKEND_URL}/internal-tasks/{task_id}",
            headers=get_headers()
        )
        
        delete_success = print_test_result("Delete Internal Task", response)
        
        if delete_success:
            print(f"Successfully deleted task with ID: {task_id}")
            
            # Verify task is deleted
            response = requests.get(
                f"{BACKEND_URL}/internal-tasks/{task_id}",
                headers=get_headers()
            )
            
            if response.status_code == 404:
                print("✅ Task successfully deleted (404 Not Found)")
            else:
                print(f"❌ Task not deleted properly: {response.status_code}")
                delete_success = False
            
            # Verify feedback is also deleted (should return 404)
            response = requests.get(
                f"{BACKEND_URL}/internal-tasks/{task_id}/feedback/",
                headers=get_headers()
            )
            
            if response.status_code == 404:
                print("✅ Task feedback successfully deleted (404 Not Found)")
            else:
                print(f"❌ Task feedback not deleted properly: {response.status_code}")
                delete_success = False
    else:
        list_success = False
        get_success = False
        add_feedback_success = False
        get_feedback_success = False
        delete_success = False
        
        # Print the error response for debugging
        print(f"Error creating task: {response.text}")
    
    return create_success and list_success and get_success and add_feedback_success and get_feedback_success and delete_success

def test_team_management():
    """Test Team Management API endpoints"""
    print("\n=== Testing Team Management API ===")
    
    # Test GET /api/teams/ - List teams
    response = requests.get(
        f"{BACKEND_URL}/teams/",
        headers=get_headers()
    )
    
    list_teams_success = print_test_result("List Teams", response)
    if list_teams_success:
        teams = response.json()
        print(f"Found {len(teams)} teams")
    
    # Test POST /api/teams/ - Create team
    new_team = {
        "name": "Marketing Team",
        "description": "Digital marketing specialists",
        "color": "#4F46E5",  # Indigo color
        "is_active": True
    }
    
    response = requests.post(
        f"{BACKEND_URL}/teams/",
        headers=get_headers(),
        json=new_team
    )
    
    create_team_success = print_test_result("Create Team", response)
    team_id = None
    
    if create_team_success:
        created_team = response.json()
        team_id = created_team["id"]
        print(f"Created new team: {created_team['name']} (ID: {team_id})")
        print(f"Team details: {created_team['description']}, Color: {created_team['color']}")
        
        # Test GET /api/teams/{team_id} - Get team details
        response = requests.get(
            f"{BACKEND_URL}/teams/{team_id}",
            headers=get_headers()
        )
        
        get_team_success = print_test_result("Get Team Details", response)
        
        if get_team_success:
            team = response.json()
            print(f"Team details: {team['name']} - {team['description']}")
            
            # Verify team details match what we created
            if (team["name"] == new_team["name"] and 
                team["description"] == new_team["description"] and
                team["color"] == new_team["color"]):
                print("✅ Team details match created team")
            else:
                print("❌ Team details do not match created team")
                get_team_success = False
        
        # Test PUT /api/teams/{team_id} - Update team
        update_data = {
            "name": "Digital Marketing Team",
            "description": "Specialists in digital marketing and social media"
        }
        
        response = requests.put(
            f"{BACKEND_URL}/teams/{team_id}",
            headers=get_headers(),
            json=update_data
        )
        
        update_team_success = print_test_result("Update Team", response)
        
        if update_team_success:
            updated_team = response.json()
            print(f"Updated team: {updated_team['name']} - {updated_team['description']}")
            
            # Verify team details were updated
            if (updated_team["name"] == update_data["name"] and 
                updated_team["description"] == update_data["description"]):
                print("✅ Team details were updated correctly")
            else:
                print("❌ Team details were not updated correctly")
                update_team_success = False
        
        # Get an active user to add as team member
        response = requests.get(
            f"{BACKEND_URL}/users/",
            headers=get_headers()
        )
        
        if response.status_code != 200:
            print("❌ Failed to get users list")
            print(f"Response: {response.text}")
            add_member_success = False
            get_members_success = False
            update_member_success = False
            remove_member_success = False
        else:
            users = response.json()
            active_users = [user for user in users if user["is_active"]]
            
            if not active_users:
                print("❌ No active users found for team membership")
                add_member_success = False
                get_members_success = False
                update_member_success = False
                remove_member_success = False
            else:
                user_to_add = active_users[0]
                user_id = user_to_add["id"]
                print(f"Using user for team membership: {user_to_add['full_name']} (ID: {user_id})")
                
                # Test POST /api/teams/{team_id}/members/ - Add team member
                member_data = {
                    "user_id": user_id,
                    "role": "member"
                }
                
                response = requests.post(
                    f"{BACKEND_URL}/teams/{team_id}/members/",
                    headers=get_headers(),
                    json=member_data
                )
                
                add_member_success = print_test_result("Add Team Member", response)
                
                if add_member_success:
                    added_member = response.json()
                    print(f"Added member: {added_member['user_name']} with role: {added_member['role']}")
                    
                    # Test GET /api/teams/{team_id}/members/ - Get team members
                    response = requests.get(
                        f"{BACKEND_URL}/teams/{team_id}/members/",
                        headers=get_headers()
                    )
                    
                    get_members_success = print_test_result("Get Team Members", response)
                    
                    if get_members_success:
                        members = response.json()
                        print(f"Found {len(members)} team members")
                        
                        # Verify our added member is in the list
                        found = any(member["user_id"] == user_id for member in members)
                        if found:
                            print("✅ Added member found in members list")
                        else:
                            print("❌ Added member not found in members list")
                            get_members_success = False
                    
                    # Test PUT /api/teams/{team_id}/members/{user_id} - Update member role
                    update_role_data = {
                        "new_role": "leader"
                    }
                    
                    response = requests.put(
                        f"{BACKEND_URL}/teams/{team_id}/members/{user_id}",
                        headers=get_headers(),
                        json=update_role_data
                    )
                    
                    update_member_success = print_test_result("Update Member Role", response)
                    
                    if update_member_success:
                        print(f"Updated member role to: {update_role_data['new_role']}")
                        
                        # Verify role was updated
                        response = requests.get(
                            f"{BACKEND_URL}/teams/{team_id}/members/",
                            headers=get_headers()
                        )
                        
                        if response.status_code == 200:
                            members = response.json()
                            member = next((m for m in members if m["user_id"] == user_id), None)
                            
                            if member and member["role"] == update_role_data["new_role"]:
                                print("✅ Member role was updated correctly")
                            else:
                                print("❌ Member role was not updated correctly")
                                update_member_success = False
                    
                    # Test DELETE /api/teams/{team_id}/members/{user_id} - Remove team member
                    response = requests.delete(
                        f"{BACKEND_URL}/teams/{team_id}/members/{user_id}",
                        headers=get_headers()
                    )
                    
                    remove_member_success = print_test_result("Remove Team Member", response)
                    
                    if remove_member_success:
                        print(f"Successfully removed member with ID: {user_id}")
                        
                        # Verify member was removed
                        response = requests.get(
                            f"{BACKEND_URL}/teams/{team_id}/members/",
                            headers=get_headers()
                        )
                        
                        if response.status_code == 200:
                            members = response.json()
                            found = any(member["user_id"] == user_id for member in members)
                            
                            if not found:
                                print("✅ Member was successfully removed")
                            else:
                                print("❌ Member was not removed")
                                remove_member_success = False
                else:
                    get_members_success = False
                    update_member_success = False
                    remove_member_success = False
        
        # Test DELETE /api/teams/{team_id} - Delete team
        response = requests.delete(
            f"{BACKEND_URL}/teams/{team_id}",
            headers=get_headers()
        )
        
        delete_team_success = print_test_result("Delete Team", response)
        
        if delete_team_success:
            print(f"Successfully deleted team with ID: {team_id}")
            
            # Verify team is deleted
            response = requests.get(
                f"{BACKEND_URL}/teams/{team_id}",
                headers=get_headers()
            )
            
            if response.status_code == 404:
                print("✅ Team successfully deleted (404 Not Found)")
            else:
                print(f"❌ Team not deleted properly: {response.status_code}")
                delete_team_success = False
    else:
        get_team_success = False
        update_team_success = False
        add_member_success = False
        get_members_success = False
        update_member_success = False
        remove_member_success = False
        delete_team_success = False
    
    return (list_teams_success and create_team_success and get_team_success and 
            update_team_success and add_member_success and get_members_success and 
            update_member_success and remove_member_success and delete_team_success)

def test_performance_endpoints():
    """Test Performance API endpoints"""
    print("\n=== Testing Performance API ===")
    
    # Get an active user for testing
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers()
    )
    
    if response.status_code != 200:
        print("❌ Failed to get users list")
        print(f"Response: {response.text}")
        return False
    
    users = response.json()
    active_users = [user for user in users if user["is_active"]]
    
    if not active_users:
        print("❌ No active users found for performance testing")
        return False
    
    test_user = active_users[0]
    user_id = test_user["id"]
    print(f"Using user for performance testing: {test_user['full_name']} (ID: {user_id})")
    
    # Test GET /api/performance/users/{user_id} - Get user performance
    # Test with different period types
    period_types = ["daily", "weekly", "monthly"]
    user_perf_success = True
    
    for period_type in period_types:
        response = requests.get(
            f"{BACKEND_URL}/performance/users/{user_id}?period_type={period_type}",
            headers=get_headers()
        )
        
        success = print_test_result(f"Get User Performance ({period_type})", response)
        if success:
            performance = response.json()
            print(f"User performance ({period_type}):")
            print(f"- Total tasks: {performance.get('total_tasks', 'N/A')}")
            print(f"- Completed tasks: {performance.get('completed_tasks', 'N/A')}")
            print(f"- Task completion rate: {performance.get('task_completion_rate', 'N/A')}")
            print(f"- Overall performance score: {performance.get('overall_performance_score', 'N/A')}")
        else:
            user_perf_success = False
    
    # Test GET /api/performance/summary - Get performance summary
    response = requests.get(
        f"{BACKEND_URL}/performance/summary",
        headers=get_headers()
    )
    
    summary_success = print_test_result("Get Performance Summary", response)
    if summary_success:
        summary = response.json()
        print(f"Performance summary: {len(summary)} user records")
        if len(summary) > 0:
            print("Sample user performance:")
            sample = summary[0]
            print(f"- User: {sample.get('user_name', 'N/A')}")
            print(f"- Role: {sample.get('user_role', 'N/A')}")
            print(f"- Performance trend: {sample.get('performance_trend', 'N/A')}")
            
            current_perf = sample.get('current_performance', {})
            print(f"- Current performance score: {current_perf.get('overall_performance_score', 'N/A')}")
    
    return user_perf_success and summary_success

def test_permission_management():
    """Test Permission Management API endpoints"""
    print("\n=== Testing Permission Management API ===")
    
    # Test GET /api/permissions/categories - Get permission categories
    response = requests.get(
        f"{BACKEND_URL}/permissions/categories",
        headers=get_headers()
    )
    
    categories_success = print_test_result("Get Permission Categories", response)
    if categories_success:
        categories = response.json()
        print(f"Found {len(categories)} permission categories")
        
        # Verify that all major system modules are included
        expected_modules = ["dashboard", "clients", "projects", "tasks", "documents", "human_resources", "expenses"]
        found_modules = [cat["name"] for cat in categories]
        
        all_modules_found = all(module in found_modules for module in expected_modules)
        if all_modules_found:
            print("✅ All major system modules are included in permission categories")
        else:
            missing = [module for module in expected_modules if module not in found_modules]
            print(f"❌ Missing modules in permission categories: {missing}")
            categories_success = False
    
    # Test GET /api/permissions/items - Get permission items
    response = requests.get(
        f"{BACKEND_URL}/permissions/items",
        headers=get_headers()
    )
    
    items_success = print_test_result("Get Permission Items", response)
    if items_success:
        items = response.json()
        print(f"Found {len(items)} permission items")
        
        # Verify that each category has appropriate permission items (view/edit/delete)
        item_types = set()
        for item in items:
            item_name = item["name"]
            if "view" in item_name:
                item_types.add("view")
            elif "edit" in item_name or "create" in item_name:
                item_types.add("edit")
            elif "delete" in item_name:
                item_types.add("delete")
        
        if all(item_type in item_types for item_type in ["view", "edit", "delete"]):
            print("✅ Permission items include view/edit/delete operations")
        else:
            missing = [item_type for item_type in ["view", "edit", "delete"] if item_type not in item_types]
            print(f"❌ Missing permission item types: {missing}")
            items_success = False
    
    # Get roles list for testing
    response = requests.get(
        f"{BACKEND_URL}/permissions/roles",
        headers=get_headers()
    )
    
    roles_success = print_test_result("Get Roles List", response)
    roles = []
    if roles_success:
        roles = response.json()
        print(f"Found {len(roles)} roles")
        
        # Verify that common roles are included
        expected_roles = ["admin", "staff", "manager"]
        found_roles = [role["value"] for role in roles]
        
        all_roles_found = all(role in found_roles for role in expected_roles)
        if all_roles_found:
            print("✅ All common roles are included")
        else:
            missing = [role for role in expected_roles if role not in found_roles]
            print(f"❌ Missing roles: {missing}")
            roles_success = False
    
    # Test GET /api/permissions/matrix/role/{role_name} - Get permission matrix for role
    role_matrix_success = True
    if roles and len(roles) > 0:
        test_role = "staff"  # Use 'staff' role for testing
        
        response = requests.get(
            f"{BACKEND_URL}/permissions/matrix/role/{test_role}",
            headers=get_headers()
        )
        
        role_matrix_success = print_test_result(f"Get Permission Matrix for Role '{test_role}'", response)
        if role_matrix_success:
            matrix = response.json()
            print(f"Permission matrix for role '{test_role}':")
            print(f"- Categories: {len(matrix.get('categories', []))} categories")
            print(f"- Items: {len(matrix.get('items', []))} items")
            print(f"- Current permissions: {len(matrix.get('current_permissions', []))} permissions")
            
            # Verify matrix structure
            if all(key in matrix for key in ["categories", "items", "current_permissions"]):
                print("✅ Permission matrix has correct structure")
            else:
                missing = [key for key in ["categories", "items", "current_permissions"] if key not in matrix]
                print(f"❌ Permission matrix missing keys: {missing}")
                role_matrix_success = False
    
    # Get users list for testing
    response = requests.get(
        f"{BACKEND_URL}/permissions/users",
        headers=get_headers()
    )
    
    users_success = print_test_result("Get Users List for Permission", response)
    users = []
    if users_success:
        users = response.json()
        print(f"Found {len(users)} users for permission management")
    
    # Test GET /api/permissions/matrix/user/{user_id} - Get permission matrix for user
    user_matrix_success = True
    if users and len(users) > 0:
        test_user = users[0]
        test_user_id = test_user["id"]
        
        response = requests.get(
            f"{BACKEND_URL}/permissions/matrix/user/{test_user_id}",
            headers=get_headers()
        )
        
        user_matrix_success = print_test_result(f"Get Permission Matrix for User '{test_user['full_name']}'", response)
        if user_matrix_success:
            matrix = response.json()
            print(f"Permission matrix for user '{test_user['full_name']}':")
            print(f"- Categories: {len(matrix.get('categories', []))} categories")
            print(f"- Items: {len(matrix.get('items', []))} items")
            print(f"- Current permissions: {len(matrix.get('current_permissions', []))} permissions")
            
            # Verify matrix structure
            if all(key in matrix for key in ["categories", "items", "current_permissions"]):
                print("✅ Permission matrix has correct structure")
            else:
                missing = [key for key in ["categories", "items", "current_permissions"] if key not in matrix]
                print(f"❌ Permission matrix missing keys: {missing}")
                user_matrix_success = False
    
    # Test POST /api/permissions/role/{role}/update - Update role permissions
    role_update_success = True
    if items and len(items) > 0 and roles and len(roles) > 0:
        test_role = "staff"  # Use 'staff' role for testing
        test_permissions = []
        
        # Create test permissions for a few items
        for i, item in enumerate(items):
            if i < 5:  # Just use the first 5 items for testing
                test_permissions.append({
                    "role": test_role,  # Add the role field
                    "permission_id": item["id"],
                    "can_view": True,
                    "can_edit": i % 2 == 0,  # Alternate edit permission
                    "can_delete": False
                })
        
        response = requests.post(
            f"{BACKEND_URL}/permissions/role/{test_role}/update",
            headers=get_headers(),
            json=test_permissions
        )
        
        role_update_success = print_test_result(f"Update Permissions for Role '{test_role}'", response)
        if role_update_success:
            print(f"Successfully updated permissions for role '{test_role}'")
            
            # Verify the update by getting the matrix again
            response = requests.get(
                f"{BACKEND_URL}/permissions/matrix/role/{test_role}",
                headers=get_headers()
            )
            
            if response.status_code == 200:
                matrix = response.json()
                current_permissions = matrix.get("current_permissions", [])
                
                # Check if our test permissions were applied
                if len(current_permissions) >= len(test_permissions):
                    print("✅ Role permissions were updated successfully")
                    
                    # Verify a few specific permissions
                    for test_perm in test_permissions:
                        found = False
                        for current_perm in current_permissions:
                            if current_perm["permission_id"] == test_perm["permission_id"]:
                                found = True
                                if (current_perm["can_view"] == test_perm["can_view"] and
                                    current_perm["can_edit"] == test_perm["can_edit"] and
                                    current_perm["can_delete"] == test_perm["can_delete"]):
                                    print(f"✅ Permission {test_perm['permission_id']} updated correctly")
                                else:
                                    print(f"❌ Permission {test_perm['permission_id']} not updated correctly")
                                    role_update_success = False
                                break
                        
                        if not found:
                            print(f"❌ Permission {test_perm['permission_id']} not found after update")
                            role_update_success = False
                else:
                    print("❌ Role permissions were not updated correctly")
                    role_update_success = False
            else:
                print(f"❌ Failed to verify role permissions update: {response.status_code}")
                role_update_success = False
    
    # Test POST /api/permissions/user/{user_id}/update - Update user permissions
    user_update_success = True
    if items and len(items) > 0 and users and len(users) > 0:
        test_user = users[0]
        test_user_id = test_user["id"]
        test_permissions = []
        
        # Create test permissions for a few items with override
        for i, item in enumerate(items):
            if i < 5:  # Just use the first 5 items for testing
                test_permissions.append({
                    "user_id": test_user_id,  # Add the user_id field
                    "permission_id": item["id"],
                    "can_view": True,
                    "can_edit": i % 2 == 0,  # Alternate edit permission
                    "can_delete": i % 3 == 0,  # Some delete permissions
                    "override_role": True  # Override role permissions
                })
        
        response = requests.post(
            f"{BACKEND_URL}/permissions/user/{test_user_id}/update",
            headers=get_headers(),
            json=test_permissions
        )
        
        user_update_success = print_test_result(f"Update Permissions for User '{test_user['full_name']}'", response)
        if user_update_success:
            print(f"Successfully updated permissions for user '{test_user['full_name']}'")
            
            # Verify the update by getting the matrix again
            response = requests.get(
                f"{BACKEND_URL}/permissions/matrix/user/{test_user_id}",
                headers=get_headers()
            )
            
            if response.status_code == 200:
                matrix = response.json()
                current_permissions = matrix.get("current_permissions", [])
                
                # Check if our test permissions were applied
                if len(current_permissions) >= len(test_permissions):
                    print("✅ User permissions were updated successfully")
                    
                    # Verify a few specific permissions
                    for test_perm in test_permissions:
                        found = False
                        for current_perm in current_permissions:
                            if current_perm["permission_id"] == test_perm["permission_id"]:
                                found = True
                                if (current_perm["can_view"] == test_perm["can_view"] and
                                    current_perm["can_edit"] == test_perm["can_edit"] and
                                    current_perm["can_delete"] == test_perm["can_delete"] and
                                    current_perm["override_role"] == test_perm["override_role"]):
                                    print(f"✅ Permission {test_perm['permission_id']} updated correctly")
                                else:
                                    print(f"❌ Permission {test_perm['permission_id']} not updated correctly")
                                    user_update_success = False
                                break
                        
                        if not found:
                            print(f"❌ Permission {test_perm['permission_id']} not found after update")
                            user_update_success = False
                else:
                    print("❌ User permissions were not updated correctly")
                    user_update_success = False
            else:
                print(f"❌ Failed to verify user permissions update: {response.status_code}")
                user_update_success = False
    
    return (categories_success and items_success and roles_success and 
            role_matrix_success and users_success and user_matrix_success and 
            role_update_success and user_update_success)

def main():
    """Main test function"""
    print("=== Starting API Tests ===")
    
    # Get authentication token
    if not get_token():
        print("Failed to authenticate. Exiting tests.")
        return
    
    # Test permission management endpoints
    permission_management_success = test_permission_management()
    
    # Test team management endpoints
    team_management_success = test_team_management()
    
    # Test performance endpoints
    performance_success = test_performance_endpoints()
    
    # Test internal task management API with feedback functionality
    internal_task_success = test_internal_task_management()
    
    print("\n=== Test Results ===")
    print(f"Permission Management API: {'✅' if permission_management_success else '❌'}")
    print(f"Team Management API: {'✅' if team_management_success else '❌'}")
    print(f"Performance API: {'✅' if performance_success else '❌'}")
    print(f"Internal Task Management API: {'✅' if internal_task_success else '❌'}")
    
    print("\n=== All tests completed ===")

if __name__ == "__main__":
    main()
