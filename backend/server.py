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
import pytz

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

# Vietnam timezone
VN_TIMEZONE = pytz.timezone('Asia/Ho_Chi_Minh')

def vietnam_now():
    """Get current time in Vietnam timezone"""
    return datetime.now(VN_TIMEZONE)

def to_vietnam_time(dt):
    """Convert datetime to Vietnam timezone"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume UTC if no timezone info
        dt = pytz.UTC.localize(dt)
    return dt.astimezone(VN_TIMEZONE)

def serialize_datetime(dt):
    """Serialize datetime to Vietnam timezone ISO format"""
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    # Convert to Vietnam timezone first
    vn_dt = to_vietnam_time(dt)
    return vn_dt.isoformat()

def serialize_mongodb_id(obj):
    """Serialize MongoDB ObjectId to string"""
    from bson import ObjectId
    
    if isinstance(obj, dict):
        for key, value in list(obj.items()):
            if isinstance(value, ObjectId):
                obj[key] = str(value)
            elif isinstance(value, dict):
                obj[key] = serialize_mongodb_id(value)
            elif isinstance(value, list):
                obj[key] = [serialize_mongodb_id(item) if isinstance(item, dict) else 
                           str(item) if isinstance(item, ObjectId) else item 
                           for item in value]
    return obj

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
    # Enriched team information
    team_ids: List[str] = []  # Computed field from team_members collection
    team_names: List[str] = []  # Computed field for display

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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
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
    
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)

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

# Permission Management Models
class PermissionCategory(BaseModel):
    """Định nghĩa các nhóm chức năng lớn"""
    id: str
    name: str
    display_name: str
    description: Optional[str] = None
    order: int = 0

class PermissionItem(BaseModel):
    """Định nghĩa các quyền cụ thể"""
    id: str
    category_id: str
    name: str
    display_name: str
    description: Optional[str] = None
    order: int = 0

class RolePermissionBase(BaseModel):
    """Phân quyền theo vị trí/role"""
    role: str  # admin, manager, account, etc.
    permission_id: str
    can_view: bool = False
    can_edit: bool = False
    can_delete: bool = False

class RolePermissionCreate(RolePermissionBase):
    pass

class RolePermission(RolePermissionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
    created_by: str

class UserPermissionBase(BaseModel):
    """Phân quyền riêng cho từng user"""
    user_id: str
    permission_id: str
    can_view: bool = False
    can_edit: bool = False
    can_delete: bool = False
    override_role: bool = False  # Có ghi đè quyền role hay không

class UserPermissionCreate(UserPermissionBase):
    pass

class UserPermission(UserPermissionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
    created_by: str

class PermissionSummary(BaseModel):
    """Tổng hợp quyền của user hoặc role"""
    target_type: str  # "role" hoặc "user"
    target_id: str  # role name hoặc user_id
    target_name: str  # display name
    permissions: List[dict] = []  # List of permission with categories
    
class PermissionMatrix(BaseModel):
    """Ma trận phân quyền để hiển thị"""
    categories: List[PermissionCategory] = []
    items: List[PermissionItem] = []
    current_permissions: List[dict] = []

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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
    created_by: Optional[str] = None

# Contract Models - Enhanced for Payment Management
class ContractBase(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    title: str
    start_date: datetime
    end_date: datetime
    value: float
    status: str = "draft"  # draft, sent, signed, active, expired, terminated
    terms: Optional[str] = None
    contract_link: Optional[str] = None  # Link to contract document
    archived: bool = False

class ContractCreate(ContractBase):
    payment_schedules: Optional[List[dict]] = []  # List of payment schedules

class Contract(ContractBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
    created_by: Optional[str] = None
    document_url: Optional[str] = None
    # Enhanced fields for payment management
    total_paid: float = 0.0  # Calculated field
    remaining_debt: float = 0.0  # Calculated field
    payment_schedules: List[dict] = []  # Array of payment schedules
    # Enriched fields
    client_name: Optional[str] = None
    project_name: Optional[str] = None

# Payment Schedule Models
class PaymentScheduleBase(BaseModel):
    contract_id: str
    amount: float
    due_date: datetime
    description: Optional[str] = None
    is_paid: bool = False

class PaymentScheduleCreate(BaseModel):
    amount: float
    due_date: datetime
    description: Optional[str] = None

class PaymentScheduleUpdate(BaseModel):
    amount: Optional[float] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None
    is_paid: Optional[bool] = None

class PaymentSchedule(PaymentScheduleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
    paid_date: Optional[datetime] = None
    created_by: Optional[str] = None

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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    task_type_id: Optional[str] = None  # Link to TaskCostType for cost calculation

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
    task_type_id: Optional[str] = None

class InternalTask(InternalTaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    assigned_by: str  # Will be set by endpoint (current user)
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
    created_by: Optional[str] = None
    # ✅ NEW: Time tracking fields for cost calculation
    start_time: Optional[datetime] = None  # When user clicks "Bắt đầu"
    completion_time: Optional[datetime] = None  # When user clicks "Hoàn thành"
    actual_hours: Optional[float] = None  # Calculated hours between start and completion
    total_cost: Optional[float] = None  # Calculated cost based on hours and rate
    # Enriched fields
    assigned_to_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    task_type_name: Optional[str] = None

# Internal Task Feedback Models
class InternalTaskFeedbackBase(BaseModel):
    task_id: str
    user_id: str
    message: str
    created_at: datetime = Field(default_factory=vietnam_now)

class InternalTaskFeedbackCreate(BaseModel):
    message: str

class InternalTaskFeedback(InternalTaskFeedbackBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: Optional[str] = None  # Enriched field

# ✅ NEW: Task Cost Settings Models
class TaskCostSettingsBase(BaseModel):
    cost_per_hour: float = 0.0  # Giá tiền/giờ (VND)
    is_enabled: bool = True
    updated_by: Optional[str] = None

class TaskCostSettingsCreate(TaskCostSettingsBase):
    pass

class TaskCostSettingsUpdate(BaseModel):
    cost_per_hour: Optional[float] = None
    is_enabled: Optional[bool] = None

class TaskCostSettings(TaskCostSettingsBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    # Enriched fields
    updated_by_name: Optional[str] = None

# ✅ NEW: Task Cost Type Models (Loại chi phí task)
class TaskCostTypeBase(BaseModel):
    name: str  # Tên loại task (e.g., "Content Writing", "Design", "Development")
    description: Optional[str] = None
    is_active: bool = True

class TaskCostTypeCreate(TaskCostTypeBase):
    pass

class TaskCostTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class TaskCostType(TaskCostTypeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    # Enriched fields
    created_by_name: Optional[str] = None

# ✅ NEW: Task Cost Rate Models (Bảng giá cho từng loại task)
class TaskCostRateBase(BaseModel):
    task_type_id: str  # Reference to TaskCostType
    cost_per_hour: float  # Giá tiền/giờ (VND)
    is_active: bool = True

class TaskCostRateCreate(TaskCostRateBase):
    pass

class TaskCostRateUpdate(BaseModel):
    task_type_id: Optional[str] = None
    cost_per_hour: Optional[float] = None
    is_active: Optional[bool] = None

class TaskCostRate(TaskCostRateBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    # Enriched fields
    task_type_name: Optional[str] = None
    created_by_name: Optional[str] = None

# ================= CLIENT CHAT MODELS =================

# Client Chat Message Models
class ClientChatMessageBase(BaseModel):
    client_id: str
    user_id: str
    message: str

class ClientChatMessageCreate(BaseModel):
    message: str

class ClientChatMessage(ClientChatMessageBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=vietnam_now)
    # Enriched fields
    user_name: Optional[str] = None
    user_email: Optional[str] = None

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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
    created_at: datetime = Field(default_factory=vietnam_now)
    updated_at: datetime = Field(default_factory=vietnam_now)
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
        expire = vietnam_now() + expires_delta
    else:
        expire = vietnam_now() + timedelta(minutes=15)
    to_encode.update({"exp": expire.timestamp()})  # Convert to timestamp for JWT
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
    
    # Enrich with team information
    for user in users:
        # Get team memberships for this user
        team_memberships = await db.team_members.find({"user_id": user["id"]}).to_list(length=100)
        team_ids = [tm["team_id"] for tm in team_memberships]
        user["team_ids"] = team_ids
        
        # Get team names
        if team_ids:
            teams = await db.teams.find({"id": {"$in": team_ids}}).to_list(length=100)
            user["team_names"] = [team["name"] for team in teams]
        else:
            user["team_names"] = []
    
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
    update_data["updated_at"] = vietnam_now()
    
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
        {"$set": {"hashed_password": hashed_new_password, "updated_at": vietnam_now()}}
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
        {"$set": {"hashed_password": hashed_new_password, "updated_at": vietnam_now()}}
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
        {"$set": {"is_active": is_active, "updated_at": vietnam_now()}}
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
    updated_client = {**db_client, **client_data, "updated_at": vietnam_now()}
    
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

# ================= CLIENT CHAT ENDPOINTS =================

@api_router.post("/clients/{client_id}/chat/", response_model=ClientChatMessage)
async def send_client_chat_message(
    client_id: str,
    message: ClientChatMessageCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Gửi tin nhắn mới trong chat client"""
    # Kiểm tra client tồn tại
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Tạo tin nhắn mới
    chat_message_data = message.dict()
    chat_message_obj = ClientChatMessage(
        **chat_message_data,
        client_id=client_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        user_email=current_user.email
    )
    
    await db.client_chat_messages.insert_one(chat_message_obj.dict())
    return chat_message_obj

