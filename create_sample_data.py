#!/usr/bin/env python3
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timedelta

# Load environment
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

async def create_sample_data():
    print("🚀 Creating sample data for CRM system...")
    
    # 1. Create sample clients
    print("\n📋 Creating sample clients...")
    sample_clients = [
        {
            "id": str(uuid.uuid4()),
            "name": "Công ty ABC Technology",
            "company": "ABC Technology Solutions",
            "industry": "Technology",
            "size": "50-100",
            "website": "https://abc-tech.com.vn",
            "phone": "+84901234567",
            "contact_name": "Nguyễn Văn A",
            "contact_email": "nguyenvana@abc-tech.com.vn",
            "contact_phone": "+84901234568",
            "notes": "Khách hàng VIP, quan tâm đến giải pháp CRM",
            "address": "123 Lê Lợi, Quận 1, TP.HCM",
            "tags": ["VIP", "Technology", "CRM"],
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Công ty XYZ Marketing",
            "company": "XYZ Digital Marketing",
            "industry": "Marketing",
            "size": "20-50",
            "website": "https://xyz-marketing.com",
            "phone": "+84902345678",
            "contact_name": "Trần Thị B",
            "contact_email": "tranthib@xyz-marketing.com",
            "notes": "Chuyên về digital marketing",
            "address": "456 Nguyễn Huệ, Quận 1, TP.HCM",
            "tags": ["Marketing", "Digital"],
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        }
    ]
    
    for client in sample_clients:
        existing = await db.clients.find_one({"name": client["name"]})
        if not existing:
            await db.clients.insert_one(client)
            print(f"   ✅ Created client: {client['name']}")
        else:
            print(f"   ℹ️  Client already exists: {client['name']}")
    
    # 2. Create sample campaigns
    print("\n🎯 Creating sample campaigns...")
    sample_campaigns = [
        {
            "id": str(uuid.uuid4()),
            "name": "Chiến dịch Marketing Q1 2025",
            "description": "Chiến dịch marketing tổng thể cho quý 1 năm 2025",
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Website Development Campaign",
            "description": "Chiến dịch phát triển website cho khách hàng",
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        }
    ]
    
    for campaign in sample_campaigns:
        existing = await db.campaigns.find_one({"name": campaign["name"]})
        if not existing:
            await db.campaigns.insert_one(campaign)
            print(f"   ✅ Created campaign: {campaign['name']}")
        else:
            print(f"   ℹ️  Campaign already exists: {campaign['name']}")
    
    # 3. Create sample projects
    print("\n📁 Creating sample projects...")
    client = await db.clients.find_one({"name": "Công ty ABC Technology"})
    campaign = await db.campaigns.find_one({"name": "Website Development Campaign"})
    
    if client and campaign:
        project_id = str(uuid.uuid4())
        sample_project = {
            "id": project_id,
            "name": "Dự án Website cho ABC Technology",
            "client_id": client["id"],
            "campaign_id": campaign["id"],
            "description": "Phát triển website corporate cho công ty ABC Technology",
            "start_date": datetime.utcnow(),
            "end_date": datetime.utcnow() + timedelta(days=90),
            "status": "in_progress",
            "team": [],
            "contract_value": 150000000.0,  # 150 triệu VND
            "debt": 50000000.0,  # 50 triệu VND còn nợ
            "archived": False,
            "manager_ids": [],
            "account_ids": [],
            "content_ids": [],
            "design_ids": [],
            "editor_ids": [],
            "sale_ids": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        }
        
        existing = await db.projects.find_one({"name": sample_project["name"]})
        if not existing:
            await db.projects.insert_one(sample_project)
            print(f"   ✅ Created project: {sample_project['name']}")
        else:
            print(f"   ℹ️  Project already exists: {sample_project['name']}")
    
    # 4. Create expense categories
    print("\n💰 Creating expense categories...")
    expense_categories = [
        {
            "id": str(uuid.uuid4()),
            "name": "Office Supplies",
            "description": "Văn phòng phẩm và thiết bị văn phòng",
            "color": "#3B82F6",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Marketing Expenses",
            "description": "Chi phí marketing và quảng cáo",
            "color": "#10B981",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Travel & Entertainment",
            "description": "Chi phí đi lại và tiếp đãi",
            "color": "#F59E0B",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "admin-id"
        }
    ]
    
    for category in expense_categories:
        existing = await db.expense_categories.find_one({"name": category["name"]})
        if not existing:
            await db.expense_categories.insert_one(category)
            print(f"   ✅ Created expense category: {category['name']}")
        else:
            print(f"   ℹ️  Category already exists: {category['name']}")
    
    print("\n🎉 Sample data creation completed!")
    print("\n📊 Summary:")
    
    clients_count = await db.clients.count_documents({})
    campaigns_count = await db.campaigns.count_documents({})
    projects_count = await db.projects.count_documents({})
    categories_count = await db.expense_categories.count_documents({})
    
    print(f"   📋 Clients: {clients_count}")
    print(f"   🎯 Campaigns: {campaigns_count}")
    print(f"   📁 Projects: {projects_count}")
    print(f"   💰 Expense Categories: {categories_count}")

if __name__ == "__main__":
    asyncio.run(create_sample_data())