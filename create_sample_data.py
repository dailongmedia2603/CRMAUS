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

async def create_comprehensive_sample_data():
    print("🚀 Creating comprehensive sample data for CRM system...")
    
    # Get admin user ID
    admin_user = await db.users.find_one({"email": "admin@example.com"})
    admin_id = admin_user["id"] if admin_user else str(uuid.uuid4())
    
    # 1. Create more users with different roles
    print("\n👥 Creating additional users...")
    sample_users = [
        {
            "id": str(uuid.uuid4()),
            "email": "manager@example.com",
            "full_name": "Nguyễn Văn Manager",
            "role": "manager",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "account@example.com", 
            "full_name": "Trần Thị Account",
            "role": "account",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "content@example.com",
            "full_name": "Lê Văn Content",
            "role": "content",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "design@example.com",
            "full_name": "Phạm Thị Design",
            "role": "design",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "sale@example.com",
            "full_name": "Hoàng Văn Sale",
            "role": "sale",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # secret
            "created_at": datetime.utcnow(),
            "is_active": True
        }
    ]
    
    for user in sample_users:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"   ✅ Created user: {user['full_name']} ({user['role']})")
        else:
            print(f"   ℹ️  User already exists: {user['full_name']}")
    
    # 2. Create more clients
    print("\n📋 Creating additional clients...")
    additional_clients = [
        {
            "id": str(uuid.uuid4()),
            "name": "Công ty DEF E-commerce",
            "company": "DEF Online Solutions",
            "industry": "E-commerce",
            "size": "100-200",
            "website": "https://def-ecommerce.com",
            "phone": "+84903456789",
            "contact_name": "Lê Thị C",
            "contact_email": "lethic@def-ecommerce.com",
            "notes": "Chuyên về giải pháp thương mại điện tử",
            "address": "789 Đống Đa, Quận Đống Đa, Hà Nội",
            "tags": ["E-commerce", "Online"],
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Startup GHI Tech",
            "company": "GHI Innovation Lab",
            "industry": "Technology",
            "size": "10-20",
            "website": "https://ghi-tech.io",
            "phone": "+84904567890",
            "contact_name": "Nguyễn Văn D",
            "contact_email": "nguyenvand@ghi-tech.io",
            "notes": "Startup công nghệ, tập trung vào AI/ML",
            "address": "456 Cầu Giấy, Quận Cầu Giấy, Hà Nội",
            "tags": ["Startup", "AI", "Technology"],
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        }
    ]
    
    for client in additional_clients:
        existing = await db.clients.find_one({"name": client["name"]})
        if not existing:
            await db.clients.insert_one(client)
            print(f"   ✅ Created client: {client['name']}")
        else:
            print(f"   ℹ️  Client already exists: {client['name']}")
    
    # 3. Create more projects
    print("\n📁 Creating additional projects...")
    all_clients = await db.clients.find().to_list(length=None)
    campaigns = await db.campaigns.find().to_list(length=None)
    
    additional_projects = []
    for i, client in enumerate(all_clients[1:]):  # Skip first client (already has project)
        campaign = campaigns[i % len(campaigns)] if campaigns else None
        project = {
            "id": str(uuid.uuid4()),
            "name": f"Dự án {client['industry']} cho {client['name']}",
            "client_id": client["id"],
            "campaign_id": campaign["id"] if campaign else None,
            "description": f"Dự án phát triển giải pháp {client['industry'].lower()} chuyên nghiệp",
            "start_date": datetime.utcnow() - timedelta(days=30),
            "end_date": datetime.utcnow() + timedelta(days=60),
            "status": ["planning", "in_progress", "completed", "on_hold"][i % 4],
            "team": [],
            "contract_value": 100000000.0 + (i * 25000000.0),  # 100M, 125M, 150M...
            "debt": 20000000.0 + (i * 10000000.0),  # 20M, 30M, 40M...
            "archived": False,
            "manager_ids": [],
            "account_ids": [],
            "content_ids": [],
            "design_ids": [],
            "editor_ids": [],
            "sale_ids": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        }
        additional_projects.append(project)
    
    for project in additional_projects:
        existing = await db.projects.find_one({"name": project["name"]})
        if not existing:
            await db.projects.insert_one(project)
            print(f"   ✅ Created project: {project['name']}")
        else:
            print(f"   ℹ️  Project already exists: {project['name']}")
    
    # 4. Create invoices
    print("\n💰 Creating sample invoices...")
    all_projects = await db.projects.find().to_list(length=None)
    
    for i, project in enumerate(all_projects):
        # Create 1-3 invoices per project
        num_invoices = (i % 3) + 1
        for j in range(num_invoices):
            invoice_count = await db.invoices.count_documents({})
            invoice = {
                "id": str(uuid.uuid4()),
                "client_id": project["client_id"],
                "project_id": project["id"],
                "title": f"Hóa đơn tháng {j+1} - {project['name'][:30]}",
                "amount": project["contract_value"] / num_invoices,
                "due_date": datetime.utcnow() + timedelta(days=30 * (j+1)),
                "status": ["draft", "sent", "paid", "overdue"][j % 4],
                "notes": f"Thanh toán giai đoạn {j+1}",
                "invoice_number": f"INV-{datetime.utcnow().strftime('%Y%m')}-{invoice_count + j + 1:04d}",
                "paid_date": datetime.utcnow() - timedelta(days=5) if j % 4 == 2 else None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            }
            
            existing = await db.invoices.find_one({"invoice_number": invoice["invoice_number"]})
            if not existing:
                await db.invoices.insert_one(invoice)
                print(f"   ✅ Created invoice: {invoice['invoice_number']}")
    
    # 5. Create contracts
    print("\n📄 Creating sample contracts...")
    for i, project in enumerate(all_projects[:3]):  # Create contracts for first 3 projects
        contract = {
            "id": str(uuid.uuid4()),
            "client_id": project["client_id"],
            "project_id": project["id"],
            "title": f"Hợp đồng dịch vụ - {project['name'][:30]}",
            "start_date": project["start_date"],
            "end_date": project["end_date"],
            "value": project["contract_value"],
            "status": ["draft", "sent", "signed", "active"][i % 4],
            "terms": f"Điều khoản hợp đồng cho dự án {project['name']}. Bao gồm các điều khoản về tiến độ, thanh toán và bảo hành.",
            "document_url": f"/documents/contract-{project['id']}.pdf",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        }
        
        existing = await db.contracts.find_one({"project_id": contract["project_id"]})
        if not existing:
            await db.contracts.insert_one(contract)
            print(f"   ✅ Created contract: {contract['title']}")
    
    # 6. Create more expense folders and expenses
    print("\n💸 Creating additional expense data...")
    additional_folders = [
        {
            "id": str(uuid.uuid4()),
            "name": "Chi phí nhân sự Q1 2025",
            "description": "Chi phí lương và phúc lợi quý 1",
            "color": "#8B5CF6",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Thiết bị và công nghệ",
            "description": "Chi phí mua sắm thiết bị, phần mềm",
            "color": "#06B6D4",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        }
    ]
    
    for folder in additional_folders:
        existing = await db.expense_folders.find_one({"name": folder["name"]})
        if not existing:
            await db.expense_folders.insert_one(folder)
            print(f"   ✅ Created expense folder: {folder['name']}")
    
    # Create sample expenses
    all_categories = await db.expense_categories.find().to_list(length=None)
    all_folders = await db.expense_folders.find().to_list(length=None)
    
    sample_expenses = [
        {
            "title": "Laptop MacBook Pro cho team Design",
            "amount": 45000000.0,
            "vendor": "Apple Store",
            "payment_method": "bank_transfer",
            "status": "paid",
            "tags": ["laptop", "design", "equipment"]
        },
        {
            "title": "Thuê văn phòng tháng 6/2025",
            "amount": 25000000.0,
            "vendor": "ABC Property",
            "payment_method": "bank_transfer", 
            "status": "paid",
            "tags": ["office", "rent", "monthly"]
        },
        {
            "title": "Quảng cáo Facebook Ads",
            "amount": 8000000.0,
            "vendor": "Meta Platforms",
            "payment_method": "credit_card",
            "status": "approved",
            "tags": ["marketing", "facebook", "ads"]
        },
        {
            "title": "License Adobe Creative Suite",
            "amount": 1200000.0,
            "vendor": "Adobe",
            "payment_method": "credit_card",
            "status": "paid",
            "tags": ["software", "design", "license"]
        },
        {
            "title": "Đi công tác Hà Nội",
            "amount": 3500000.0,
            "vendor": "Various",
            "payment_method": "cash",
            "status": "pending",
            "tags": ["travel", "business", "hanoi"]
        }
    ]
    
    for i, expense_data in enumerate(sample_expenses):
        expense_count = await db.expenses.count_documents({})
        expense = {
            "id": str(uuid.uuid4()),
            "category_id": all_categories[i % len(all_categories)]["id"],
            "folder_id": all_folders[i % len(all_folders)]["id"],
            "project_id": all_projects[i % len(all_projects)]["id"] if i < len(all_projects) else None,
            "client_id": all_clients[i % len(all_clients)]["id"] if i < len(all_clients) else None,
            "expense_date": datetime.utcnow() - timedelta(days=i*7),
            "description": f"Chi tiết cho {expense_data['title']}",
            "expense_number": f"EXP-{datetime.utcnow().strftime('%Y%m')}-{expense_count + i + 1:04d}",
            "is_recurring": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id,
            **expense_data
        }
        
        existing = await db.expenses.find_one({"expense_number": expense["expense_number"]})
        if not existing:
            await db.expenses.insert_one(expense)
            print(f"   ✅ Created expense: {expense['title']}")
    
    # 7. Create document folders and documents
    print("\n📁 Creating document folders and documents...")
    doc_folders = [
        {
            "id": str(uuid.uuid4()),
            "name": "Tài liệu Marketing",
            "color": "#EF4444",
            "permissions": "all",
            "description": "Tài liệu và chiến lược marketing",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Hợp đồng và pháp lý",
            "color": "#8B5CF6",
            "permissions": "admin",
            "description": "Tài liệu hợp đồng và pháp lý",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        }
    ]
    
    for folder in doc_folders:
        existing = await db.folders.find_one({"name": folder["name"]})
        if not existing:
            await db.folders.insert_one(folder)
            print(f"   ✅ Created document folder: {folder['name']}")
    
    # Create sample documents
    all_doc_folders = await db.folders.find().to_list(length=None)
    
    sample_documents = [
        {
            "title": "Chiến lược Marketing Q2 2025",
            "link": "https://docs.google.com/document/d/sample1",
            "description": "<h2>Tổng quan chiến lược</h2><p>Kế hoạch marketing chi tiết cho quý 2 năm 2025...</p>",
            "archived": False
        },
        {
            "title": "Mẫu hợp đồng dịch vụ",
            "link": "https://docs.google.com/document/d/sample2",
            "description": "<h2>Mẫu hợp đồng</h2><p>Template hợp đồng chuẩn cho các dự án dịch vụ...</p>",
            "archived": False
        },
        {
            "title": "Báo cáo tài chính tháng 6",
            "link": "https://drive.google.com/file/d/sample3",
            "description": "<h2>Báo cáo tài chính</h2><p>Tổng hợp thu chi và lợi nhuận tháng 6/2025...</p>",
            "archived": False
        }
    ]
    
    for i, doc_data in enumerate(sample_documents):
        document = {
            "id": str(uuid.uuid4()),
            "folder_id": all_doc_folders[i % len(all_doc_folders)]["id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id,
            **doc_data
        }
        
        existing = await db.documents.find_one({"title": document["title"]})
        if not existing:
            await db.documents.insert_one(document)
            print(f"   ✅ Created document: {document['title']}")
    
    print("\n🎉 Comprehensive sample data creation completed!")
    print("\n📊 Final Summary:")
    
    # Count all data
    users_count = await db.users.count_documents({})
    clients_count = await db.clients.count_documents({})
    projects_count = await db.projects.count_documents({})
    campaigns_count = await db.campaigns.count_documents({})
    invoices_count = await db.invoices.count_documents({})
    contracts_count = await db.contracts.count_documents({})
    categories_count = await db.expense_categories.count_documents({})
    folders_count = await db.expense_folders.count_documents({})
    expenses_count = await db.expenses.count_documents({})
    doc_folders_count = await db.folders.count_documents({})
    documents_count = await db.documents.count_documents({})
    
    print(f"   👥 Users: {users_count}")
    print(f"   📋 Clients: {clients_count}")
    print(f"   📁 Projects: {projects_count}")
    print(f"   🎯 Campaigns: {campaigns_count}")
    print(f"   💰 Invoices: {invoices_count}")
    print(f"   📄 Contracts: {contracts_count}")
    print(f"   🏷️  Expense Categories: {categories_count}")
    print(f"   📂 Expense Folders: {folders_count}")
    print(f"   💸 Expenses: {expenses_count}")
    print(f"   📁 Document Folders: {doc_folders_count}")
    print(f"   📄 Documents: {documents_count}")

if __name__ == "__main__":
    asyncio.run(create_comprehensive_sample_data())