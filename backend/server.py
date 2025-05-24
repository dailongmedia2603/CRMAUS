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
    status: str = "planning"  # planning, in_progress, on_hold, completed, cancelled

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

class TaskBase(BaseModel):
    title: str
    project_id: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str = "medium"  # low, medium, high
    status: str = "to_do"  # to_do, in_progress, review, completed

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    completion_date: Optional[datetime] = None

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
    await db.tasks.delete_many({"project_id": project_id})
    
    return {"detail": "Project deleted successfully"}

# Task routes
@api_router.post("/tasks/", response_model=Task)
async def create_task(task: TaskCreate, current_user: User = Depends(get_current_active_user)):
    # Kiểm tra project tồn tại
    project = await db.projects.find_one({"id": task.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    task_data = task.dict()
    task_obj = Task(**task_data, created_by=current_user.id)
    result = await db.tasks.insert_one(task_obj.dict())
    return task_obj

@api_router.get("/tasks/", response_model=List[Task])
async def read_tasks(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_active_user)):
    tasks = await db.tasks.find().skip(skip).limit(limit).to_list(length=limit)
    return tasks

@api_router.get("/tasks/project/{project_id}", response_model=List[Task])
async def read_project_tasks(project_id: str, current_user: User = Depends(get_current_active_user)):
    tasks = await db.tasks.find({"project_id": project_id}).to_list(length=100)
    return tasks

@api_router.get("/tasks/assigned/{user_id}", response_model=List[Task])
async def read_assigned_tasks(user_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.id != user_id and current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    tasks = await db.tasks.find({"assigned_to": user_id}).to_list(length=100)
    return tasks

@api_router.get("/tasks/{task_id}", response_model=Task)
async def read_task(task_id: str, current_user: User = Depends(get_current_active_user)):
    task = await db.tasks.find_one({"id": task_id})
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task: TaskCreate, current_user: User = Depends(get_current_active_user)):
    db_task = await db.tasks.find_one({"id": task_id})
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_data = task.dict()
    updated_task = {**db_task, **task_data, "updated_at": datetime.utcnow()}
    
    # Nếu đang chuyển trạng thái sang completed, cập nhật completion_date
    if task.status == "completed" and db_task.get("status") != "completed":
        updated_task["completion_date"] = datetime.utcnow()
    
    await db.tasks.update_one({"id": task_id}, {"$set": updated_task})
    return updated_task

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_active_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"detail": "Task deleted successfully"}

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

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "CRM API for Marketing Agency"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}

# Service Template Models
class ServiceTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    status: str = "active"  # active, inactive
    estimated_duration: Optional[int] = None  # days
    base_price: Optional[float] = None

class ServiceTemplateCreate(ServiceTemplateBase):
    pass