@api_router.get("/clients/{client_id}/chat/", response_model=List[ClientChatMessage])
async def get_client_chat_messages(
    client_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách tin nhắn chat của client"""
    # Kiểm tra client tồn tại
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Lấy tin nhắn chat, sắp xếp theo thời gian tạo (cũ nhất trước)
    messages = await db.client_chat_messages.find(
        {"client_id": client_id}
    ).sort("created_at", 1).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich với thông tin user (trong trường hợp user bị xóa hoặc thay đổi tên)
    for message in messages:
        if message.get("user_id"):
            user = await db.users.find_one({"id": message["user_id"]})
            if user:
                message["user_name"] = user["full_name"]
                message["user_email"] = user["email"]
            else:
                # User đã bị xóa, giữ nguyên tên cũ hoặc hiển thị "Unknown User"
                if not message.get("user_name"):
                    message["user_name"] = "Unknown User"
    
    return messages

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
    updated_project = {**db_project, **project_data, "updated_at": vietnam_now()}
    
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
        {"$set": {"archived": True, "updated_at": vietnam_now()}}
    )
    
    return {"detail": f"{result.modified_count} projects archived"}

@api_router.post("/projects/bulk-restore")
async def bulk_restore_projects(project_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.projects.update_many(
        {"id": {"$in": project_ids}},
        {"$set": {"archived": False, "updated_at": vietnam_now()}}
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

# Contract routes - Enhanced for Payment Management
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
    
    contract_data = contract.dict(exclude={"payment_schedules"})
    contract_obj = Contract(**contract_data, created_by=current_user.id)
    
    # Create payment schedules if provided
    payment_schedules = []
    if contract.payment_schedules:
        for schedule_data in contract.payment_schedules:
            schedule_obj = PaymentSchedule(
                contract_id=contract_obj.id,
                amount=schedule_data["amount"],
                due_date=datetime.fromisoformat(schedule_data["due_date"].replace('Z', '+00:00')),
                description=schedule_data.get("description", ""),
                created_by=current_user.id
            )
            await db.payment_schedules.insert_one(schedule_obj.dict())
            payment_schedules.append(schedule_obj.dict())
    
    contract_obj.payment_schedules = payment_schedules
    contract_obj.total_paid = 0.0
    contract_obj.remaining_debt = contract_obj.value
    
    result = await db.contracts.insert_one(contract_obj.dict())
    return contract_obj

@api_router.get("/contracts/", response_model=List[Contract])
async def read_contracts(
    skip: int = 0, 
    limit: int = 100,
    status: Optional[str] = None,
    has_debt: Optional[bool] = None,
    archived: Optional[bool] = False,
    search: Optional[str] = None,
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    week: Optional[int] = None,
    current_user: User = Depends(get_current_active_user)
):
    # Build query filter
    query_filter = {"archived": archived}
    
    # Status filter
    if status:
        query_filter["status"] = status
    
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
        elif week:
            # Week filter (ISO week)
            import calendar
            first_day_of_year = datetime(year, 1, 1)
            first_monday = first_day_of_year + timedelta(days=(7 - first_day_of_year.weekday()) % 7)
            start_date = first_monday + timedelta(weeks=week - 1)
            end_date = start_date + timedelta(days=7)
        else:
            # Year filter
            end_date = datetime(year + 1, 1, 1)
        
        query_filter["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    contracts = await db.contracts.find(query_filter).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich contracts with payment schedules and calculations
    enriched_contracts = []
    for contract in contracts:
        # Serialize MongoDB ObjectId to string
        contract = serialize_mongodb_id(contract)
        
        # Get payment schedules for this contract
        payment_schedules = await db.payment_schedules.find({"contract_id": contract["id"]}).to_list(length=100)
        
        # Serialize MongoDB ObjectId in payment schedules
        payment_schedules = [serialize_mongodb_id(schedule) for schedule in payment_schedules]
        
        # Calculate total paid and remaining debt
        total_paid = sum(schedule["amount"] for schedule in payment_schedules if schedule.get("is_paid", False))
        remaining_debt = contract["value"] - total_paid
        
        # Get client name
        if contract.get("client_id"):
            client = await db.clients.find_one({"id": contract["client_id"]})
            if client:
                client = serialize_mongodb_id(client)
                contract["client_name"] = client.get("name", "Unknown Client")
            else:
                contract["client_name"] = "Unknown Client"
        
        # Get project name  
        if contract.get("project_id"):
            project = await db.projects.find_one({"id": contract["project_id"]})
            if project:
                project = serialize_mongodb_id(project)
                contract["project_name"] = project.get("name", "Unknown Project")
            else:
                contract["project_name"] = "Unknown Project"
        
        contract["payment_schedules"] = payment_schedules
        contract["total_paid"] = total_paid
        contract["remaining_debt"] = remaining_debt
        
        # Apply debt filter after calculation
        if has_debt is not None:
            if has_debt and remaining_debt <= 0:
                continue
            if not has_debt and remaining_debt > 0:
                continue
        
        # Search filter
        if search:
            search_fields = [
                contract.get("title", ""),
                contract.get("client_name", ""),
                contract.get("project_name", ""),
                contract.get("terms", "")
            ]
            if not any(search.lower() in field.lower() for field in search_fields if field):
                continue
        
        enriched_contracts.append(contract)
    
    return enriched_contracts

@api_router.get("/contracts/statistics")
async def get_contracts_statistics(
    year: Optional[int] = None,
    quarter: Optional[int] = None,
    month: Optional[int] = None,
    week: Optional[int] = None,
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
        elif week:
            import calendar
            first_day_of_year = datetime(year, 1, 1)
            first_monday = first_day_of_year + timedelta(days=(7 - first_day_of_year.weekday()) % 7)
            start_date = first_monday + timedelta(weeks=week - 1)
            end_date = start_date + timedelta(days=7)
        else:
            end_date = datetime(year + 1, 1, 1)
        
        time_filter["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    # Get contracts within time filter
    base_filter = {"archived": False, **time_filter}
    contracts = await db.contracts.find(base_filter).to_list(length=None)
    
    # Calculate statistics
    total_value = 0.0
    active_value = 0.0
    total_paid = 0.0
    total_debt = 0.0
    
    for contract in contracts:
        contract_value = contract.get("value", 0)
        total_value += contract_value
        
        # Active contracts (status = active or signed)
        if contract.get("status") in ["active", "signed"]:
            active_value += contract_value
        
        # Get payment schedules for this contract
        payment_schedules = await db.payment_schedules.find({"contract_id": contract["id"]}).to_list(length=100)
        
        # Calculate paid amount for this contract
        contract_paid = sum(schedule["amount"] for schedule in payment_schedules if schedule.get("is_paid", False))
        total_paid += contract_paid
        
        # Calculate debt for this contract
        contract_debt = contract_value - contract_paid
        if contract_debt > 0:
            total_debt += contract_debt
    
    return {
        "total_value": total_value,
        "active_value": active_value,
        "total_paid": total_paid,
        "total_debt": total_debt,
        "total_contracts": len(contracts)
    }

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
    updated_contract = {**db_contract, **contract_data, "updated_at": vietnam_now()}
    
    await db.contracts.update_one({"id": contract_id}, {"$set": updated_contract})
    return updated_contract

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str, current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Delete payment schedules first
    await db.payment_schedules.delete_many({"contract_id": contract_id})
    
    result = await db.contracts.delete_one({"id": contract_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"detail": "Contract deleted successfully"}

# ================= PAYMENT SCHEDULE ENDPOINTS =================

@api_router.post("/contracts/{contract_id}/payment-schedules/", response_model=PaymentSchedule)
async def create_payment_schedule(
    contract_id: str,
    schedule: PaymentScheduleCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Thêm đợt thanh toán mới cho hợp đồng"""
    # Kiểm tra contract tồn tại
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    schedule_data = schedule.dict()
    schedule_obj = PaymentSchedule(**schedule_data, contract_id=contract_id, created_by=current_user.id)
    
    await db.payment_schedules.insert_one(schedule_obj.dict())
    return schedule_obj

@api_router.get("/contracts/{contract_id}/payment-schedules/", response_model=List[PaymentSchedule])
async def get_contract_payment_schedules(
    contract_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách đợt thanh toán của hợp đồng"""
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    schedules = await db.payment_schedules.find({"contract_id": contract_id}).sort("due_date", 1).to_list(length=100)
    return schedules

@api_router.patch("/payment-schedules/{schedule_id}/mark-paid")
async def mark_payment_schedule_paid(
    schedule_id: str,
    is_paid: bool,
    current_user: User = Depends(get_current_active_user)
):
    """Đánh dấu đợt thanh toán đã thanh toán/chưa thanh toán"""
    schedule = await db.payment_schedules.find_one({"id": schedule_id})
    if not schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")
    
    update_data = {
        "is_paid": is_paid,
        "updated_at": vietnam_now()
    }
    
    if is_paid:
        update_data["paid_date"] = vietnam_now()
    else:
        update_data["paid_date"] = None
    
    await db.payment_schedules.update_one({"id": schedule_id}, {"$set": update_data})
    
    # Update contract status if all payments are completed
    contract_id = schedule["contract_id"]
    all_schedules = await db.payment_schedules.find({"contract_id": contract_id}).to_list(length=100)
    all_paid = all(s.get("is_paid", False) for s in all_schedules) if all_schedules else False
    
    if all_paid and len(all_schedules) > 0:
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": {"status": "completed", "updated_at": vietnam_now()}}
        )
    
    return {"detail": "Payment schedule updated successfully", "all_payments_completed": all_paid}

@api_router.put("/payment-schedules/{schedule_id}", response_model=PaymentSchedule)
async def update_payment_schedule(
    schedule_id: str,
    schedule_update: PaymentScheduleUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật thông tin đợt thanh toán"""
    db_schedule = await db.payment_schedules.find_one({"id": schedule_id})
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Payment schedule not found")
    
    update_data = schedule_update.dict(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = vietnam_now()
        
        # Handle payment status change
        if "is_paid" in update_data:
            if update_data["is_paid"]:
                update_data["paid_date"] = vietnam_now()
            else:
                update_data["paid_date"] = None
        
        await db.payment_schedules.update_one({"id": schedule_id}, {"$set": update_data})
        
        # Check if all payments are completed
        contract_id = db_schedule["contract_id"]
        all_schedules = await db.payment_schedules.find({"contract_id": contract_id}).to_list(length=100)
        all_paid = all(s.get("is_paid", False) for s in all_schedules) if all_schedules else False
        
        if all_paid and len(all_schedules) > 0:
            await db.contracts.update_one(
                {"id": contract_id},
                {"$set": {"status": "completed", "updated_at": vietnam_now()}}
            )
        
        updated_schedule = await db.payment_schedules.find_one({"id": schedule_id})
        return updated_schedule
    
    return db_schedule

@api_router.delete("/payment-schedules/{schedule_id}")
async def delete_payment_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Xóa đợt thanh toán"""
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.payment_schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment schedule not found")
    
    return {"detail": "Payment schedule deleted successfully"}

# Contract bulk operations
@api_router.post("/contracts/bulk-archive")
async def bulk_archive_contracts(contract_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.contracts.update_many(
        {"id": {"$in": contract_ids}},
        {"$set": {"archived": True, "updated_at": vietnam_now()}}
    )
    
    return {"detail": f"{result.modified_count} contracts archived"}

@api_router.post("/contracts/bulk-restore")
async def bulk_restore_contracts(contract_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin", "account"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.contracts.update_many(
        {"id": {"$in": contract_ids}},
        {"$set": {"archived": False, "updated_at": vietnam_now()}}
    )
    
    return {"detail": f"{result.modified_count} contracts restored"}

@api_router.post("/contracts/bulk-delete")
async def bulk_delete_contracts(contract_ids: List[str], current_user: User = Depends(get_current_active_user)):
    if current_user.role not in ["admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Delete payment schedules first
    await db.payment_schedules.delete_many({"contract_id": {"$in": contract_ids}})
    
    result = await db.contracts.delete_many({"id": {"$in": contract_ids}})
    
    return {"detail": f"{result.deleted_count} contracts deleted"}

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
    invoice_number = f"INV-{vietnam_now().strftime('%Y%m')}-{invoice_count + 1:04d}"
    
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
    updated_invoice = {**db_invoice, **invoice_data, "updated_at": vietnam_now()}
    
    # Nếu đang chuyển trạng thái sang paid, cập nhật paid_date
    if invoice.status == "paid" and db_invoice.get("status") != "paid":
        updated_invoice["paid_date"] = vietnam_now()
    
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
        update_data["updated_at"] = vietnam_now()
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
        {"$set": {"status": status, "updated_at": vietnam_now()}}
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
    
    # ✅ NEW: Non-admin users chỉ thấy tasks được assign cho họ
    if current_user.role != "admin":
        query_filter["assigned_to"] = current_user.id
    
    # Filter by status
    if status:
        query_filter["status"] = status
    
    # Filter by priority
    if priority:
        query_filter["priority"] = priority
    
    # Filter by assigned user (chỉ admin có thể filter theo user khác)
    if assigned_to and current_user.role == "admin":
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
    
    # Enrich với thông tin user, task type và convert datetime
    for task in tasks:
        if task.get("assigned_to"):
            assigned_user = await db.users.find_one({"id": task["assigned_to"]})
            task["assigned_to_name"] = assigned_user["full_name"] if assigned_user else "Unknown"
        
        if task.get("assigned_by"):
            assigned_by_user = await db.users.find_one({"id": task["assigned_by"]})
            task["assigned_by_name"] = assigned_by_user["full_name"] if assigned_by_user else "Unknown"
        
        if task.get("task_type_id"):
            task_type = await db.task_cost_types.find_one({"id": task["task_type_id"]})
            task["task_type_name"] = task_type["name"] if task_type else "Unknown"
        
        # Convert datetime fields to Vietnam timezone
        datetime_fields = ['created_at', 'updated_at', 'deadline', 'start_time', 'completion_time']
        for field in datetime_fields:
            if task.get(field):
                task[field] = serialize_datetime(task[field])
    
    return tasks

@api_router.get("/internal-tasks/statistics")
async def get_internal_tasks_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy thống kê công việc nội bộ"""
    query_filter = {}
    
    # ✅ NEW: Non-admin users chỉ thấy statistics của tasks được assign cho họ
    if current_user.role != "admin":
        query_filter["assigned_to"] = current_user.id
    
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
    
    # Enrich với thông tin user và task type
    if task.get("assigned_to"):
        assigned_user = await db.users.find_one({"id": task["assigned_to"]})
        task["assigned_to_name"] = assigned_user["full_name"] if assigned_user else "Unknown"
    
    if task.get("assigned_by"):
        assigned_by_user = await db.users.find_one({"id": task["assigned_by"]})
        task["assigned_by_name"] = assigned_by_user["full_name"] if assigned_by_user else "Unknown"
    
    if task.get("task_type_id"):
        task_type = await db.task_cost_types.find_one({"id": task["task_type_id"]})
        task["task_type_name"] = task_type["name"] if task_type else "Unknown"
    
    # Convert datetime fields to Vietnam timezone with ISO format
    datetime_fields = ['created_at', 'updated_at', 'deadline', 'start_time', 'completion_time']
    for field in datetime_fields:
        if task.get(field):
            task[field] = serialize_datetime(task[field])
    
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
        update_data["updated_at"] = vietnam_now()
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
    
    # Lấy task hiện tại để check status cũ
    current_task = await db.internal_tasks.find_one({"id": task_id})
    if not current_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {"status": status, "updated_at": vietnam_now()}
    current_time = vietnam_now()
    
    # ✅ NEW: Track time và calculate cost
    if status == "in_progress" and current_task.get("status") == "not_started":
        # Bắt đầu task - ghi nhận start_time
        update_data["start_time"] = current_time
        print(f"Task {task_id} started at {current_time}")
        
    elif status == "completed":
        # Hoàn thành task
        if not report_link:
            raise HTTPException(status_code=400, detail="Report link is required for completed tasks")
        update_data["report_link"] = report_link
        update_data["completion_time"] = current_time
        
        # Tính toán thời gian và chi phí
        start_time = current_task.get("start_time")
        if start_time:
            # Convert to Vietnam timezone if needed
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            start_time_vn = to_vietnam_time(start_time)
            
            # Tính số giờ thực tế
            time_diff = current_time - start_time_vn
            actual_hours = time_diff.total_seconds() / 3600  # Convert to hours
            update_data["actual_hours"] = round(actual_hours, 2)
            
            # Lấy cost rate từ task cost rates dựa trên task_type_id
            cost_per_hour = 0.0
            
            # Ưu tiên: Tìm cost rate từ task_cost_rates theo task_type_id
            task_type_id = current_task.get("task_type_id")
            if task_type_id:
                cost_rate = await db.task_cost_rates.find_one({
                    "task_type_id": task_type_id, 
                    "is_active": True
                })
                if cost_rate:
                    cost_per_hour = cost_rate.get("cost_per_hour", 0.0)
                    print(f"Using task type cost rate: {cost_per_hour:,.0f} VND/hour for task type {task_type_id}")
            
            # Fallback: Tìm cost rate từ task cost settings nếu không có task type specific
            if cost_per_hour == 0.0:
                cost_settings = await db.task_cost_settings.find_one({}, sort=[("created_at", -1)])
                if cost_settings and cost_settings.get("is_enabled", True):
                    cost_per_hour = cost_settings.get("cost_per_hour", 0.0)
                    print(f"Using default cost rate: {cost_per_hour:,.0f} VND/hour from settings")
            
            if cost_per_hour > 0:
                total_cost = actual_hours * cost_per_hour
                update_data["total_cost"] = round(total_cost, 0)  # Round to nearest VND
                print(f"Task {task_id} completed: {actual_hours:.2f} hours, cost: {total_cost:,.0f} VND")
            else:
                update_data["total_cost"] = 0.0
                print(f"Task {task_id} completed: {actual_hours:.2f} hours, no cost rate configured")
        else:
            print(f"Warning: Task {task_id} completed but no start_time found")
    
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
    today = vietnam_now()
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
    updated_folder = {**db_folder, **folder_data, "updated_at": vietnam_now()}
    
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
        folder_ids = [folder["id"] for folder in accessible_folders]
        
        # Admin thấy tất cả documents
        documents = await db.documents.find({
            "folder_id": {"$in": folder_ids},
            "archived": archived
        }).skip(skip).limit(limit).to_list(length=limit)
    else:
        accessible_folders = await db.folders.find({
            "$or": [
                {"permissions": "all"},
                {"permissions": current_user.role}
            ]
        }).to_list(length=1000)
        
        folder_ids = [folder["id"] for folder in accessible_folders]
        
        # ✅ NEW: Non-admin users chỉ thấy documents do họ tạo
        documents = await db.documents.find({
            "folder_id": {"$in": folder_ids},
            "archived": archived,
            "created_by": current_user.id  # Chỉ documents của user hiện tại
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
    
    # ✅ NEW: Non-admin users chỉ thấy documents do họ tạo
    if current_user.role == "admin":
        documents = await db.documents.find({
            "folder_id": folder_id,
            "archived": archived
        }).to_list(length=100)
    else:
        documents = await db.documents.find({
            "folder_id": folder_id,
            "archived": archived,
            "created_by": current_user.id
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
    updated_document = {**db_document, **document_data, "updated_at": vietnam_now()}
    
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
        {"$set": {"archived": True, "updated_at": vietnam_now()}}
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
        {"$set": {"archived": False, "updated_at": vietnam_now()}}
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
    campaign_dict["created_at"] = vietnam_now()
    campaign_dict["updated_at"] = vietnam_now()
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
        update_data["updated_at"] = vietnam_now()
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
            {"$set": {"archived": True, "updated_at": vietnam_now()}}
        )
        return {"detail": f"{result.modified_count} campaigns archived"}
    
    elif action == "restore":
        result = await db.campaigns.update_many(
            {"id": {"$in": campaign_ids}},
            {"$set": {"archived": False, "updated_at": vietnam_now()}}
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
    service_dict["created_at"] = vietnam_now()
    service_dict["updated_at"] = vietnam_now()
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
        update_data["updated_at"] = vietnam_now()
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
    task_dict["created_at"] = vietnam_now()
    task_dict["updated_at"] = vietnam_now()
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
        update_data["updated_at"] = vietnam_now()
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
        task_dict["created_at"] = vietnam_now()
        task_dict["updated_at"] = vietnam_now()
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
        update_data["updated_at"] = vietnam_now()
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
        update_data["updated_at"] = vietnam_now()
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
    expense_number = f"EXP-{vietnam_now().strftime('%Y%m')}-{expense_count + 1:04d}"
    
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
        update_data["updated_at"] = vietnam_now()
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
        {"$set": {"status": status, "updated_at": vietnam_now()}}
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
    template_dict["created_at"] = vietnam_now()
    template_dict["updated_at"] = vietnam_now()
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
        update_data["updated_at"] = vietnam_now()
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
        {"$set": {"archived": True, "updated_at": vietnam_now()}}
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
        {"$set": {"archived": False, "updated_at": vietnam_now()}}
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
        "created_at": vietnam_now(),
        "updated_at": vietnam_now(),
        "created_by": current_user.id
    }
    
    await db.templates.insert_one(new_template)
    
    # Add creator name
    new_template["creator_name"] = current_user.full_name
    
    return Template(**new_template)

# =================== TEAM MANAGEMENT ENDPOINTS ===================

@api_router.post("/teams/", response_model=Team)
async def create_team(team: TeamCreate, current_user: User = Depends(get_current_active_user)):
    """Tạo team mới"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    team_data = team.dict()
    team_obj = Team(**team_data, created_by=current_user.id)
    await db.teams.insert_one(team_obj.dict())
    return team_obj

@api_router.get("/teams/", response_model=List[Team])
async def get_teams(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách teams"""
    query = {}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if is_active is not None:
        query["is_active"] = is_active
    
    teams = await db.teams.find(query).sort("created_at", -1).to_list(length=100)
    
    # Enrich with member count
    for team in teams:
        member_count = await db.team_members.count_documents({"team_id": team["id"]})
        team["member_count"] = member_count
    
    return teams

@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str, current_user: User = Depends(get_current_active_user)):
    """Lấy chi tiết team"""
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Enrich with member count
    member_count = await db.team_members.count_documents({"team_id": team_id})
    team["member_count"] = member_count
    
    return team

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(
    team_id: str, 
    team_update: TeamUpdate, 
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật team"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = team_update.dict(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = vietnam_now()
        await db.teams.update_one({"id": team_id}, {"$set": update_data})
    
    # Return updated team
    updated_team = await db.teams.find_one({"id": team_id})
    member_count = await db.team_members.count_documents({"team_id": team_id})
    updated_team["member_count"] = member_count
    
    return updated_team

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, current_user: User = Depends(get_current_active_user)):
    """Xóa team"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Xóa team members trước
    await db.team_members.delete_many({"team_id": team_id})
    
    result = await db.teams.delete_one({"id": team_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    
    return {"detail": "Team deleted successfully"}

# =================== TEAM MEMBERSHIP ENDPOINTS ===================

@api_router.post("/teams/{team_id}/members/", response_model=TeamMember)
async def add_team_member(
    team_id: str,
    user_id: str = Body(embed=True),
    role: str = Body(default="member", embed=True),
    current_user: User = Depends(get_current_active_user)
):
    """Thêm thành viên vào team"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Kiểm tra team tồn tại
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Kiểm tra user tồn tại
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Kiểm tra đã là thành viên chưa
    existing_member = await db.team_members.find_one({"team_id": team_id, "user_id": user_id})
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a team member")
    
    member_data = TeamMember(
        team_id=team_id,
        user_id=user_id,
        role=role,
        created_by=current_user.id,
        user_name=user["full_name"],
        user_email=user["email"],
        user_role=user["role"]
    )
    
    await db.team_members.insert_one(member_data.dict())
    return member_data

@api_router.get("/teams/{team_id}/members/", response_model=List[TeamMember])
async def get_team_members(team_id: str, current_user: User = Depends(get_current_active_user)):
    """Lấy danh sách thành viên của team"""
    members = await db.team_members.find({"team_id": team_id}).to_list(length=100)
    
    # Enrich with user information
    for member in members:
        user = await db.users.find_one({"id": member["user_id"]})
        if user:
            member["user_name"] = user["full_name"]
            member["user_email"] = user["email"]
            member["user_role"] = user["role"]
    
    return members

@api_router.delete("/teams/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str, 
    user_id: str, 
    current_user: User = Depends(get_current_active_user)
):
    """Xóa thành viên khỏi team"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.team_members.delete_one({"team_id": team_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    return {"detail": "Team member removed successfully"}

@api_router.put("/teams/{team_id}/members/{user_id}")
async def update_team_member_role(
    team_id: str,
    user_id: str,
    new_role: str = Body(embed=True),
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật role của thành viên trong team"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if new_role not in ["leader", "member"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.team_members.update_one(
        {"team_id": team_id, "user_id": user_id},
        {"$set": {"role": new_role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    return {"detail": "Team member role updated successfully"}

# =================== PERFORMANCE TRACKING ENDPOINTS ===================

@api_router.get("/performance/users/{user_id}")
async def get_user_performance(
    user_id: str,
    period_type: str = "monthly",  # daily, weekly, monthly, quarterly, yearly
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy performance metrics của user"""
    # Kiểm tra quyền truy cập
    if current_user.role not in ["admin", "manager"] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate period_type
    if period_type not in ["daily", "weekly", "monthly", "quarterly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid period_type")
    
    # Calculate date range
    if not start_date or not end_date:
        end_dt = vietnam_now()
        if period_type == "daily":
            start_dt = end_dt - timedelta(days=1)
        elif period_type == "weekly":
            start_dt = end_dt - timedelta(weeks=1)
        elif period_type == "monthly":
            start_dt = end_dt - timedelta(days=30)
        elif period_type == "quarterly":
            start_dt = end_dt - timedelta(days=90)
        elif period_type == "yearly":
            start_dt = end_dt - timedelta(days=365)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    # Calculate performance metrics
    performance = await calculate_user_performance(user_id, start_dt, end_dt, period_type)
    return performance

@api_router.get("/performance/teams/{team_id}")
async def get_team_performance(
    team_id: str,
    period_type: str = "monthly",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy performance metrics của team"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate period_type
    if period_type not in ["daily", "weekly", "monthly", "quarterly", "yearly"]:
        raise HTTPException(status_code=400, detail="Invalid period_type")
    
    # Get team members
    team_members = await db.team_members.find({"team_id": team_id}).to_list(length=100)
    user_ids = [tm["user_id"] for tm in team_members]
    
    if not user_ids:
        return {"team_id": team_id, "members": [], "aggregate_metrics": {}}
    
    # Calculate date range
    if not start_date or not end_date:
        end_dt = vietnam_now()
        if period_type == "daily":
            start_dt = end_dt - timedelta(days=1)
        elif period_type == "weekly":
            start_dt = end_dt - timedelta(weeks=1)
        elif period_type == "monthly":
            start_dt = end_dt - timedelta(days=30)
        elif period_type == "quarterly":
            start_dt = end_dt - timedelta(days=90)
        elif period_type == "yearly":
            start_dt = end_dt - timedelta(days=365)
    else:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    # Calculate performance for each member
    member_performances = []
    total_metrics = {
        "total_tasks": 0,
        "completed_tasks": 0,
        "total_projects": 0,
        "completed_projects": 0,
        "revenue_contribution": 0.0,
        "avg_performance_score": 0.0
    }
    
    for user_id in user_ids:
        performance = await calculate_user_performance(user_id, start_dt, end_dt, period_type)
        member_performances.append(performance)
        
        # Aggregate metrics
        total_metrics["total_tasks"] += performance["total_tasks"]
        total_metrics["completed_tasks"] += performance["completed_tasks"]
        total_metrics["total_projects"] += performance["total_projects"]
        total_metrics["completed_projects"] += performance["completed_projects"]
        total_metrics["revenue_contribution"] += performance["revenue_contribution"]
    
    # Calculate average performance score
    if member_performances:
        total_metrics["avg_performance_score"] = sum(p["overall_performance_score"] for p in member_performances) / len(member_performances)
    
    return {
        "team_id": team_id,
        "period_type": period_type,
        "start_date": start_dt,
        "end_date": end_dt,
        "members": member_performances,
        "aggregate_metrics": total_metrics
    }

@api_router.get("/performance/summary", response_model=List[PerformanceSummary])
async def get_performance_summary(
    period_type: str = "monthly",
    team_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy tổng quan performance của tất cả users hoặc theo team"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get users (filtered by team if specified)
    if team_id:
        team_members = await db.team_members.find({"team_id": team_id}).to_list(length=100)
        user_ids = [tm["user_id"] for tm in team_members]
        users = await db.users.find({"id": {"$in": user_ids}}).to_list(length=100)
    else:
        users = await db.users.find({"is_active": True}).to_list(length=100)
    
    # Calculate performance summary for each user
    summaries = []
    end_dt = vietnam_now()
    
    if period_type == "daily":
        start_dt = end_dt - timedelta(days=1)
        prev_start = start_dt - timedelta(days=1)
        prev_end = start_dt
    elif period_type == "weekly":
        start_dt = end_dt - timedelta(weeks=1)
        prev_start = start_dt - timedelta(weeks=1)
        prev_end = start_dt
    elif period_type == "monthly":
        start_dt = end_dt - timedelta(days=30)
        prev_start = start_dt - timedelta(days=30)
        prev_end = start_dt
    elif period_type == "quarterly":
        start_dt = end_dt - timedelta(days=90)
        prev_start = start_dt - timedelta(days=90)
        prev_end = start_dt
    elif period_type == "yearly":
        start_dt = end_dt - timedelta(days=365)
        prev_start = start_dt - timedelta(days=365)
        prev_end = start_dt
    
    for user in users:
        # Current period performance
        current_perf = await calculate_user_performance(user["id"], start_dt, end_dt, period_type)
        
        # Previous period performance for trend calculation
        prev_perf = await calculate_user_performance(user["id"], prev_start, prev_end, period_type)
        
        # Calculate trends
        task_completion_trend = 0.0
        performance_trend = 0.0
        
        if prev_perf["task_completion_rate"] > 0:
            task_completion_trend = ((current_perf["task_completion_rate"] - prev_perf["task_completion_rate"]) / prev_perf["task_completion_rate"]) * 100
        
        if prev_perf["overall_performance_score"] > 0:
            performance_trend = ((current_perf["overall_performance_score"] - prev_perf["overall_performance_score"]) / prev_perf["overall_performance_score"]) * 100
        
        # Get team names
        team_memberships = await db.team_members.find({"user_id": user["id"]}).to_list(length=100)
        team_ids = [tm["team_id"] for tm in team_memberships]
        team_names = []
        if team_ids:
            teams = await db.teams.find({"id": {"$in": team_ids}}).to_list(length=100)
            team_names = [team["name"] for team in teams]
        
        summary = PerformanceSummary(
            user_id=user["id"],
            user_name=user["full_name"],
            user_email=user["email"],
            user_role=user["role"],
            team_names=team_names,
            current_performance=PerformanceMetric(
                user_id=user["id"],
                period_type=period_type,
                period_start=start_dt,
                period_end=end_dt,
                **current_perf
            ),
            task_completion_trend=task_completion_trend,
            performance_trend=performance_trend,
            rank_change=0  # Would need more complex ranking logic
        )
        
        summaries.append(summary)
    
    # Sort by performance score
    summaries.sort(key=lambda x: x.current_performance.overall_performance_score, reverse=True)
    
    # Add rank information
    for i, summary in enumerate(summaries):
        summary.current_performance.productivity_rank = i + 1
    
    return summaries

# Performance calculation helper function
async def calculate_user_performance(user_id: str, start_date: datetime, end_date: datetime, period_type: str) -> dict:
    """Calculate comprehensive performance metrics for a user"""
    
    # Task metrics from internal_tasks
    task_query = {
        "assigned_to": user_id,
        "created_at": {"$gte": start_date, "$lte": end_date}
    }
    
    total_tasks = await db.internal_tasks.count_documents(task_query)
    completed_tasks = await db.internal_tasks.count_documents({**task_query, "status": "completed"})
    overdue_tasks = await db.internal_tasks.count_documents({
        **task_query, 
        "deadline": {"$lt": vietnam_now()},
        "status": {"$ne": "completed"}
    })
    
    task_completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
    
    # Calculate average task completion time
    completed_task_cursor = db.internal_tasks.find({
        **task_query,
        "status": "completed",
        "updated_at": {"$exists": True}
    })
    
    avg_completion_time = None
    completion_times = []
    async for task in completed_task_cursor:
        if task.get("created_at") and task.get("updated_at"):
            completion_time = (task["updated_at"] - task["created_at"]).total_seconds() / 3600  # hours
            completion_times.append(completion_time)
    
    if completion_times:
        avg_completion_time = sum(completion_times) / len(completion_times)
    
    # Project metrics
    project_query = {
        "$or": [
            {"manager_ids": user_id},
            {"account_ids": user_id},
            {"content_ids": user_id},
            {"design_ids": user_id},
            {"editor_ids": user_id},
            {"sale_ids": user_id}
        ],
        "created_at": {"$gte": start_date, "$lte": end_date}
    }
    
    total_projects = await db.projects.count_documents(project_query)
    active_projects = await db.projects.count_documents({**project_query, "status": "in_progress"})
    completed_projects = await db.projects.count_documents({**project_query, "status": "completed"})
    
    # Project involvement score (simple calculation)
    project_involvement_score = (completed_projects * 10 + active_projects * 5) if total_projects > 0 else 0.0
    
    # Quality metrics from feedback
    feedback_query = {
        "user_id": user_id,
        "created_at": {"$gte": start_date, "$lte": end_date}
    }
    
    total_feedbacks = await db.internal_task_feedbacks.count_documents(feedback_query)
    
    # Revenue contribution from projects
    revenue_projects = await db.projects.find(project_query).to_list(length=100)
    revenue_contribution = sum(p.get("contract_value", 0) for p in revenue_projects) / len(revenue_projects) if revenue_projects else 0.0
    
    # Calculate overall performance score
    score_components = {
        "task_completion": task_completion_rate * 0.3,  # 30%
        "project_involvement": min(project_involvement_score, 100) * 0.25,  # 25%
        "quality": min(total_feedbacks * 5, 100) * 0.2,  # 20%
        "timeliness": max(0, 100 - (overdue_tasks / max(total_tasks, 1) * 100)) * 0.25  # 25%
    }
    
    overall_performance_score = sum(score_components.values())
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "task_completion_rate": task_completion_rate,
        "avg_task_completion_time": avg_completion_time,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "project_involvement_score": project_involvement_score,
        "avg_feedback_rating": None,  # Would need rating data in feedback
        "total_feedbacks": total_feedbacks,
        "revenue_contribution": revenue_contribution,
        "overall_performance_score": overall_performance_score,
        "productivity_rank": None  # Calculated in summary endpoint
    }

# =================== PERMISSION MANAGEMENT ENDPOINTS ===================

# Initialize default permissions on startup
@api_router.on_event("startup")
async def initialize_permissions():
    """Initialize default permission categories and items"""
    
    # Check if permissions are already initialized
    existing_categories = await db.permission_categories.count_documents({})
    if existing_categories > 0:
        return
    
    # Define permission categories and items
    permission_structure = {
        "dashboard": {
            "name": "dashboard",
            "display_name": "Dashboard",
            "description": "Trang tổng quan và thống kê",
            "items": [
                {"name": "dashboard_view", "display_name": "Xem Dashboard", "description": "Xem trang tổng quan và thống kê"}
            ]
        },
        "clients": {
            "name": "clients", 
            "display_name": "Quản lý Khách hàng",
            "description": "Quản lý thông tin khách hàng",
            "items": [
                {"name": "clients_view", "display_name": "Xem danh sách khách hàng", "description": "Xem danh sách và thông tin khách hàng"},
                {"name": "clients_create", "display_name": "Thêm khách hàng", "description": "Tạo khách hàng mới"},
                {"name": "clients_edit", "display_name": "Sửa thông tin khách hàng", "description": "Chỉnh sửa thông tin khách hàng"},
                {"name": "clients_delete", "display_name": "Xóa khách hàng", "description": "Xóa khách hàng khỏi hệ thống"},
                {"name": "clients_archive", "display_name": "Lưu trữ khách hàng", "description": "Lưu trữ/khôi phục khách hàng"}
            ]
        },
        "leads": {
            "name": "leads",
            "display_name": "Quản lý Lead", 
            "description": "Quản lý tiềm năng khách hàng",
            "items": [
                {"name": "leads_view", "display_name": "Xem danh sách Lead", "description": "Xem danh sách Lead"},
                {"name": "leads_create", "display_name": "Thêm Lead", "description": "Tạo Lead mới"},
                {"name": "leads_edit", "display_name": "Sửa thông tin Lead", "description": "Chỉnh sửa thông tin Lead"},
                {"name": "leads_delete", "display_name": "Xóa Lead", "description": "Xóa Lead khỏi hệ thống"}
            ]
        },
        "projects": {
            "name": "projects",
            "display_name": "Quản lý Dự án",
            "description": "Quản lý dự án và chiến dịch",
            "items": [
                {"name": "projects_view", "display_name": "Xem danh sách dự án", "description": "Xem danh sách dự án"},
                {"name": "projects_create", "display_name": "Thêm dự án", "description": "Tạo dự án mới"},
                {"name": "projects_edit", "display_name": "Sửa thông tin dự án", "description": "Chỉnh sửa thông tin dự án"},
                {"name": "projects_delete", "display_name": "Xóa dự án", "description": "Xóa dự án"},
                {"name": "projects_assign", "display_name": "Phân công nhân sự", "description": "Phân công nhân sự cho dự án"}
            ]
        },
        "campaigns": {
            "name": "campaigns",
            "display_name": "Quản lý Chiến dịch",
            "description": "Quản lý chiến dịch marketing",
            "items": [
                {"name": "campaigns_view", "display_name": "Xem chiến dịch", "description": "Xem danh sách chiến dịch"},
                {"name": "campaigns_create", "display_name": "Thêm chiến dịch", "description": "Tạo chiến dịch mới"},
                {"name": "campaigns_edit", "display_name": "Sửa chiến dịch", "description": "Chỉnh sửa chiến dịch"},
                {"name": "campaigns_delete", "display_name": "Xóa chiến dịch", "description": "Xóa chiến dịch"}
            ]
        },
        "services": {
            "name": "services",
            "display_name": "Quản lý Dịch vụ",
            "description": "Quản lý dịch vụ trong chiến dịch",
            "items": [
                {"name": "services_view", "display_name": "Xem dịch vụ", "description": "Xem dịch vụ trong chiến dịch"},
                {"name": "services_create", "display_name": "Thêm dịch vụ", "description": "Tạo dịch vụ mới"},
                {"name": "services_edit", "display_name": "Sửa dịch vụ", "description": "Chỉnh sửa dịch vụ"},
                {"name": "services_delete", "display_name": "Xóa dịch vụ", "description": "Xóa dịch vụ"}
            ]
        },
        "tasks": {
            "name": "tasks",
            "display_name": "Quản lý Công việc",
            "description": "Quản lý công việc và nhiệm vụ",
            "items": [
                {"name": "tasks_view", "display_name": "Xem công việc", "description": "Xem danh sách công việc"},
                {"name": "tasks_create", "display_name": "Thêm công việc", "description": "Tạo công việc mới"},
                {"name": "tasks_edit", "display_name": "Sửa công việc", "description": "Chỉnh sửa công việc"},
                {"name": "tasks_delete", "display_name": "Xóa công việc", "description": "Xóa công việc"},
                {"name": "tasks_assign", "display_name": "Phân công công việc", "description": "Phân công công việc cho nhân sự"}
            ]
        },
        "internal_tasks": {
            "name": "internal_tasks",
            "display_name": "Nhiệm vụ Nội bộ",
            "description": "Quản lý nhiệm vụ nội bộ",
            "items": [
                {"name": "internal_tasks_view", "display_name": "Xem nhiệm vụ nội bộ", "description": "Xem danh sách nhiệm vụ nội bộ"},
                {"name": "internal_tasks_create", "display_name": "Thêm nhiệm vụ", "description": "Tạo nhiệm vụ nội bộ mới"},
                {"name": "internal_tasks_edit", "display_name": "Sửa nhiệm vụ", "description": "Chỉnh sửa nhiệm vụ nội bộ"},
                {"name": "internal_tasks_delete", "display_name": "Xóa nhiệm vụ", "description": "Xóa nhiệm vụ nội bộ"}
            ]
        },
        "contracts": {
            "name": "contracts",
            "display_name": "Quản lý Hợp đồng",
            "description": "Quản lý hợp đồng với khách hàng",
            "items": [
                {"name": "contracts_view", "display_name": "Xem hợp đồng", "description": "Xem danh sách hợp đồng"},
                {"name": "contracts_create", "display_name": "Thêm hợp đồng", "description": "Tạo hợp đồng mới"},
                {"name": "contracts_edit", "display_name": "Sửa hợp đồng", "description": "Chỉnh sửa hợp đồng"},
                {"name": "contracts_delete", "display_name": "Xóa hợp đồng", "description": "Xóa hợp đồng"}
            ]
        },
        "invoices": {
            "name": "invoices",
            "display_name": "Quản lý Hóa đơn",
            "description": "Quản lý hóa đơn và thanh toán",
            "items": [
                {"name": "invoices_view", "display_name": "Xem hóa đơn", "description": "Xem danh sách hóa đơn"},
                {"name": "invoices_create", "display_name": "Thêm hóa đơn", "description": "Tạo hóa đơn mới"},
                {"name": "invoices_edit", "display_name": "Sửa hóa đơn", "description": "Chỉnh sửa hóa đơn"},
                {"name": "invoices_delete", "display_name": "Xóa hóa đơn", "description": "Xóa hóa đơn"}
            ]
        },
        "expenses": {
            "name": "expenses",
            "display_name": "Quản lý Chi phí",
            "description": "Quản lý chi phí và báo cáo",
            "items": [
                {"name": "expenses_view", "display_name": "Xem chi phí", "description": "Xem danh sách chi phí"},
                {"name": "expenses_create", "display_name": "Thêm chi phí", "description": "Tạo chi phí mới"},
                {"name": "expenses_edit", "display_name": "Sửa chi phí", "description": "Chỉnh sửa chi phí"},
                {"name": "expenses_delete", "display_name": "Xóa chi phí", "description": "Xóa chi phí"},
                {"name": "expenses_approve", "display_name": "Duyệt chi phí", "description": "Duyệt/từ chối chi phí"}
            ]
        },
        "documents": {
            "name": "documents",
            "display_name": "Quản lý Tài liệu",
            "description": "Quản lý tài liệu và thư mục",
            "items": [
                {"name": "documents_view", "display_name": "Xem tài liệu", "description": "Xem tài liệu"},
                {"name": "documents_create", "display_name": "Thêm tài liệu", "description": "Tạo tài liệu mới"},
                {"name": "documents_edit", "display_name": "Sửa tài liệu", "description": "Chỉnh sửa tài liệu"},
                {"name": "documents_delete", "display_name": "Xóa tài liệu", "description": "Xóa tài liệu"},
                {"name": "folders_manage", "display_name": "Quản lý thư mục", "description": "Tạo/sửa/xóa thư mục"}
            ]
        },
        "templates": {
            "name": "templates",
            "display_name": "Quản lý Template",
            "description": "Quản lý template dịch vụ",
            "items": [
                {"name": "templates_view", "display_name": "Xem template", "description": "Xem danh sách template"},
                {"name": "templates_create", "display_name": "Thêm template", "description": "Tạo template mới"},
                {"name": "templates_edit", "display_name": "Sửa template", "description": "Chỉnh sửa template"},
                {"name": "templates_delete", "display_name": "Xóa template", "description": "Xóa template"}
            ]
        },
        "human_resources": {
            "name": "human_resources",
            "display_name": "Quản lý Nhân sự",
            "description": "Quản lý nhân viên và team",
            "items": [
                {"name": "users_view", "display_name": "Xem nhân sự", "description": "Xem danh sách nhân sự"},
                {"name": "users_create", "display_name": "Thêm nhân sự", "description": "Tạo tài khoản nhân sự mới"},
                {"name": "users_edit", "display_name": "Sửa thông tin nhân sự", "description": "Chỉnh sửa thông tin nhân sự"},
                {"name": "users_delete", "display_name": "Xóa nhân sự", "description": "Xóa tài khoản nhân sự"},
                {"name": "teams_manage", "display_name": "Quản lý Team", "description": "Tạo/sửa/xóa team và phân công thành viên"},
                {"name": "performance_view", "display_name": "Xem hiệu suất", "description": "Xem báo cáo hiệu suất nhân sự"},
                {"name": "permissions_manage", "display_name": "Quản lý Phân quyền", "description": "Cấu hình phân quyền hệ thống"}
            ]
        },
        "reports": {
            "name": "reports",
            "display_name": "Báo cáo",
            "description": "Xem và tạo báo cáo",
            "items": [
                {"name": "reports_view", "display_name": "Xem báo cáo", "description": "Xem các báo cáo hệ thống"},
                {"name": "reports_export", "display_name": "Xuất báo cáo", "description": "Xuất báo cáo ra file"},
                {"name": "financial_reports", "display_name": "Báo cáo tài chính", "description": "Xem báo cáo tài chính"},
                {"name": "sales_reports", "display_name": "Báo cáo bán hàng", "description": "Xem báo cáo bán hàng"}
            ]
        },
        "settings": {
            "name": "settings",
            "display_name": "Cài đặt Hệ thống",
            "description": "Cấu hình hệ thống",
            "items": [
                {"name": "settings_view", "display_name": "Xem cài đặt", "description": "Xem cài đặt hệ thống"},
                {"name": "settings_edit", "display_name": "Sửa cài đặt", "description": "Chỉnh sửa cài đặt hệ thống"},
                {"name": "system_manage", "display_name": "Quản lý hệ thống", "description": "Quản lý tổng thể hệ thống"}
            ]
        }
    }
    
    # Insert permission categories and items
    order = 0
    for category_key, category_data in permission_structure.items():
        # Create category
        category = PermissionCategory(
            id=category_key,
            name=category_data["name"],
            display_name=category_data["display_name"],
            description=category_data["description"],
            order=order
        )
        await db.permission_categories.insert_one(category.dict())
        
        # Create items for this category
        item_order = 0
        for item_data in category_data["items"]:
            item = PermissionItem(
                id=f"{category_key}_{item_data['name']}",
                category_id=category_key,
                name=item_data["name"],
                display_name=item_data["display_name"],
                description=item_data["description"],
                order=item_order
            )
            await db.permission_items.insert_one(item.dict())
            item_order += 1
        
        order += 1

@api_router.get("/permissions/categories", response_model=List[PermissionCategory])
async def get_permission_categories(current_user: User = Depends(get_current_active_user)):
    """Lấy danh sách các nhóm quyền"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    categories = await db.permission_categories.find().sort("order", 1).to_list(length=100)
    return categories

@api_router.get("/permissions/items", response_model=List[PermissionItem])
async def get_permission_items(
    category_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách các quyền cụ thể"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    items = await db.permission_items.find(query).sort("order", 1).to_list(length=500)
    return items

@api_router.get("/permissions/matrix/{target_type}/{target_id}")
async def get_permission_matrix(
    target_type: str,  # "role" or "user"
    target_id: str,    # role name or user_id
    current_user: User = Depends(get_current_active_user)
):
    """Lấy ma trận phân quyền cho role hoặc user"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if target_type not in ["role", "user"]:
        raise HTTPException(status_code=400, detail="Invalid target_type")
    
    # Get categories and items
    categories = await db.permission_categories.find().sort("order", 1).to_list(length=100)
    items = await db.permission_items.find().sort("order", 1).to_list(length=500)
    
    # Get current permissions
    current_permissions = []
    
    if target_type == "role":
        # Get role permissions
        role_perms = await db.role_permissions.find({"role": target_id}).to_list(length=500)
        current_permissions = [
            {
                "permission_id": perm["permission_id"],
                "can_view": perm["can_view"],
                "can_edit": perm["can_edit"],
                "can_delete": perm["can_delete"]
            }
            for perm in role_perms
        ]
    else:
        # Get user permissions
        user_perms = await db.user_permissions.find({"user_id": target_id}).to_list(length=500)
        current_permissions = [
            {
                "permission_id": perm["permission_id"],
                "can_view": perm["can_view"],
                "can_edit": perm["can_edit"],
                "can_delete": perm["can_delete"],
                "override_role": perm["override_role"]
            }
            for perm in user_perms
        ]
    
    return PermissionMatrix(
        categories=categories,
        items=items,
        current_permissions=current_permissions
    )

@api_router.post("/permissions/role/{role}/update")
async def update_role_permissions(
    role: str,
    permissions: List[RolePermissionCreate],
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật phân quyền cho role"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate role
    valid_roles = ["admin", "account", "creative", "staff", "manager", "content", "design", "editor", "sale"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Delete existing role permissions
    await db.role_permissions.delete_many({"role": role})
    
    # Insert new permissions
    for perm in permissions:
        role_perm = RolePermission(
            role=role,
            permission_id=perm.permission_id,
            can_view=perm.can_view,
            can_edit=perm.can_edit,
            can_delete=perm.can_delete,
            created_by=current_user.id
        )
        await db.role_permissions.insert_one(role_perm.dict())
    
    return {"detail": f"Updated permissions for role {role}"}

@api_router.post("/permissions/user/{user_id}/update")
async def update_user_permissions(
    user_id: str,
    permissions: List[UserPermissionCreate],
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật phân quyền cho user cụ thể"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete existing user permissions
    await db.user_permissions.delete_many({"user_id": user_id})
    
    # Insert new permissions
    for perm in permissions:
        user_perm = UserPermission(
            user_id=user_id,
            permission_id=perm.permission_id,
            can_view=perm.can_view,
            can_edit=perm.can_edit,
            can_delete=perm.can_delete,
            override_role=perm.override_role,
            created_by=current_user.id
        )
        await db.user_permissions.insert_one(user_perm.dict())
    
    return {"detail": f"Updated permissions for user {user_id}"}

@api_router.get("/permissions/roles", response_model=List[dict])
async def get_roles_list(current_user: User = Depends(get_current_active_user)):
    """Lấy danh sách các role để phân quyền"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    roles = [
        {"value": "admin", "label": "Quản trị viên", "color": "red"},
        {"value": "account", "label": "Account Manager", "color": "blue"},
        {"value": "manager", "label": "Quản lý dự án", "color": "purple"},
        {"value": "creative", "label": "Creative Director", "color": "indigo"},
        {"value": "content", "label": "Content Creator", "color": "green"},
        {"value": "design", "label": "Designer", "color": "pink"},
        {"value": "editor", "label": "Editor", "color": "orange"},
        {"value": "sale", "label": "Sales", "color": "yellow"},
        {"value": "staff", "label": "Nhân viên", "color": "gray"}
    ]
    return roles

@api_router.get("/permissions/users", response_model=List[dict])
async def get_users_for_permission(current_user: User = Depends(get_current_active_user)):
    """Lấy danh sách users để phân quyền riêng"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    users = await db.users.find({"is_active": True}).to_list(length=100)
    return [
        {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"]
        }
        for user in users
    ]

@api_router.get("/permissions/my-permissions")
async def get_my_permissions(current_user: User = Depends(get_current_active_user)):
    """Lấy tất cả quyền của user hiện tại (kết hợp role và user permissions)"""
    
    # Get all permission items
    all_items = await db.permission_items.find().to_list(length=500)
    
    # Get role permissions
    role_permissions = await db.role_permissions.find({"role": current_user.role}).to_list(length=500)
    role_perms_dict = {
        perm["permission_id"]: {
            "can_view": perm["can_view"],
            "can_edit": perm["can_edit"], 
            "can_delete": perm["can_delete"]
        }
        for perm in role_permissions
    }
    
    # Get user-specific permissions
    user_permissions = await db.user_permissions.find({"user_id": current_user.id}).to_list(length=500)
    user_perms_dict = {
        perm["permission_id"]: {
            "can_view": perm["can_view"],
            "can_edit": perm["can_edit"],
            "can_delete": perm["can_delete"],
            "override_role": perm["override_role"]
        }
        for perm in user_permissions
    }
    
    # Combine permissions (user permissions override role permissions when override_role is True)
    final_permissions = {}
    
    for item in all_items:
        permission_id = item["id"]
        
        # Start with role permissions
        role_perm = role_perms_dict.get(permission_id, {
            "can_view": False,
            "can_edit": False,
            "can_delete": False
        })
        
        # Check if user has specific permissions that override role
        user_perm = user_perms_dict.get(permission_id)
        
        if user_perm and user_perm.get("override_role", False):
            # Use user permissions
            final_permissions[permission_id] = {
                "can_view": user_perm["can_view"],
                "can_edit": user_perm["can_edit"],
                "can_delete": user_perm["can_delete"],
                "source": "user_override"
            }
        else:
            # Use role permissions
            final_permissions[permission_id] = {
                "can_view": role_perm["can_view"],
                "can_edit": role_perm["can_edit"],
                "can_delete": role_perm["can_delete"],
                "source": "role"
            }
    
    return {
        "user_id": current_user.id,
        "user_role": current_user.role,
        "permissions": final_permissions
    }

@api_router.get("/permissions/check/{permission_id}")
async def check_permission(
    permission_id: str,
    action: str = "view",  # view, edit, delete
    current_user: User = Depends(get_current_active_user)
):
    """Check if current user has specific permission"""
    
    # Admin has all permissions
    if current_user.role == "admin":
        return {"has_permission": True, "source": "admin"}
    
    if action not in ["view", "edit", "delete"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    # Get role permissions
    role_perm = await db.role_permissions.find_one({
        "role": current_user.role,
        "permission_id": permission_id
    })
    
    # Get user permissions
    user_perm = await db.user_permissions.find_one({
        "user_id": current_user.id,
        "permission_id": permission_id
    })
    
    has_permission = False
    source = "none"
    
    if user_perm and user_perm.get("override_role", False):
        # Use user permission
        has_permission = user_perm.get(f"can_{action}", False)
        source = "user_override"
    elif role_perm:
        # Use role permission
        has_permission = role_perm.get(f"can_{action}", False)
        source = "role"
    
    return {
        "has_permission": has_permission,
        "source": source,
        "permission_id": permission_id,
        "action": action
    }

# Root endpoint
# ================= TASK COST TYPE ENDPOINTS =================

@api_router.post("/task-cost-types/", response_model=TaskCostType)
async def create_task_cost_type(
    task_type: TaskCostTypeCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Tạo loại chi phí task mới (chỉ admin)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create task cost types")
    
    # Check if name already exists
    existing = await db.task_cost_types.find_one({"name": task_type.name, "is_active": True})
    if existing:
        raise HTTPException(status_code=400, detail="Task cost type name already exists")
    
    new_task_type = TaskCostType(
        **task_type.dict(),
        created_by=current_user.id
    )
    
    await db.task_cost_types.insert_one(new_task_type.dict())
    
    # Enrich with user info
    new_task_type.created_by_name = current_user.full_name
    
    return new_task_type

@api_router.get("/task-cost-types/", response_model=List[TaskCostType])
async def get_task_cost_types(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách loại chi phí task"""
    query_filter = {}
    
    if is_active is not None:
        query_filter["is_active"] = is_active
    
    if search:
        query_filter["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    task_types = await db.task_cost_types.find(query_filter).sort("created_at", -1).to_list(length=100)
    
    # Enrich with user info
    for task_type in task_types:
        if task_type.get("created_by"):
            creator = await db.users.find_one({"id": task_type["created_by"]})
            task_type["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return task_types

@api_router.put("/task-cost-types/{type_id}", response_model=TaskCostType)
async def update_task_cost_type(
    type_id: str,
    task_type_update: TaskCostTypeUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật loại chi phí task (chỉ admin)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update task cost types")
    
    # Check if exists
    existing = await db.task_cost_types.find_one({"id": type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task cost type not found")
    
    # Check name uniqueness if name is being updated
    if task_type_update.name and task_type_update.name != existing["name"]:
        name_exists = await db.task_cost_types.find_one({
            "name": task_type_update.name,
            "is_active": True,
            "id": {"$ne": type_id}
        })
        if name_exists:
            raise HTTPException(status_code=400, detail="Task cost type name already exists")
    
    update_data = {k: v for k, v in task_type_update.dict().items() if v is not None}
    update_data["updated_at"] = vietnam_now()
    
    await db.task_cost_types.update_one({"id": type_id}, {"$set": update_data})
    
    # Get updated task type
    updated_task_type = await db.task_cost_types.find_one({"id": type_id})
    
    # Enrich with user info
    if updated_task_type.get("created_by"):
        creator = await db.users.find_one({"id": updated_task_type["created_by"]})
        updated_task_type["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return updated_task_type

@api_router.delete("/task-cost-types/{type_id}")
async def delete_task_cost_type(
    type_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Xóa loại chi phí task (chỉ admin)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete task cost types")
    
    # Check if exists
    existing = await db.task_cost_types.find_one({"id": type_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task cost type not found")
    
    # Check if being used in task cost rates
    used_in_rates = await db.task_cost_rates.find_one({"task_type_id": type_id, "is_active": True})
    if used_in_rates:
        raise HTTPException(status_code=400, detail="Cannot delete task cost type that is being used in cost rates")
    
    # Soft delete
    await db.task_cost_types.update_one(
        {"id": type_id},
        {"$set": {"is_active": False, "updated_at": vietnam_now()}}
    )
    
    return {"detail": "Task cost type deleted successfully"}

# ================= TASK COST RATE ENDPOINTS =================

@api_router.post("/task-cost-rates/", response_model=TaskCostRate)
async def create_task_cost_rate(
    cost_rate: TaskCostRateCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Tạo chi phí task mới (chỉ admin)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create task cost rates")
    
    # Check if task type exists
    task_type = await db.task_cost_types.find_one({"id": cost_rate.task_type_id, "is_active": True})
    if not task_type:
        raise HTTPException(status_code=400, detail="Task cost type not found or inactive")
    
    # Check if cost rate for this task type already exists
    existing = await db.task_cost_rates.find_one({
        "task_type_id": cost_rate.task_type_id,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="Cost rate for this task type already exists")
    
    new_cost_rate = TaskCostRate(
        **cost_rate.dict(),
        created_by=current_user.id
    )
    
    await db.task_cost_rates.insert_one(new_cost_rate.dict())
    
    # Enrich with info
    new_cost_rate.task_type_name = task_type["name"]
    new_cost_rate.created_by_name = current_user.full_name
    
    return new_cost_rate

@api_router.get("/task-cost-rates/", response_model=List[TaskCostRate])
async def get_task_cost_rates(
    search: Optional[str] = None,
    task_type_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user)
):
    """Lấy danh sách chi phí task"""
    query_filter = {}
    
    if is_active is not None:
        query_filter["is_active"] = is_active
    
    if task_type_id:
        query_filter["task_type_id"] = task_type_id
    
    cost_rates = await db.task_cost_rates.find(query_filter).sort("created_at", -1).to_list(length=100)
    
    # Enrich with task type names and user info
    for rate in cost_rates:
        # Get task type info
        if rate.get("task_type_id"):
            task_type = await db.task_cost_types.find_one({"id": rate["task_type_id"]})
            rate["task_type_name"] = task_type["name"] if task_type else "Unknown"
        
        # Get creator info
        if rate.get("created_by"):
            creator = await db.users.find_one({"id": rate["created_by"]})
            rate["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    # Apply search filter after enrichment
    if search:
        filtered_rates = []
        search_lower = search.lower()
        for rate in cost_rates:
            if (search_lower in rate.get("task_type_name", "").lower() or
                search_lower in str(rate.get("cost_per_hour", "")).lower()):
                filtered_rates.append(rate)
        cost_rates = filtered_rates
    
    return cost_rates

@api_router.put("/task-cost-rates/{rate_id}", response_model=TaskCostRate)
async def update_task_cost_rate(
    rate_id: str,
    rate_update: TaskCostRateUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật chi phí task (chỉ admin)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update task cost rates")
    
    # Check if exists
    existing = await db.task_cost_rates.find_one({"id": rate_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task cost rate not found")
    
    # Check task type if being updated
    if rate_update.task_type_id:
        task_type = await db.task_cost_types.find_one({"id": rate_update.task_type_id, "is_active": True})
        if not task_type:
            raise HTTPException(status_code=400, detail="Task cost type not found or inactive")
    
    update_data = {k: v for k, v in rate_update.dict().items() if v is not None}
    update_data["updated_at"] = vietnam_now()
    
    await db.task_cost_rates.update_one({"id": rate_id}, {"$set": update_data})
    
    # Get updated cost rate
    updated_rate = await db.task_cost_rates.find_one({"id": rate_id})
    
    # Enrich with info
    if updated_rate.get("task_type_id"):
        task_type = await db.task_cost_types.find_one({"id": updated_rate["task_type_id"]})
        updated_rate["task_type_name"] = task_type["name"] if task_type else "Unknown"
    
    if updated_rate.get("created_by"):
        creator = await db.users.find_one({"id": updated_rate["created_by"]})
        updated_rate["created_by_name"] = creator["full_name"] if creator else "Unknown"
    
    return updated_rate

@api_router.delete("/task-cost-rates/{rate_id}")
async def delete_task_cost_rate(
    rate_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Xóa chi phí task (chỉ admin)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete task cost rates")
    
    # Check if exists
    existing = await db.task_cost_rates.find_one({"id": rate_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task cost rate not found")
    
    # Soft delete
    await db.task_cost_rates.update_one(
        {"id": rate_id},
        {"$set": {"is_active": False, "updated_at": vietnam_now()}}
    )
    
    return {"detail": "Task cost rate deleted successfully"}

# ================= TASK COST SETTINGS ENDPOINTS =================

@api_router.get("/task-cost-settings/", response_model=TaskCostSettings)
async def get_task_cost_settings(current_user: User = Depends(get_current_active_user)):
    """Lấy cấu hình chi phí task hiện tại"""
    
    # Tìm settings hiện tại
    settings = await db.task_cost_settings.find_one({}, sort=[("created_at", -1)])
    
    if not settings:
        # Tạo settings mặc định nếu chưa có
        default_settings = TaskCostSettings(
            cost_per_hour=0.0,
            is_enabled=True,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        await db.task_cost_settings.insert_one(default_settings.dict())
        settings = default_settings.dict()
    
    # Enrich với thông tin user
    if settings.get("updated_by"):
        updated_by_user = await db.users.find_one({"id": settings["updated_by"]})
        settings["updated_by_name"] = updated_by_user["full_name"] if updated_by_user else "Unknown"
    
    return settings

@api_router.put("/task-cost-settings/", response_model=TaskCostSettings)
async def update_task_cost_settings(
    settings_update: TaskCostSettingsUpdate, 
    current_user: User = Depends(get_current_active_user)
):
    """Cập nhật cấu hình chi phí task (chỉ admin)"""
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update task cost settings")
    
    # Tìm settings hiện tại hoặc tạo mới
    current_settings = await db.task_cost_settings.find_one({}, sort=[("created_at", -1)])
    
    if current_settings:
        # Update existing settings
        update_data = {k: v for k, v in settings_update.dict().items() if v is not None}
        update_data["updated_at"] = vietnam_now()
        update_data["updated_by"] = current_user.id
        
        await db.task_cost_settings.update_one(
            {"id": current_settings["id"]}, 
            {"$set": update_data}
        )
        
        # Get updated settings
        updated_settings = await db.task_cost_settings.find_one({"id": current_settings["id"]})
    else:
        # Create new settings
        new_settings = TaskCostSettings(
            cost_per_hour=settings_update.cost_per_hour or 0.0,
            is_enabled=settings_update.is_enabled if settings_update.is_enabled is not None else True,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        await db.task_cost_settings.insert_one(new_settings.dict())
        updated_settings = new_settings.dict()
    
    # Enrich với thông tin user
    if updated_settings.get("updated_by"):
        updated_by_user = await db.users.find_one({"id": updated_settings["updated_by"]})
        updated_settings["updated_by_name"] = updated_by_user["full_name"] if updated_by_user else "Unknown"
    
    return updated_settings

# ================= ROOT AND HEALTH ENDPOINTS =================

@api_router.get("/")
async def read_root():
    return {"message": "CRM API for Marketing Agency"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": vietnam_now()}

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
