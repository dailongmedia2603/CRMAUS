#!/usr/bin/env python3
import requests
import json
import uuid
from datetime import datetime, timedelta
import time
import os

# Get backend URL from environment variable
BACKEND_URL = "https://17a1f9e1-95d0-488e-8748-8fd2444151c2.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "admin@example.com"
TEST_PASSWORD = "admin123"

# Test data
test_client = {
    "name": "Test Client",
    "company": "Test Company",
    "industry": "Technology",
    "size": "Medium",
    "website": "https://testcompany.com",
    "phone": "123-456-7890",
    "contact_name": "John Doe",
    "contact_email": "john@testcompany.com",
    "contact_phone": "123-456-7890",
    "notes": "Test notes",
    "address": "123 Test St, Test City",
    "tags": ["test", "client"]
}

test_project = {
    "name": "Test Project",
    "description": "Test project description",
    "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
    "budget": 10000,
    "status": "planning"
}

test_task = {
    "title": "Test Task",
    "description": "Test task description",
    "rich_content": "<p>Rich content for test task</p>",
    "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
    "priority": "urgent",
    "status": "todo",
    "task_type": "development"
}

test_contract = {
    "title": "Test Contract",
    "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    "end_date": (datetime.utcnow() + timedelta(days=90)).isoformat(),
    "value": 15000,
    "status": "draft",
    "terms": "Test contract terms"
}

test_invoice = {
    "title": "Test Invoice",
    "amount": 5000,
    "due_date": (datetime.utcnow() + timedelta(days=14)).isoformat(),
    "status": "draft",
    "notes": "Test invoice notes"
}

test_service_template = {
    "name": "Test Service Template",
    "description": "Test service template description",
    "category": "Web Development",
    "status": "active",
    "estimated_duration": 30,
    "base_price": 5000
}

test_service = {
    "name": "Test Service",
    "description": "Test service description",
    "order_index": 0,
    "estimated_hours": 40,
    "required_skills": ["python", "react"],
    "dependencies": []
}

test_task_template = {
    "name": "Test Task Template",
    "description": "Test task template description",
    "order_index": 0,
    "estimated_hours": 8,
    "priority": "medium",
    "task_type": "development",
    "required_deliverables": ["code", "documentation"]
}

test_task_detail_component = {
    "component_type": "text",
    "component_data": {"content": "Test component content"},
    "order_index": 0,
    "required": True
}

# Test results
test_results = {
    "total_tests": 0,
    "passed_tests": 0,
    "failed_tests": 0,
    "failures": []
}

# Helper functions
def log_test(name, success, message=""):
    test_results["total_tests"] += 1
    if success:
        test_results["passed_tests"] += 1
        print(f"✅ {name}: PASSED")
    else:
        test_results["failed_tests"] += 1
        test_results["failures"].append({"name": name, "message": message})
        print(f"❌ {name}: FAILED - {message}")

def get_auth_header(token):
    return {"Authorization": f"Bearer {token}"}

