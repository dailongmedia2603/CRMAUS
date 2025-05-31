import requests
import json
import time
from datetime import datetime

# Base URL for API
BASE_URL = "http://localhost:8001/api"

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
    response = requests.post(f"{BASE_URL}/token", data=admin_credentials)
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

if __name__ == "__main__":
    # Run the tests
    test_campaign_services()
