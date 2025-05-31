
import requests
import sys
from datetime import datetime, timedelta
import time
import io
import os
import json

class CRMAPITester:
    def __init__(self, base_url=None):
        # Get backend URL from frontend .env file if not provided
        if base_url is None:
            try:
                with open('/app/frontend/.env', 'r') as f:
                    for line in f:
                        if line.startswith('REACT_APP_BACKEND_URL='):
                            base_url = line.strip().split('=')[1].strip('"\'') + '/api'
                            break
            except Exception as e:
                print(f"Error reading REACT_APP_BACKEND_URL from .env: {e}")
                base_url = "https://b3e10cfb-dcad-4f9b-8473-d7104a7ee54b.preview.emergentagent.com/api"
        
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.client_id = None
        self.project_id = None
        self.task_id = None
        self.folder_id = None
        self.document_id = None
        self.created_users = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_setup(self):
        """Test system setup"""
        return self.run_test("System Setup", "POST", "setup", 200)

    def test_login(self, email="admin@example.com", password="admin123"):
        """Test login and get token"""
        # For login we need to use form data
        url = f"{self.base_url}/token"
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        data = {
            'username': email,
            'password': password
        }
        
        print(f"\n🔍 Testing Login for {email}...")
        self.tests_run += 1
        
        try:
            response = requests.post(url, data=data, headers=headers)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                response_data = response.json()
                self.token = response_data.get('access_token')
                return True, response_data
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test("Get Current User", "GET", "users/me/", 200)
        if success:
            self.user_id = response.get('id')
            print(f"Current user: {response.get('email')} (Role: {response.get('role')})")
        return success, response

    def test_create_user(self, email, full_name, role, password):
        """Test creating a new user"""
        user_data = {
            "email": email,
            "full_name": full_name,
            "role": role,
            "password": password
        }
        
        success, response = self.run_test(f"Create User ({role})", "POST", "users/", 200, user_data)
        if success:
            self.created_users.append({"email": email, "password": password, "role": role})
            print(f"✅ Created user: {email} with role: {role}")
        return success, response

    def test_get_users(self):
        """Test getting all users"""
        success, response = self.run_test("Get All Users", "GET", "users/", 200)
        if success:
            print(f"Total users: {len(response)}")
            for user in response:
                print(f"- {user.get('email')} (Role: {user.get('role')})")
        return success, response

    def test_create_client(self):
        """Test creating a new client"""
        client_data = {
            "name": f"Test Client {datetime.now().strftime('%H%M%S')}",
            "company": "Test Company",
            "industry": "Technology",
            "size": "11-50",
            "website": "https://example.com",
            "phone": "123-456-7890",
            "contact_name": "John Doe",
            "contact_email": "john@example.com",
            "contact_phone": "123-456-7890",
            "notes": "This is a test client",
            "tags": ["test", "api"]
        }
        
        success, response = self.run_test("Create Client", "POST", "clients/", 200, client_data)
        if success:
            self.client_id = response.get('id')
        return success, response

    def test_get_clients(self):
        """Test getting all clients"""
        return self.run_test("Get All Clients", "GET", "clients/", 200)

    def test_get_client(self):
        """Test getting a specific client"""
        if not self.client_id:
            print("❌ Cannot test get_client: No client_id available")
            return False, {}
        return self.run_test("Get Client", "GET", f"clients/{self.client_id}", 200)

    def test_create_project(self):
        """Test creating a new project"""
        if not self.client_id:
            print("❌ Cannot test create_project: No client_id available")
            return False, {}
            
        project_data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "client_id": self.client_id,
            "description": "This is a test project",
            "start_date": datetime.now().isoformat(),
            "end_date": datetime.now().isoformat(),
            "budget": 10000,
            "status": "planning"
        }
        
        success, response = self.run_test("Create Project", "POST", "projects/", 200, project_data)
        if success:
            self.project_id = response.get('id')
        return success, response

    def test_get_projects(self):
        """Test getting all projects"""
        return self.run_test("Get All Projects", "GET", "projects/", 200)
    
    def test_create_task(self):
        """Test creating a new task"""
        if not self.project_id:
            print("❌ Cannot test create_task: No project_id available")
            return False, {}
            
        task_data = {
            "title": f"Test Task {datetime.now().strftime('%H%M%S')}",
            "project_id": self.project_id,
            "description": "This is a test task",
            "assigned_to": self.user_id,
            "due_date": (datetime.now()).isoformat(),
            "priority": "medium",
            "status": "to_do"
        }
        
        success, response = self.run_test("Create Task", "POST", "tasks/", 200, task_data)
        if success:
            self.task_id = response.get('id')
        return success, response
    
    def test_get_tasks(self):
        """Test getting all tasks"""
        return self.run_test("Get All Tasks", "GET", "tasks/", 200)
    
    def test_update_task_status(self):
        """Test updating a task status"""
        if not self.task_id:
            print("❌ Cannot test update_task_status: No task_id available")
            return False, {}
            
        # First get the current task data
        success, task = self.run_test("Get Task", "GET", f"tasks/{self.task_id}", 200)
        if not success:
            return False, {}
            
        # Update the status to in_progress
        task["status"] = "in_progress"
        return self.run_test("Update Task Status", "PUT", f"tasks/{self.task_id}", 200, task)

    def test_get_dashboard(self):
        """Test getting dashboard data"""
        return self.run_test("Get Dashboard Data", "GET", "dashboard", 200)

    def test_create_demo_accounts(self):
        """Create demo accounts with different roles"""
        # Define demo accounts
        demo_accounts = [
            {"email": "admin@crm.com", "full_name": "Admin User", "role": "admin", "password": "admin123"},
            {"email": "sale@crm.com", "full_name": "Sales User", "role": "account", "password": "sale123"},
            {"email": "editor@crm.com", "full_name": "Editor User", "role": "creative", "password": "editor123"},
            {"email": "content@crm.com", "full_name": "Content User", "role": "staff", "password": "content123"},
            {"email": "design@crm.com", "full_name": "Design User", "role": "creative", "password": "design123"},
            {"email": "manager@crm.com", "full_name": "Manager User", "role": "account", "password": "manager123"},
            {"email": "finance@crm.com", "full_name": "Finance User", "role": "account", "password": "finance123"}
        ]
        
        success_count = 0
        for account in demo_accounts:
            success, _ = self.test_create_user(
                account["email"], 
                account["full_name"], 
                account["role"], 
                account["password"]
            )
            if success:
                success_count += 1
        
        print(f"\n✅ Created {success_count}/{len(demo_accounts)} demo accounts")
        return success_count == len(demo_accounts), self.created_users

    def test_login_all_accounts(self):
        """Test login for all created accounts"""
        if not self.created_users:
            print("❌ No users created to test login")
            return False, {}
        
        success_count = 0
        for user in self.created_users:
            print(f"\n🔍 Testing login for {user['email']} (Role: {user['role']})")
            success, _ = self.test_login(user["email"], user["password"])
            if success:
                # Verify we can get user info
                user_success, user_data = self.test_get_current_user()
                if user_success and user_data.get("email") == user["email"]:
                    success_count += 1
                    print(f"✅ Successfully logged in and verified user: {user['email']}")
                else:
                    print(f"❌ Failed to verify user data for: {user['email']}")
            else:
                print(f"❌ Failed to login as: {user['email']}")
        
        print(f"\n✅ Successfully logged in to {success_count}/{len(self.created_users)} accounts")
        return success_count == len(self.created_users), {}
        
    # Document Management API Tests
    
    def test_create_folder(self, folder_data=None):
        """Test creating a new folder"""
        if folder_data is None:
            folder_data = {
                "name": f"Marketing Documents {datetime.now().strftime('%H%M%S')}",
                "color": "#FF5722",
                "permissions": "all",
                "description": "Tài liệu marketing"
            }
        
        success, response = self.run_test("Create Folder", "POST", "folders/", 200, folder_data)
        if success:
            self.folder_id = response.get('id')
            print(f"✅ Created folder: {response.get('name')} with ID: {self.folder_id}")
        return success, response
    
    def test_get_folders(self):
        """Test getting all folders"""
        success, response = self.run_test("Get All Folders", "GET", "folders/", 200)
        if success:
            print(f"Total folders: {len(response)}")
            for folder in response:
                print(f"- {folder.get('name')} (ID: {folder.get('id')})")
        return success, response
    
    def test_get_folder(self, folder_id=None):
        """Test getting a specific folder"""
        if folder_id is None:
            folder_id = self.folder_id
            
        if not folder_id:
            print("❌ Cannot test get_folder: No folder_id available")
            return False, {}
            
        return self.run_test("Get Folder", "GET", f"folders/{folder_id}", 200)
    
    def test_update_folder(self, folder_id=None):
        """Test updating a folder"""
        if folder_id is None:
            folder_id = self.folder_id
            
        if not folder_id:
            print("❌ Cannot test update_folder: No folder_id available")
            return False, {}
        
        # First get the current folder data
        success, folder = self.run_test("Get Folder", "GET", f"folders/{folder_id}", 200)
        if not success:
            return False, {}
        
        # Update the folder name and description
        folder_data = {
            "name": f"Updated Folder {datetime.now().strftime('%H%M%S')}",
            "color": folder.get("color"),
            "permissions": folder.get("permissions"),
            "description": "Updated folder description"
        }
        
        return self.run_test("Update Folder", "PUT", f"folders/{folder_id}", 200, folder_data)
    
    def test_delete_folder(self, folder_id=None):
        """Test deleting a folder"""
        if folder_id is None:
            folder_id = self.folder_id
            
        if not folder_id:
            print("❌ Cannot test delete_folder: No folder_id available")
            return False, {}
            
        return self.run_test("Delete Folder", "DELETE", f"folders/{folder_id}", 200)
    
    def test_create_document(self, document_data=None):
        """Test creating a new document"""
        if not self.folder_id:
            print("❌ Cannot test create_document: No folder_id available")
            return False, {}
            
        if document_data is None:
            document_data = {
                "title": f"Social Media Strategy {datetime.now().strftime('%H%M%S')}",
                "folder_id": self.folder_id,
                "link": "https://example.com/doc",
                "description": "Chiến lược social media 2024"
            }
        
        success, response = self.run_test("Create Document", "POST", "documents/", 200, document_data)
        if success:
            self.document_id = response.get('id')
            print(f"✅ Created document: {response.get('title')} with ID: {self.document_id}")
        return success, response
    
    def test_get_documents(self):
        """Test getting all documents"""
        success, response = self.run_test("Get All Documents", "GET", "documents/", 200)
        if success:
            print(f"Total documents: {len(response)}")
            for doc in response:
                print(f"- {doc.get('title')} (ID: {doc.get('id')})")
        return success, response
    
    def test_get_folder_documents(self, folder_id=None):
        """Test getting documents by folder"""
        if folder_id is None:
            folder_id = self.folder_id
            
        if not folder_id:
            print("❌ Cannot test get_folder_documents: No folder_id available")
            return False, {}
            
        success, response = self.run_test("Get Folder Documents", "GET", f"documents/folder/{folder_id}", 200)
        if success:
            print(f"Documents in folder: {len(response)}")
            for doc in response:
                print(f"- {doc.get('title')} (ID: {doc.get('id')})")
        return success, response
    
    def test_get_document(self, document_id=None):
        """Test getting a specific document"""
        if document_id is None:
            document_id = self.document_id
            
        if not document_id:
            print("❌ Cannot test get_document: No document_id available")
            return False, {}
            
        return self.run_test("Get Document", "GET", f"documents/{document_id}", 200)
    
    def test_update_document(self, document_id=None):
        """Test updating a document"""
        if document_id is None:
            document_id = self.document_id
            
        if not document_id:
            print("❌ Cannot test update_document: No document_id available")
            return False, {}
        
        # First get the current document data
        success, document = self.run_test("Get Document", "GET", f"documents/{document_id}", 200)
        if not success:
            return False, {}
        
        # Update the document title and description
        document_data = {
            "title": f"Updated Document {datetime.now().strftime('%H%M%S')}",
            "folder_id": document.get("folder_id"),
            "link": document.get("link"),
            "description": "Updated document description"
        }
        
        return self.run_test("Update Document", "PUT", f"documents/{document_id}", 200, document_data)
    
    def test_delete_document(self, document_id=None):
        """Test deleting a document"""
        if document_id is None:
            document_id = self.document_id
            
        if not document_id:
            print("❌ Cannot test delete_document: No document_id available")
            return False, {}
            
        return self.run_test("Delete Document", "DELETE", f"documents/{document_id}", 200)
    
    def test_bulk_archive_documents(self, document_ids=None):
        """Test bulk archiving documents"""
        if document_ids is None:
            if not self.document_id:
                print("❌ Cannot test bulk_archive_documents: No document_id available")
                return False, {}
            document_ids = [self.document_id]
        
        return self.run_test("Bulk Archive Documents", "POST", "documents/bulk-archive", 200, document_ids)
    
    def test_bulk_restore_documents(self, document_ids=None):
        """Test bulk restoring documents"""
        if document_ids is None:
            if not self.document_id:
                print("❌ Cannot test bulk_restore_documents: No document_id available")
                return False, {}
            document_ids = [self.document_id]
        
        return self.run_test("Bulk Restore Documents", "POST", "documents/bulk-restore", 200, document_ids)
    
    def test_bulk_delete_documents(self, document_ids=None):
        """Test bulk deleting documents"""
        if document_ids is None:
            if not self.document_id:
                print("❌ Cannot test bulk_delete_documents: No document_id available")
                return False, {}
            document_ids = [self.document_id]
        
        return self.run_test("Bulk Delete Documents", "POST", "documents/bulk-delete", 200, document_ids)
    
    def test_document_permissions(self):
        """Test document permissions with different roles"""
        # Store original token
        original_token = self.token
        
        # Create a test folder with admin-only permissions
        admin_folder_data = {
            "name": f"Admin Only Folder {datetime.now().strftime('%H%M%S')}",
            "color": "#FF0000",
            "permissions": "admin",
            "description": "Admin only folder"
        }
        admin_folder_success, admin_folder = self.test_create_folder(admin_folder_data)
        admin_folder_id = admin_folder.get('id') if admin_folder_success else None
        
        # Create a test document in the admin folder
        if admin_folder_id:
            admin_doc_data = {
                "title": f"Admin Document {datetime.now().strftime('%H%M%S')}",
                "folder_id": admin_folder_id,
                "link": "https://example.com/admin-doc",
                "description": "Admin only document"
            }
            admin_doc_success, admin_doc = self.run_test("Create Admin Document", "POST", "documents/", 200, admin_doc_data)
            admin_doc_id = admin_doc.get('id') if admin_doc_success else None
        
        # Get existing users if we don't have any
        if not self.created_users:
            success, users = self.run_test("Get All Users", "GET", "users/", 200)
            if success:
                for user in users:
                    if user.get('email') != 'admin@example.com':  # Skip the main admin
                        self.created_users.append({
                            "email": user.get('email'),
                            "role": user.get('role'),
                            "password": user.get('email').split('@')[0] + "123"  # Assume password pattern
                        })
        
        # Test with different roles
        results = {}
        for user in self.created_users:
            if user["role"] != "admin":  # Skip admin users
                print(f"\n🔍 Testing permissions for {user['email']} (Role: {user['role']})")
                
                # Login as this user
                login_success, _ = self.test_login(user["email"], user["password"])
                if login_success:
                    # Try to access admin folder
                    if admin_folder_id:
                        folder_access, _ = self.run_test(f"{user['role']} accessing admin folder", 
                                                      "GET", f"folders/{admin_folder_id}", 403)
                        # If folder_access is True, the test passed (got 403 as expected)
                        results[f"{user['role']}_folder_access"] = folder_access
                    
                    # Try to access admin document
                    if admin_folder_id and admin_doc_id:
                        doc_access, _ = self.run_test(f"{user['role']} accessing admin document", 
                                                   "GET", f"documents/{admin_doc_id}", 403)
                        # If doc_access is True, the test passed (got 403 as expected)
                        results[f"{user['role']}_doc_access"] = doc_access
        
        # Restore original token (admin)
        self.token = original_token
        
        # Clean up
        if admin_doc_id:
            self.test_delete_document(admin_doc_id)
        if admin_folder_id:
            self.test_delete_folder(admin_folder_id)
        
        # Check if all permission tests passed
        all_passed = all(results.values()) if results else False
        if all_passed:
            print("✅ All permission tests passed - non-admin users cannot access admin resources")
        else:
            print("❌ Some permission tests failed")
            for test, result in results.items():
                print(f"- {test}: {'Passed' if result else 'Failed'}")
        
        return all_passed, results
        
    def test_create_project_with_new_fields(self):
        """Test creating a project with new fields: team, contract_value, debt, archived"""
        if not self.client_id:
            print("❌ Cannot test create_project_with_new_fields: No client_id available")
            return False, {}
            
        project_data = {
            "name": f"Test Project with New Fields {datetime.now().strftime('%H%M%S')}",
            "client_id": self.client_id,
            "description": "This is a test project with new fields",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "budget": 10000,
            "status": "planning",
            "team": [self.user_id] if self.user_id else [],
            "contract_value": 100000,
            "debt": 20000,
            "archived": False
        }
        
        success, response = self.run_test("Create Project with New Fields", "POST", "projects/", 200, project_data)
        if success:
            self.project_id = response.get('id')
            print(f"✅ Created project with new fields: {response.get('name')} with ID: {self.project_id}")
            
            # Verify all fields were saved correctly
            for key, value in project_data.items():
                if key in ['start_date', 'end_date']:  # Skip date comparison
                    continue
                if response.get(key) != value:
                    print(f"❌ Field mismatch: {key} expected {value}, got {response.get(key)}")
                    success = False
            
            if success:
                print("✅ All fields were saved correctly")
        
        return success, response
    
    def test_update_project_with_new_fields(self):
        """Test updating a project with new fields"""
        if not self.project_id:
            print("❌ Cannot test update_project_with_new_fields: No project_id available")
            return False, {}
        
        # First get the current project data
        success, project = self.run_test("Get Project", "GET", f"projects/{self.project_id}", 200)
        if not success:
            return False, {}
        
        # Update the project with new values
        updated_data = {
            "name": project.get("name"),
            "client_id": project.get("client_id"),
            "description": "Updated project description",
            "start_date": project.get("start_date"),
            "end_date": project.get("end_date"),
            "budget": project.get("budget"),
            "status": "in_progress",  # Change status
            "team": project.get("team", []) + ["new_user_id"],  # Add a team member
            "contract_value": 150000,  # Update contract value
            "debt": 10000,  # Update debt
            "archived": False
        }
        
        success, response = self.run_test("Update Project with New Fields", "PUT", f"projects/{self.project_id}", 200, updated_data)
        if success:
            print(f"✅ Updated project with new fields: {response.get('name')}")
            
            # Verify all fields were updated correctly
            for key, value in updated_data.items():
                if key in ['start_date', 'end_date']:  # Skip date comparison
                    continue
                if response.get(key) != value:
                    print(f"❌ Field mismatch: {key} expected {value}, got {response.get(key)}")
                    success = False
            
            if success:
                print("✅ All fields were updated correctly")
        
        return success, response
    
    def test_projects_with_filters(self):
        """Test getting projects with various filters"""
        # Create multiple projects with different statuses and dates for testing
        if not self.client_id:
            print("❌ Cannot test projects_with_filters: No client_id available")
            return False, {}
        
        # Create projects with different statuses
        statuses = ["planning", "in_progress", "completed", "pending", "overdue"]
        project_ids = []
        
        for status in statuses:
            project_data = {
                "name": f"Test {status.capitalize()} Project {datetime.now().strftime('%H%M%S')}",
                "client_id": self.client_id,
                "description": f"This is a test {status} project",
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "status": status,
                "team": [self.user_id] if self.user_id else [],
                "contract_value": 100000,
                "debt": 20000,
                "archived": False
            }
            
            success, response = self.run_test(f"Create {status.capitalize()} Project", "POST", "projects/", 200, project_data)
            if success:
                project_ids.append(response.get('id'))
        
        # Create an archived project
        archived_project_data = {
            "name": f"Archived Project {datetime.now().strftime('%H%M%S')}",
            "client_id": self.client_id,
            "description": "This is an archived project",
            "status": "completed",
            "archived": True
        }
        
        success, response = self.run_test("Create Archived Project", "POST", "projects/", 200, archived_project_data)
        if success:
            archived_project_id = response.get('id')
            project_ids.append(archived_project_id)
        
        # Test filters
        filter_tests = [
            {"name": "Get All Projects", "params": "", "expected_count": len(project_ids)},
            {"name": "Filter by Archived=true", "params": "?archived=true", "expected_min": 1},
            {"name": "Filter by Archived=false", "params": "?archived=false", "expected_min": len(project_ids) - 1},
            {"name": "Filter by Status=in_progress", "params": "?status=in_progress", "expected_min": 1},
            {"name": "Filter by Status=completed", "params": "?status=completed", "expected_min": 1},
            {"name": "Filter by Team Member", "params": f"?team_member={self.user_id}" if self.user_id else "?team_member=any", "expected_min": 1},
            {"name": "Filter by Search", "params": "?search=test", "expected_min": 1},
            {"name": "Filter by Year", "params": f"?year={datetime.now().year}", "expected_min": 1},
            {"name": "Filter by Year and Month", "params": f"?year={datetime.now().year}&month={datetime.now().month}", "expected_min": 1},
            {"name": "Filter by Year and Quarter", "params": f"?year={datetime.now().year}&quarter={(datetime.now().month-1)//3+1}", "expected_min": 1},
            {"name": "Combined Filters", "params": f"?archived=false&status=in_progress&year={datetime.now().year}", "expected_min": 1}
        ]
        
        filter_results = {}
        for test in filter_tests:
            success, response = self.run_test(test["name"], "GET", f"projects/{test['params']}", 200)
            if success:
                count = len(response)
                expected = test.get("expected_count", test.get("expected_min", 0))
                if "expected_count" in test:
                    filter_results[test["name"]] = count == expected
                    print(f"  - Expected exactly {expected} projects, got {count}")
                else:
                    filter_results[test["name"]] = count >= expected
                    print(f"  - Expected at least {expected} projects, got {count}")
            else:
                filter_results[test["name"]] = False
        
        # Clean up - delete the test projects
        for project_id in project_ids:
            self.run_test(f"Delete Test Project", "DELETE", f"projects/{project_id}", 200)
        
        # Check if all filter tests passed
        all_passed = all(filter_results.values())
        if all_passed:
            print("✅ All project filter tests passed")
        else:
            print("❌ Some project filter tests failed")
            for test, result in filter_results.items():
                print(f"  - {test}: {'Passed' if result else 'Failed'}")
        
        return all_passed, filter_results
    
    def test_projects_statistics(self):
        """Test the projects statistics API with different time filters"""
        # Create projects with different statuses for testing
        if not self.client_id:
            print("❌ Cannot test projects_statistics: No client_id available")
            return False, {}
        
        # Create projects with different statuses
        statuses = ["in_progress", "completed", "pending", "overdue"]
        project_ids = []
        
        for status in statuses:
            project_data = {
                "name": f"Stats {status.capitalize()} Project {datetime.now().strftime('%H%M%S')}",
                "client_id": self.client_id,
                "description": f"This is a test {status} project for statistics",
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() - timedelta(days=5)).isoformat() if status == "overdue" else (datetime.now() + timedelta(days=30)).isoformat(),
                "status": status,
                "archived": False
            }
            
            success, response = self.run_test(f"Create {status.capitalize()} Project for Stats", "POST", "projects/", 200, project_data)
            if success:
                project_ids.append(response.get('id'))
        
        # Test statistics endpoints
        stats_tests = [
            {"name": "Get All Projects Statistics", "params": "", "expected_keys": ["total_projects", "in_progress", "completed", "pending", "overdue"]},
            {"name": "Statistics by Year", "params": f"?year={datetime.now().year}", "expected_keys": ["total_projects", "in_progress", "completed", "pending", "overdue"]},
            {"name": "Statistics by Year and Month", "params": f"?year={datetime.now().year}&month={datetime.now().month}", "expected_keys": ["total_projects", "in_progress", "completed", "pending", "overdue"]},
            {"name": "Statistics by Year and Quarter", "params": f"?year={datetime.now().year}&quarter={(datetime.now().month-1)//3+1}", "expected_keys": ["total_projects", "in_progress", "completed", "pending", "overdue"]}
        ]
        
        stats_results = {}
        for test in stats_tests:
            success, response = self.run_test(test["name"], "GET", f"projects/statistics{test['params']}", 200)
            if success:
                # Check if all expected keys are present
                keys_present = all(key in response for key in test["expected_keys"])
                stats_results[test["name"]] = keys_present
                
                if keys_present:
                    print(f"  - All expected keys present: {', '.join(test['expected_keys'])}")
                    print(f"  - Statistics: {response}")
                else:
                    print(f"  - Missing keys. Expected: {test['expected_keys']}, Got: {list(response.keys())}")
            else:
                stats_results[test["name"]] = False
        
        # Clean up - delete the test projects
        for project_id in project_ids:
            self.run_test(f"Delete Test Project", "DELETE", f"projects/{project_id}", 200)
        
        # Check if all statistics tests passed
        all_passed = all(stats_results.values())
        if all_passed:
            print("✅ All project statistics tests passed")
        else:
            print("❌ Some project statistics tests failed")
            for test, result in stats_results.items():
                print(f"  - {test}: {'Passed' if result else 'Failed'}")
        
        return all_passed, stats_results
    
    def test_projects_bulk_operations(self):
        """Test bulk operations for projects: archive, restore, delete"""
        if not self.client_id:
            print("❌ Cannot test projects_bulk_operations: No client_id available")
            return False, {}
        
        # Create multiple projects for testing bulk operations
        project_ids = []
        for i in range(3):
            project_data = {
                "name": f"Bulk Test Project {i} {datetime.now().strftime('%H%M%S')}",
                "client_id": self.client_id,
                "description": f"This is test project {i} for bulk operations",
                "status": "planning",
                "archived": False
            }
            
            success, response = self.run_test(f"Create Project {i} for Bulk Ops", "POST", "projects/", 200, project_data)
            if success:
                project_ids.append(response.get('id'))
        
        if len(project_ids) < 3:
            print(f"❌ Failed to create enough test projects. Only created {len(project_ids)}/3")
            return False, {}
        
        # Test bulk archive
        success, response = self.run_test("Bulk Archive Projects", "POST", "projects/bulk-archive", 200, project_ids)
        if success:
            print(f"✅ Successfully archived {response.get('detail', '').split()[0]} projects")
            
            # Verify projects are archived
            for project_id in project_ids:
                verify_success, project = self.run_test(f"Verify Project {project_id} Archived", "GET", f"projects/{project_id}", 200)
                if verify_success and not project.get('archived', False):
                    print(f"❌ Project {project_id} was not archived")
                    success = False
        
        # Test bulk restore
        if success:
            success, response = self.run_test("Bulk Restore Projects", "POST", "projects/bulk-restore", 200, project_ids)
            if success:
                print(f"✅ Successfully restored {response.get('detail', '').split()[0]} projects")
                
                # Verify projects are restored
                for project_id in project_ids:
                    verify_success, project = self.run_test(f"Verify Project {project_id} Restored", "GET", f"projects/{project_id}", 200)
                    if verify_success and project.get('archived', True):
                        print(f"❌ Project {project_id} was not restored")
                        success = False
        
        # Test bulk delete (admin only)
        if success:
            success, response = self.run_test("Bulk Delete Projects", "POST", "projects/bulk-delete", 200, project_ids)
            if success:
                print(f"✅ Successfully deleted {response.get('detail', '').split()[0]} projects")
                
                # Verify projects are deleted
                for project_id in project_ids:
                    verify_success, _ = self.run_test(f"Verify Project {project_id} Deleted", "GET", f"projects/{project_id}", 404)
                    if not verify_success:
                        print(f"❌ Project {project_id} was not deleted")
                        success = False
            
            # Projects are deleted, so clear the list
            project_ids = []
        
        # Clean up any remaining projects
        for project_id in project_ids:
            self.run_test(f"Delete Test Project", "DELETE", f"projects/{project_id}", 200)
        
        return success, {}
    
    def test_projects_error_handling(self):
        """Test error handling for projects API"""
        error_tests = []
        
        # Test invalid year/quarter/month values
        invalid_time_params = [
            {"name": "Invalid Year", "params": "?year=invalid", "expected_status": 422},
            {"name": "Invalid Quarter", "params": "?year=2024&quarter=5", "expected_status": 422},
            {"name": "Invalid Month", "params": "?year=2024&month=13", "expected_status": 422}
        ]
        
        for test in invalid_time_params:
            success, _ = self.run_test(test["name"], "GET", f"projects/{test['params']}", test["expected_status"])
            error_tests.append({"name": test["name"], "success": success})
        
        # Test non-existent project IDs for bulk operations
        non_existent_ids = ["non_existent_id1", "non_existent_id2"]
        
        bulk_ops_tests = [
            {"name": "Bulk Archive Non-existent Projects", "endpoint": "projects/bulk-archive", "expected_status": 200},
            {"name": "Bulk Restore Non-existent Projects", "endpoint": "projects/bulk-restore", "expected_status": 200},
            {"name": "Bulk Delete Non-existent Projects", "endpoint": "projects/bulk-delete", "expected_status": 200}
        ]
        
        for test in bulk_ops_tests:
            success, _ = self.run_test(test["name"], "POST", test["endpoint"], test["expected_status"], non_existent_ids)
            error_tests.append({"name": test["name"], "success": success})
        
        # Test permissions (non-admin trying bulk delete)
        # First create a non-admin user if we don't have one
        non_admin_user = None
        for user in self.created_users:
            if user["role"] != "admin":
                non_admin_user = user
                break
        
        if not non_admin_user:
            # Create a non-admin user
            non_admin_email = f"nonadmin_{datetime.now().strftime('%H%M%S')}@example.com"
            non_admin_password = "nonadmin123"
            success, _ = self.test_create_user(non_admin_email, "Non Admin User", "account", non_admin_password)
            if success:
                non_admin_user = {"email": non_admin_email, "password": non_admin_password, "role": "account"}
                self.created_users.append(non_admin_user)
        
        if non_admin_user:
            # Store original token
            original_token = self.token
            
            # Login as non-admin user
            login_success, _ = self.test_login(non_admin_user["email"], non_admin_user["password"])
            if login_success:
                # Try to bulk delete projects as non-admin
                success, _ = self.run_test("Non-admin Bulk Delete", "POST", "projects/bulk-delete", 403, non_existent_ids)
                error_tests.append({"name": "Non-admin Bulk Delete", "success": success})
            
            # Restore original token
            self.token = original_token
        
        # Check if all error handling tests passed
        all_passed = all(test["success"] for test in error_tests)
        if all_passed:
            print("✅ All project error handling tests passed")
        else:
            print("❌ Some project error handling tests failed")
            for test in error_tests:
                print(f"  - {test['name']}: {'Passed' if test['success'] else 'Failed'}")
        
        return all_passed, error_tests

