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
    print("\n👥 Creating users with different roles...")
    sample_users = [
        {
            "id": str(uuid.uuid4()),
            "email": "account@example.com",
            "full_name": "Account Manager",
            "role": "account",
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdHrADfEuVAAQQFk/wjgQvPo7TlLIkz.",  # password: account123
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "content@example.com",
            "full_name": "Content Creator",
            "role": "content",
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdHrADfEuVAAQQFk/wjgQvPo7TlLIkz.",  # password: content123
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "design@example.com",
            "full_name": "Designer",
            "role": "design",
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdHrADfEuVAAQQFk/wjgQvPo7TlLIkz.",  # password: design123
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "manager@example.com",
            "full_name": "Project Manager",
            "role": "manager",
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdHrADfEuVAAQQFk/wjgQvPo7TlLIkz.",  # password: manager123
            "created_at": datetime.utcnow(),
            "is_active": True
        },
        {
            "id": str(uuid.uuid4()),
            "email": "sale@example.com",
            "full_name": "Sales Representative",
            "role": "sale",
            "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdHrADfEuVAAQQFk/wjgQvPo7TlLIkz.",  # password: sale123
            "created_at": datetime.utcnow(),
            "is_active": True
        }
    ]
    
    for user in sample_users:
        existing = await db.users.find_one({"email": user["email"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"   ✅ Created user: {user['email']} ({user['role']})")
        else:
            print(f"   ℹ️  User already exists: {user['email']}")
    
    # 2. Create more clients
    print("\n📋 Creating additional clients...")
    additional_clients = [
        {
            "id": str(uuid.uuid4()),
            "name": "Startup Tech Hub",
            "company": "Startup Tech Hub Ltd",
            "industry": "Technology",
            "size": "10-20",
            "website": "https://startuptechhub.com",
            "phone": "+84903456789",
            "contact_name": "Lê Văn C",
            "contact_email": "levanc@startuptechhub.com",
            "notes": "Startup công nghệ mới, tiềm năng phát triển cao",
            "address": "789 Điện Biên Phủ, Quận 1, TP.HCM",
            "tags": ["Startup", "Technology", "Potential"],
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Fashion House Saigon",
            "company": "Fashion House Saigon Co., Ltd",
            "industry": "Fashion",
            "size": "30-50",
            "website": "https://fashionhousesaigon.com",
            "phone": "+84904567890",
            "contact_name": "Nguyễn Thị D",
            "contact_email": "nguyenthid@fashionhousesaigon.com",
            "notes": "Thương hiệu thời trang cao cấp",
            "address": "456 Nguyễn Văn Cừ, Quận 5, TP.HCM",
            "tags": ["Fashion", "Premium", "Brand"],
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
    
    # 3. Create more campaigns and services
    print("\n🎯 Creating campaigns and services...")
    campaigns_and_services = [
        {
            "campaign": {
                "id": str(uuid.uuid4()),
                "name": "Social Media Campaign Q2 2025",
                "description": "Chiến dịch social media cho quý 2",
                "archived": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            },
            "services": [
                {
                    "name": "Facebook Marketing",
                    "sort_order": 1,
                    "description": "Quảng cáo và quản lý fanpage Facebook"
                },
                {
                    "name": "Instagram Content",
                    "sort_order": 2,
                    "description": "Tạo nội dung và quản lý Instagram"
                },
                {
                    "name": "TikTok Strategy",
                    "sort_order": 3,
                    "description": "Xây dựng chiến lược TikTok marketing"
                }
            ]
        }
    ]
    
    for item in campaigns_and_services:
        campaign = item["campaign"]
        existing_campaign = await db.campaigns.find_one({"name": campaign["name"]})
        if not existing_campaign:
            await db.campaigns.insert_one(campaign)
            print(f"   ✅ Created campaign: {campaign['name']}")
            
            # Create services for this campaign
            for service_data in item["services"]:
                service = {
                    "id": str(uuid.uuid4()),
                    "name": service_data["name"],
                    "campaign_id": campaign["id"],
                    "sort_order": service_data["sort_order"],
                    "description": service_data["description"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "created_by": admin_id
                }
                await db.services.insert_one(service)
                print(f"      ✅ Created service: {service['name']}")
        else:
            print(f"   ℹ️  Campaign already exists: {campaign['name']}")
    
    # 4. Create more projects
    print("\n📁 Creating additional projects...")
    clients = await db.clients.find().to_list(length=10)
    campaigns = await db.campaigns.find().to_list(length=10)
    users = await db.users.find().to_list(length=10)
    
    if clients and campaigns:
        additional_projects = [
            {
                "id": str(uuid.uuid4()),
                "name": "E-commerce Platform Development",
                "client_id": clients[1]["id"] if len(clients) > 1 else clients[0]["id"],
                "campaign_id": campaigns[1]["id"] if len(campaigns) > 1 else campaigns[0]["id"],
                "description": "Phát triển nền tảng thương mại điện tử hoàn chỉnh",
                "start_date": datetime.utcnow() - timedelta(days=30),
                "end_date": datetime.utcnow() + timedelta(days=120),
                "status": "in_progress",
                "team": [user["id"] for user in users[:3]],
                "contract_value": 300000000.0,  # 300 triệu VND
                "debt": 100000000.0,  # 100 triệu VND còn nợ
                "archived": False,
                "manager_ids": [users[3]["id"]] if len(users) > 3 else [],
                "account_ids": [users[1]["id"]] if len(users) > 1 else [],
                "content_ids": [users[2]["id"]] if len(users) > 2 else [],
                "design_ids": [users[3]["id"]] if len(users) > 3 else [],
                "editor_ids": [],
                "sale_ids": [users[4]["id"]] if len(users) > 4 else [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Mobile App Design Project",
                "client_id": clients[2]["id"] if len(clients) > 2 else clients[0]["id"],
                "campaign_id": campaigns[0]["id"],
                "description": "Thiết kế ứng dụng mobile cho iOS và Android",
                "start_date": datetime.utcnow(),
                "end_date": datetime.utcnow() + timedelta(days=60),
                "status": "planning",
                "team": [user["id"] for user in users[:2]],
                "contract_value": 80000000.0,  # 80 triệu VND
                "debt": 80000000.0,  # 80 triệu VND chưa thanh toán
                "archived": False,
                "manager_ids": [users[3]["id"]] if len(users) > 3 else [],
                "account_ids": [users[1]["id"]] if len(users) > 1 else [],
                "content_ids": [],
                "design_ids": [users[3]["id"]] if len(users) > 3 else [],
                "editor_ids": [],
                "sale_ids": [users[4]["id"]] if len(users) > 4 else [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            }
        ]
        
        for project in additional_projects:
            existing = await db.projects.find_one({"name": project["name"]})
            if not existing:
                await db.projects.insert_one(project)
                print(f"   ✅ Created project: {project['name']}")
            else:
                print(f"   ℹ️  Project already exists: {project['name']}")
    
    # 5. Create expense folders and expenses
    print("\n💰 Creating expense folders and sample expenses...")
    expense_categories = await db.expense_categories.find().to_list(length=10)
    
    if expense_categories:
        # Create expense folders
        expense_folders = [
            {
                "id": str(uuid.uuid4()),
                "name": "Q1 2025 Office Expenses",
                "description": "Chi phí văn phòng quý 1 năm 2025",
                "color": "#3B82F6",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Marketing Campaign Costs",
                "description": "Chi phí các chiến dịch marketing",
                "color": "#10B981",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            }
        ]
        
        for folder in expense_folders:
            existing = await db.expense_folders.find_one({"name": folder["name"]})
            if not existing:
                await db.expense_folders.insert_one(folder)
                print(f"   ✅ Created expense folder: {folder['name']}")
            else:
                print(f"   ℹ️  Expense folder already exists: {folder['name']}")
        
        # Get created folders
        folders = await db.expense_folders.find().to_list(length=10)
        projects = await db.projects.find().to_list(length=5)
        
        # Create sample expenses
        sample_expenses = [
            {
                "id": str(uuid.uuid4()),
                "title": "Laptop Dell XPS 13",
                "amount": 25000000.0,  # 25 triệu VND
                "category_id": expense_categories[0]["id"],
                "folder_id": folders[0]["id"] if folders else None,
                "project_id": projects[0]["id"] if projects else None,
                "client_id": clients[0]["id"] if clients else None,
                "expense_date": datetime.utcnow() - timedelta(days=5),
                "description": "Mua laptop cho nhân viên mới",
                "vendor": "Dell Vietnam",
                "payment_method": "bank_transfer",
                "status": "paid",
                "tags": ["laptop", "equipment"],
                "is_recurring": False,
                "expense_number": f"EXP-{datetime.utcnow().strftime('%Y%m')}-0001",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Facebook Ads Campaign",
                "amount": 5000000.0,  # 5 triệu VND
                "category_id": expense_categories[1]["id"] if len(expense_categories) > 1 else expense_categories[0]["id"],
                "folder_id": folders[1]["id"] if len(folders) > 1 else (folders[0]["id"] if folders else None),
                "project_id": projects[1]["id"] if len(projects) > 1 else (projects[0]["id"] if projects else None),
                "expense_date": datetime.utcnow() - timedelta(days=2),
                "description": "Chi phí quảng cáo Facebook cho dự án",
                "vendor": "Facebook Inc.",
                "payment_method": "credit_card",
                "status": "approved",
                "tags": ["advertising", "facebook"],
                "is_recurring": True,
                "recurring_frequency": "monthly",
                "recurring_end_date": datetime.utcnow() + timedelta(days=365),
                "expense_number": f"EXP-{datetime.utcnow().strftime('%Y%m')}-0002",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            }
        ]
        
        for expense in sample_expenses:
            existing = await db.expenses.find_one({"title": expense["title"]})
            if not existing:
                await db.expenses.insert_one(expense)
                print(f"   ✅ Created expense: {expense['title']} - {expense['amount']:,.0f} VND")
            else:
                print(f"   ℹ️  Expense already exists: {expense['title']}")
    
    # 6. Create document folders and documents
    print("\n📁 Creating document folders and documents...")
    document_folders = [
        {
            "id": str(uuid.uuid4()),
            "name": "Contract Templates",
            "color": "#8B5CF6",
            "permissions": "admin",
            "description": "Mẫu hợp đồng chuẩn của công ty",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Project Documentation",
            "color": "#06B6D4",
            "permissions": "all",
            "description": "Tài liệu dự án cho tất cả thành viên",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id
        }
    ]
    
    for folder in document_folders:
        existing = await db.folders.find_one({"name": folder["name"]})
        if not existing:
            await db.folders.insert_one(folder)
            print(f"   ✅ Created document folder: {folder['name']}")
        else:
            print(f"   ℹ️  Document folder already exists: {folder['name']}")
    
    # Get created document folders
    doc_folders = await db.folders.find().to_list(length=10)
    
    # Create sample documents
    if doc_folders:
        sample_documents = [
            {
                "id": str(uuid.uuid4()),
                "title": "Hướng dẫn triển khai dự án",
                "folder_id": doc_folders[1]["id"] if len(doc_folders) > 1 else doc_folders[0]["id"],
                "link": "https://docs.google.com/document/d/example1",
                "description": "<h3>Hướng dẫn triển khai dự án</h3><p>Tài liệu này mô tả quy trình triển khai dự án từ A-Z</p><ul><li>Bước 1: Phân tích yêu cầu</li><li>Bước 2: Thiết kế giao diện</li><li>Bước 3: Phát triển</li><li>Bước 4: Testing</li><li>Bước 5: Deploy</li></ul>",
                "archived": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Mẫu hợp đồng dịch vụ",
                "folder_id": doc_folders[0]["id"],
                "link": "https://docs.google.com/document/d/example2",
                "description": "<h3>Mẫu hợp đồng dịch vụ</h3><p>Mẫu hợp đồng chuẩn cho các dự án phát triển phần mềm</p>",
                "archived": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": admin_id
            }
        ]
        
        for doc in sample_documents:
            existing = await db.documents.find_one({"title": doc["title"]})
            if not existing:
                await db.documents.insert_one(doc)
                print(f"   ✅ Created document: {doc['title']}")
            else:
                print(f"   ℹ️  Document already exists: {doc['title']}")
    
    # 7. Create templates
    print("\n📝 Creating service templates...")
    sample_templates = [
        {
            "id": str(uuid.uuid4()),
            "name": "Website Development Template",
            "content": '{"components":[{"id":"1","type":"title","content":{"text":"Website Development Checklist","size":"h2"}},{"id":"2","type":"text","content":{"text":"This template outlines the key steps for website development projects."}},{"id":"3","type":"title","content":{"text":"Phase 1: Planning","size":"h3"}},{"id":"4","type":"text","content":{"text":"• Requirements gathering\\n• Technical specification\\n• Project timeline"}},{"id":"5","type":"title","content":{"text":"Phase 2: Design","size":"h3"}},{"id":"6","type":"text","content":{"text":"• UI/UX wireframes\\n• Visual design\\n• Responsive layouts"}}]}',
            "template_type": "service",
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id,
            "creator_name": "Admin User"
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Marketing Campaign Template",
            "content": '{"components":[{"id":"1","type":"title","content":{"text":"Marketing Campaign Planning","size":"h2"}},{"id":"2","type":"text","content":{"text":"Complete guide for planning and executing marketing campaigns."}},{"id":"3","type":"title","content":{"text":"Campaign Objectives","size":"h3"}},{"id":"4","type":"text","content":{"text":"• Define target audience\\n• Set measurable goals\\n• Budget allocation"}},{"id":"5","type":"feedback","content":{"question":"Rate the campaign concept","rating":5}}]}',
            "template_type": "service",
            "archived": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": admin_id,
            "creator_name": "Admin User"
        }
    ]
    
    for template in sample_templates:
        existing = await db.templates.find_one({"name": template["name"]})
        if not existing:
            await db.templates.insert_one(template)
            print(f"   ✅ Created template: {template['name']}")
        else:
            print(f"   ℹ️  Template already exists: {template['name']}")
    
    print("\n🎉 Comprehensive sample data creation completed!")
    print("\n📊 Final Summary:")
    
    users_count = await db.users.count_documents({})
    clients_count = await db.clients.count_documents({})
    campaigns_count = await db.campaigns.count_documents({})
    projects_count = await db.projects.count_documents({})
    services_count = await db.services.count_documents({})
    expense_categories_count = await db.expense_categories.count_documents({})
    expense_folders_count = await db.expense_folders.count_documents({})
    expenses_count = await db.expenses.count_documents({})
    document_folders_count = await db.folders.count_documents({})
    documents_count = await db.documents.count_documents({})
    templates_count = await db.templates.count_documents({})
    
    print(f"   👥 Users: {users_count}")
    print(f"   📋 Clients: {clients_count}")
    print(f"   🎯 Campaigns: {campaigns_count}")
    print(f"   📁 Projects: {projects_count}")
    print(f"   🔧 Services: {services_count}")
    print(f"   💰 Expense Categories: {expense_categories_count}")
    print(f"   📂 Expense Folders: {expense_folders_count}")
    print(f"   💸 Expenses: {expenses_count}")
    print(f"   📁 Document Folders: {document_folders_count}")
    print(f"   📄 Documents: {documents_count}")
    print(f"   📝 Templates: {templates_count}")

if __name__ == "__main__":
    asyncio.run(create_comprehensive_sample_data())