#!/usr/bin/env python3
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime

# Load environment
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def check_and_create_admin():
    # Check if admin user exists
    admin_user = await db.users.find_one({"email": "admin@example.com"})
    
    if admin_user:
        print("✅ Admin user already exists:")
        print(f"   Email: {admin_user['email']}")
        print(f"   Name: {admin_user['full_name']}")
        print(f"   Role: {admin_user['role']}")
        print(f"   Active: {admin_user['is_active']}")
        
        # Test password
        if pwd_context.verify("admin123", admin_user['hashed_password']):
            print("✅ Password 'admin123' is correct")
        else:
            print("❌ Password 'admin123' is INCORRECT - updating password...")
            # Update password
            new_hashed_password = pwd_context.hash("admin123")
            await db.users.update_one(
                {"email": "admin@example.com"},
                {"$set": {"hashed_password": new_hashed_password}}
            )
            print("✅ Password updated successfully!")
    else:
        print("❌ Admin user does not exist - creating new admin user...")
        
        # Create admin user
        admin_data = {
            "id": str(uuid.uuid4()),
            "email": "admin@example.com",
            "full_name": "Admin User",
            "role": "admin",
            "hashed_password": pwd_context.hash("admin123"),
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        await db.users.insert_one(admin_data)
        print("✅ Admin user created successfully!")
        print(f"   Email: {admin_data['email']}")
        print(f"   Password: admin123")
        print(f"   Name: {admin_data['full_name']}")
        print(f"   Role: {admin_data['role']}")

    # List all users
    print("\n📋 All users in database:")
    users = await db.users.find().to_list(length=10)
    for i, user in enumerate(users, 1):
        print(f"   {i}. {user['email']} - {user['full_name']} ({user['role']}) - Active: {user['is_active']}")

if __name__ == "__main__":
    asyncio.run(check_and_create_admin())