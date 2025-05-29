
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
