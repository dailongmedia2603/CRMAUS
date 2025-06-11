import requests
import json

# Backend URL
BACKEND_URL = "http://localhost:8001/api"

def get_admin_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BACKEND_URL}/token",
        data={"username": "admin@example.com", "password": "admin123"}
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✅ Successfully logged in as admin")
        return token
    else:
        print(f"❌ Failed to get admin token: {response.status_code} - {response.text}")
        return None

def get_headers(token):
    """Get headers with authentication token"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def get_users_list(admin_token):
    """Get list of users to find Bé Kiều's user ID"""
    response = requests.get(
        f"{BACKEND_URL}/users/",
        headers=get_headers(admin_token)
    )
    
    if response.status_code == 200:
        users = response.json()
        print(f"✅ Successfully retrieved users list. Found {len(users)} users.")
        return users
    else:
        print(f"❌ Failed to get users list: {response.status_code} - {response.text}")
        return []

def find_user_by_name(users, name):
    """Find a user by name in the users list"""
    for user in users:
        if user.get("full_name") == name:
            print(f"✅ Found user '{name}' with ID: {user['id']}")
            return user
    print(f"❌ User '{name}' not found in users list")
    return None

def reset_user_password(admin_token, user_id, new_password):
    """Reset a user's password (admin only)"""
    response = requests.put(
        f"{BACKEND_URL}/users/{user_id}/password",
        headers=get_headers(admin_token),
        json={"new_password": new_password}
    )
    
    if response.status_code == 200:
        print(f"✅ Successfully reset password for user ID: {user_id}")
        return True
    else:
        print(f"❌ Failed to reset password: {response.status_code} - {response.text}")
        return False

def main():
    print("=== Resetting Password for 'Bé Kiều' ===\n")
    
    # Step 1: Login with admin credentials
    admin_token = get_admin_token()
    if not admin_token:
        print("Cannot proceed without admin access")
        return
    
    # Step 2: Get the list of users to find "Bé Kiều"
    users = get_users_list(admin_token)
    if not users:
        print("Cannot proceed without users list")
        return
    
    # Find "Bé Kiều" user
    kieu_user = find_user_by_name(users, "Bé Kiều")
    if not kieu_user:
        print("Cannot proceed without finding 'Bé Kiều' user")
        return
    
    kieu_user_id = kieu_user["id"]
    kieu_email = kieu_user["email"]
    
    print(f"Bé Kiều's email: {kieu_email}")
    
    # Step 3: Reset password
    new_password = "testpassword123"
    reset_user_password(admin_token, kieu_user_id, new_password)
    print(f"Password reset to: {new_password}")

if __name__ == "__main__":
    main()
