
import requests
import sys
from datetime import datetime
import time
import io
from PIL import Image

class CRMAPITester:
    def __init__(self, base_url="https://b3e10cfb-dcad-4f9b-8473-d7104a7ee54b.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.client_id = None
        self.project_id = None
        self.task_id = None

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
        
        print(f"\n🔍 Testing Login...")
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

    def test_upload_avatar(self):
        """Test avatar upload functionality"""
        try:
            # Create a simple test image
            img = Image.new('RGB', (100, 100), color='red')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            # Prepare file for upload
            files = {'file': ('test_avatar.png', img_bytes, 'image/png')}
            
            url = f"{self.base_url}/upload-avatar/"
            headers = {}
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'
            
            print(f"\n🔍 Testing Avatar Upload...")
            self.tests_run += 1
            
            response = requests.post(url, files=files, headers=headers)
            success = response.status_code == 200
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                response_data = response.json()
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

    def test_create_client_with_avatar(self):
        """Test creating a client with avatar"""
        # First upload an avatar
        avatar_success, avatar_response = self.test_upload_avatar()
        if not avatar_success:
            print("❌ Cannot test client with avatar: Avatar upload failed")
            return False, {}
        
        avatar_url = avatar_response.get('avatar_url')
        
        client_data = {
            "name": f"Test Client with Avatar {datetime.now().strftime('%H%M%S')}",
            "company": "Test Company with Avatar",
            "industry": "Technology",
            "size": "11-50",
            "website": "https://example.com",
            "phone": "123-456-7890",
            "contact_name": "John Doe",
            "contact_email": "john@example.com",
            "contact_phone": "123-456-7890",
            "notes": "This is a test client with avatar",
            "tags": ["test", "avatar"],
            "avatar_url": avatar_url
        }
        
        success, response = self.run_test("Create Client with Avatar", "POST", "clients/", 200, client_data)
        if success:
            # Verify the avatar_url is saved correctly
            if response.get('avatar_url') == avatar_url:
                print("✅ Avatar URL saved correctly in client data")
                return True, response
            else:
                print("❌ Avatar URL not saved correctly in client data")
                return False, {}
        return success, response

    def test_get_dashboard(self):
        """Test getting dashboard data"""
        return self.run_test("Get Dashboard Data", "GET", "dashboard", 200)

def main():
    # Setup
    tester = CRMAPITester()
    
    # Run tests
    print("🚀 Starting CRM API Tests")
    
    # Test health check
    tester.test_health()
    
    # Test setup
    tester.test_setup()
    
    # Test login
    login_success, _ = tester.test_login()
    if not login_success:
        print("❌ Login failed, stopping tests")
        return 1
    
    # Test user info
    tester.test_get_current_user()
    
    # Test client operations
    tester.test_create_client()
    tester.test_get_clients()
    tester.test_get_client()
    
    # Test project operations
    tester.test_create_project()
    tester.test_get_projects()
    
    # Test task operations
    tester.test_create_task()
    tester.test_get_tasks()
    tester.test_update_task_status()
    
    # Test dashboard
    tester.test_get_dashboard()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
