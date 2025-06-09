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
    role: str = "staff"  # admin, account, creative, staff, manager, content, design, editor, sale

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

# Team Models
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"  # Default blue color
    is_active: bool = True

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class Team(TeamBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    member_count: int = 0  # Computed field

# Team Membership Models
class TeamMemberBase(BaseModel):
    team_id: str
    user_id: str
    role: str = "member"  # leader, member

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMember(TeamMemberBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    # Enriched fields
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None

# Performance Models
class PerformanceMetric(BaseModel):
    user_id: str
    team_id: Optional[str] = None
    period_type: str  # daily, weekly, monthly, quarterly, yearly
    period_start: datetime
    period_end: datetime
    
    # Task metrics
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    task_completion_rate: float = 0.0
    avg_task_completion_time: Optional[float] = None  # in hours
    
    # Project metrics
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    project_involvement_score: float = 0.0
    
    # Quality metrics
    avg_feedback_rating: Optional[float] = None
    total_feedbacks: int = 0
    
    # Financial metrics
    revenue_contribution: float = 0.0  # từ projects và invoices
    
    # Computed scores
    overall_performance_score: float = 0.0
    productivity_rank: Optional[int] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PerformanceSummary(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    user_role: str
    team_names: List[str] = []
    
    # Current period metrics
    current_performance: PerformanceMetric
    
    # Trend data (comparison with previous period)
    task_completion_trend: float = 0.0  # percentage change
    performance_trend: float = 0.0
    rank_change: int = 0

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
    campaign_id: Optional[str] = None  # Liên kết với chiến dịch
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "planning"  # planning, in_progress, on_hold, completed, cancelled, overdue, pending
    team: Optional[List[str]] = []  # List of user IDs assigned to project (backward compatibility)
    contract_value: Optional[float] = None  # Giá trị hợp đồng
    debt: Optional[float] = None  # Công nợ
    archived: bool = False  # Dự án lưu trữ
    # Nhân sự triển khai theo vai trò
    manager_ids: Optional[List[str]] = []  # Quản lý
    account_ids: Optional[List[str]] = []  # Account
    content_ids: Optional[List[str]] = []  # Content
    design_ids: Optional[List[str]] = []  # Design
    editor_ids: Optional[List[str]] = []  # Editor
    sale_ids: Optional[List[str]] = []  # Sale

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

# Campaign Models
class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    archived: bool = False

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    archived: Optional[bool] = None

class Campaign(CampaignBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Service Models (thuộc Campaign)
class ServiceBase(BaseModel):
    name: str
    campaign_id: str
    sort_order: int = 0
    description: Optional[str] = None

class ServiceCreate(BaseModel):
    name: str
    sort_order: int = 0
    description: Optional[str] = None

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    description: Optional[str] = None

class Service(ServiceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Task Models (thuộc Service)
class TaskBase(BaseModel):
    name: str
    service_id: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "not_started"  # not_started, in_progress, completed
    template_id: Optional[str] = None  # Link to service template
    description: Optional[str] = None

class TaskCreate(BaseModel):
    name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "not_started"  # not_started, in_progress, completed
    template_id: Optional[str] = None  # Link to service template
    description: Optional[str] = None

class TaskUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None
    template_id: Optional[str] = None
    description: Optional[str] = None

class Task(TaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    template_name: Optional[str] = None

# Work Item Models (công việc trong dự án)
class WorkItemBase(BaseModel):
    name: str
    description: Optional[str] = None  # Rich text content
    service_id: Optional[str] = None  # Dịch vụ liên quan
    task_id: Optional[str] = None     # Nhiệm vụ liên quan
    assigned_to: Optional[str] = None # Người nhận
    deadline: Optional[datetime] = None
    priority: str = "normal"          # urgent, high, normal
    status: str = "not_started"       # not_started, in_progress, completed
    result_checked: bool = False      # Đã check kết quả

class WorkItemCreate(WorkItemBase):
    pass

class WorkItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    service_id: Optional[str] = None
    task_id: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    result_checked: Optional[bool] = None

class WorkItem(WorkItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str                   # Will be set by endpoint
    assigned_by: str                  # Will be set by endpoint
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Feedback Models (feedback cho work items)
class FeedbackBase(BaseModel):
    work_item_id: str
    user_id: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FeedbackCreate(BaseModel):
    message: str

class Feedback(FeedbackBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: Optional[str] = None  # Enriched field

# Template Models (for service templates)
class TemplateBase(BaseModel):
    name: str
    content: Optional[str] = None  # JSON content for template
    template_type: str = "service"  # service, task, etc.
    archived: bool = False

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    archived: Optional[bool] = None

class Template(TemplateBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    creator_name: Optional[str] = None

# ================= INTERNAL TASK MANAGEMENT MODELS =================

# Internal Task Models (for agency internal work management)
class InternalTaskBase(BaseModel):
    name: str
    description: Optional[str] = None  # Rich text content
    document_links: Optional[List[str]] = []  # Multiple document links
    assigned_to: str  # User ID - required
    deadline: datetime
    priority: str = "normal"  # high, normal, low
    status: str = "not_started"  # not_started, in_progress, completed
    report_link: Optional[str] = None  # Report link when completed

class InternalTaskCreate(InternalTaskBase):
    pass

class InternalTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    document_links: Optional[List[str]] = None
    assigned_to: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    report_link: Optional[str] = None

class InternalTask(InternalTaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_by: str  # Will be set by endpoint (current user)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    # Enriched fields
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None

# Internal Task Feedback Models
class InternalTaskFeedbackBase(BaseModel):
    task_id: str
    user_id: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InternalTaskFeedbackCreate(BaseModel):
    message: str

class InternalTaskFeedback(InternalTaskFeedbackBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: Optional[str] = None  # Enriched field

# ================= EXPENSE MANAGEMENT MODELS =================

# Expense Category Models
class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"  # Default blue color
    is_active: bool = True

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class ExpenseCategory(ExpenseCategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Expense Folder Models (for organizing expenses)
class ExpenseFolderBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#10B981"  # Default green color
    is_active: bool = True

class ExpenseFolderCreate(ExpenseFolderBase):
    pass

class ExpenseFolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class ExpenseFolder(ExpenseFolderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None

# Expense Models
class ExpenseBase(BaseModel):
    title: str
    amount: float
    category_id: str
    folder_id: Optional[str] = None
    project_id: Optional[str] = None  # Link to project if applicable
    client_id: Optional[str] = None   # Link to client if applicable
    expense_date: datetime
    description: Optional[str] = None
    receipt_url: Optional[str] = None  # Receipt/invoice image
    vendor: Optional[str] = None       # Vendor/supplier name
    payment_method: str = "cash"       # cash, credit_card, bank_transfer, check
    status: str = "pending"           # pending, approved, rejected, paid
    tags: List[str] = []
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None  # weekly, monthly, quarterly, yearly
    recurring_end_date: Optional[datetime] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    category_id: Optional[str] = None
    folder_id: Optional[str] = None
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    expense_date: Optional[datetime] = None
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    vendor: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    is_recurring: Optional[bool] = None
    recurring_frequency: Optional[str] = None
    recurring_end_date: Optional[datetime] = None

class Expense(ExpenseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    expense_number: str  # Auto-generated unique number
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    # Enriched fields
    category_name: Optional[str] = None
    folder_name: Optional[str] = None
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    created_by_name: Optional[str] = None

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
async def create_user(user: UserCreate, current_user: User = Depends(get_current_active_user)):
    # Kiểm tra quyền admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
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

@api_router.get("/users/by-role/{role}", response_model=List[User])
async def read_users_by_role(role: str, current_user: User = Depends(get_current_active_user)):
    """Lấy danh sách users theo role cụ thể"""
    allowed_roles = ["manager", "account", "content", "design", "editor", "sale", "admin", "creative", "staff"]
    if role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    users = await db.users.find({"role": role, "is_active": True}).to_list(length=100)
    return users

# Additional User Management Endpoints for module-tai-khoan
@api_router.put("/users/me/", response_model=User)
async def update_current_user(user_update: dict, current_user: User = Depends(get_current_active_user)):
    """Cập nhật thông tin user hiện tại"""
    # Kiểm tra email unique nếu thay đổi
    if user_update.get("email") and user_update["email"] != current_user.email:
        existing_user = await db.users.find_one({"email": user_update["email"], "id": {"$ne": current_user.id}})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    update_data = {k: v for k, v in user_update.items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one({"id": current_user.id}, {"$set": update_data})
    
    # Return updated user
    updated_user = await db.users.find_one({"id": current_user.id})
    return updated_user

@api_router.put("/users/me/password")
async def update_current_user_password(
    password_data: dict, 
    current_user: User = Depends(get_current_active_user)
):
    """Đổi mật khẩu user hiện tại"""
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current password and new password are required")
    
    # Verify current password
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    # Update password
    hashed_new_password = get_password_hash(new_password)
    await db.users.update_one(
        {"id": current_user.id}, 
        {"$set": {"hashed_password": hashed_new_password, "updated_at": datetime.utcnow()}}
    )
    
    return {"detail": "Password updated successfully"}

@api_router.put("/users/{user_id}/password")
async def reset_user_password(
    user_id: str,
    password_data: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Reset mật khẩu user (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    new_password = password_data.get("new_password")
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required")
    
    # Check if target user exists
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    hashed_new_password = get_password_hash(new_password)
    await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"hashed_password": hashed_new_password, "updated_at": datetime.utcnow()}}
    )
    
    return {"detail": "Password reset successfully"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_active_user)):
    """Xóa user (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"detail": "User deleted successfully"}

@api_router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str, 
    status_data: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật trạng thái active/inactive của user (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own account status")
    
    is_active = status_data.get("is_active")
    if is_active is None:
        raise HTTPException(status_code=400, detail="is_active field is required")
    
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"is_active": is_active, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"detail": f"User {'activated' if is_active else 'deactivated'} successfully"}

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
    
    # Kiểm tra campaign tồn tại (nếu có)
    if project.campaign_id:
        campaign = await db.campaigns.find_one({"id": project.campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
    
    project_data = project.dict()
    project_obj = Project(**project_data, created_by=current_user.id)
    result = await db.projects.insert_one(project_obj.dict())
    return project_obj

@api_router.get("/projects/", response_model=List[Project])
async def read_projects(
    skip: int = 0, 
    limit: int = 100,
    archived: bool = False,
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    team_member: Optional[str] = None,
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    # Build query filter
    query_filter = {"archived": archived}
    
    # Status filter
    if status:
        query_filter["status"] = status
    
    # Client filter  
    if client_id:
        query_filter["client_id"] = client_id
    
    # Team member filter
    if team_member:
        query_filter["team"] = {"$in": [team_member]}
    
    # Time filters
    if year:
        start_date = datetime(year, 1, 1)
        if quarter:
            # Quarter filter
            quarter_months = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}
            start_month, end_month = quarter_months[quarter]
            start_date = datetime(year, start_month, 1)
            end_date = datetime(year, end_month + 1, 1) if end_month < 12 else datetime(year + 1, 1, 1)
        elif month:
            # Month filter
            start_date = datetime(year, month, 1)
            end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        else:
            # Year filter
            end_date = datetime(year + 1, 1, 1)
        
        query_filter["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    # Search filter
    if search:
        # We need to get client names that match the search term first
        matching_clients = await db.clients.find(
            {"name": {"$regex": search, "$options": "i"}}
        ).to_list(length=None)
        
        client_ids = [client["id"] for client in matching_clients]
        
        # Search in project name, description, or matching client names
        search_conditions = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
        
        # Add client_id condition if we found matching clients
        if client_ids:
            search_conditions.append({"client_id": {"$in": client_ids}})
        
        query_filter["$or"] = search_conditions
    
    projects = await db.projects.find(query_filter).skip(skip).limit(limit).to_list(length=limit)
    return projects

@api_router.get("/projects/statistics")
async def get_projects_statistics(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_active_user)
):
    # Build time filter
    time_filter = {}
    if year:
        start_date = datetime(year, 1, 1)
        if quarter:
            quarter_months = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}
            start_month, end_month = quarter_months[quarter]
            start_date = datetime(year, start_month, 1)
            end_date = datetime(year, end_month + 1, 1) if end_month < 12 else datetime(year + 1, 1, 1)
        elif month:
            start_date = datetime(year, month, 1)
            end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year + 1, 1, 1)
        
        time_filter["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    # Get all non-archived projects within time filter
    base_filter = {"archived": False, **time_filter}
    
    # Count statistics
    total_projects = await db.projects.count_documents(base_filter)
    in_progress = await db.projects.count_documents({**base_filter, "status": "in_progress"})
    completed = await db.projects.count_documents({**base_filter, "status": "completed"})
    pending = await db.projects.count_documents({**base_filter, "status": "pending"})
    
    # Count overdue projects (end_date < now and status not completed)
    from datetime import datetime as dt
    now = dt.utcnow()
    overdue = await db.projects.count_documents({
        **base_filter,
        "end_date": {"$lt": now},
        "status": {"$nin": ["completed", "cancelled"]}
    })
    
    return {
        "total_projects": total_projects,
        "in_progress": in_progress,
        "completed": completed,
        "pending": pending,
        "overdue": overdue
    }

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
    
    # Kiểm tra client tồn tại
    client = await db.clients.find_one({"id": project.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Kiểm tra campaign tồn tại (nếu có)
    if project.campaign_id:
        campaign = await db.campaigns.find_one({"id": project.campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
    
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

# Project bulk operations
@api_router.post("/projects/bulk-archive")
async def bulk_archive_projects(project_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.projects.update_many(
        {"id": {"$in": project_ids}},
        {"$set": {"archived": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"detail": f"{result.modified_count} projects archived"}

@api_router.post("/projects/bulk-restore")
async def bulk_restore_projects(project_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.projects.update_many(
        {"id": {"$in": project_ids}},
        {"$set": {"archived": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"detail": f"{result.modified_count} projects restored"}

@api_router.post("/projects/bulk-delete")
async def bulk_delete_projects(project_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Delete related data (contracts, invoices, etc.) if needed
    # TODO: Add cleanup logic for related data
    
    result = await db.projects.delete_many({"id": {"$in": project_ids}})
    
    return {"detail": f"{result.deleted_count} projects deleted"}

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

# Invoice statistics endpoint - must be before {invoice_id} endpoint
@api_router.get("/invoices/statistics")
async def get_invoice_statistics(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_active_user)
):
    # Build time filter
    time_filter = {}
    if year:
        start_date = datetime(year, 1, 1)
        if quarter:
            quarter_months = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}
            start_month, end_month = quarter_months[quarter]
            start_date = datetime(year, start_month, 1)
            end_date = datetime(year, end_month + 1, 1) if end_month < 12 else datetime(year + 1, 1, 1)
        elif month:
            start_date = datetime(year, month, 1)
            end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year + 1, 1, 1)
        
        time_filter["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    # Get invoice statistics
    base_filter = time_filter
    
    total_invoices = await db.invoices.count_documents(base_filter)
    total_amount = 0
    paid_amount = 0
    pending_amount = 0
    overdue_amount = 0
    
    invoices = await db.invoices.find(base_filter).to_list(length=None)
    
    for invoice in invoices:
        total_amount += invoice["amount"]
        if invoice["status"] == "paid":
            paid_amount += invoice["amount"]
        elif invoice["status"] == "sent":
            pending_amount += invoice["amount"]
        elif invoice["status"] == "overdue":
            overdue_amount += invoice["amount"]
    
    # Count by status
    draft_count = await db.invoices.count_documents({**base_filter, "status": "draft"})
    sent_count = await db.invoices.count_documents({**base_filter, "status": "sent"})
    paid_count = await db.invoices.count_documents({**base_filter, "status": "paid"})
    overdue_count = await db.invoices.count_documents({**base_filter, "status": "overdue"})
    
    return {
        "total_invoices": total_invoices,
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "pending_amount": pending_amount,
        "overdue_amount": overdue_amount,
        "by_status": {
            "draft": draft_count,
            "sent": sent_count,
            "paid": paid_count,
            "overdue": overdue_count
        }
    }

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

# Work Item Management endpoints
@api_router.post("/projects/{project_id}/work-items/", response_model=WorkItem)
async def create_work_item(
    project_id: str, 
    work_item: WorkItemCreate, 
    current_user: User = Depends(get_current_active_user)
):
    # Kiểm tra project tồn tại
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Kiểm tra service tồn tại (nếu có)
    if work_item.service_id:
        service = await db.services.find_one({"id": work_item.service_id})
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
    
    # Kiểm tra task tồn tại (nếu có)
    if work_item.task_id:
        task = await db.tasks.find_one({"id": work_item.task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
    
    work_item_data = work_item.dict()
    work_item_data["project_id"] = project_id
    work_item_data["assigned_by"] = current_user.id
    
    work_item_obj = WorkItem(**work_item_data, created_by=current_user.id)
    await db.work_items.insert_one(work_item_obj.dict())
    return work_item_obj

@api_router.get("/projects/{project_id}/work-items/", response_model=List[WorkItem])
async def get_project_work_items(
    project_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
):
    # Kiểm tra project tồn tại
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    work_items = await db.work_items.find({"project_id": project_id}).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich với thông tin user
    for item in work_items:
        if item.get("assigned_by"):
            user = await db.users.find_one({"id": item["assigned_by"]})
            item["assigned_by_name"] = user["full_name"] if user else "Unknown"
        
        if item.get("assigned_to"):
            user = await db.users.find_one({"id": item["assigned_to"]})
            item["assigned_to_name"] = user["full_name"] if user else "Unknown"
        
        if item.get("service_id"):
            service = await db.services.find_one({"id": item["service_id"]})
            item["service_name"] = service["name"] if service else "Unknown"
        
        if item.get("task_id"):
            task = await db.tasks.find_one({"id": item["task_id"]})
            item["task_name"] = task["name"] if task else "Unknown"
    
    return work_items

@api_router.get("/work-items/{work_item_id}", response_model=WorkItem)
async def get_work_item(work_item_id: str, current_user: User = Depends(get_current_active_user)):
    work_item = await db.work_items.find_one({"id": work_item_id})
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    return work_item

@api_router.put("/work-items/{work_item_id}", response_model=WorkItem)
async def update_work_item(
    work_item_id: str, 
    work_item_update: WorkItemUpdate, 
    current_user: User = Depends(get_current_active_user)
):
    db_work_item = await db.work_items.find_one({"id": work_item_id})
    if not db_work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    update_data = work_item_update.dict(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.work_items.update_one({"id": work_item_id}, {"$set": update_data})
        
        # Fetch updated work item
        updated_work_item = await db.work_items.find_one({"id": work_item_id})
        return updated_work_item
    
    return db_work_item

@api_router.delete("/work-items/{work_item_id}")
async def delete_work_item(work_item_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.work_items.delete_one({"id": work_item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    return {"detail": "Work item deleted successfully"}

@api_router.patch("/work-items/{work_item_id}/status")
async def update_work_item_status(
    work_item_id: str,
    status: str,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật trạng thái công việc (cho nút kết quả)"""
    if status not in ["not_started", "in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.work_items.update_one(
        {"id": work_item_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    return {"detail": "Status updated successfully", "status": status}

# Feedback Management endpoints  
@api_router.post("/work-items/{work_item_id}/feedback/", response_model=Feedback)
async def create_feedback(
    work_item_id: str,
    feedback: FeedbackCreate,
    current_user: User = Depends(get_current_active_user)
):
    # Kiểm tra work item tồn tại
    work_item = await db.work_items.find_one({"id": work_item_id})
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    feedback_data = feedback.dict()
    feedback_obj = Feedback(
        **feedback_data,
        work_item_id=work_item_id,
        user_id=current_user.id,
        user_name=current_user.full_name
    )
    await db.feedbacks.insert_one(feedback_obj.dict())
    return feedback_obj

@api_router.get("/work-items/{work_item_id}/feedback/", response_model=List[Feedback])
async def get_work_item_feedback(
    work_item_id: str,
    current_user: User = Depends(get_current_active_user)
):
    # Kiểm tra work item tồn tại
    work_item = await db.work_items.find_one({"id": work_item_id})
    if not work_item:
        raise HTTPException(status_code=404, detail="Work item not found")
    
    feedbacks = await db.feedbacks.find({"work_item_id": work_item_id}).sort("created_at", 1).to_list(length=100)
    
    # Enrich với user names
    for feedback in feedbacks:
        if feedback.get("user_id"):
            user = await db.users.find_one({"id": feedback["user_id"]})
            feedback["user_name"] = user["full_name"] if user else "Unknown User"
    
    return feedbacks

# ================= INTERNAL TASK MANAGEMENT ENDPOINTS =================

@api_router.post("/internal-tasks/", response_model=InternalTask)
async def create_internal_task(
    task: InternalTaskCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Tạo công việc nội bộ mới"""
    # Kiểm tra người được giao việc tồn tại
    assigned_user = await db.users.find_one({"id": task.assigned_to})
    if not assigned_user:
        raise HTTPException(status_code=404, detail="Assigned user not found")
    
    task_data = task.dict()
    task_obj = InternalTask(**task_data, assigned_by=current_user.id, created_by=current_user.id)
    
    await db.internal_tasks.insert_one(task_obj.dict())
    
    # Enrich với tên người dùng
    task_dict = task_obj.dict()
    task_dict["assigned_to_name"] = assigned_user["full_name"]
    task_dict["assigned_by_name"] = current_user.full_name
    
    return task_dict

@api_router.get("/internal-tasks/", response_model=List[InternalTask])
async def get_internal_tasks(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách công việc nội bộ với bộ lọc"""
    query_filter = {}
    
    # Filter by status
    if status:
        query_filter["status"] = status
    
    # Filter by priority
    if priority:
        query_filter["priority"] = priority
    
    # Filter by assigned user
    if assigned_to:
        query_filter["assigned_to"] = assigned_to
    
    # Date range filter
    if start_date or end_date:
        date_filter = {}
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                date_filter["$gte"] = start_dt
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format")
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                date_filter["$lte"] = end_dt
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format")
        
        query_filter["created_at"] = date_filter
    
    # Search filter
    if search:
        query_filter["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    tasks = await db.internal_tasks.find(query_filter).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich với thông tin user
    for task in tasks:
        if task.get("assigned_to"):
            assigned_user = await db.users.find_one({"id": task["assigned_to"]})
            task["assigned_to_name"] = assigned_user["full_name"] if assigned_user else "Unknown"
        
        if task.get("assigned_by"):
            assigned_by_user = await db.users.find_one({"id": task["assigned_by"]})
            task["assigned_by_name"] = assigned_by_user["full_name"] if assigned_by_user else "Unknown"
    
    return tasks

@api_router.get("/internal-tasks/statistics")
async def get_internal_tasks_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy thống kê công việc nội bộ"""
    query_filter = {}
    
    # Date range filter
    if start_date or end_date:
        date_filter = {}
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                date_filter["$gte"] = start_dt
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format")
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                date_filter["$lte"] = end_dt
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format")
        
        query_filter["created_at"] = date_filter
    
    # Count statistics
    total_tasks = await db.internal_tasks.count_documents(query_filter)
    not_started = await db.internal_tasks.count_documents({**query_filter, "status": "not_started"})
    in_progress = await db.internal_tasks.count_documents({**query_filter, "status": "in_progress"})
    completed = await db.internal_tasks.count_documents({**query_filter, "status": "completed"})
    
    # Priority statistics
    high_priority = await db.internal_tasks.count_documents({**query_filter, "priority": "high"})
    normal_priority = await db.internal_tasks.count_documents({**query_filter, "priority": "normal"})
    low_priority = await db.internal_tasks.count_documents({**query_filter, "priority": "low"})
    
    return {
        "total_tasks": total_tasks,
        "not_started": not_started,
        "in_progress": in_progress,
        "completed": completed,
        "high_priority": high_priority,
        "normal_priority": normal_priority,
        "low_priority": low_priority
    }

@api_router.get("/internal-tasks/{task_id}", response_model=InternalTask)
async def get_internal_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy chi tiết công việc nội bộ"""
    task = await db.internal_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Enrich với thông tin user
    if task.get("assigned_to"):
        assigned_user = await db.users.find_one({"id": task["assigned_to"]})
        task["assigned_to_name"] = assigned_user["full_name"] if assigned_user else "Unknown"
    
    if task.get("assigned_by"):
        assigned_by_user = await db.users.find_one({"id": task["assigned_by"]})
        task["assigned_by_name"] = assigned_by_user["full_name"] if assigned_by_user else "Unknown"
    
    return task

@api_router.put("/internal-tasks/{task_id}", response_model=InternalTask)
async def update_internal_task(
    task_id: str,
    task_update: InternalTaskUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật công việc nội bộ"""
    task = await db.internal_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    
    # Kiểm tra người được giao việc mới nếu có
    if "assigned_to" in update_data:
        assigned_user = await db.users.find_one({"id": update_data["assigned_to"]})
        if not assigned_user:
            raise HTTPException(status_code=404, detail="Assigned user not found")
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.internal_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # Get updated task
    updated_task = await db.internal_tasks.find_one({"id": task_id})
    
    # Enrich với thông tin user
    if updated_task.get("assigned_to"):
        assigned_user = await db.users.find_one({"id": updated_task["assigned_to"]})
        updated_task["assigned_to_name"] = assigned_user["full_name"] if assigned_user else "Unknown"
    
    if updated_task.get("assigned_by"):
        assigned_by_user = await db.users.find_one({"id": updated_task["assigned_by"]})
        updated_task["assigned_by_name"] = assigned_by_user["full_name"] if assigned_by_user else "Unknown"
    
    return updated_task

@api_router.delete("/internal-tasks/{task_id}")
async def delete_internal_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Xóa công việc nội bộ"""
    result = await db.internal_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Xóa feedback liên quan
    await db.internal_task_feedbacks.delete_many({"task_id": task_id})
    
    return {"detail": "Task deleted successfully"}

@api_router.post("/internal-tasks/bulk-delete")
async def bulk_delete_internal_tasks(
    task_ids: List[str],
    current_user: User = Depends(get_current_active_user)
):
    """Xóa nhiều công việc nội bộ"""
    result = await db.internal_tasks.delete_many({"id": {"$in": task_ids}})
    
    # Xóa feedback liên quan
    await db.internal_task_feedbacks.delete_many({"task_id": {"$in": task_ids}})
    
    return {"detail": f"{result.deleted_count} tasks deleted successfully"}

@api_router.patch("/internal-tasks/{task_id}/status")
async def update_internal_task_status(
    task_id: str,
    status_data: Dict[str, str],
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật trạng thái công việc nội bộ"""
    status = status_data.get("status")
    report_link = status_data.get("report_link")
    
    if status not in ["not_started", "in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": status, "updated_at": datetime.utcnow()}
    
    # Nếu hoàn thành thì cần report_link
    if status == "completed":
        if not report_link:
            raise HTTPException(status_code=400, detail="Report link is required for completed tasks")
        update_data["report_link"] = report_link
    
    result = await db.internal_tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"detail": "Task status updated successfully", "status": status}

# Feedback for Internal Tasks
@api_router.post("/internal-tasks/{task_id}/feedback/", response_model=InternalTaskFeedback)
async def create_internal_task_feedback(
    task_id: str,
    feedback: InternalTaskFeedbackCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Tạo feedback cho công việc nội bộ"""
    # Kiểm tra task tồn tại
    task = await db.internal_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    feedback_data = feedback.dict()
    feedback_obj = InternalTaskFeedback(
        **feedback_data,
        task_id=task_id,
        user_id=current_user.id,
        user_name=current_user.full_name
    )
    await db.internal_task_feedbacks.insert_one(feedback_obj.dict())
    return feedback_obj

@api_router.get("/internal-tasks/{task_id}/feedback/", response_model=List[InternalTaskFeedback])
async def get_internal_task_feedback(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy feedback của công việc nội bộ"""
    # Kiểm tra task tồn tại
    task = await db.internal_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    feedbacks = await db.internal_task_feedbacks.find({"task_id": task_id}).sort("created_at", 1).to_list(length=100)
    
    # Enrich với user names
    for feedback in feedbacks:
        if feedback.get("user_id"):
            user = await db.users.find_one({"id": feedback["user_id"]})
            feedback["user_name"] = user["full_name"] if user else "Unknown User"
    
    return feedbacks

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

# ================== CAMPAIGN ENDPOINTS ==================

@api_router.post("/campaigns/", response_model=Campaign)
async def create_campaign(
    campaign: CampaignCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo chiến dịch mới"""
    campaign_dict = campaign.dict()
    campaign_dict["id"] = str(uuid.uuid4())
    campaign_dict["created_at"] = datetime.utcnow()
    campaign_dict["updated_at"] = datetime.utcnow()
    campaign_dict["created_by"] = current_user.id
    
    await db.campaigns.insert_one(campaign_dict)
    return Campaign(**campaign_dict)

@api_router.get("/campaigns/", response_model=List[Campaign])
async def get_campaigns(
    search: Optional[str] = None,
    archived: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách chiến dịch với search và filter"""
    query_filter = {"archived": archived}
    
    # Search filter
    if search:
        query_filter["name"] = {"$regex": search, "$options": "i"}
    
    campaigns = await db.campaigns.find(query_filter).sort([("created_at", -1)]).to_list(length=None)
    
    # Enrich with user info
    for campaign in campaigns:
        if campaign.get("created_by"):
            user = await db.users.find_one({"id": campaign["created_by"]})
            campaign["created_by_name"] = user.get("full_name", "Unknown") if user else "Unknown"
        else:
            campaign["created_by_name"] = "Unknown"
    
    return [Campaign(**campaign) for campaign in campaigns]

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy thông tin chi tiết một chiến dịch"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Enrich with user info
    if campaign.get("created_by"):
        user = await db.users.find_one({"id": campaign["created_by"]})
        campaign["created_by_name"] = user.get("full_name", "Unknown") if user else "Unknown"
    else:
        campaign["created_by_name"] = "Unknown"
    
    return Campaign(**campaign)

@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: str,
    campaign_update: CampaignUpdate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật chiến dịch"""
    existing_campaign = await db.campaigns.find_one({"id": campaign_id})
    if not existing_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = {k: v for k, v in campaign_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    
    updated_campaign = await db.campaigns.find_one({"id": campaign_id})
    
    # Enrich with user info
    if updated_campaign.get("created_by"):
        user = await db.users.find_one({"id": updated_campaign["created_by"]})
        updated_campaign["created_by_name"] = user.get("full_name", "Unknown") if user else "Unknown"
    else:
        updated_campaign["created_by_name"] = "Unknown"
    
    return Campaign(**updated_campaign)

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa chiến dịch (chỉ admin và account)"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(
            status_code=403,
            detail="Only admin and account users can delete campaigns"
        )
    
    result = await db.campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"detail": "Campaign deleted successfully"}

@api_router.post("/campaigns/bulk-action")
async def bulk_campaign_action(
    action: str = Body(..., embed=True),
    campaign_ids: List[str] = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Thực hiện hành động hàng loạt trên nhiều chiến dịch"""
    if not campaign_ids:
        raise HTTPException(status_code=400, detail="No campaigns selected")
    
    if action == "archive":
        result = await db.campaigns.update_many(
            {"id": {"$in": campaign_ids}},
            {"$set": {"archived": True, "updated_at": datetime.utcnow()}}
        )
        return {"detail": f"{result.modified_count} campaigns archived"}
    
    elif action == "restore":
        result = await db.campaigns.update_many(
            {"id": {"$in": campaign_ids}},
            {"$set": {"archived": False, "updated_at": datetime.utcnow()}}
        )
        return {"detail": f"{result.modified_count} campaigns restored"}
    
    elif action == "delete":
        if current_user.role not in ["admin", "account"]:
            raise HTTPException(
                status_code=403,
                detail="Only admin and account users can delete campaigns"
            )
        
        result = await db.campaigns.delete_many({"id": {"$in": campaign_ids}})
        return {"detail": f"{result.deleted_count} campaigns deleted"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

# ================== SERVICE ENDPOINTS ==================

@api_router.post("/campaigns/{campaign_id}/services/", response_model=Service)
async def create_service(
    campaign_id: str,
    service: ServiceCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo dịch vụ mới trong chiến dịch"""
    # Verify campaign exists
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    service_dict = service.dict()
    service_dict["id"] = str(uuid.uuid4())
    service_dict["campaign_id"] = campaign_id
    service_dict["created_at"] = datetime.utcnow()
    service_dict["updated_at"] = datetime.utcnow()
    service_dict["created_by"] = current_user.id
    
    await db.services.insert_one(service_dict)
    return Service(**service_dict)

@api_router.get("/campaigns/{campaign_id}/services/", response_model=List[Service])
async def get_services(
    campaign_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách dịch vụ trong chiến dịch"""
    services = await db.services.find({"campaign_id": campaign_id}).sort([("sort_order", 1), ("created_at", 1)]).to_list(length=None)
    return [Service(**service) for service in services]

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(
    service_id: str,
    service_update: ServiceUpdate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật dịch vụ"""
    existing_service = await db.services.find_one({"id": service_id})
    if not existing_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = {k: v for k, v in service_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.services.update_one({"id": service_id}, {"$set": update_data})
    
    updated_service = await db.services.find_one({"id": service_id})
    return Service(**updated_service)

@api_router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa dịch vụ và tất cả tasks thuộc dịch vụ"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(
            status_code=403,
            detail="Only admin and account users can delete services"
        )
    
    # Delete all tasks in this service first
    await db.tasks.delete_many({"service_id": service_id})
    
    # Delete the service
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"detail": "Service and all its tasks deleted successfully"}

# ================== TASK ENDPOINTS ==================

@api_router.post("/services/{service_id}/tasks/", response_model=Task)
async def create_task(
    service_id: str,
    task: TaskCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo nhiệm vụ mới trong dịch vụ"""
    # Verify service exists
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    task_dict = task.dict()
    task_dict["id"] = str(uuid.uuid4())
    task_dict["service_id"] = service_id
    task_dict["created_at"] = datetime.utcnow()
    task_dict["updated_at"] = datetime.utcnow()
    task_dict["created_by"] = current_user.id
    
    await db.tasks.insert_one(task_dict)
    return Task(**task_dict)

@api_router.get("/services/{service_id}/tasks/", response_model=List[Task])
async def get_tasks(
    service_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách nhiệm vụ trong dịch vụ"""
    tasks = await db.tasks.find({"service_id": service_id}).sort([("created_at", 1)]).to_list(length=None)
    
    # Enrich with template info
    for task in tasks:
        if task.get("template_id"):
            template = await db.templates.find_one({"id": task["template_id"]})
            task["template_name"] = template.get("name", "Unknown") if template else "Unknown"
        else:
            task["template_name"] = None
    
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy chi tiết nhiệm vụ"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Enrich with template name if template_id exists
    if task.get("template_id"):
        template = await db.templates.find_one({"id": task["template_id"]})
        if template:
            task["template_name"] = template["name"]
    
    return Task(**task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật nhiệm vụ"""
    existing_task = await db.tasks.find_one({"id": task_id})
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id})
    
    # Enrich with template info
    if updated_task.get("template_id"):
        template = await db.templates.find_one({"id": updated_task["template_id"]})
        updated_task["template_name"] = template.get("name", "Unknown") if template else "Unknown"
    else:
        updated_task["template_name"] = None
    
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa nhiệm vụ"""
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"detail": "Task deleted successfully"}

@api_router.delete("/tasks/bulk")
async def bulk_delete_tasks(
    task_ids: List[str] = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Xóa nhiều nhiệm vụ cùng lúc"""
    if not task_ids:
        raise HTTPException(status_code=400, detail="No task IDs provided")
    
    if len(task_ids) > 50:
        raise HTTPException(status_code=400, detail="Cannot delete more than 50 tasks at once")
    
    result = await db.tasks.delete_many({"id": {"$in": task_ids}})
    
    return {
        "detail": f"{result.deleted_count} tasks deleted successfully",
        "deleted_count": result.deleted_count
    }

@api_router.post("/tasks/bulk-delete")
async def bulk_delete_tasks_post(
    task_ids: List[str] = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Xóa nhiều nhiệm vụ cùng lúc (POST method)"""
    if not task_ids:
        raise HTTPException(status_code=400, detail="No task IDs provided")
    
    if len(task_ids) > 50:
        raise HTTPException(status_code=400, detail="Cannot delete more than 50 tasks at once")
    
    result = await db.tasks.delete_many({"id": {"$in": task_ids}})
    
    return {
        "detail": f"{result.deleted_count} tasks deleted successfully",
        "deleted_count": result.deleted_count
    }

@api_router.post("/tasks/{task_id}/copy")
async def copy_task(
    task_id: str,
    data: dict,
    current_user: User = Depends(get_current_user)
):
    """Sao chép nhiệm vụ"""
    quantity = data.get("quantity", 1)
    if quantity <= 0 or quantity > 20:
        raise HTTPException(status_code=400, detail="Quantity must be between 1 and 20")
    
    original_task = await db.tasks.find_one({"id": task_id})
    if not original_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    copied_tasks = []
    for i in range(quantity):
        task_dict = original_task.copy()
        task_dict["id"] = str(uuid.uuid4())
        task_dict["name"] = f"{original_task['name']} (Copy {i+1})"
        task_dict["created_at"] = datetime.utcnow()
        task_dict["updated_at"] = datetime.utcnow()
        task_dict["created_by"] = current_user.id
        task_dict["status"] = "not_started"  # Reset status for copies
        
        await db.tasks.insert_one(task_dict)
        copied_tasks.append(task_dict)
    
    return {"detail": f"{quantity} tasks copied successfully", "copied_tasks": [Task(**task) for task in copied_tasks]}

# ================== EXPENSE MANAGEMENT ENDPOINTS ==================

# Expense Categories endpoints
@api_router.post("/expense-categories/", response_model=ExpenseCategory)
async def create_expense_category(
    category: ExpenseCategoryCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Tạo hạng mục chi phí mới"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    category_data = category.dict()
    category_obj = ExpenseCategory(**category_data, created_by=current_user.id)
    await db.expense_categories.insert_one(category_obj.dict())
    return category_obj

@api_router.get("/expense-categories/", response_model=List[ExpenseCategory])
async def get_expense_categories(
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách hạng mục chi phí"""
    query_filter = {}
    if is_active is not None:
        query_filter["is_active"] = is_active
    
    categories = await db.expense_categories.find(query_filter).sort("name", 1).to_list(length=None)
    return [ExpenseCategory(**cat) for cat in categories]

@api_router.put("/expense-categories/{category_id}", response_model=ExpenseCategory)
async def update_expense_category(
    category_id: str,
    category_update: ExpenseCategoryUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật hạng mục chi phí"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    existing_category = await db.expense_categories.find_one({"id": category_id})
    if not existing_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {k: v for k, v in category_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.expense_categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated_category = await db.expense_categories.find_one({"id": category_id})
    return ExpenseCategory(**updated_category)

@api_router.delete("/expense-categories/{category_id}")
async def delete_expense_category(
    category_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Xóa hạng mục chi phí"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if category is being used by any expenses
    expense_count = await db.expenses.count_documents({"category_id": category_id})
    if expense_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category that has expenses")
    
    result = await db.expense_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"detail": "Category deleted successfully"}

# Expense Folders endpoints
@api_router.post("/expense-folders/", response_model=ExpenseFolder)
async def create_expense_folder(
    folder: ExpenseFolderCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Tạo thư mục chi phí mới"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    folder_data = folder.dict()
    folder_obj = ExpenseFolder(**folder_data, created_by=current_user.id)
    await db.expense_folders.insert_one(folder_obj.dict())
    return folder_obj

@api_router.get("/expense-folders/", response_model=List[ExpenseFolder])
async def get_expense_folders(
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách thư mục chi phí"""
    query_filter = {}
    if is_active is not None:
        query_filter["is_active"] = is_active
    
    folders = await db.expense_folders.find(query_filter).sort("name", 1).to_list(length=None)
    return [ExpenseFolder(**folder) for folder in folders]

@api_router.put("/expense-folders/{folder_id}", response_model=ExpenseFolder)
async def update_expense_folder(
    folder_id: str,
    folder_update: ExpenseFolderUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật thư mục chi phí"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    existing_folder = await db.expense_folders.find_one({"id": folder_id})
    if not existing_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    update_data = {k: v for k, v in folder_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.expense_folders.update_one({"id": folder_id}, {"$set": update_data})
    
    updated_folder = await db.expense_folders.find_one({"id": folder_id})
    return ExpenseFolder(**updated_folder)

@api_router.delete("/expense-folders/{folder_id}")
async def delete_expense_folder(
    folder_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Xóa thư mục chi phí"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if folder is being used by any expenses
    expense_count = await db.expenses.count_documents({"folder_id": folder_id})
    if expense_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete folder that has expenses")
    
    result = await db.expense_folders.delete_one({"id": folder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return {"detail": "Folder deleted successfully"}

# Expenses endpoints
@api_router.post("/expenses/", response_model=Expense)
async def create_expense(
    expense: ExpenseCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Tạo chi phí mới"""
    # Verify category exists
    category = await db.expense_categories.find_one({"id": expense.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Verify folder exists (if provided)
    if expense.folder_id:
        folder = await db.expense_folders.find_one({"id": expense.folder_id})
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
    
    # Verify project exists (if provided)
    if expense.project_id:
        project = await db.projects.find_one({"id": expense.project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify client exists (if provided)
    if expense.client_id:
        client = await db.clients.find_one({"id": expense.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    
    # Generate expense number
    expense_count = await db.expenses.count_documents({})
    expense_number = f"EXP-{datetime.utcnow().strftime('%Y%m')}-{expense_count + 1:04d}"
    
    expense_data = expense.dict()
    expense_obj = Expense(**expense_data, expense_number=expense_number, created_by=current_user.id)
    await db.expenses.insert_one(expense_obj.dict())
    
    # Enrich with related data
    expense_dict = expense_obj.dict()
    expense_dict["category_name"] = category.get("name")
    if expense.folder_id and folder:
        expense_dict["folder_name"] = folder.get("name")
    if expense.project_id and project:
        expense_dict["project_name"] = project.get("name")
    if expense.client_id and client:
        expense_dict["client_name"] = client.get("name")
    expense_dict["created_by_name"] = current_user.full_name
    
    return Expense(**expense_dict)

@api_router.get("/expenses/", response_model=List[Expense])
async def get_expenses(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[str] = None,
    folder_id: Optional[str] = None,
    project_id: Optional[str] = None,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách chi phí với filters"""
    query_filter = {}
    
    # Apply filters
    if category_id:
        query_filter["category_id"] = category_id
    if folder_id:
        query_filter["folder_id"] = folder_id
    if project_id:
        query_filter["project_id"] = project_id
    if client_id:
        query_filter["client_id"] = client_id
    if status:
        query_filter["status"] = status
    if payment_method:
        query_filter["payment_method"] = payment_method
    
    # Date range filter
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        query_filter["expense_date"] = date_filter
    
    # Search filter
    if search:
        search_conditions = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"vendor": {"$regex": search, "$options": "i"}},
            {"expense_number": {"$regex": search, "$options": "i"}}
        ]
        query_filter["$or"] = search_conditions
    
    expenses = await db.expenses.find(query_filter).sort("expense_date", -1).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with related data
    for expense in expenses:
        if expense.get("category_id"):
            category = await db.expense_categories.find_one({"id": expense["category_id"]})
            expense["category_name"] = category.get("name") if category else "Unknown"
        
        if expense.get("folder_id"):
            folder = await db.expense_folders.find_one({"id": expense["folder_id"]})
            expense["folder_name"] = folder.get("name") if folder else "Unknown"
        
        if expense.get("project_id"):
            project = await db.projects.find_one({"id": expense["project_id"]})
            expense["project_name"] = project.get("name") if project else "Unknown"
        
        if expense.get("client_id"):
            client = await db.clients.find_one({"id": expense["client_id"]})
            expense["client_name"] = client.get("name") if client else "Unknown"
        
        if expense.get("created_by"):
            user = await db.users.find_one({"id": expense["created_by"]})
            expense["created_by_name"] = user.get("full_name") if user else "Unknown"
    
    return [Expense(**expense) for expense in expenses]

@api_router.get("/expenses/statistics")
async def get_expense_statistics(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    category_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy thống kê chi phí"""
    # Build time filter
    time_filter = {}
    if year:
        start_date = datetime(year, 1, 1)
        if quarter:
            quarter_months = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}
            start_month, end_month = quarter_months[quarter]
            start_date = datetime(year, start_month, 1)
            end_date = datetime(year, end_month + 1, 1) if end_month < 12 else datetime(year + 1, 1, 1)
        elif month:
            start_date = datetime(year, month, 1)
            end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year + 1, 1, 1)
        
        time_filter["expense_date"] = {"$gte": start_date, "$lt": end_date}
    
    # Build base filter
    base_filter = time_filter.copy()
    if category_id:
        base_filter["category_id"] = category_id
    
    # Get statistics
    total_expenses = await db.expenses.count_documents(base_filter)
    
    # Amount by status
    pending_amount = sum([exp["amount"] for exp in await db.expenses.find({**base_filter, "status": "pending"}).to_list(length=1000)])
    approved_amount = sum([exp["amount"] for exp in await db.expenses.find({**base_filter, "status": "approved"}).to_list(length=1000)])
    paid_amount = sum([exp["amount"] for exp in await db.expenses.find({**base_filter, "status": "paid"}).to_list(length=1000)])
    
    # Count by status
    pending_count = await db.expenses.count_documents({**base_filter, "status": "pending"})
    approved_count = await db.expenses.count_documents({**base_filter, "status": "approved"})
    paid_count = await db.expenses.count_documents({**base_filter, "status": "paid"})
    
    # Expenses by category
    pipeline = [
        {"$match": base_filter},
        {"$group": {
            "_id": "$category_id",
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    category_stats = await db.expenses.aggregate(pipeline).to_list(length=None)
    
    # Enrich category stats with names
    for stat in category_stats:
        category = await db.expense_categories.find_one({"id": stat["_id"]})
        stat["category_name"] = category.get("name") if category else "Unknown"
    
    # Monthly trends (if no specific month filter)
    monthly_trends = []
    if not month and year:
        for m in range(1, 13):
            month_start = datetime(year, m, 1)
            month_end = datetime(year, m + 1, 1) if m < 12 else datetime(year + 1, 1, 1)
            month_filter = {**base_filter, "expense_date": {"$gte": month_start, "$lt": month_end}}
            
            month_total = sum([exp["amount"] for exp in await db.expenses.find(month_filter).to_list(length=1000)])
            month_count = await db.expenses.count_documents(month_filter)
            
            monthly_trends.append({
                "month": m,
                "total_amount": month_total,
                "count": month_count
            })
    
    return {
        "total_expenses": total_expenses,
        "amounts": {
            "pending": pending_amount,
            "approved": approved_amount,
            "paid": paid_amount,
            "total": pending_amount + approved_amount + paid_amount
        },
        "counts": {
            "pending": pending_count,
            "approved": approved_count,
            "paid": paid_count
        },
        "by_category": category_stats,
        "monthly_trends": monthly_trends
    }

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(
    expense_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy thông tin chi tiết một chi phí"""
    expense = await db.expenses.find_one({"id": expense_id})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Enrich with related data
    if expense.get("category_id"):
        category = await db.expense_categories.find_one({"id": expense["category_id"]})
        expense["category_name"] = category.get("name") if category else "Unknown"
    
    if expense.get("folder_id"):
        folder = await db.expense_folders.find_one({"id": expense["folder_id"]})
        expense["folder_name"] = folder.get("name") if folder else "Unknown"
    
    if expense.get("project_id"):
        project = await db.projects.find_one({"id": expense["project_id"]})
        expense["project_name"] = project.get("name") if project else "Unknown"
    
    if expense.get("client_id"):
        client = await db.clients.find_one({"id": expense["client_id"]})
        expense["client_name"] = client.get("name") if client else "Unknown"
    
    if expense.get("created_by"):
        user = await db.users.find_one({"id": expense["created_by"]})
        expense["created_by_name"] = user.get("full_name") if user else "Unknown"
    
    return Expense(**expense)

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật chi phí"""
    existing_expense = await db.expenses.find_one({"id": expense_id})
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Verify category exists (if being updated)
    if expense_update.category_id:
        category = await db.expense_categories.find_one({"id": expense_update.category_id})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Verify folder exists (if being updated)
    if expense_update.folder_id:
        folder = await db.expense_folders.find_one({"id": expense_update.folder_id})
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
    
    # Verify project exists (if being updated)
    if expense_update.project_id:
        project = await db.projects.find_one({"id": expense_update.project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify client exists (if being updated)
    if expense_update.client_id:
        client = await db.clients.find_one({"id": expense_update.client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = {k: v for k, v in expense_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    
    # Get updated expense with enriched data
    updated_expense = await get_expense(expense_id, current_user)
    return updated_expense

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Xóa chi phí"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"detail": "Expense deleted successfully"}

# Expense bulk operations
@api_router.post("/expenses/bulk-delete")
async def bulk_delete_expenses(
    expense_ids: List[str],
    current_user: User = Depends(get_current_active_user)
):
    """Xóa nhiều chi phí cùng lúc"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.expenses.delete_many({"id": {"$in": expense_ids}})
    return {"detail": f"{result.deleted_count} expenses deleted"}

@api_router.post("/expenses/bulk-update-status")
async def bulk_update_expense_status(
    expense_ids: List[str],
    status: str,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật trạng thái nhiều chi phí cùng lúc"""
    if status not in ["pending", "approved", "rejected", "paid"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.expenses.update_many(
        {"id": {"$in": expense_ids}},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    return {"detail": f"{result.modified_count} expenses updated"}

# Expense Statistics and Dashboard
# ================== TEMPLATE ENDPOINTS ==================

@api_router.post("/templates/", response_model=Template)
async def create_template(
    template: TemplateCreate,
    current_user: User = Depends(get_current_user)
):
    """Tạo template mới"""
    template_dict = template.dict()
    template_dict["id"] = str(uuid.uuid4())
    template_dict["created_at"] = datetime.utcnow()
    template_dict["updated_at"] = datetime.utcnow()
    template_dict["created_by"] = current_user.id
    
    await db.templates.insert_one(template_dict)
    return Template(**template_dict)

@api_router.get("/templates/", response_model=List[Template])
async def get_templates(
    template_type: str = "service",
    archived: bool = False,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách templates với tìm kiếm"""
    query_filter = {"template_type": template_type, "archived": archived}
    
    # Thêm tìm kiếm theo tên
    if search:
        query_filter["name"] = {"$regex": search, "$options": "i"}
    
    templates = await db.templates.find(query_filter).sort([("created_at", -1)]).to_list(length=None)
    
    # Thêm thông tin người tạo
    for template in templates:
        if template.get("created_by"):
            user = await db.users.find_one({"id": template["created_by"]})
            if user:
                template["creator_name"] = user.get("full_name", "Unknown")
            else:
                template["creator_name"] = "Unknown"
        else:
            template["creator_name"] = "Unknown"
    
    return [Template(**template) for template in templates]

@api_router.get("/templates/{template_id}", response_model=Template)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Lấy thông tin chi tiết template"""
    template = await db.templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return Template(**template)

@api_router.put("/templates/{template_id}", response_model=Template)
async def update_template(
    template_id: str,
    template_update: TemplateUpdate,
    current_user: User = Depends(get_current_user)
):
    """Cập nhật template"""
    template = await db.templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions (only creator or admin can update)
    if template["created_by"] != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    update_data = {k: v for k, v in template_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.templates.update_one(
            {"id": template_id},
            {"$set": update_data}
        )
    
    updated_template = await db.templates.find_one({"id": template_id})
    
    # Add creator name
    if updated_template.get("created_by"):
        user = await db.users.find_one({"id": updated_template["created_by"]})
        if user:
            updated_template["creator_name"] = user.get("full_name", "Unknown")
        else:
            updated_template["creator_name"] = "Unknown"
    else:
        updated_template["creator_name"] = "Unknown"
    
    return Template(**updated_template)

@api_router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Xóa template"""
    template = await db.templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions (only creator, admin or account can delete)
    if (template["created_by"] != current_user.id and 
        current_user.role not in ["admin", "account"]):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    await db.templates.delete_one({"id": template_id})
    return {"message": "Template deleted successfully"}

@api_router.post("/templates/bulk-archive")
async def bulk_archive_templates(
    template_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Lưu trữ templates hàng loạt"""
    result = await db.templates.update_many(
        {"id": {"$in": template_ids}},
        {"$set": {"archived": True, "updated_at": datetime.utcnow()}}
    )
    return {"message": f"Archived {result.modified_count} templates"}

@api_router.post("/templates/bulk-restore")
async def bulk_restore_templates(
    template_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Khôi phục templates hàng loạt"""
    result = await db.templates.update_many(
        {"id": {"$in": template_ids}},
        {"$set": {"archived": False, "updated_at": datetime.utcnow()}}
    )
    return {"message": f"Restored {result.modified_count} templates"}

@api_router.post("/templates/bulk-delete")
async def bulk_delete_templates(
    template_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Xóa templates hàng loạt (chỉ admin và account)"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.templates.delete_many(
        {"id": {"$in": template_ids}}
    )
    return {"message": f"Deleted {result.deleted_count} templates"}

@api_router.post("/templates/{template_id}/duplicate", response_model=Template)
async def duplicate_template(
    template_id: str,
    current_user: User = Depends(get_current_user)
):
    """Nhân đôi template"""
    original_template = await db.templates.find_one({"id": template_id})
    if not original_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create new template
    new_template = {
        "id": str(uuid.uuid4()),
        "name": f"{original_template['name']} (Copy)",
        "content": original_template.get("content"),
        "template_type": original_template.get("template_type", "service"),
        "archived": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": current_user.id
    }
    
    await db.templates.insert_one(new_template)
    
    # Add creator name
    new_template["creator_name"] = current_user.full_name
    
    return Template(**new_template)

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