class ServiceTemplate(ServiceTemplateBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceBase(BaseModel):
    template_id: str
    name: str
    description: Optional[str] = None
    order_index: int = 0
    estimated_hours: Optional[float] = None
    required_skills: List[str] = []
    dependencies: List[str] = []  # List of service IDs

class ServiceCreate(ServiceBase):
    pass

class Service(ServiceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskTemplateBase(BaseModel):
    service_id: str
    name: str
    description: Optional[str] = None
    order_index: int = 0
    estimated_hours: Optional[float] = None
    priority: str = "medium"  # low, medium, high
    task_type: Optional[str] = None  # design, development, review, etc.
    required_deliverables: List[str] = []

class TaskTemplateCreate(TaskTemplateBase):
    pass

class TaskTemplate(TaskTemplateBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskDetailComponentBase(BaseModel):
    task_template_id: str
    component_type: str  # text, checklist, file_upload, approval, etc.
    component_data: Dict[str, Any] = {}
    order_index: int = 0
    required: bool = False

class TaskDetailComponentCreate(TaskDetailComponentBase):
    pass

class TaskDetailComponent(TaskDetailComponentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Service Template API Endpoints

# Categories API (must be before parameterized routes)
@api_router.get("/service-templates/categories")
async def get_service_categories(current_user: User = Depends(get_current_user)):
    """Lấy danh sách categories từ database"""
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$match": {"_id": {"$ne": None}}},
        {"$sort": {"count": -1}}
    ]
    
    categories_cursor = db.service_templates.aggregate(pipeline)
    categories = await categories_cursor.to_list(length=None)
    
    return [{"name": cat["_id"], "count": cat["count"]} for cat in categories]

# Service Templates CRUD
@api_router.get("/service-templates", response_model=List[ServiceTemplate])
async def get_service_templates(
    current_user: User = Depends(get_current_user),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None
):
    """Lấy danh sách mẫu dịch vụ với tìm kiếm và lọc"""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if category:
        query["category"] = category
        
    if status:
        query["status"] = status
    
    templates_cursor = db.service_templates.find(query).sort("created_at", -1)
    templates = await templates_cursor.to_list(length=None)
    
    return [ServiceTemplate(**template) for template in templates]

@api_router.post("/service-templates", response_model=ServiceTemplate)
async def create_service_template(
    template: ServiceTemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo mẫu dịch vụ mới"""
    new_template = ServiceTemplate(**template.dict(), created_by=current_user.id)
    
    result = await db.service_templates.insert_one(new_template.dict())
    if result.inserted_id:
        return new_template
    raise HTTPException(status_code=400, detail="Failed to create service template")

@api_router.get("/service-templates/{template_id}", response_model=ServiceTemplate)
async def get_service_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy thông tin chi tiết mẫu dịch vụ"""
    template = await db.service_templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Service template not found")
    return ServiceTemplate(**template)

@api_router.put("/service-templates/{template_id}", response_model=ServiceTemplate)
async def update_service_template(
    template_id: str,
    template_update: ServiceTemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật mẫu dịch vụ"""
    update_data = template_update.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.service_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service template not found")
    
    updated_template = await db.service_templates.find_one({"id": template_id})
    return ServiceTemplate(**updated_template)

@api_router.delete("/service-templates/{template_id}")
async def delete_service_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa mẫu dịch vụ và tất cả dữ liệu liên quan"""
    # Xóa tất cả task detail components trước
    services_cursor = db.services.find({"template_id": template_id})
    services = await services_cursor.to_list(length=None)
    
    for service in services:
        # Xóa task detail components
        tasks_cursor = db.task_templates.find({"service_id": service["id"]})
        tasks = await tasks_cursor.to_list(length=None)
        
        for task in tasks:
            await db.task_detail_components.delete_many({"task_template_id": task["id"]})
        
        # Xóa task templates
        await db.task_templates.delete_many({"service_id": service["id"]})
    
    # Xóa services
    await db.services.delete_many({"template_id": template_id})
    
    # Xóa template
    result = await db.service_templates.delete_one({"id": template_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service template not found")
    
    return {"message": "Service template deleted successfully"}

@api_router.post("/service-templates/{template_id}/clone", response_model=ServiceTemplate)
async def clone_service_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Sao chép mẫu dịch vụ"""
    # Lấy template gốc
    original_template = await db.service_templates.find_one({"id": template_id})
    if not original_template:
        raise HTTPException(status_code=404, detail="Service template not found")
    
    # Tạo template mới
    new_template = ServiceTemplate(
        name=f"{original_template['name']} (Copy)",
        description=original_template.get('description'),
        category=original_template.get('category'),
        status=original_template.get('status', 'active'),
        estimated_duration=original_template.get('estimated_duration'),
        base_price=original_template.get('base_price'),
        created_by=current_user.id
    )
    
    result = await db.service_templates.insert_one(new_template.dict())
    if not result.inserted_id:
        raise HTTPException(status_code=400, detail="Failed to clone template")
    
    # Copy services
    services_cursor = db.services.find({"template_id": template_id})
    services = await services_cursor.to_list(length=None)
    
    service_id_mapping = {}
    
    for service in services:
        old_service_id = service["id"]
        new_service = Service(
            template_id=new_template.id,
            name=service["name"],
            description=service.get("description"),
            order_index=service.get("order_index", 0),
            estimated_hours=service.get("estimated_hours"),
            required_skills=service.get("required_skills", []),
            dependencies=[]  # Will update later
        )
        
        await db.services.insert_one(new_service.dict())
        service_id_mapping[old_service_id] = new_service.id
        
        # Copy task templates
        tasks_cursor = db.task_templates.find({"service_id": old_service_id})
        tasks = await tasks_cursor.to_list(length=None)
        
        for task in tasks:
            old_task_id = task["id"]
            new_task = TaskTemplate(
                service_id=new_service.id,
                name=task["name"],
                description=task.get("description"),
                order_index=task.get("order_index", 0),
                estimated_hours=task.get("estimated_hours"),
                priority=task.get("priority", "medium"),
                task_type=task.get("task_type"),
                required_deliverables=task.get("required_deliverables", [])
            )
            
            await db.task_templates.insert_one(new_task.dict())
            
            # Copy task detail components
            components_cursor = db.task_detail_components.find({"task_template_id": old_task_id})
            components = await components_cursor.to_list(length=None)
            
            for component in components:
                new_component = TaskDetailComponent(
                    task_template_id=new_task.id,
                    component_type=component["component_type"],
                    component_data=component.get("component_data", {}),
                    order_index=component.get("order_index", 0),
                    required=component.get("required", False)
                )
                
                await db.task_detail_components.insert_one(new_component.dict())
    
    # Update dependencies with new service IDs
    for service in services:
        if service.get("dependencies"):
            new_dependencies = [service_id_mapping.get(dep_id, dep_id) for dep_id in service["dependencies"]]
            await db.services.update_one(
                {"template_id": new_template.id, "name": service["name"]},
                {"$set": {"dependencies": new_dependencies}}
            )
    
    return new_template

# Services CRUD
@api_router.get("/service-templates/{template_id}/services", response_model=List[Service])
async def get_services_by_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách dịch vụ theo template"""
    services_cursor = db.services.find({"template_id": template_id}).sort("order_index", 1)
    services = await services_cursor.to_list(length=None)
    return [Service(**service) for service in services]

@api_router.post("/services", response_model=Service)
async def create_service(
    service: ServiceCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo dịch vụ mới trong template"""
    new_service = Service(**service.dict())
    
    result = await db.services.insert_one(new_service.dict())
    if result.inserted_id:
        return new_service
    raise HTTPException(status_code=400, detail="Failed to create service")

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(
    service_id: str,
    service_update: ServiceCreate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật dịch vụ"""
    update_data = service_update.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.services.update_one(
        {"id": service_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    updated_service = await db.services.find_one({"id": service_id})
    return Service(**updated_service)

@api_router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa dịch vụ và tất cả task templates liên quan"""
    # Xóa task detail components trước
    tasks_cursor = db.task_templates.find({"service_id": service_id})
    tasks = await tasks_cursor.to_list(length=None)
    
    for task in tasks:
        await db.task_detail_components.delete_many({"task_template_id": task["id"]})
    
    # Xóa task templates
    await db.task_templates.delete_many({"service_id": service_id})
    
    # Xóa service
    result = await db.services.delete_one({"id": service_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service deleted successfully"}

# Task Templates CRUD
@api_router.get("/services/{service_id}/tasks", response_model=List[TaskTemplate])
async def get_task_templates_by_service(
    service_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách task templates theo service"""
    tasks_cursor = db.task_templates.find({"service_id": service_id}).sort("order_index", 1)
    tasks = await tasks_cursor.to_list(length=None)
    return [TaskTemplate(**task) for task in tasks]

@api_router.post("/task-templates", response_model=TaskTemplate)
async def create_task_template(
    task: TaskTemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo task template mới"""
    new_task = TaskTemplate(**task.dict())
    
    result = await db.task_templates.insert_one(new_task.dict())
    if result.inserted_id:
        return new_task
    raise HTTPException(status_code=400, detail="Failed to create task template")

@api_router.put("/task-templates/{task_id}", response_model=TaskTemplate)
async def update_task_template(
    task_id: str,
    task_update: TaskTemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật task template"""
    update_data = task_update.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.task_templates.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task template not found")
    
    updated_task = await db.task_templates.find_one({"id": task_id})
    return TaskTemplate(**updated_task)

@api_router.delete("/task-templates/{task_id}")
async def delete_task_template(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa task template và tất cả components liên quan"""
    # Xóa task detail components trước
    await db.task_detail_components.delete_many({"task_template_id": task_id})
    
    # Xóa task template
    result = await db.task_templates.delete_one({"id": task_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task template not found")
    
    return {"message": "Task template deleted successfully"}

# Task Detail Components CRUD
@api_router.get("/task-templates/{task_id}/components", response_model=List[TaskDetailComponent])
async def get_task_detail_components(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách components theo task template"""
    components_cursor = db.task_detail_components.find({"task_template_id": task_id}).sort("order_index", 1)
    components = await components_cursor.to_list(length=None)
    return [TaskDetailComponent(**component) for component in components]

@api_router.post("/task-detail-components", response_model=TaskDetailComponent)
async def create_task_detail_component(
    component: TaskDetailComponentCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo task detail component mới"""
    new_component = TaskDetailComponent(**component.dict())
    
    result = await db.task_detail_components.insert_one(new_component.dict())
    if result.inserted_id:
        return new_component
    raise HTTPException(status_code=400, detail="Failed to create task detail component")

@api_router.put("/task-detail-components/{component_id}", response_model=TaskDetailComponent)
async def update_task_detail_component(
    component_id: str,
    component_update: TaskDetailComponentCreate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật task detail component"""
    update_data = component_update.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.task_detail_components.update_one(
        {"id": component_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task detail component not found")
    
    updated_component = await db.task_detail_components.find_one({"id": component_id})
    return TaskDetailComponent(**updated_component)

@api_router.delete("/task-detail-components/{component_id}")
async def delete_task_detail_component(
    component_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa task detail component"""
    result = await db.task_detail_components.delete_one({"id": component_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task detail component not found")
    
    return {"message": "Task detail component deleted successfully"}

class ComponentReorderItem(BaseModel):
    id: str
    order_index: int

class ComponentReorderRequest(BaseModel):
    items: List[ComponentReorderItem]

@api_router.put("/task-detail-components/reorder")
async def reorder_task_detail_components(
    request: ComponentReorderRequest,
    current_user: User = Depends(get_current_user)
):
    """Sắp xếp lại thứ tự các components"""
    for item in request.items:
        await db.task_detail_components.update_one(
            {"id": item.id},
            {"$set": {"order_index": item.order_index, "updated_at": datetime.utcnow()}}
        )
    
    return {"message": "Components reordered successfully"}

# Template Hierarchy API
@api_router.get("/service-templates/{template_id}/hierarchy")
async def get_template_hierarchy(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy cấu trúc phân cấp đầy đủ của template"""
    # Lấy template
    template = await db.service_templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Service template not found")
    
    # Remove MongoDB _id field to avoid serialization issues
    if "_id" in template:
        del template["_id"]
    
    # Lấy services
    services_cursor = db.services.find({"template_id": template_id}).sort("order_index", 1)
    services = await services_cursor.to_list(length=None)
    
    # Lấy tasks và components cho mỗi service
    for service in services:
        # Remove MongoDB _id field
        if "_id" in service:
            del service["_id"]
            
        # Lấy tasks
        tasks_cursor = db.task_templates.find({"service_id": service["id"]}).sort("order_index", 1)
        tasks = await tasks_cursor.to_list(length=None)
        
        # Lấy components cho mỗi task
        for task in tasks:
            # Remove MongoDB _id field
            if "_id" in task:
                del task["_id"]
                
            components_cursor = db.task_detail_components.find({"task_template_id": task["id"]}).sort("order_index", 1)
            components = await components_cursor.to_list(length=None)
            
            # Remove MongoDB _id fields from components
            for component in components:
                if "_id" in component:
                    del component["_id"]
            
            task["components"] = components
        
        service["tasks"] = tasks
    
    template["services"] = services
    
    return template

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
