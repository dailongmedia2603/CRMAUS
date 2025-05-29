
import requests
import sys
from datetime import datetime
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
                        results[f"{user['role']}_folder_access"] = not folder_access  # Should fail
                    
                    # Try to access admin document
                    if admin_folder_id and admin_doc_id:
                        doc_access, _ = self.run_test(f"{user['role']} accessing admin document", 
                                                   "GET", f"documents/{admin_doc_id}", 403)
                        results[f"{user['role']}_doc_access"] = not doc_access  # Should fail
        
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

def main():
    # Setup
    tester = CRMAPITester()
    
    # Run tests
    print("🚀 Starting CRM API Tests")
    print(f"Using backend URL: {tester.base_url}")
    
    # Test health check
    health_success, _ = tester.test_health()
    
    # Test setup and create first admin
    setup_success, setup_response = tester.test_setup()
    if setup_success:
        print(f"✅ Initial admin setup: {setup_response.get('message')}")
        print(f"   Email: {setup_response.get('email')}")
        print(f"   Password: {setup_response.get('password')}")
    
    # Test login with initial admin
    login_success, _ = tester.test_login()
    if not login_success:
        print("❌ Login failed, stopping tests")
        return 1
    
    # Test user info
    tester.test_get_current_user()
    
    # Create demo accounts
    demo_accounts_success, _ = tester.test_create_demo_accounts()
    
    # Test login for all created accounts
    login_all_success, _ = tester.test_login_all_accounts()
    
    # Login back as admin to test dashboard
    tester.test_login()
    
    # Test dashboard
    dashboard_success, _ = tester.test_get_dashboard()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    # Print summary of created accounts
    print("\n📋 Demo Accounts Created:")
    for user in tester.created_users:
        print(f"- {user['email']} (Role: {user['role']}, Password: {user['password']})")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
