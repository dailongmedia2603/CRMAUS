import React, { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import "./App.css";

// Import components thực sự
import ProjectsComponent from "./components/Projects.js";
import CampaignsComponent from "./components/Campaigns.js";
import CampaignDetailComponent from "./components/CampaignDetail.js";
import DocumentsComponent from "./components/Documents.js";
import TemplatesComponent from "./components/Templates.js";
import { ExpenseManagement } from "./components/ExpenseComponents.js";
import ClientsComponent from "./components/Clients.js";
import ClientDetailComponent from "./components/ClientDetail.js";
import ProjectDetailComponent from "./components/ProjectDetail.js";
import HumanResources from "./components/HumanResources.js";

// Auth context
// Create AuthContext for user authentication and permissions
const AuthContext = createContext();

// Create PermissionContext for permission management
const PermissionContext = createContext();

export { AuthContext, PermissionContext };

// Permission Hook
const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Permission checking functions
const checkPermission = (permissions, permissionId, action = 'view') => {
  if (!permissions || !permissionId) return false;
  const permission = permissions[permissionId];
  if (!permission) return false;
  return permission[`can_${action}`] || false;
};

const hasAnyPermission = (permissions, permissionIds, action = 'view') => {
  if (!permissions || !permissionIds || !Array.isArray(permissionIds)) return false;
  return permissionIds.some(permissionId => checkPermission(permissions, permissionId, action));
};

// Permission Provider Component
const PermissionProvider = ({ children, user, token }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && token) {
      fetchUserPermissions();
    } else {
      setPermissions(null);
      setLoading(false);
    }
  }, [user, token]);

  const fetchUserPermissions = async () => {
    try {
      setLoading(true);
      
      // Admin has all permissions
      if (user.role === 'admin') {
        setPermissions('admin');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API}/api/permissions/my-permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPermissions(response.data.permissions);
      console.log('User permissions loaded:', response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionId, action = 'view') => {
    // Admin has all permissions
    if (permissions === 'admin') return true;
    return checkPermission(permissions, permissionId, action);
  };

  const hasAnyOfPermissions = (permissionIds, action = 'view') => {
    // Admin has all permissions
    if (permissions === 'admin') return true;
    return hasAnyPermission(permissions, permissionIds, action);
  };

  const value = {
    permissions,
    loading,
    hasPermission,
    hasAnyOfPermissions,
    refreshPermissions: fetchUserPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

// Environment variables - Use backend URL from environment variable
const API = process.env.REACT_APP_BACKEND_URL || '';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          setToken(savedToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          const response = await axios.get(`${API}/api/users/me/`);
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginComponent login={login} />;
  }

  // Main app layout
  return (
    <AuthContext.Provider value={{ user, token, logout }}>
      <PermissionProvider user={user} token={token}>
        <div className="min-h-screen bg-gray-50 flex">
          {/* Static sidebar for desktop */}
          <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
            <SidebarContent user={user} logout={logout} />
          </div>

          {/* Main content */}
          <div className="md:pl-64 flex flex-col flex-1">
            {/* Modern Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
              {/* Breadcrumb */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  </svg>
                  <span className="text-gray-500">CRM AUS</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-gray-900 font-medium">
                    {window.location.pathname === "/" ? "Dashboard" : 
                     window.location.pathname === "/clients" ? "Client" :
                     window.location.pathname.startsWith("/clients/") ? "Client Detail" :
                     window.location.pathname === "/leads" ? "Lead" :
                     window.location.pathname === "/task" ? "Nhiệm vụ" :
                     window.location.pathname === "/projects" ? "Dự án" :
                     window.location.pathname === "/contracts" ? "Hợp đồng" :
                     window.location.pathname === "/invoices" ? "Hóa đơn" :
                     window.location.pathname === "/campaigns" ? "Chiến dịch" :
                     window.location.pathname === "/documents" ? "Tài liệu" :
                     window.location.pathname === "/human-resources" ? "Nhân sự" :
                     window.location.pathname === "/settings" ? "Cài đặt" :
                     'Trang'}
                  </span>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center space-x-4">
                  {/* Search Button */}
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>

                  {/* Notifications */}
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM5.07 7A7.002 7.002 0 0112 2c1.857 0 3.547.72 4.816 1.898M15 17h5l-5 5v-5z" />
                    </svg>
                  </button>

                  {/* Settings */}
                  <button 
                    onClick={() => {
                      if (user?.role === 'admin') {
                        window.location.href = '/settings';
                      }
                    }}
                    disabled={user?.role !== 'admin'}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  {/* User Menu */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{user?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
                    </div>
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Main content area */}
            <main className="flex-1 p-6">
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute requiredPermission="dashboard_dashboard_view">
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/clients" element={
                  <ProtectedRoute requiredPermission="clients_clients_view">
                    <ClientsComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/clients/:id" element={
                  <ProtectedRoute requiredPermission="clients_clients_view">
                    <ClientDetailComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/task" element={
                  <ProtectedRoute requiredPermission="internal_tasks_internal_tasks_view">
                    <Task />
                  </ProtectedRoute>
                } />
                <Route path="/projects" element={
                  <ProtectedRoute requiredPermission="projects_projects_view">
                    <ProjectsComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/projects/:id" element={
                  <ProtectedRoute requiredPermission="projects_projects_view">
                    <ProjectDetailComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/campaigns" element={
                  <ProtectedRoute requiredPermission="campaigns_campaigns_view">
                    <CampaignsComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/campaigns/:id" element={
                  <ProtectedRoute requiredPermission="campaigns_campaigns_view">
                    <CampaignDetailComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/task-templates" element={
                  <ProtectedRoute requiredPermission="templates_templates_view">
                    <TemplatesComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/contracts" element={
                  <ProtectedRoute requiredPermission="contracts_contracts_view">
                    <Contracts />
                  </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                  <ProtectedRoute requiredPermission="invoices_invoices_view">
                    <Invoices />
                  </ProtectedRoute>
                } />
                <Route path="/expenses" element={
                  <ProtectedRoute requiredPermission="expenses_expenses_view">
                    <ExpenseManagement user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/financial-reports" element={
                  <ProtectedRoute requiredPermission="reports_financial_reports">
                    <FinancialReports />
                  </ProtectedRoute>
                } />
                <Route path="/opportunities" element={
                  <ProtectedRoute requiredPermission="reports_reports_view">
                    <Opportunities />
                  </ProtectedRoute>
                } />
                <Route path="/leads" element={
                  <ProtectedRoute requiredPermission="leads_leads_view">
                    <LeadsComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/sales-reports" element={
                  <ProtectedRoute requiredPermission="reports_sales_reports">
                    <SalesReports />
                  </ProtectedRoute>
                } />
                <Route path="/documents" element={
                  <ProtectedRoute requiredPermission="documents_documents_view">
                    <DocumentsComponent user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute requiredPermission="reports_reports_view">
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/human-resources" element={
                  <ProtectedRoute requiredPermission="human_resources_users_view">
                    <HumanResources user={user} />
                  </ProtectedRoute>
                } />
                <Route path="/account" element={<Account />} />
                <Route path="/settings" element={
                  <ProtectedRoute requiredPermission="settings_settings_view">
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </PermissionProvider>
    </AuthContext.Provider>
  );
}

// Dashboard Component (ném từ App.js cũ)
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalProjects: 0,
    totalRevenue: 0,
    pendingInvoices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/api/clients/`),
        axios.get(`${API}/api/projects/`),
        axios.get(`${API}/api/invoices/`)
      ]);

      const clients = clientsRes.data;
      const projects = projectsRes.data;
      const invoices = invoicesRes.data;

      const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);

      const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;

      setStats({
        totalClients: clients.length,
        totalProjects: projects.length,
        totalRevenue,
        pendingInvoices
      });
    } catch (error) {
      toast.error('Lỗi khi tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Tổng quan hệ thống CRM</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="modern-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Tổng khách hàng</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {loading ? '...' : stats.totalClients}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Tổng dự án</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {loading ? '...' : stats.totalProjects}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Tổng doanh thu</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {loading ? '...' : formatCurrency(stats.totalRevenue)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Hóa đơn chờ</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {loading ? '...' : stats.pendingInvoices}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => window.location.href = '/clients'}
          className="p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
        >
          <svg className="w-6 h-6 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Quản lý khách hàng</h3>
          <p className="text-sm text-gray-600">Thêm và quản lý khách hàng</p>
        </button>

        <button
          onClick={() => window.location.href = '/projects'}
          className="p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
        >
          <svg className="w-6 h-6 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Quản lý dự án</h3>
          <p className="text-sm text-gray-600">Tạo và theo dõi dự án</p>
        </button>

        <button
          onClick={() => window.location.href = '/invoices'}
          className="p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
        >
          <svg className="w-6 h-6 text-yellow-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Quản lý hóa đơn</h3>
          <p className="text-sm text-gray-600">Tạo và theo dõi hóa đơn</p>
        </button>

        <button
          onClick={() => window.location.href = '/task'}
          className="p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
        >
          <svg className="w-6 h-6 text-purple-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="font-semibold text-gray-900">Quản lý nhiệm vụ</h3>
          <p className="text-sm text-gray-600">Giao và theo dõi nhiệm vụ</p>
        </button>
      </div>

      {/* System Status */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Trạng thái hệ thống</h3>
            <p className="text-sm text-gray-600">Tất cả các dịch vụ đang hoạt động bình thường</p>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-green-700">Hoạt động</span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Backend API</p>
              <p className="text-xs text-gray-600">FastAPI Server</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-600">MongoDB</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Frontend</p>
              <p className="text-xs text-gray-600">React App</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredPermission, fallback = null }) => {
  const { hasPermission, loading } = usePermissions();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Không có quyền truy cập</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bạn không có quyền truy cập vào trang này.
          </p>
        </div>
      </div>
    );
  }
  
  return children;
};

// SidebarContent Component với Permission-Based Rendering
const SidebarContent = ({ user, logout }) => {
  const { hasPermission, loading } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [openSubmenus, setOpenSubmenus] = useState({
    project: false,
    finance: false,
    sales: false
  });

  // Check if user has permission for any items in a submenu
  const hasAnyPermissionInSubmenu = (submenu) => {
    return submenu.some(item => !item.permission || hasPermission(item.permission));
  };

  // Check if user has permission for a menu item
  const canAccessMenuItem = (item) => {
    return !item.permission || hasPermission(item.permission);
  };

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const toggleSubmenu = (menu) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  // Menu config with permissions
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      icon: (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      ),
      permission: 'dashboard_dashboard_view'
    },
    {
      id: 'clients',
      label: 'Client',
      path: '/clients',
      icon: (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      permission: 'clients_clients_view'
    },
    {
      id: 'task',
      label: 'Task',
      path: '/task',
      icon: (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      permission: 'internal_tasks_internal_tasks_view'
    }
  ];

  const projectSubmenu = [
    {
      id: 'projects',
      label: 'Danh sách dự án',
      path: '/projects',
      permission: 'projects_projects_view'
    },
    {
      id: 'campaigns',
      label: 'Chiến dịch',
      path: '/campaigns',
      permission: 'campaigns_campaigns_view'
    },
    {
      id: 'templates',
      label: 'Template dịch vụ',
      path: '/task-templates',
      permission: 'templates_templates_view'
    }
  ];

  const financeSubmenu = [
    {
      id: 'invoices',
      label: 'Hóa đơn',
      path: '/invoices',
      permission: 'invoices_invoices_view'
    },
    {
      id: 'contracts',
      label: 'Hợp đồng',
      path: '/contracts',
      permission: 'contracts_contracts_view'
    },
    {
      id: 'expenses',
      label: 'Quản lý chi phí',
      path: '/expenses',
      permission: 'expenses_expenses_view'
    },
    {
      id: 'financial-reports',
      label: 'Báo cáo tài chính',
      path: '/financial-reports',
      permission: 'reports_financial_reports'
    }
  ];

  const salesSubmenu = [
    {
      id: 'leads',
      label: 'Lead',
      path: '/leads',
      permission: 'leads_leads_view'
    },
    {
      id: 'opportunities',
      label: 'Cơ hội',
      path: '/opportunities',
      permission: 'reports_reports_view'
    },
    {
      id: 'sales-reports',
      label: 'Báo cáo bán hàng',
      path: '/sales-reports',
      permission: 'reports_sales_reports'
    }
  ];

  // Unified color scheme - blue theme
  const activeClasses = "text-white bg-blue-600 shadow-md";
  const hoverClasses = "text-blue-700 bg-blue-50 hover:bg-blue-100";
  const defaultClasses = "text-gray-700 hover:text-blue-700 hover:bg-blue-50";
  
  const subActiveClasses = "text-white bg-blue-600 shadow-sm";
  const subHoverClasses = "text-blue-700 bg-blue-50 hover:bg-blue-100";
  const subDefaultClasses = "text-gray-600 hover:text-blue-700 hover:bg-blue-50";

  return (
    <div className="h-screen w-64 bg-white shadow-lg flex flex-col border-r border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-md">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CRM AUS</h1>
            <p className="text-blue-100 text-xs">Quản lý khách hàng</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* Main Menu Items with Permission Check */}
        {menuItems.filter(item => canAccessMenuItem(item)).map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname === item.path ? activeClasses : defaultClasses
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        {/* Project Submenu - Only show if user has any project permissions */}
        {hasAnyPermissionInSubmenu(projectSubmenu) && (
          <div>
            <button
              onClick={() => toggleSubmenu('project')}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                projectSubmenu.some(item => location.pathname === item.path) ? activeClasses : defaultClasses
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Dự án
              </div>
              <svg className={`w-4 h-4 transform transition-transform duration-200 ${openSubmenus.project ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSubmenus.project && (
              <div className="ml-6 mt-2 space-y-1">
                {projectSubmenu.filter(item => canAccessMenuItem(item)).map(subItem => (
                  <button
                    key={subItem.id}
                    onClick={() => navigate(subItem.path)}
                    className={`w-full flex items-start px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                      location.pathname === subItem.path ? subActiveClasses : subDefaultClasses
                    }`}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Finance Submenu - Only show if user has any finance permissions */}
        {hasAnyPermissionInSubmenu(financeSubmenu) && (
          <div>
            <button
              onClick={() => toggleSubmenu('finance')}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                financeSubmenu.some(item => location.pathname === item.path) ? activeClasses : defaultClasses
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tài chính
              </div>
              <svg className={`w-4 h-4 transform transition-transform duration-200 ${openSubmenus.finance ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSubmenus.finance && (
              <div className="ml-6 mt-2 space-y-1">
                {financeSubmenu.filter(item => canAccessMenuItem(item)).map(subItem => (
                  <button
                    key={subItem.id}
                    onClick={() => navigate(subItem.path)}
                    className={`w-full flex items-start px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                      location.pathname === subItem.path ? subActiveClasses : subDefaultClasses
                    }`}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sales Submenu - Only show if user has any sales permissions */}
        {hasAnyPermissionInSubmenu(salesSubmenu) && (
          <div>
            <button
              onClick={() => toggleSubmenu('sales')}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                salesSubmenu.some(item => location.pathname === item.path) ? activeClasses : defaultClasses
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Bán hàng
              </div>
              <svg className={`w-4 h-4 transform transition-transform duration-200 ${openSubmenus.sales ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSubmenus.sales && (
              <div className="ml-6 mt-2 space-y-1">
                {salesSubmenu.filter(item => canAccessMenuItem(item)).map(subItem => (
                  <button
                    key={subItem.id}
                    onClick={() => navigate(subItem.path)}
                    className={`w-full flex items-start px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                      location.pathname === subItem.path ? subActiveClasses : subDefaultClasses
                    }`}
                  >
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Standalone Menu Items with Permission Check */}
        {/* Documents */}
        {hasPermission('documents_documents_view') && (
          <button
            onClick={() => navigate("/documents")}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname.startsWith("/documents") ? activeClasses : defaultClasses
            }`}
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Tài liệu
          </button>
        )}

        {/* Reports */}
        {hasPermission('reports_reports_view') && (
          <button
            onClick={() => navigate("/reports")}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname.startsWith("/reports") ? activeClasses : defaultClasses
            }`}
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Báo cáo
          </button>
        )}

        {/* Human Resources */}
        {hasPermission('human_resources_users_view') && (
          <button
            onClick={() => navigate("/human-resources")}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname.startsWith("/human-resources") ? activeClasses : defaultClasses
            }`}
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Nhân sự
          </button>
        )}

        {/* Account - Always visible */}
        <button
          onClick={() => navigate("/account")}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.pathname.startsWith("/account") ? activeClasses : defaultClasses
          }`}
        >
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Tài khoản
        </button>

        {/* Settings - Admin only or permission check */}
        {hasPermission('settings_settings_view') && (
          <button
            onClick={() => navigate("/settings")}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname.startsWith("/settings") ? activeClasses : defaultClasses
            }`}
          >
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cài đặt
          </button>
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-sm font-semibold text-white">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
            title="Đăng xuất"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Login Component
const LoginComponent = ({ login }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [connectionTest, setConnectionTest] = useState(null);

  const testConnection = async () => {
    try {
      setConnectionTest('testing');
      console.log('🔗 Testing connection to:', API);
      
      // Test basic connectivity
      const response = await axios.get(`${API}/api/`, { timeout: 5000 });
      console.log('✅ Connection test response:', response.data);
      setConnectionTest('success');
      toast.success('Kết nối backend thành công!');
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      setConnectionTest('failed');
      toast.error(`Lỗi kết nối: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Login attempt with:', { email: credentials.email });
      console.log('🌐 API URL:', API);
      
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      console.log('📤 Sending login request to:', `${API}/api/token`);
      const response = await axios.post(`${API}/api/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      console.log('✅ Login response:', response.data);
      
      console.log('👤 Fetching user info...');
      const userResponse = await axios.get(`${API}/api/users/me/`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` },
        timeout: 10000
      });

      console.log('👤 User data:', userResponse.data);
      
      login(userResponse.data, response.data.access_token);
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error message:', error.message);
      console.error('❌ Network Error?', error.code === 'NETWORK_ERROR');
      toast.error(`Đăng nhập thất bại! ${error.response?.data?.detail || error.message || 'Vui lòng kiểm tra thông tin.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 bg-indigo-600 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập CRM AUS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hệ thống quản lý khách hàng toàn diện
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mật khẩu"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="spinner mr-2"></div>
                  Đang đăng nhập...
                </div>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600">
              <strong>Thông tin đăng nhập demo:</strong>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Email: admin@example.com<br />
              Password: admin123<br />
              Email: kieu@aus.com<br />
              Password: kieu123
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={testConnection}
                disabled={connectionTest === 'testing'}
                className={`text-xs px-3 py-1 rounded border ${
                  connectionTest === 'success' ? 'bg-green-100 text-green-700 border-green-300' :
                  connectionTest === 'failed' ? 'bg-red-100 text-red-700 border-red-300' :
                  'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {connectionTest === 'testing' ? 'Đang kiểm tra...' :
                 connectionTest === 'success' ? '✅ Kết nối OK' :
                 connectionTest === 'failed' ? '❌ Lỗi kết nối' :
                 'Test kết nối Backend'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Empty components for unimplemented routes
const Task = () => <div>Task Management - Under Development</div>;
const Contracts = () => <div>Contracts - Under Development</div>;
const Invoices = () => <div>Invoices - Under Development</div>;
const FinancialReports = () => <div>Financial Reports - Under Development</div>;
const Opportunities = () => <div>Opportunities - Under Development</div>;
const LeadsComponent = () => <div>Leads - Under Development</div>;
const SalesReports = () => <div>Sales Reports - Under Development</div>;
const Reports = () => <div>Reports - Under Development</div>;
const Account = () => <div>Account - Under Development</div>;
const Settings = () => <div>Settings - Under Development</div>;

export default App;