def main():
    # Setup
    tester = CRMAPITester()
    
    # Run tests
    print("🚀 Starting CRM API Tests")
    print(f"Using backend URL: {tester.base_url}")
    
    # Test health check
    health_success, _ = tester.test_health()
    
    # Test login with admin
    login_success, _ = tester.test_login("admin@example.com", "admin123")
    if not login_success:
        print("❌ Login failed, stopping tests")
        return 1
    
    # Test user info
    tester.test_get_current_user()
    
    # Create a test client for project tests
    client_success, _ = tester.test_create_client()
    if not client_success:
        print("❌ Failed to create test client, stopping tests")
        return 1
    
    # Test Projects API with new features
    print("\n🚀 Starting Projects API Tests")
    
    # Test Project model fields
    print("\n📋 Testing Project Model Fields")
    tester.test_create_project_with_new_fields()
    tester.test_update_project_with_new_fields()
    
    # Test Projects with filters
    print("\n🔍 Testing Projects API with Filters")
    tester.test_projects_with_filters()
    
    # Test Projects Statistics API
    print("\n📊 Testing Projects Statistics API")
    tester.test_projects_statistics()
    
    # Test Projects Bulk Operations
    print("\n🔄 Testing Projects Bulk Operations")
    tester.test_projects_bulk_operations()
    
    # Test Projects Error Handling
    print("\n⚠️ Testing Projects Error Handling")
    tester.test_projects_error_handling()
    
    # Initialize class attributes for document tests
    tester.folder_id = None
    tester.document_id = None
    
    print("\n🚀 Starting Document Management API Tests")
    
    # Test Folder endpoints
    print("\n📁 Testing Folder Endpoints")
    folder_success, folder = tester.test_create_folder()
    if folder_success:
        tester.test_get_folders()
        tester.test_get_folder()
        tester.test_update_folder()
    
    # Test Document endpoints
    if folder_success:
        print("\n📄 Testing Document Endpoints")
        doc_success, doc = tester.test_create_document()
        if doc_success:
            tester.test_get_documents()
            tester.test_get_folder_documents()
            tester.test_get_document()
            tester.test_update_document()
    
    # Test bulk operations
    if folder_success and doc_success:
        print("\n🔄 Testing Bulk Operations")
        # Create a second document for bulk operations
        second_doc_data = {
            "title": f"Second Document {datetime.now().strftime('%H%M%S')}",
            "folder_id": tester.folder_id,
            "link": "https://example.com/doc2",
            "description": "Second test document"
        }
        second_doc_success, second_doc = tester.test_create_document(second_doc_data)
        
        if second_doc_success:
            doc_ids = [tester.document_id, second_doc.get('id')]
            
            # Test bulk archive
            tester.test_bulk_archive_documents(doc_ids)
            
            # Verify documents are archived
            archived_docs, _ = tester.run_test("Get Archived Documents", "GET", f"documents/?archived=true", 200)
            
            # Test bulk restore
            tester.test_bulk_restore_documents(doc_ids)
            
            # Test bulk delete
            tester.test_bulk_delete_documents(doc_ids)
            tester.document_id = None  # Reset since documents are deleted
        else:
            # Delete the first document if second one failed
            tester.test_delete_document()
            tester.document_id = None
    
    # Test permissions with different roles
    if folder_success:
        print("\n🔒 Testing Document Permissions")
        # Create demo accounts if they don't exist
        if not tester.created_users:
            tester.test_create_demo_accounts()
        
        # Test permissions
        tester.test_document_permissions()
    
    # Clean up - delete the test folder if it still exists
    if tester.folder_id:
        try:
            # Check if folder still exists
            folder_exists, _ = tester.run_test("Check Folder Exists", "GET", f"folders/{tester.folder_id}", 200)
            
            if folder_exists:
                # Check if folder has any documents
                docs, _ = tester.run_test("Check Remaining Documents", "GET", f"documents/folder/{tester.folder_id}", 200)
                if docs and len(docs) > 0:
                    # Delete any remaining documents
                    for doc in docs:
                        tester.test_delete_document(doc.get('id'))
                
                # Now delete the folder
                tester.test_delete_folder()
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")
            # Folder might already be deleted, so we can ignore this error
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