# Test functions
def test_authentication():
    print("\n=== Testing Authentication ===")
    
    # Test login
    try:
        response = requests.post(
            f"{API_URL}/token",
            data={"username": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        response.raise_for_status()
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        log_test("Login", True if access_token else False, 
                 "" if access_token else "No access token returned")
        
        # Test get current user
        if access_token:
            response = requests.get(
                f"{API_URL}/users/me",
                headers=get_auth_header(access_token)
            )
            response.raise_for_status()
            user_data = response.json()
            
            log_test("Get Current User", user_data.get("email") == TEST_EMAIL,
                    f"Expected {TEST_EMAIL}, got {user_data.get('email')}")
            
            return access_token
        
    except requests.exceptions.RequestException as e:
        log_test("Authentication", False, str(e))
        return None

def test_dashboard(token):
    print("\n=== Testing Dashboard ===")
    
    # Test dashboard data
    try:
        response = requests.get(
            f"{API_URL}/dashboard",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        dashboard_data = response.json()
        
        log_test("Dashboard Data", 
                 "client_count" in dashboard_data and 
                 "projects_by_status" in dashboard_data and
                 "tasks_by_status" in dashboard_data,
                 "Missing expected dashboard data fields")
        
    except requests.exceptions.RequestException as e:
        log_test("Dashboard Data", False, str(e))
    
    # Test task stats
    try:
        response = requests.get(
            f"{API_URL}/tasks/stats",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        stats_data = response.json()
        
        log_test("Task Stats", 
                 "urgent" in stats_data and 
                 "todo" in stats_data and
                 "in_progress" in stats_data and
                 "due_today" in stats_data and
                 "overdue" in stats_data,
                 "Missing expected task stats fields")
        
    except requests.exceptions.RequestException as e:
        log_test("Task Stats", False, str(e))

def test_client_management(token):
    print("\n=== Testing Client Management ===")
    client_id = None
    
    # Test create client
    try:
        response = requests.post(
            f"{API_URL}/clients/",
            headers=get_auth_header(token),
            json=test_client
        )
        response.raise_for_status()
        client_data = response.json()
        client_id = client_data.get("id")
        
        log_test("Create Client", client_id is not None,
                "Failed to create client")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Client", False, str(e))
    
    # Test get clients
    try:
        response = requests.get(
            f"{API_URL}/clients/",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        clients = response.json()
        
        log_test("Get Clients", isinstance(clients, list),
                "Expected list of clients")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Clients", False, str(e))
    
    # Test get client by ID
    if client_id:
        try:
            response = requests.get(
                f"{API_URL}/clients/{client_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            client_data = response.json()
            
            log_test("Get Client by ID", client_data.get("id") == client_id,
                    f"Expected client with ID {client_id}")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Client by ID", False, str(e))
        
        # Test update client
        try:
            updated_client = test_client.copy()
            updated_client["name"] = "Updated Test Client"
            
            response = requests.put(
                f"{API_URL}/clients/{client_id}",
                headers=get_auth_header(token),
                json=updated_client
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Client", updated_data.get("name") == "Updated Test Client",
                    f"Expected updated name 'Updated Test Client', got {updated_data.get('name')}")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Client", False, str(e))
    
    return client_id

def test_project_management(token, client_id):
    print("\n=== Testing Project Management ===")
    project_id = None
    
    if not client_id:
        log_test("Project Management", False, "No client ID available for testing")
        return None
    
    # Update test project with client ID
    test_project["client_id"] = client_id
    
    # Test create project
    try:
        response = requests.post(
            f"{API_URL}/projects/",
            headers=get_auth_header(token),
            json=test_project
        )
        response.raise_for_status()
        project_data = response.json()
        project_id = project_data.get("id")
        
        log_test("Create Project", project_id is not None,
                "Failed to create project")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Project", False, str(e))
    
    # Test get projects
    try:
        response = requests.get(
            f"{API_URL}/projects/",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        projects = response.json()
        
        log_test("Get Projects", isinstance(projects, list),
                "Expected list of projects")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Projects", False, str(e))
    
    # Test get client projects
    try:
        response = requests.get(
            f"{API_URL}/projects/client/{client_id}",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        client_projects = response.json()
        
        log_test("Get Client Projects", isinstance(client_projects, list),
                "Expected list of client projects")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Client Projects", False, str(e))
    
    # Test get project by ID
    if project_id:
        try:
            response = requests.get(
                f"{API_URL}/projects/{project_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            project_data = response.json()
            
            log_test("Get Project by ID", project_data.get("id") == project_id,
                    f"Expected project with ID {project_id}")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Project by ID", False, str(e))
        
        # Test update project
        try:
            updated_project = test_project.copy()
            updated_project["name"] = "Updated Test Project"
            
            response = requests.put(
                f"{API_URL}/projects/{project_id}",
                headers=get_auth_header(token),
                json=updated_project
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Project", updated_data.get("name") == "Updated Test Project",
                    f"Expected updated name 'Updated Test Project', got {updated_data.get('name')}")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Project", False, str(e))
    
    return project_id

def test_task_management(token, project_id):
    print("\n=== Testing Task Management ===")
    task_id = None
    feedback_id = None
    
    if not project_id:
        log_test("Task Management", False, "No project ID available for testing")
        return None
    
    # Update test task with project ID
    test_task["project_id"] = project_id
    
    # Test create task
    try:
        response = requests.post(
            f"{API_URL}/tasks/",
            headers=get_auth_header(token),
            json=test_task
        )
        response.raise_for_status()
        task_data = response.json()
        task_id = task_data.get("id")
        
        log_test("Create Task", task_id is not None,
                "Failed to create task")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Task", False, str(e))
    
    # Test get tasks
    try:
        response = requests.get(
            f"{API_URL}/tasks/",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        tasks = response.json()
        
        log_test("Get Tasks", isinstance(tasks, list),
                "Expected list of tasks")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Tasks", False, str(e))
    
    # Test get tasks with filters
    try:
        response = requests.get(
            f"{API_URL}/tasks/?status=todo&priority=urgent",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        filtered_tasks = response.json()
        
        log_test("Get Filtered Tasks", isinstance(filtered_tasks, list),
                "Expected list of filtered tasks")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Filtered Tasks", False, str(e))
    
    # Test get project tasks
    try:
        response = requests.get(
            f"{API_URL}/tasks/project/{project_id}",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        project_tasks = response.json()
        
        log_test("Get Project Tasks", isinstance(project_tasks, list),
                "Expected list of project tasks")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Project Tasks", False, str(e))
    
    # Test get task by ID
    if task_id:
        try:
            response = requests.get(
                f"{API_URL}/tasks/{task_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            task_data = response.json()
            
            log_test("Get Task by ID", task_data.get("id") == task_id,
                    f"Expected task with ID {task_id}")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Task by ID", False, str(e))
        
        # Test update task
        try:
            updated_task = test_task.copy()
            updated_task["title"] = "Updated Test Task"
            updated_task["status"] = "in_progress"
            
            response = requests.put(
                f"{API_URL}/tasks/{task_id}",
                headers=get_auth_header(token),
                json=updated_task
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Task", 
                    updated_data.get("title") == "Updated Test Task" and
                    updated_data.get("status") == "in_progress",
                    f"Expected updated title and status")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Task", False, str(e))
        
        # Test create task feedback
        try:
            feedback = {
                "task_id": task_id,
                "message": "Test feedback message",
                "feedback_type": "comment"
            }
            
            response = requests.post(
                f"{API_URL}/tasks/{task_id}/feedback",
                headers=get_auth_header(token),
                json=feedback
            )
            response.raise_for_status()
            feedback_data = response.json()
            feedback_id = feedback_data.get("id")
            
            log_test("Create Task Feedback", feedback_id is not None,
                    "Failed to create task feedback")
            
        except requests.exceptions.RequestException as e:
            log_test("Create Task Feedback", False, str(e))
        
        # Test get task feedback
        try:
            response = requests.get(
                f"{API_URL}/tasks/{task_id}/feedback",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            feedback_list = response.json()
            
            log_test("Get Task Feedback", isinstance(feedback_list, list),
                    "Expected list of task feedback")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Task Feedback", False, str(e))
    
    # Test delete task feedback
    if feedback_id:
        try:
            response = requests.delete(
                f"{API_URL}/feedback/{feedback_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            
            log_test("Delete Task Feedback", True)
            
        except requests.exceptions.RequestException as e:
            log_test("Delete Task Feedback", False, str(e))
    
    return task_id

def test_contract_management(token, client_id):
    print("\n=== Testing Contract Management ===")
    contract_id = None
    
    if not client_id:
        log_test("Contract Management", False, "No client ID available for testing")
        return None
    
    # Update test contract with client ID
    test_contract["client_id"] = client_id
    
    # Test create contract
    try:
        response = requests.post(
            f"{API_URL}/contracts/",
            headers=get_auth_header(token),
            json=test_contract
        )
        response.raise_for_status()
        contract_data = response.json()
        contract_id = contract_data.get("id")
        
        log_test("Create Contract", contract_id is not None,
                "Failed to create contract")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Contract", False, str(e))
    
    # Test get contracts
    try:
        response = requests.get(
            f"{API_URL}/contracts/",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        contracts = response.json()
        
        log_test("Get Contracts", isinstance(contracts, list),
                "Expected list of contracts")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Contracts", False, str(e))
    
    # Test get client contracts
    try:
        response = requests.get(
            f"{API_URL}/contracts/client/{client_id}",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        client_contracts = response.json()
        
        log_test("Get Client Contracts", isinstance(client_contracts, list),
                "Expected list of client contracts")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Client Contracts", False, str(e))
    
    # Test get contract by ID
    if contract_id:
        try:
            response = requests.get(
                f"{API_URL}/contracts/{contract_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            contract_data = response.json()
            
            log_test("Get Contract by ID", contract_data.get("id") == contract_id,
                    f"Expected contract with ID {contract_id}")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Contract by ID", False, str(e))
        
        # Test update contract
        try:
            updated_contract = test_contract.copy()
            updated_contract["title"] = "Updated Test Contract"
            updated_contract["status"] = "sent"
            
            response = requests.put(
                f"{API_URL}/contracts/{contract_id}",
                headers=get_auth_header(token),
                json=updated_contract
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Contract", 
                    updated_data.get("title") == "Updated Test Contract" and
                    updated_data.get("status") == "sent",
                    f"Expected updated title and status")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Contract", False, str(e))
    
    return contract_id

def test_invoice_management(token, client_id):
    print("\n=== Testing Invoice Management ===")
    invoice_id = None
    
    if not client_id:
        log_test("Invoice Management", False, "No client ID available for testing")
        return None
    
    # Update test invoice with client ID
    test_invoice["client_id"] = client_id
    
    # Test create invoice
    try:
        response = requests.post(
            f"{API_URL}/invoices/",
            headers=get_auth_header(token),
            json=test_invoice
        )
        response.raise_for_status()
        invoice_data = response.json()
        invoice_id = invoice_data.get("id")
        
        log_test("Create Invoice", invoice_id is not None,
                "Failed to create invoice")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Invoice", False, str(e))
    
    # Test get invoices
    try:
        response = requests.get(
            f"{API_URL}/invoices/",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        invoices = response.json()
        
        log_test("Get Invoices", isinstance(invoices, list),
                "Expected list of invoices")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Invoices", False, str(e))
    
    # Test get client invoices
    try:
        response = requests.get(
            f"{API_URL}/invoices/client/{client_id}",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        client_invoices = response.json()
        
        log_test("Get Client Invoices", isinstance(client_invoices, list),
                "Expected list of client invoices")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Client Invoices", False, str(e))
    
    # Test get invoice by ID
    if invoice_id:
        try:
            response = requests.get(
                f"{API_URL}/invoices/{invoice_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            invoice_data = response.json()
            
            log_test("Get Invoice by ID", invoice_data.get("id") == invoice_id,
                    f"Expected invoice with ID {invoice_id}")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Invoice by ID", False, str(e))
        
        # Test update invoice
        try:
            updated_invoice = test_invoice.copy()
            updated_invoice["title"] = "Updated Test Invoice"
            updated_invoice["status"] = "sent"
            
            response = requests.put(
                f"{API_URL}/invoices/{invoice_id}",
                headers=get_auth_header(token),
                json=updated_invoice
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Invoice", 
                    updated_data.get("title") == "Updated Test Invoice" and
                    updated_data.get("status") == "sent",
                    f"Expected updated title and status")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Invoice", False, str(e))
    
    return invoice_id

def test_service_template_management(token):
    print("\n=== Testing Service Template Management ===")
    template_id = None
    
    # Test create service template
    try:
        response = requests.post(
            f"{API_URL}/service-templates",
            headers=get_auth_header(token),
            json=test_service_template
        )
        response.raise_for_status()
        template_data = response.json()
        template_id = template_data.get("id")
        
        log_test("Create Service Template", template_id is not None,
                "Failed to create service template")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Service Template", False, str(e))
    
    # Test get service templates
    try:
        response = requests.get(
            f"{API_URL}/service-templates",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        templates = response.json()
        
        log_test("Get Service Templates", isinstance(templates, list),
                "Expected list of service templates")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Service Templates", False, str(e))
    
    # Test get service categories
    try:
        response = requests.get(
            f"{API_URL}/service-templates/categories",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        categories = response.json()
        
        log_test("Get Service Categories", isinstance(categories, list),
                "Expected list of service categories")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Service Categories", False, str(e))
    
    # Test get service template by ID
    if template_id:
        try:
            response = requests.get(
                f"{API_URL}/service-templates/{template_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            template_data = response.json()
            
            log_test("Get Service Template by ID", template_data.get("id") == template_id,
                    f"Expected service template with ID {template_id}")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Service Template by ID", False, str(e))
        
        # Test update service template
        try:
            updated_template = test_service_template.copy()
            updated_template["name"] = "Updated Test Service Template"
            
            response = requests.put(
                f"{API_URL}/service-templates/{template_id}",
                headers=get_auth_header(token),
                json=updated_template
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Service Template", 
                    updated_data.get("name") == "Updated Test Service Template",
                    f"Expected updated name 'Updated Test Service Template'")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Service Template", False, str(e))
        
        # Test clone service template
        try:
            response = requests.post(
                f"{API_URL}/service-templates/{template_id}/clone",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            cloned_data = response.json()
            cloned_id = cloned_data.get("id")
            
            log_test("Clone Service Template", 
                    cloned_id is not None and cloned_id != template_id,
                    f"Failed to clone service template")
            
        except requests.exceptions.RequestException as e:
            log_test("Clone Service Template", False, str(e))
        
        # Test get template hierarchy
        try:
            response = requests.get(
                f"{API_URL}/service-templates/{template_id}/hierarchy",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            hierarchy_data = response.json()
            
            log_test("Get Template Hierarchy", 
                    hierarchy_data.get("id") == template_id,
                    f"Expected hierarchy for template with ID {template_id}")
            
        except requests.exceptions.RequestException as e:
            log_test("Get Template Hierarchy", False, str(e))
    
    return template_id

def test_service_management(token, template_id):
    print("\n=== Testing Service Management ===")
    service_id = None
    
    if not template_id:
        log_test("Service Management", False, "No template ID available for testing")
        return None
    
    # Update test service with template ID
    test_service["template_id"] = template_id
    
    # Test create service
    try:
        response = requests.post(
            f"{API_URL}/services",
            headers=get_auth_header(token),
            json=test_service
        )
        response.raise_for_status()
        service_data = response.json()
        service_id = service_data.get("id")
        
        log_test("Create Service", service_id is not None,
                "Failed to create service")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Service", False, str(e))
    
    # Test get services by template
    try:
        response = requests.get(
            f"{API_URL}/service-templates/{template_id}/services",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        services = response.json()
        
        log_test("Get Services by Template", isinstance(services, list),
                "Expected list of services")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Services by Template", False, str(e))
    
    # Test update service
    if service_id:
        try:
            updated_service = test_service.copy()
            updated_service["name"] = "Updated Test Service"
            
            response = requests.put(
                f"{API_URL}/services/{service_id}",
                headers=get_auth_header(token),
                json=updated_service
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Service", 
                    updated_data.get("name") == "Updated Test Service",
                    f"Expected updated name 'Updated Test Service'")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Service", False, str(e))
    
    return service_id

def test_task_template_management(token, service_id):
    print("\n=== Testing Task Template Management ===")
    task_template_id = None
    
    if not service_id:
        log_test("Task Template Management", False, "No service ID available for testing")
        return None
    
    # Update test task template with service ID
    test_task_template["service_id"] = service_id
    
    # Test create task template
    try:
        response = requests.post(
            f"{API_URL}/task-templates",
            headers=get_auth_header(token),
            json=test_task_template
        )
        response.raise_for_status()
        task_template_data = response.json()
        task_template_id = task_template_data.get("id")
        
        log_test("Create Task Template", task_template_id is not None,
                "Failed to create task template")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Task Template", False, str(e))
    
    # Test get task templates by service
    try:
        response = requests.get(
            f"{API_URL}/services/{service_id}/tasks",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        task_templates = response.json()
        
        log_test("Get Task Templates by Service", isinstance(task_templates, list),
                "Expected list of task templates")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Task Templates by Service", False, str(e))
    
    # Test update task template
    if task_template_id:
        try:
            updated_task_template = test_task_template.copy()
            updated_task_template["name"] = "Updated Test Task Template"
            
            response = requests.put(
                f"{API_URL}/task-templates/{task_template_id}",
                headers=get_auth_header(token),
                json=updated_task_template
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Task Template", 
                    updated_data.get("name") == "Updated Test Task Template",
                    f"Expected updated name 'Updated Test Task Template'")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Task Template", False, str(e))
    
    return task_template_id

def test_task_detail_component_management(token, task_template_id):
    print("\n=== Testing Task Detail Component Management ===")
    component_id = None
    
    if not task_template_id:
        log_test("Task Detail Component Management", False, "No task template ID available for testing")
        return None
    
    # Update test task detail component with task template ID
    test_task_detail_component["task_template_id"] = task_template_id
    
    # Test create task detail component
    try:
        response = requests.post(
            f"{API_URL}/task-detail-components",
            headers=get_auth_header(token),
            json=test_task_detail_component
        )
        response.raise_for_status()
        component_data = response.json()
        component_id = component_data.get("id")
        
        log_test("Create Task Detail Component", component_id is not None,
                "Failed to create task detail component")
        
    except requests.exceptions.RequestException as e:
        log_test("Create Task Detail Component", False, str(e))
    
    # Test get task detail components by task template
    try:
        response = requests.get(
            f"{API_URL}/task-templates/{task_template_id}/components",
            headers=get_auth_header(token)
        )
        response.raise_for_status()
        components = response.json()
        
        log_test("Get Task Detail Components", isinstance(components, list),
                "Expected list of task detail components")
        
    except requests.exceptions.RequestException as e:
        log_test("Get Task Detail Components", False, str(e))
    
    # Test update task detail component
    if component_id:
        try:
            updated_component = test_task_detail_component.copy()
            updated_component["component_data"] = {"content": "Updated test component content"}
            
            response = requests.put(
                f"{API_URL}/task-detail-components/{component_id}",
                headers=get_auth_header(token),
                json=updated_component
            )
            response.raise_for_status()
            updated_data = response.json()
            
            log_test("Update Task Detail Component", 
                    updated_data.get("component_data", {}).get("content") == "Updated test component content",
                    f"Expected updated component content")
            
        except requests.exceptions.RequestException as e:
            log_test("Update Task Detail Component", False, str(e))
        
        # Test reorder task detail components
        try:
            reorder_data = {
                "items": [
                    {"id": component_id, "order_index": 1}
                ]
            }
            
            response = requests.put(
                f"{API_URL}/task-detail-components/reorder",
                headers=get_auth_header(token),
                json=reorder_data
            )
            response.raise_for_status()
            
            log_test("Reorder Task Detail Components", True)
            
        except requests.exceptions.RequestException as e:
            log_test("Reorder Task Detail Components", False, str(e))
    
    return component_id

def cleanup(token, client_id, project_id, task_id, contract_id, invoice_id, template_id, service_id, task_template_id, component_id):
    print("\n=== Cleaning Up Test Data ===")
    
    # Delete task detail component
    if component_id:
        try:
            response = requests.delete(
                f"{API_URL}/task-detail-components/{component_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Task Detail Component", True)
        except:
            log_test("Delete Task Detail Component", False)
    
    # Delete task template
    if task_template_id:
        try:
            response = requests.delete(
                f"{API_URL}/task-templates/{task_template_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Task Template", True)
        except:
            log_test("Delete Task Template", False)
    
    # Delete service
    if service_id:
        try:
            response = requests.delete(
                f"{API_URL}/services/{service_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Service", True)
        except:
            log_test("Delete Service", False)
    
    # Delete service template
    if template_id:
        try:
            response = requests.delete(
                f"{API_URL}/service-templates/{template_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Service Template", True)
        except:
            log_test("Delete Service Template", False)
    
    # Delete invoice
    if invoice_id:
        try:
            response = requests.delete(
                f"{API_URL}/invoices/{invoice_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Invoice", True)
        except:
            log_test("Delete Invoice", False)
    
    # Delete contract
    if contract_id:
        try:
            response = requests.delete(
                f"{API_URL}/contracts/{contract_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Contract", True)
        except:
            log_test("Delete Contract", False)
    
    # Delete task
    if task_id:
        try:
            response = requests.delete(
                f"{API_URL}/tasks/{task_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Task", True)
        except:
            log_test("Delete Task", False)
    
    # Delete project
    if project_id:
        try:
            response = requests.delete(
                f"{API_URL}/projects/{project_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Project", True)
        except:
            log_test("Delete Project", False)
    
    # Delete client
    if client_id:
        try:
            response = requests.delete(
                f"{API_URL}/clients/{client_id}",
                headers=get_auth_header(token)
            )
            response.raise_for_status()
            log_test("Delete Client", True)
        except:
            log_test("Delete Client", False)

def print_summary():
    print("\n=== Test Summary ===")
    print(f"Total Tests: {test_results['total_tests']}")
    print(f"Passed Tests: {test_results['passed_tests']}")
    print(f"Failed Tests: {test_results['failed_tests']}")
    
    if test_results['failed_tests'] > 0:
        print("\nFailed Tests:")
        for failure in test_results['failures']:
            print(f"- {failure['name']}: {failure['message']}")
    
    success_rate = (test_results['passed_tests'] / test_results['total_tests']) * 100 if test_results['total_tests'] > 0 else 0
    print(f"\nSuccess Rate: {success_rate:.2f}%")

def main():
    print("=== CRM AUS Backend API Testing ===")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Test authentication
    token = test_authentication()
    if not token:
        print("Authentication failed. Cannot proceed with further tests.")
        print_summary()
        return
    
    # Test dashboard
    test_dashboard(token)
    
    # Test client management
    client_id = test_client_management(token)
    
    # Test project management
    project_id = test_project_management(token, client_id)
    
    # Test task management
    task_id = test_task_management(token, project_id)
    
    # Test contract management
    contract_id = test_contract_management(token, client_id)
    
    # Test invoice management
    invoice_id = test_invoice_management(token, client_id)
    
    # Test service template management
    template_id = test_service_template_management(token)
    
    # Test service management
    service_id = test_service_management(token, template_id)
    
    # Test task template management
    task_template_id = test_task_template_management(token, service_id)
    
    # Test task detail component management
    component_id = test_task_detail_component_management(token, task_template_id)
    
    # Clean up test data
    cleanup(token, client_id, project_id, task_id, contract_id, invoice_id, template_id, service_id, task_template_id, component_id)
    
    # Print summary
    print_summary()

if __name__ == "__main__":
    main()
