from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Body, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Union
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from starlette.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
import os
import uuid
import logging
import shutil
from pathlib import Path
from fastapi.staticfiles import StaticFiles

# Thiết lập cơ bản
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Cấu hình bảo mật
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"  # Trong thực tế nên đặt trong biến môi trường
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Kết nối MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Khởi tạo ứng dụng
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Cấu hình bảo mật
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mô hình dữ liệu
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "staff"  # admin, account, creative, staff

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str = None

class ClientBase(BaseModel):
    name: str
    company: str
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None
    address: Optional[str] = None
    tags: List[str] = []
    avatar_url: Optional[str] = None
    archived: bool = False

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class ProjectBase(BaseModel):
    name: str
    client_id: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    status: str = "planning"  # planning, in_progress, on_hold, completed, cancelled, overdue, pending
    team: Optional[List[str]] = []  # List of user IDs assigned to project
    contract_value: Optional[float] = None  # Giá trị hợp đồng
    debt: Optional[float] = None  # Công nợ
    archived: bool = False  # Dự án lưu trữ

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class ContractBase(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    title: str
    start_date: datetime
    end_date: datetime
    value: float
    status: str = "draft"  # draft, sent, signed, active, expired, terminated
    terms: Optional[str] = None

class ContractCreate(ContractBase):
    pass

class Contract(ContractBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    document_url: Optional[str] = None

class InvoiceBase(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    contract_id: Optional[str] = None
    title: str
    amount: float
    due_date: datetime
    status: str = "draft"  # draft, sent, paid, overdue, cancelled
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    paid_date: Optional[datetime] = None

# Document Management Models
class FolderBase(BaseModel):
    name: str
    color: str = "#3B82F6"  # Default blue color
    permissions: str = "all"  # all, admin, account, creative, staff
    description: Optional[str] = None

class FolderCreate(FolderBase):
    pass

class Folder(FolderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class DocumentBase(BaseModel):
    title: str
    folder_id: str
    link: Optional[str] = None
    description: Optional[str] = None  # Rich text content
    archived: bool = False

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Hàm tiện ích
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(email: str):
    user_dict = await db.users.find_one({"email": email})
    if user_dict:
        return UserInDB(**user_dict)

async def authenticate_user(email: str, password: str):
    user = await get_user(email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = await get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Routes
@api_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User routes
@api_router.post("/users/", response_model=User)
async def create_user(user: UserCreate):
    db_user = await db.users.find_one({"email": user.email})
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_data = user.dict()
    del user_data["password"]
    user_in_db = UserInDB(**user_data, hashed_password=hashed_password)
    
    result = await db.users.insert_one(user_in_db.dict())
    return user_in_db

@api_router.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@api_router.get("/users/", response_model=List[User])
async def read_users(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    users = await db.users.find().skip(skip).limit(limit).to_list(length=limit)
    return users

# Client routes
@api_router.post("/clients/", response_model=Client)
async def create_client(client: ClientCreate, current_user: User = Depends(get_current_active_user)):
    client_data = client.dict()
    client_obj = Client(**client_data, created_by=current_user.id)
    result = await db.clients.insert_one(client_obj.dict())
    return client_obj

@api_router.get("/clients/", response_model=List[Client])
async def read_clients(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_active_user)):
    clients = await db.clients.find().skip(skip).limit(limit).to_list(length=limit)
    return clients

@api_router.get("/clients/{client_id}", response_model=Client)
async def read_client(client_id: str, current_user: User = Depends(get_current_active_user)):
    client = await db.clients.find_one({"id": client_id})
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client: ClientCreate, current_user: User = Depends(get_current_active_user)):
    db_client = await db.clients.find_one({"id": client_id})
    if db_client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client_data = client.dict()
    updated_client = {**db_client, **client_data, "updated_at": datetime.utcnow()}
    
    await db.clients.update_one({"id": client_id}, {"$set": updated_client})
    return updated_client

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"detail": "Client deleted successfully"}

# Project routes
@api_router.post("/projects/", response_model=Project)
async def create_project(project: ProjectCreate, current_user: User = Depends(get_current_active_user)):
    # Kiểm tra client tồn tại
    client = await db.clients.find_one({"id": project.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    project_data = project.dict()
    project_obj = Project(**project_data, created_by=current_user.id)
    result = await db.projects.insert_one(project_obj.dict())
    return project_obj

@api_router.get("/projects/", response_model=List[Project])
async def read_projects(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_active_user)):
    projects = await db.projects.find().skip(skip).limit(limit).to_list(length=limit)
    return projects

@api_router.get("/projects/client/{client_id}", response_model=List[Project])
async def read_client_projects(client_id: str, current_user: User = Depends(get_current_active_user)):
    projects = await db.projects.find({"client_id": client_id}).to_list(length=100)
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def read_project(project_id: str, current_user: User = Depends(get_current_active_user)):
    project = await db.projects.find_one({"id": project_id})
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project: ProjectCreate, current_user: User = Depends(get_current_active_user)):
    db_project = await db.projects.find_one({"id": project_id})
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_data = project.dict()
    updated_project = {**db_project, **project_data, "updated_at": datetime.utcnow()}
    
    await db.projects.update_one({"id": project_id}, {"$set": updated_project})
    return updated_project

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Xóa các task liên quan
    # TODO: Xóa tasks liên quan khi cần thiết
    # await db.tasks.delete_many({"project_id": project_id})
    
    return {"detail": "Project deleted successfully"}

# Contract routes
# Contract routes
@api_router.post("/contracts/", response_model=Contract)
async def create_contract(contract: ContractCreate, current_user: User = Depends(get_current_active_user)):
    # Kiểm tra client tồn tại
    client = await db.clients.find_one({"id": contract.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Kiểm tra project tồn tại (nếu có)
    if contract.project_id:
        project = await db.projects.find_one({"id": contract.project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    contract_data = contract.dict()
    contract_obj = Contract(**contract_data, created_by=current_user.id)
    result = await db.contracts.insert_one(contract_obj.dict())
    return contract_obj

@api_router.get("/contracts/", response_model=List[Contract])
async def read_contracts(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_active_user)):
    contracts = await db.contracts.find().skip(skip).limit(limit).to_list(length=limit)
    return contracts

@api_router.get("/contracts/client/{client_id}", response_model=List[Contract])
async def read_client_contracts(client_id: str, current_user: User = Depends(get_current_active_user)):
    contracts = await db.contracts.find({"client_id": client_id}).to_list(length=100)
    return contracts

@api_router.get("/contracts/{contract_id}", response_model=Contract)
async def read_contract(contract_id: str, current_user: User = Depends(get_current_active_user)):
    contract = await db.contracts.find_one({"id": contract_id})
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@api_router.put("/contracts/{contract_id}", response_model=Contract)
async def update_contract(contract_id: str, contract: ContractCreate, current_user: User = Depends(get_current_active_user)):
    db_contract = await db.contracts.find_one({"id": contract_id})
    if db_contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    contract_data = contract.dict()
    updated_contract = {**db_contract, **contract_data, "updated_at": datetime.utcnow()}
    
    await db.contracts.update_one({"id": contract_id}, {"$set": updated_contract})
    return updated_contract

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.contracts.delete_one({"id": contract_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"detail": "Contract deleted successfully"}

# Invoice routes
@api_router.post("/invoices/", response_model=Invoice)
async def create_invoice(invoice: InvoiceCreate, current_user: User = Depends(get_current_active_user)):
    # Kiểm tra client tồn tại
    client = await db.clients.find_one({"id": invoice.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Kiểm tra project tồn tại (nếu có)
    if invoice.project_id:
        project = await db.projects.find_one({"id": invoice.project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Kiểm tra contract tồn tại (nếu có)
    if invoice.contract_id:
        contract = await db.contracts.find_one({"id": invoice.contract_id})
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
    
    # Tạo số hóa đơn duy nhất (theo định dạng: INV-YYYYMM-XXXX)
    invoice_count = await db.invoices.count_documents({})
    invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m')}-{invoice_count + 1:04d}"
    
    invoice_data = invoice.dict()
    invoice_obj = Invoice(**invoice_data, invoice_number=invoice_number, created_by=current_user.id)
    result = await db.invoices.insert_one(invoice_obj.dict())
    return invoice_obj

@api_router.get("/invoices/", response_model=List[Invoice])
async def read_invoices(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_active_user)):
    invoices = await db.invoices.find().skip(skip).limit(limit).to_list(length=limit)
    return invoices

@api_router.get("/invoices/client/{client_id}", response_model=List[Invoice])
async def read_client_invoices(client_id: str, current_user: User = Depends(get_current_active_user)):
    invoices = await db.invoices.find({"client_id": client_id}).to_list(length=100)
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def read_invoice(invoice_id: str, current_user: User = Depends(get_current_active_user)):
    invoice = await db.invoices.find_one({"id": invoice_id})
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, invoice: InvoiceCreate, current_user: User = Depends(get_current_active_user)):
    db_invoice = await db.invoices.find_one({"id": invoice_id})
    if db_invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice_data = invoice.dict()
    updated_invoice = {**db_invoice, **invoice_data, "updated_at": datetime.utcnow()}
    
    # Nếu đang chuyển trạng thái sang paid, cập nhật paid_date
    if invoice.status == "paid" and db_invoice.get("status") != "paid":
        updated_invoice["paid_date"] = datetime.utcnow()
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": updated_invoice})
    return updated_invoice

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"detail": "Invoice deleted successfully"}

# Dashboard Data
@api_router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_data(current_user: User = Depends(get_current_active_user)):
    # Số lượng khách hàng
    client_count = await db.clients.count_documents({})
    
    # Số lượng dự án theo trạng thái
    projects_by_status = {
        "planning": await db.projects.count_documents({"status": "planning"}),
        "in_progress": await db.projects.count_documents({"status": "in_progress"}),
        "on_hold": await db.projects.count_documents({"status": "on_hold"}),
        "completed": await db.projects.count_documents({"status": "completed"}),
        "cancelled": await db.projects.count_documents({"status": "cancelled"})
    }
    
    # Số lượng task theo trạng thái
    tasks_by_status = {
        "to_do": await db.tasks.count_documents({"status": "to_do"}),
        "in_progress": await db.tasks.count_documents({"status": "in_progress"}),
        "review": await db.tasks.count_documents({"status": "review"}),
        "completed": await db.tasks.count_documents({"status": "completed"})
    }
    
    # Số lượng task được gán cho người dùng hiện tại
    user_tasks = await db.tasks.count_documents({"assigned_to": current_user.id})
    
    # Số lượng hóa đơn theo trạng thái
    invoices_by_status = {
        "draft": await db.invoices.count_documents({"status": "draft"}),
        "sent": await db.invoices.count_documents({"status": "sent"}),
        "paid": await db.invoices.count_documents({"status": "paid"}),
        "overdue": await db.invoices.count_documents({"status": "overdue"}),
        "cancelled": await db.invoices.count_documents({"status": "cancelled"})
    }
    
    # Tổng số tiền hóa đơn đã thanh toán
    paid_invoices = await db.invoices.find({"status": "paid"}).to_list(length=1000)
    total_paid = sum(invoice["amount"] for invoice in paid_invoices)
    
    # Tổng số tiền hóa đơn đang chờ thanh toán
    pending_invoices = await db.invoices.find({"status": "sent"}).to_list(length=1000)
    total_pending = sum(invoice["amount"] for invoice in pending_invoices)
    
    # Tổng số tiền hóa đơn quá hạn
    overdue_invoices = await db.invoices.find({"status": "overdue"}).to_list(length=1000)
    total_overdue = sum(invoice["amount"] for invoice in overdue_invoices)
    
    # Các task gần đến hạn (trong vòng 7 ngày)
    today = datetime.utcnow()
    next_week = today + timedelta(days=7)
    upcoming_tasks = await db.tasks.find({
        "due_date": {"$gte": today, "$lte": next_week},
        "status": {"$ne": "completed"}
    }).to_list(length=10)
    
    # Các hợp đồng sắp hết hạn (trong vòng 30 ngày)
    next_month = today + timedelta(days=30)
    expiring_contracts = await db.contracts.find({
        "end_date": {"$gte": today, "$lte": next_month},
        "status": "active"
    }).to_list(length=10)
    
    return {
        "client_count": client_count,
        "projects_by_status": projects_by_status,
        "tasks_by_status": tasks_by_status,
        "user_tasks": user_tasks,
        "invoices_by_status": invoices_by_status,
        "financial": {
            "total_paid": total_paid,
            "total_pending": total_pending,
            "total_overdue": total_overdue
        },
        "upcoming_tasks": upcoming_tasks,
        "expiring_contracts": expiring_contracts
    }

# Endpoint để tạo user admin ban đầu
@api_router.post("/setup")
async def setup_initial_admin():
    # Kiểm tra xem đã có user nào chưa
    user_count = await db.users.count_documents({})
    if user_count > 0:
        return {"message": "Setup already completed"}
    
    # Tạo user admin đầu tiên
    admin_user = UserCreate(
        email="admin@example.com",
        full_name="Admin User",
        role="admin",
        password="admin123"
    )
    
    hashed_password = get_password_hash(admin_user.password)
    admin_data = admin_user.dict()
    del admin_data["password"]
    admin_in_db = UserInDB(**admin_data, hashed_password=hashed_password)
    
    await db.users.insert_one(admin_in_db.dict())
    
    return {"message": "Initial admin user created", "email": "admin@example.com", "password": "admin123"}

# Upload avatar endpoint
@api_router.post("/upload-avatar/")
async def upload_avatar(file: UploadFile = File(...)):
    try:
        # Tạo thư mục nếu chưa tồn tại
        os.makedirs("public/uploads", exist_ok=True)
        
        # Tạo tên file duy nhất
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"public/uploads/{unique_filename}"
        
        # Lưu file
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Trả về đường dẫn file
        return {"avatar_url": f"/public/uploads/{unique_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Document Management Routes

# Folder routes
@api_router.post("/folders/", response_model=Folder)
async def create_folder(folder: FolderCreate, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    folder_data = folder.dict()
    folder_obj = Folder(**folder_data, created_by=current_user.id)
    result = await db.folders.insert_one(folder_obj.dict())
    return folder_obj

@api_router.get("/folders/", response_model=List[Folder])
async def read_folders(current_user: User = Depends(get_current_active_user)):
    # Filter folders based on user role and permissions
    if current_user.role == "admin":
        folders = await db.folders.find().to_list(length=100)
    else:
        # Show folders with 'all' permissions or folders specific to user role
        folders = await db.folders.find({
            "$or": [
                {"permissions": "all"},
                {"permissions": current_user.role}
            ]
        }).to_list(length=100)
    return folders

@api_router.get("/folders/{folder_id}", response_model=Folder)
async def read_folder(folder_id: str, current_user: User = Depends(get_current_active_user)):
    folder = await db.folders.find_one({"id": folder_id})
    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check permissions
    if folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return folder

@api_router.put("/folders/{folder_id}", response_model=Folder)
async def update_folder(folder_id: str, folder: FolderCreate, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_folder = await db.folders.find_one({"id": folder_id})
    if db_folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder_data = folder.dict()
    updated_folder = {**db_folder, **folder_data, "updated_at": datetime.utcnow()}
    
    await db.folders.update_one({"id": folder_id}, {"$set": updated_folder})
    return updated_folder

@api_router.delete("/folders/{folder_id}")
async def delete_folder(folder_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if folder has documents
    documents_count = await db.documents.count_documents({"folder_id": folder_id})
    if documents_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete folder with documents")
    
    result = await db.folders.delete_one({"id": folder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return {"detail": "Folder deleted successfully"}

# Document routes
@api_router.post("/documents/", response_model=Document)
async def create_document(document: DocumentCreate, current_user: User = Depends(get_current_active_user)):
    # Check if folder exists and user has permission
    folder = await db.folders.find_one({"id": document.folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check folder permissions
    if folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions to add document to this folder")
    
    document_data = document.dict()
    document_obj = Document(**document_data, created_by=current_user.id)
    result = await db.documents.insert_one(document_obj.dict())
    return document_obj

@api_router.get("/documents/", response_model=List[Document])
async def read_documents(skip: int = 0, limit: int = 100, archived: bool = False, current_user: User = Depends(get_current_active_user)):
    # Get accessible folders first
    if current_user.role == "admin":
        accessible_folders = await db.folders.find().to_list(length=1000)
    else:
        accessible_folders = await db.folders.find({
            "$or": [
                {"permissions": "all"},
                {"permissions": current_user.role}
            ]
        }).to_list(length=1000)
    
    folder_ids = [folder["id"] for folder in accessible_folders]
    
    documents = await db.documents.find({
        "folder_id": {"$in": folder_ids},
        "archived": archived
    }).skip(skip).limit(limit).to_list(length=limit)
    
    return documents

@api_router.get("/documents/folder/{folder_id}", response_model=List[Document])
async def read_folder_documents(folder_id: str, archived: bool = False, current_user: User = Depends(get_current_active_user)):
    # Check folder permissions
    folder = await db.folders.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    documents = await db.documents.find({
        "folder_id": folder_id,
        "archived": archived
    }).to_list(length=100)
    
    return documents

@api_router.get("/documents/{document_id}", response_model=Document)
async def read_document(document_id: str, current_user: User = Depends(get_current_active_user)):
    document = await db.documents.find_one({"id": document_id})
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check folder permissions
    folder = await db.folders.find_one({"id": document["folder_id"]})
    if folder and folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return document

@api_router.put("/documents/{document_id}", response_model=Document)
async def update_document(document_id: str, document: DocumentCreate, current_user: User = Depends(get_current_active_user)):
    db_document = await db.documents.find_one({"id": document_id})
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check folder permissions for both old and new folder
    old_folder = await db.folders.find_one({"id": db_document["folder_id"]})
    new_folder = await db.folders.find_one({"id": document.folder_id})
    
    if not new_folder:
        raise HTTPException(status_code=404, detail="New folder not found")
    
    # Check permissions for both folders
    for folder in [old_folder, new_folder]:
        if folder and folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    document_data = document.dict()
    updated_document = {**db_document, **document_data, "updated_at": datetime.utcnow()}
    
    await db.documents.update_one({"id": document_id}, {"$set": updated_document})
    return updated_document

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: User = Depends(get_current_active_user)):
    document = await db.documents.find_one({"id": document_id})
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check permissions
    folder = await db.folders.find_one({"id": document["folder_id"]})
    if folder and folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.documents.delete_one({"id": document_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"detail": "Document deleted successfully"}

# Bulk operations
@api_router.post("/documents/bulk-archive")
async def bulk_archive_documents(document_ids: List[str], current_user: User = Depends(get_current_active_user)):
    # Check permissions for all documents
    for doc_id in document_ids:
        document = await db.documents.find_one({"id": doc_id})
        if document:
            folder = await db.folders.find_one({"id": document["folder_id"]})
            if folder and folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
                raise HTTPException(status_code=403, detail=f"Not enough permissions for document {doc_id}")
    
    result = await db.documents.update_many(
        {"id": {"$in": document_ids}},
        {"$set": {"archived": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"detail": f"{result.modified_count} documents archived"}

@api_router.post("/documents/bulk-restore")
async def bulk_restore_documents(document_ids: List[str], current_user: User = Depends(get_current_active_user)):
    # Check permissions for all documents
    for doc_id in document_ids:
        document = await db.documents.find_one({"id": doc_id})
        if document:
            folder = await db.folders.find_one({"id": document["folder_id"]})
            if folder and folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
                raise HTTPException(status_code=403, detail=f"Not enough permissions for document {doc_id}")
    
    result = await db.documents.update_many(
        {"id": {"$in": document_ids}},
        {"$set": {"archived": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"detail": f"{result.modified_count} documents restored"}

@api_router.post("/documents/bulk-delete")
async def bulk_delete_documents(document_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check permissions for all documents
    for doc_id in document_ids:
        document = await db.documents.find_one({"id": doc_id})
        if document:
            folder = await db.folders.find_one({"id": document["folder_id"]})
            if folder and folder["permissions"] != "all" and folder["permissions"] != current_user.role and current_user.role != "admin":
                raise HTTPException(status_code=403, detail=f"Not enough permissions for document {doc_id}")
    
    result = await db.documents.delete_many({"id": {"$in": document_ids}})
    
    return {"detail": f"{result.deleted_count} documents deleted"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "CRM API for Marketing Agency"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}

# Include router
app.include_router(api_router)

# Tạo thư mục public nếu chưa tồn tại
os.makedirs("public/uploads", exist_ok=True)

# Mount thư mục public để phục vụ file tĩnh
app.mount("/public", StaticFiles(directory="public"), name="public")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
