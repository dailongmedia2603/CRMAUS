
import requests
import sys
from datetime import datetime
import time
import io
from PIL import Image

class CRMAPITester:
    def __init__(self, base_url="https://17a1f9e1-95d0-488e-8748-8fd2444151c2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.client_id = None
        self.project_id = None
        self.task_id = None
        # Service Template related IDs
        self.service_template_id = None
        self.service_id = None
        self.task_template_id = None
        self.task_detail_component_id = None

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

    # ===== SERVICE TEMPLATE API TESTS =====
    
    def test_create_service_template(self):
        """Test creating a new service template"""
        template_data = {
            "name": f"Test Service Template {datetime.now().strftime('%H%M%S')}",
            "description": "This is a test service template for API testing",
            "category": "Web Development",
            "status": "active",
            "estimated_duration": 30,
            "base_price": 5000.0
        }
        
        success, response = self.run_test("Create Service Template", "POST", "service-templates", 200, template_data)
        if success:
            self.service_template_id = response.get('id')
        return success, response

    def test_get_service_templates(self):
        """Test getting all service templates"""
        return self.run_test("Get All Service Templates", "GET", "service-templates", 200)

    def test_get_service_templates_with_filters(self):
        """Test getting service templates with filters"""
        # Test with search filter
        success1, _ = self.run_test("Get Service Templates with Search", "GET", "service-templates?search=Test", 200)
        
        # Test with category filter
        success2, _ = self.run_test("Get Service Templates with Category", "GET", "service-templates?category=Web Development", 200)
        
        # Test with status filter
        success3, _ = self.run_test("Get Service Templates with Status", "GET", "service-templates?status=active", 200)
        
        return success1 and success2 and success3, {}

    def test_get_service_template(self):
        """Test getting a specific service template"""
        if not self.service_template_id:
            print("❌ Cannot test get_service_template: No service_template_id available")
            return False, {}
        return self.run_test("Get Service Template", "GET", f"service-templates/{self.service_template_id}", 200)

    def test_update_service_template(self):
        """Test updating a service template"""
        if not self.service_template_id:
            print("❌ Cannot test update_service_template: No service_template_id available")
            return False, {}
            
        update_data = {
            "name": f"Updated Test Service Template {datetime.now().strftime('%H%M%S')}",
            "description": "This is an updated test service template",
            "category": "Web Development",
            "status": "active",
            "estimated_duration": 45,
            "base_price": 7500.0
        }
        
        return self.run_test("Update Service Template", "PUT", f"service-templates/{self.service_template_id}", 200, update_data)

    def test_clone_service_template(self):
        """Test cloning a service template"""
        if not self.service_template_id:
            print("❌ Cannot test clone_service_template: No service_template_id available")
            return False, {}
        return self.run_test("Clone Service Template", "POST", f"service-templates/{self.service_template_id}/clone", 200)

    def test_create_service(self):
        """Test creating a new service in a template"""
        if not self.service_template_id:
            print("❌ Cannot test create_service: No service_template_id available")
            return False, {}
            
        service_data = {
            "template_id": self.service_template_id,
            "name": f"Test Service {datetime.now().strftime('%H%M%S')}",
            "description": "This is a test service",
            "order_index": 1,
            "estimated_hours": 40.0,
            "required_skills": ["JavaScript", "React", "Node.js"],
            "dependencies": []
        }
        
        success, response = self.run_test("Create Service", "POST", "services", 200, service_data)
        if success:
            self.service_id = response.get('id')
        return success, response

    def test_get_services_by_template(self):
        """Test getting services by template"""
        if not self.service_template_id:
            print("❌ Cannot test get_services_by_template: No service_template_id available")
            return False, {}
        return self.run_test("Get Services by Template", "GET", f"service-templates/{self.service_template_id}/services", 200)

    def test_update_service(self):
        """Test updating a service"""
        if not self.service_id:
            print("❌ Cannot test update_service: No service_id available")
            return False, {}
            
        update_data = {
            "template_id": self.service_template_id,
            "name": f"Updated Test Service {datetime.now().strftime('%H%M%S')}",
            "description": "This is an updated test service",
            "order_index": 1,
            "estimated_hours": 50.0,
            "required_skills": ["JavaScript", "React", "Node.js", "MongoDB"],
            "dependencies": []
        }
        
        return self.run_test("Update Service", "PUT", f"services/{self.service_id}", 200, update_data)

    def test_create_task_template(self):
        """Test creating a new task template"""
        if not self.service_id:
            print("❌ Cannot test create_task_template: No service_id available")
            return False, {}
            
        task_data = {
            "service_id": self.service_id,
            "name": f"Test Task Template {datetime.now().strftime('%H%M%S')}",
            "description": "This is a test task template",
            "order_index": 1,
            "estimated_hours": 8.0,
            "priority": "high",
            "task_type": "development",
            "required_deliverables": ["Code", "Documentation", "Tests"]
        }
        
        success, response = self.run_test("Create Task Template", "POST", "task-templates", 200, task_data)
        if success:
            self.task_template_id = response.get('id')
        return success, response

    def test_get_task_templates_by_service(self):
        """Test getting task templates by service"""
        if not self.service_id:
            print("❌ Cannot test get_task_templates_by_service: No service_id available")
            return False, {}
        return self.run_test("Get Task Templates by Service", "GET", f"services/{self.service_id}/tasks", 200)

    def test_update_task_template(self):
        """Test updating a task template"""
        if not self.task_template_id:
            print("❌ Cannot test update_task_template: No task_template_id available")
            return False, {}
            
        update_data = {
            "service_id": self.service_id,
            "name": f"Updated Test Task Template {datetime.now().strftime('%H%M%S')}",
            "description": "This is an updated test task template",
            "order_index": 1,
            "estimated_hours": 12.0,
            "priority": "medium",
            "task_type": "development",
            "required_deliverables": ["Code", "Documentation", "Tests", "Review"]
        }
        
        return self.run_test("Update Task Template", "PUT", f"task-templates/{self.task_template_id}", 200, update_data)

    def test_create_task_detail_component(self):
        """Test creating a new task detail component"""
        if not self.task_template_id:
            print("❌ Cannot test create_task_detail_component: No task_template_id available")
            return False, {}
            
        component_data = {
            "task_template_id": self.task_template_id,
            "component_type": "checklist",
            "component_data": {
                "title": "Development Checklist",
                "items": ["Setup environment", "Write code", "Write tests", "Code review"]
            },
            "order_index": 1,
            "required": True
        }
        
        success, response = self.run_test("Create Task Detail Component", "POST", "task-detail-components", 200, component_data)
        if success:
            self.task_detail_component_id = response.get('id')
        return success, response

    def test_get_task_detail_components(self):
        """Test getting task detail components by task template"""
        if not self.task_template_id:
            print("❌ Cannot test get_task_detail_components: No task_template_id available")
            return False, {}
        return self.run_test("Get Task Detail Components", "GET", f"task-templates/{self.task_template_id}/components", 200)

    def test_update_task_detail_component(self):
        """Test updating a task detail component"""
        if not self.task_detail_component_id:
            print("❌ Cannot test update_task_detail_component: No task_detail_component_id available")
            return False, {}
            
        update_data = {
            "task_template_id": self.task_template_id,
            "component_type": "checklist",
            "component_data": {
                "title": "Updated Development Checklist",
                "items": ["Setup environment", "Write code", "Write tests", "Code review", "Deploy"]
            },
            "order_index": 1,
            "required": True
        }
        
        return self.run_test("Update Task Detail Component", "PUT", f"task-detail-components/{self.task_detail_component_id}", 200, update_data)

    def test_reorder_task_detail_components(self):
        """Test reordering task detail components"""
        if not self.task_detail_component_id:
            print("❌ Cannot test reorder_task_detail_components: No task_detail_component_id available")
            return False, {}
            
        reorder_data = [
            {"id": self.task_detail_component_id, "order_index": 2}
        ]
        
        return self.run_test("Reorder Task Detail Components", "PUT", "task-detail-components/reorder", 200, reorder_data)

    def test_get_template_hierarchy(self):
        """Test getting full template hierarchy"""
        if not self.service_template_id:
            print("❌ Cannot test get_template_hierarchy: No service_template_id available")
            return False, {}
        return self.run_test("Get Template Hierarchy", "GET", f"service-templates/{self.service_template_id}/hierarchy", 200)

    def test_get_service_categories(self):
        """Test getting service categories"""
        return self.run_test("Get Service Categories", "GET", "service-templates/categories", 200)

    # Test cascade deletion
    def test_delete_task_detail_component(self):
        """Test deleting a task detail component"""
        if not self.task_detail_component_id:
            print("❌ Cannot test delete_task_detail_component: No task_detail_component_id available")
            return False, {}
        return self.run_test("Delete Task Detail Component", "DELETE", f"task-detail-components/{self.task_detail_component_id}", 200)

    def test_delete_task_template(self):
        """Test deleting a task template"""
        if not self.task_template_id:
            print("❌ Cannot test delete_task_template: No task_template_id available")
            return False, {}
        return self.run_test("Delete Task Template", "DELETE", f"task-templates/{self.task_template_id}", 200)

    def test_delete_service(self):
        """Test deleting a service"""
        if not self.service_id:
            print("❌ Cannot test delete_service: No service_id available")
            return False, {}
        return self.run_test("Delete Service", "DELETE", f"services/{self.service_id}", 200)

    def test_delete_service_template(self):
        """Test deleting a service template and all related data"""
        if not self.service_template_id:
            print("❌ Cannot test delete_service_template: No service_template_id available")
            return False, {}
        return self.run_test("Delete Service Template", "DELETE", f"service-templates/{self.service_template_id}", 200)

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
