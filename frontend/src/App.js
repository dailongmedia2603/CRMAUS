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

// Dashboard Component
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

// SidebarContent Component  
const SidebarContent = ({ user, logout }) => {
  const { hasPermission, loading } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [openSubmenus, setOpenSubmenus] = useState({
    project: false,
    finance: false,
    sales: false
  });

  // Permission-based menu items
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
      permission: 'reports_reports_view' // Assuming opportunities are part of reports
    },
    {
      id: 'sales-reports',
      label: 'Báo cáo',
      path: '/sales-reports',
      permission: 'reports_sales_reports'
    }
  ];

  const otherMenuItems = [
    {
      id: 'documents',
      label: 'Tài liệu',
      path: '/documents',
      icon: (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      permission: 'documents_documents_view'
    },
    {
      id: 'reports',
      label: 'Báo cáo',
      path: '/reports',
      icon: (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      permission: 'reports_reports_view'
    },
    {
      id: 'human-resources',
      label: 'Nhân sự',
      path: '/human-resources',
      icon: (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      permission: 'human_resources_users_view'
    },
    {
      id: 'account',
      label: 'Tài khoản',
      path: '/account',
      icon: (
        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      permission: null // Always visible
    }
  ];

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
        {/* Dashboard */}
        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.pathname === "/" ? activeClasses : defaultClasses
          }`}
        >
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15V9m4 6V9m4 6V9" />
          </svg>
          Dashboard
        </button>

        {/* Client */}
        <button
          onClick={() => navigate("/clients")}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.pathname.startsWith("/clients") ? activeClasses : defaultClasses
          }`}
        >
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Client
        </button>

        {/* Task */}
        <button
          onClick={() => navigate("/task")}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.pathname.startsWith("/task") ? activeClasses : defaultClasses
          }`}
        >
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Công việc
        </button>

        {/* Dự án Section */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('project')}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              openSubmenus.project || location.pathname.startsWith("/projects") || location.pathname.startsWith("/campaigns") || location.pathname.startsWith("/task-templates") 
                ? hoverClasses : defaultClasses
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Dự án
            </div>
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${openSubmenus.project ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {openSubmenus.project && (
            <div className="ml-8 space-y-1 border-l-2 border-blue-100 pl-4">
              <button
                onClick={() => navigate("/projects")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/projects") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Danh sách dự án
              </button>
              <button
                onClick={() => navigate("/campaigns")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/campaigns") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Chiến dịch
              </button>
              <button
                onClick={() => navigate("/task-templates")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/task-templates") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Template dịch vụ
              </button>
            </div>
          )}
        </div>

        {/* Tài chính Section */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('finance')}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              openSubmenus.finance || location.pathname.startsWith("/invoices") || location.pathname.startsWith("/contracts") || location.pathname.startsWith("/expenses") || location.pathname.startsWith("/financial-reports")
                ? hoverClasses : defaultClasses
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tài chính
            </div>
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${openSubmenus.finance ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {openSubmenus.finance && (
            <div className="ml-8 space-y-1 border-l-2 border-blue-100 pl-4">
              <button
                onClick={() => navigate("/invoices")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/invoices") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Hóa đơn
              </button>
              <button
                onClick={() => navigate("/contracts")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/contracts") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Hợp đồng
              </button>
              <button
                onClick={() => navigate("/expenses")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/expenses") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Quản lý chi phí
              </button>
              <button
                onClick={() => navigate("/financial-reports")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/financial-reports") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Báo cáo tài chính
              </button>
            </div>
          )}
        </div>

        {/* Bán hàng Section */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('sales')}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              openSubmenus.sales || location.pathname.startsWith("/opportunities") || location.pathname.startsWith("/sales-reports")
                ? hoverClasses : defaultClasses
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Bán hàng
            </div>
            <svg className={`w-4 h-4 transform transition-transform duration-200 ${openSubmenus.sales ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {openSubmenus.sales && (
            <div className="ml-8 space-y-1 border-l-2 border-blue-100 pl-4">
              <button
                onClick={() => navigate("/leads")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/leads") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Lead
              </button>
              <button
                onClick={() => navigate("/opportunities")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/opportunities") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Cơ hội
              </button>
              <button
                onClick={() => navigate("/sales-reports")}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.pathname.startsWith("/sales-reports") ? subActiveClasses : subDefaultClasses
                }`}
              >
                <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Báo cáo
              </button>
            </div>
          )}
        </div>

        {/* Tài liệu */}
        <button
          onClick={() => navigate("/documents")}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.pathname.startsWith("/documents") ? activeClasses : defaultClasses
          }`}
        >
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2H8.5a2.5 2.5 0 01-2.5-2.5v-8.5z" />
          </svg>
          Tài liệu
        </button>

        {/* Báo cáo */}
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

        {/* Nhân sự */}
        <button
          onClick={() => navigate("/human-resources")}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.pathname.startsWith("/human-resources") ? activeClasses : defaultClasses
          }`}
        >
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          Nhân sự
        </button>

        {/* Tài khoản */}
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

        {/* Cài đặt - Only for Admin */}
        {user?.role === 'admin' && (
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
              Password: admin123
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

// Task Management Component - ADVANCED IMPLEMENTATION
const Task = () => {
  const { user, token } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    total_tasks: 0,
    not_started: 0,
    in_progress: 0,
    completed: 0,
    high_priority: 0,
    normal_priority: 0,
    low_priority: 0
  });
  
  // Filters and state
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [feedbackTask, setFeedbackTask] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackCounts, setFeedbackCounts] = useState({}); // Store feedback counts for each task
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTask, setReportTask] = useState(null);
  const [reportLink, setReportLink] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchStatistics();
  }, [statusFilter, priorityFilter, dateFilter, showCompleted]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (dateFilter !== 'all') params.append('date_filter', dateFilter);
      if (showCompleted) params.append('completed_only', 'true');

      const response = await axios.get(`${API}/api/internal-tasks/?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tasksData = response.data;
      setTasks(tasksData);
      
      // Fetch feedback counts for all tasks
      await fetchFeedbackCounts(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Lỗi khi tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/api/users/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('date_filter', dateFilter);
      
      const response = await axios.get(`${API}/api/internal-tasks/statistics?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Fallback to calculating from tasks array if API fails
      const stats = {
        total_tasks: tasks.length,
        not_started: tasks.filter(t => t.status === 'not_started').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        high_priority: tasks.filter(t => t.priority === 'urgent').length,
        normal_priority: tasks.filter(t => t.priority === 'normal').length,
        low_priority: tasks.filter(t => t.priority === 'low').length
      };
      setStatistics(stats);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      console.log('Creating task with data:', taskData);
      console.log('API URL:', `${API}/api/internal-tasks/`);
      
      const response = await axios.post(`${API}/api/internal-tasks/`, taskData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Task created successfully:', response.data);
      setShowCreateModal(false);
      toast.success('Tạo công việc thành công!');
      fetchTasks(); // Refresh task list
      fetchStatistics();
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Lỗi khi tạo công việc';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map(err => err.msg || err).join(', ');
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      await axios.put(`${API}/api/internal-tasks/${editingTask.id}`, taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEditingTask(null);
      toast.success('Cập nhật công việc thành công!');
      fetchTasks(); // Refresh task list
      fetchStatistics();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Lỗi khi cập nhật công việc');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      try {
        await axios.delete(`${API}/api/internal-tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Xóa công việc thành công!');
        fetchTasks(); // Refresh task list
        fetchStatistics();
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Lỗi khi xóa công việc');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một công việc để xóa');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTasks.length} công việc đã chọn?`)) {
      try {
        console.log('Bulk deleting tasks:', selectedTasks);
        console.log('API URL:', `${API}/api/internal-tasks/bulk-delete`);
        
        // Backend expects a list of task_ids directly, not wrapped in an object
        const response = await axios.post(`${API}/api/internal-tasks/bulk-delete`, selectedTasks, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Bulk delete response:', response.data);
        
        setSelectedTasks([]);
        toast.success(`Xóa ${selectedTasks.length} công việc thành công!`);
        fetchTasks(); // Refresh task list
        fetchStatistics();
      } catch (error) {
        console.error('Error bulk deleting tasks:', error);
        console.error('Error response:', error.response?.data);
        toast.error(error.response?.data?.detail || 'Lỗi khi xóa công việc');
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus, reportLink = null) => {
    try {
      const updateData = { status: newStatus };
      if (reportLink) {
        updateData.report_link = reportLink;
      }
      
      await axios.patch(`${API}/api/internal-tasks/${taskId}/status`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Cập nhật trạng thái thành công!');
      
      // Use setTimeout to prevent rapid re-renders
      setTimeout(() => {
        fetchTasks();
        fetchStatistics();
      }, 100);
    } catch (error) {
      console.error('Error updating task status:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Lỗi khi cập nhật trạng thái';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      }
      
      toast.error(errorMessage);
      throw error; // Re-throw to handle in modal
    }
  };

  const handleAddFeedback = async () => {
    try {
      if (!newFeedback.trim()) {
        toast.error('Vui lòng nhập nội dung feedback');
        return;
      }

      const response = await axios.post(`${API}/api/internal-tasks/${feedbackTask.id}/feedback/`, {
        message: newFeedback.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Add new feedback to the list with user info
      const newFeedbackItem = {
        id: response.data.id || Date.now().toString(),
        task_id: feedbackTask.id,
        user_id: user.id,
        user_name: user.full_name,
        message: newFeedback.trim(),
        created_at: new Date().toISOString()
      };
      
      setFeedbacks(prev => [...prev, newFeedbackItem]);
      setNewFeedback('');
      
      // Update feedback count for this task
      setFeedbackCounts(prev => ({
        ...prev,
        [feedbackTask.id]: (prev[feedbackTask.id] || 0) + 1
      }));
      
      toast.success('Thêm feedback thành công!');
    } catch (error) {
      console.error('Error adding feedback:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Lỗi khi thêm feedback';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const fetchFeedbacks = async (taskId) => {
    try {
      const response = await axios.get(`${API}/api/internal-tasks/${taskId}/feedback/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const feedbackData = response.data || [];
      setFeedbacks(feedbackData);
      
      // Update feedback count for this task
      setFeedbackCounts(prev => ({
        ...prev,
        [taskId]: feedbackData.length
      }));
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      // Fallback to empty array if API not implemented yet
      setFeedbacks([]);
      setFeedbackCounts(prev => ({
        ...prev,
        [taskId]: 0
      }));
    }
  };

  const fetchFeedbackCounts = async (tasks) => {
    try {
      const counts = {};
      await Promise.all(tasks.map(async (task) => {
        try {
          const response = await axios.get(`${API}/api/internal-tasks/${task.id}/feedback/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          counts[task.id] = response.data?.length || 0;
        } catch (error) {
          counts[task.id] = 0;
        }
      }));
      setFeedbackCounts(counts);
    } catch (error) {
      console.error('Error fetching feedback counts:', error);
    }
  };

  // Report modal functions
  const handleOpenReportModal = (task) => {
    setReportTask(task);
    setReportLink('');
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    if (!isSubmittingReport) {
      setShowReportModal(false);
      setReportTask(null);
      setReportLink('');
    }
  };

  const submitCompletion = async () => {
    if (!reportLink.trim()) {
      toast.error('Vui lòng nhập link báo cáo');
      return;
    }

    setIsSubmittingReport(true);

    try {
      await handleStatusChange(reportTask.id, 'completed', reportLink);
      setShowReportModal(false);
      setReportTask(null);
      setReportLink('');
      toast.success('Hoàn thành công việc thành công!');
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Có lỗi xảy ra khi hoàn thành công việc');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    if (searchTerm && !task.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    if (showCompleted && task.status !== 'completed') {
      return false;
    }
    if (!showCompleted && task.status === 'completed') {
      return false;
    }
    return true;
  });

  // Utility functions
  const getStatusIcon = (status) => {
    switch (status) {
      case 'not_started':
        return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
      case 'in_progress':
        return <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>;
      case 'completed':
        return <div className="w-3 h-3 bg-green-400 rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'not_started': return 'Chưa làm';
      case 'in_progress': return 'Đang làm';
      case 'completed': return 'Hoàn thành';
      default: return 'Không xác định';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'normal': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Không xác định';
    }
  };

  const StatCard = ({ title, count, color, onClick, isActive }) => (
    <div 
      className={`modern-card p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isActive ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{count}</p>
        </div>
        <div className={`w-12 h-12 rounded-full ${color.replace('text', 'bg').replace('-600', '-100')} flex items-center justify-center`}>
          <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý công việc</h1>
          <p className="text-gray-600 mt-1">Quản lý và theo dõi công việc nội bộ agency</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="modern-input"
          >
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Tổng Task"
          count={statistics.total_tasks || 0}
          color="text-blue-600"
          onClick={() => {
            setStatusFilter('all');
            setPriorityFilter('all');
          }}
          isActive={statusFilter === 'all' && priorityFilter === 'all'}
        />
        <StatCard
          title="Chưa làm"
          count={statistics.not_started || 0}
          color="text-gray-600"
          onClick={() => {
            setStatusFilter('not_started');
            setPriorityFilter('all');
          }}
          isActive={statusFilter === 'not_started'}
        />
        <StatCard
          title="Hoàn thành"
          count={statistics.completed || 0}
          color="text-green-600"
          onClick={() => {
            setStatusFilter('completed');
            setPriorityFilter('all');
          }}
          isActive={statusFilter === 'completed'}
        />
        <StatCard
          title="Cao"
          count={statistics.high_priority || 0}
          color="text-red-600"
          onClick={() => {
            setPriorityFilter('urgent');
            setStatusFilter('all');
          }}
          isActive={priorityFilter === 'urgent'}
        />
        <StatCard
          title="Trung bình"
          count={statistics.normal_priority || 0}
          color="text-blue-600"
          onClick={() => {
            setPriorityFilter('normal');
            setStatusFilter('all');
          }}
          isActive={priorityFilter === 'normal'}
        />
        <StatCard
          title="Thấp"
          count={statistics.low_priority || 0}
          color="text-gray-600"
          onClick={() => {
            setPriorityFilter('low');
            setStatusFilter('all');
          }}
          isActive={priorityFilter === 'low'}
        />
      </div>

      {/* Toolbar */}
      <div className="modern-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm công việc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="modern-input pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="modern-input"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="not_started">Chưa làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="completed">Hoàn thành</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="modern-input"
            >
              <option value="all">Tất cả ưu tiên</option>
              <option value="urgent">Cao</option>
              <option value="normal">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {selectedTasks.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Xóa ({selectedTasks.length})
              </button>
            )}
            
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                showCompleted 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {showCompleted ? 'Trở về' : 'Hoàn thành'}
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
              title="Thêm công việc mới"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm công việc
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="modern-card">
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTasks(filteredTasks.map(t => t.id));
                      } else {
                        setSelectedTasks([]);
                      }
                    }}
                    checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Công việc
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhân sự
                </th>
                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ưu tiên
                </th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-6 py-4 text-center">
                    <div className="spinner mx-auto"></div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-4 text-center text-gray-500">
                    Không có công việc nào
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selectedTasks={selectedTasks}
                    setSelectedTasks={setSelectedTasks}
                    onStatusChange={handleStatusChange}
                    onEdit={setEditingTask}
                    onDelete={handleDeleteTask}
                    onView={setViewingTask}
                    onOpenReportModal={handleOpenReportModal}
                    onFeedback={(task) => {
                      setFeedbackTask(task);
                      fetchFeedbacks(task.id);
                    }}
                    feedbackCounts={feedbackCounts}
                    getStatusIcon={getStatusIcon}
                    getPriorityColor={getPriorityColor}
                    getPriorityLabel={getPriorityLabel}
                    getStatusLabel={getStatusLabel}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredTasks.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có công việc</h3>
            <p className="text-gray-600">Bắt đầu bằng cách tạo công việc đầu tiên</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TaskModal
          users={users}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {editingTask && (
        <TaskModal
          task={editingTask}
          users={users}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
        />
      )}

      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
        />
      )}

      {feedbackTask && (
        <FeedbackModal
          task={feedbackTask}
          feedbacks={feedbacks}
          newFeedback={newFeedback}
          setNewFeedback={setNewFeedback}
          onClose={() => setFeedbackTask(null)}
          onAddFeedback={handleAddFeedback}
          user={user}
        />
      )}

      {/* Report Link Modal */}
      {showReportModal && reportTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Hoàn thành công việc</h3>
              <button
                onClick={handleCloseReportModal}
                disabled={isSubmittingReport}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Vui lòng cung cấp link báo cáo để hoàn thành công việc: <strong>{reportTask.name}</strong>
            </p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!isSubmittingReport && reportLink.trim()) {
                submitCompletion();
              }
            }}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link báo cáo *
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/report"
                  value={reportLink}
                  onChange={(e) => setReportLink(e.target.value)}
                  disabled={isSubmittingReport}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  autoFocus
                  required
                />
                {reportLink && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Link đã nhập
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  disabled={isSubmittingReport}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!reportLink.trim() || isSubmittingReport}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center font-medium"
                >
                  {isSubmittingReport ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Hoàn thành
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// TaskRow Component with memo to prevent unnecessary re-renders
const TaskRow = React.memo(({ 
  task, 
  selectedTasks, 
  setSelectedTasks, 
  onStatusChange, 
  onEdit, 
  onDelete, 
  onView, 
  onFeedback,
  onOpenReportModal, // Add new prop
  feedbackCounts = {}, // Add feedbackCounts prop
  getStatusIcon,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel
}) => {

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === 'completed') {
      // Open report modal instead of inline logic
      onOpenReportModal(task);
    } else {
      onStatusChange(task.id, newStatus);
    }
  };

  const getActionButton = () => {
    if (task.status === 'not_started') {
      return (
        <button
          onClick={() => handleStatusUpdate('in_progress')}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
        >
          Bắt đầu
        </button>
      );
    } else if (task.status === 'in_progress') {
      return (
        <button
          onClick={() => handleStatusUpdate('completed')}
          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
        >
          Hoàn thành
        </button>
      );
    }
    return null;
  };

  return (
    <>
      <tr key={task.id} className="hover:bg-gray-50">
        <td className="w-12 px-3 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedTasks.includes(task.id)}
            onChange={() => {
              if (selectedTasks.includes(task.id)) {
                setSelectedTasks(selectedTasks.filter(id => id !== task.id));
              } else {
                setSelectedTasks([...selectedTasks, task.id]);
              }
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
        <td className="w-48 px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {getStatusIcon(task.status)}
            <span className="ml-2 text-sm font-medium text-gray-900 truncate max-w-xs">
              {task.name}
            </span>
          </div>
        </td>
        <td className="w-32 px-4 py-4 whitespace-nowrap">
          <button
            onClick={() => onView(task)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Chi tiết
          </button>
        </td>
        <td className="w-28 px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {new Date(task.deadline).toLocaleString('vi-VN')}
        </td>
        <td className="w-24 px-4 py-4 whitespace-nowrap">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
        </td>
        <td className="w-20 px-4 py-4 whitespace-nowrap">
          <button
            onClick={() => onFeedback(task)}
            className={`text-sm px-3 py-1 rounded hover:bg-gray-200 transition-colors ${
              feedbackCounts[task.id] > 0 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Feedback ({feedbackCounts[task.id] || 0})
          </button>
        </td>
        <td className="w-24 px-4 py-4 whitespace-nowrap text-sm text-gray-900">
          {getStatusLabel(task.status)}
        </td>
        <td className="w-20 px-4 py-4 whitespace-nowrap">
          {task.report_link ? (
            <a
              href={task.report_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Xem báo cáo
            </a>
          ) : (
            <span className="text-sm text-gray-400">Chưa có</span>
          )}
        </td>
        <td className="w-20 px-4 py-4 whitespace-nowrap">
          {getActionButton()}
        </td>
        <td className="w-24 px-4 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(task)}
              className="text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={() => onEdit(task)}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    </>
  );
});

// TaskModal Component (Create/Edit)
const TaskModal = ({ task, users, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    deadline: task?.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
    priority: task?.priority || 'normal',
    document_links: task?.document_links || []
  });
  const [newLink, setNewLink] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên công việc');
      return;
    }
    if (!formData.assigned_to) {
      toast.error('Vui lòng chọn người nhận');
      return;
    }
    if (!formData.deadline) {
      toast.error('Vui lòng chọn deadline');
      return;
    }
    onSubmit(formData);
  };

  const addDocumentLink = () => {
    if (newLink.trim()) {
      setFormData(prev => ({
        ...prev,
        document_links: [...prev.document_links, newLink.trim()]
      }));
      setNewLink('');
    }
  };

  const removeDocumentLink = (index) => {
    setFormData(prev => ({
      ...prev,
      document_links: prev.document_links.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {task ? 'Sửa công việc' : 'Thêm công việc mới'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên công việc *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Nhập tên công việc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Mô tả chi tiết công việc..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link tài liệu
              </label>
              <div className="flex gap-3 mb-3">
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập link tài liệu..."
                />
                <button
                  type="button"
                  onClick={addDocumentLink}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap font-medium"
                >
                  Thêm
                </button>
              </div>
              {formData.document_links.length > 0 && (
                <div className="space-y-3 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {formData.document_links.map((link, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm truncate flex-1 mr-3"
                        title={link}
                      >
                        {link}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeDocumentLink(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Xóa link"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Người nhận *
              </label>
              <select
                required
                value={formData.assigned_to}
                onChange={(e) => setFormData(prev => ({...prev, assigned_to: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              >
                <option value="">Chọn người nhận</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ưu tiên
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              >
                <option value="low">Thấp</option>
                <option value="normal">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({...prev, deadline: e.target.value}))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>

            {/* Preview/Status Box */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">Thông tin tóm tắt</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tên:</span>
                  <span className="font-medium">{formData.name || 'Chưa nhập'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Người nhận:</span>
                  <span className="font-medium">
                    {formData.assigned_to ? 
                      users.find(u => u.id === formData.assigned_to)?.full_name || 'Unknown' : 
                      'Chưa chọn'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ưu tiên:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    formData.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    formData.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    formData.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.priority === 'urgent' ? 'Khẩn cấp' :
                     formData.priority === 'high' ? 'Cao' :
                     formData.priority === 'normal' ? 'Trung bình' : 'Thấp'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số link:</span>
                  <span className="font-medium">{formData.document_links.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Submit Buttons */}
          <div className="md:col-span-2 flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
            >
              {task ? 'Cập nhật' : 'Tạo công việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// TaskDetailModal Component
const TaskDetailModal = ({ task, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Chi tiết công việc</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên công việc</label>
            <p className="text-gray-900">{task.name}</p>
          </div>

          {task.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {task.document_links && task.document_links.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link tài liệu</label>
              <div className="space-y-1">
                {task.document_links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người giao</label>
            <p className="text-gray-900">{task.assigned_by_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận</label>
            <p className="text-gray-900">{task.assigned_to_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <p className="text-gray-900">{new Date(task.deadline).toLocaleString('vi-VN')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ưu tiên</label>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
              task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              task.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.priority === 'urgent' ? 'Khẩn cấp' : task.priority === 'high' ? 'Cao' : task.priority === 'normal' ? 'Trung bình' : 'Thấp'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              task.status === 'completed' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status === 'completed' ? 'Hoàn thành' :
               task.status === 'in_progress' ? 'Đang làm' : 'Chưa làm'}
            </span>
          </div>

          {task.report_link && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Báo cáo</label>
              <a
                href={task.report_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                {task.report_link}
              </a>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
            <p className="text-gray-900">{new Date(task.created_at).toLocaleString('vi-VN')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cập nhật lần cuối</label>
            <p className="text-gray-900">{new Date(task.updated_at).toLocaleString('vi-VN')}</p>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// FeedbackModal Component - Improved with persistent storage and better UI
const FeedbackModal = ({ task, feedbacks, newFeedback, setNewFeedback, onClose, onAddFeedback, user }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Feedback - {task.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Thảo luận và góp ý về công việc này
            </p>
            {feedbacks.length > 0 && (
              <span className="inline-flex items-center mt-2 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {feedbacks.length} bình luận
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(90vh-140px)]">
          {/* Feedback List */}
          <div className="flex-1 overflow-y-auto p-6">
            {feedbacks.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 text-lg">Chưa có feedback nào</p>
                <p className="text-gray-400 text-sm mt-1">Hãy là người đầu tiên góp ý về công việc này</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm font-semibold">
                            {feedback.user_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">
                            {feedback.user_name || 'Unknown User'}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(feedback.created_at).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed pl-11">{feedback.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Feedback Section */}
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-900">
                    {user?.full_name || 'Current User'}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    Đang viết feedback...
                  </span>
                </div>
                <textarea
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                  placeholder="Nhập feedback của bạn về công việc này..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                />
                <div className="flex justify-between items-center mt-4">
                  <div className="text-xs text-gray-500">
                    {newFeedback.length}/500 ký tự
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                      Đóng
                    </button>
                    <button
                      onClick={onAddFeedback}
                      disabled={!newFeedback.trim() || newFeedback.length > 500}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Gửi feedback
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component placeholders with proper Vietnamese interface

const Contracts = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý hợp đồng</h1>
        <p className="text-gray-600 mt-1">Theo dõi hợp đồng và thỏa thuận</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Tạo hợp đồng
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Danh sách hợp đồng</h2>
      <p className="text-gray-600">Quản lý lifecycle hợp đồng với khách hàng.</p>
    </div>
  </div>
);

const Invoices = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý hóa đơn</h1>
        <p className="text-gray-600 mt-1">Tạo và theo dõi hóa đơn thanh toán</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Tạo hóa đơn
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Danh sách hóa đơn</h2>
      <p className="text-gray-600">Auto-numbering system và tracking thanh toán.</p>
    </div>
  </div>
);

const FinancialReports = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Báo cáo tài chính</h1>
      <p className="text-gray-600 mt-1">Thống kê và phân tích tài chính</p>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Dashboard tài chính</h2>
      <p className="text-gray-600">Biểu đồ doanh thu, chi phí và lợi nhuận.</p>
    </div>
  </div>
);

const Opportunities = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cơ hội bán hàng</h1>
        <p className="text-gray-600 mt-1">Theo dõi và quản lý cơ hội kinh doanh</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Thêm cơ hội
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Pipeline bán hàng</h2>
      <p className="text-gray-600">Theo dõi leads và conversion rates.</p>
    </div>
  </div>
);

const SalesReports = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Báo cáo bán hàng</h1>
      <p className="text-gray-600 mt-1">Phân tích hiệu suất bán hàng</p>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Thống kê bán hàng</h2>
      <p className="text-gray-600">Revenue, conversion rates và performance metrics.</p>
    </div>
  </div>
);

const Reports = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Báo cáo tổng hợp</h1>
      <p className="text-gray-600 mt-1">Dashboard và analytics tổng hợp</p>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Dashboard analytics</h2>
      <p className="text-gray-600">Real-time charts và KPI tracking.</p>
    </div>
  </div>
);

// ==================== MODULE-TAI-KHOAN START ====================
// Account Management Module - Simple & Reliable User Management
const Account = () => {
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    role: 'staff',
    password: ''
  });

  const roles = [
    { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
    { value: 'account', label: 'Account Manager', color: 'bg-blue-100 text-blue-800' },
    { value: 'manager', label: 'Project Manager', color: 'bg-green-100 text-green-800' },
    { value: 'content', label: 'Content Creator', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'design', label: 'Designer', color: 'bg-pink-100 text-pink-800' },
    { value: 'editor', label: 'Editor', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'sale', label: 'Sales', color: 'bg-orange-100 text-orange-800' },
    { value: 'creative', label: 'Creative', color: 'bg-purple-100 text-purple-800' },
    { value: 'staff', label: 'Staff', color: 'bg-gray-100 text-gray-800' }
  ];

  // Load users - SIMPLE FUNCTION
  const loadUsers = async () => {
    console.log('🔄 loadUsers called');
    console.log('User role:', user?.role);
    console.log('Token exists:', !!token);
    console.log('API URL:', API);

    if (!token || user?.role !== 'admin') {
      console.log('❌ Cannot load users - no admin access');
      return;
    }

    setLoading(true);
    try {
      console.log('📡 Making API call to get users...');
      
      const response = await axios.get(`${API}/api/users/`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Users API response:', response.data);
      console.log('Number of users:', response.data.length);
      
      setUsers(response.data);
      toast.success(`Tải thành công ${response.data.length} tài khoản!`);
      
    } catch (error) {
      console.error('❌ Error loading users:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      setUsers([]);
      toast.error(`Lỗi tải danh sách: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create user
  const createUser = async (e) => {
    e.preventDefault();
    
    if (!userForm.email || !userForm.full_name || !userForm.password) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      console.log('Creating user:', userForm);
      
      const response = await axios.post(`${API}/api/users/`, userForm, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ User created:', response.data);
      
      setShowCreateModal(false);
      setUserForm({ email: '', full_name: '', role: 'staff', password: '' });
      toast.success('Tạo tài khoản thành công!');
      loadUsers(); // Reload
    } catch (error) {
      console.error('❌ Error creating user:', error);
      toast.error(error.response?.data?.detail || 'Lỗi tạo tài khoản');
    }
  };

  // Delete user
  const deleteUser = async (userId, userName) => {
    if (userId === user.id) {
      toast.error('Không thể xóa tài khoản của chính mình');
      return;
    }

    if (!window.confirm(`Xóa tài khoản "${userName}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API}/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success('Xóa tài khoản thành công!');
      loadUsers(); // Reload
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      toast.error('Lỗi xóa tài khoản');
    }
  };

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || { value: role, label: role, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tài khoản</h1>
        <p className="text-gray-600 mt-1">Quản lý thông tin cá nhân và tài khoản người dùng</p>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h3 className="font-semibold text-blue-800 mb-2">🔍 Debug Info:</h3>
        <ul className="text-blue-700 space-y-1">
          <li>👤 User: {user?.full_name} ({user?.role})</li>
          <li>🔑 Token: {token ? 'Available' : 'Missing'}</li>
          <li>📡 API: {API}</li>
          <li>👥 Users loaded: {users.length}</li>
          <li>🎯 Is Admin: {user?.role === 'admin' ? 'Yes' : 'No'}</li>
        </ul>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Thông tin cá nhân
          </button>
          
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                setActiveTab('users');
                loadUsers(); // Load users when tab is clicked
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Quản lý tài khoản ({users.length})
            </button>
          )}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="modern-card p-6">
          <h2 className="text-lg font-semibold mb-4">Thông tin cá nhân</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <div className="text-gray-900">{user?.full_name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="text-gray-900">{user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleInfo(user?.role).color}`}>
                {getRoleInfo(user?.role).label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Tab */}
      {activeTab === 'users' && user?.role === 'admin' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Quản lý tài khoản</h2>
              <p className="text-gray-600">Tạo và quản lý tài khoản người dùng</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                disabled={loading}
              >
                {loading ? '⏳ Đang tải...' : '🔄 Tải lại'}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                ➕ Tạo tài khoản mới
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="modern-card">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center">
                  <div className="spinner mr-2"></div>
                  Đang tải danh sách tài khoản...
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-4">Chưa có tài khoản nào</p>
                <button 
                  onClick={loadUsers}
                  className="btn-primary"
                >
                  🔄 Thử tải lại
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Người dùng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vai trò
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày tạo
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-semibold text-blue-800">
                                {userItem.full_name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {userItem.full_name}
                              </div>
                              {userItem.id === user.id && (
                                <div className="text-xs text-blue-600">(Bạn)</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {userItem.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleInfo(userItem.role).color}`}>
                            {getRoleInfo(userItem.role).label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(userItem.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {userItem.id !== user.id && (
                            <button
                              onClick={() => deleteUser(userItem.id, userItem.full_name)}
                              className="text-red-600 hover:text-red-900"
                              title="Xóa tài khoản"
                            >
                              🗑️ Xóa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Tạo tài khoản mới</h3>
            
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="modern-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="modern-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="modern-input"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu *
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="modern-input"
                  required
                  minLength="6"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setUserForm({ email: '', full_name: '', role: 'staff', password: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
// ==================== MODULE-TAI-KHOAN END ====================

const Settings = () => {
  const { user, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('task-cost');
  const [taskCostSubTab, setTaskCostSubTab] = useState('list');
  const [loading, setLoading] = useState(false);

  // Task Cost States
  const [taskCostRates, setTaskCostRates] = useState([]);
  const [taskCostTypes, setTaskCostTypes] = useState([]);
  const [taskCostSettings, setTaskCostSettings] = useState(null);
  
  // Search states
  const [rateSearchTerm, setRateSearchTerm] = useState('');
  const [typeSearchTerm, setTypeSearchTerm] = useState('');
  
  // Modal states
  const [showRateModal, setShowRateModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [editingType, setEditingType] = useState(null);

  const tabs = [
    { id: 'task-cost', name: 'Chi phí Task', icon: '💰' },
    { id: 'other', name: 'Khác', icon: '⚙️' }
  ];

  const taskCostSubTabs = [
    { id: 'list', name: 'Danh sách', icon: '📋' },
    { id: 'config', name: 'Cấu hình', icon: '⚙️' }
  ];

  // Load data when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'task-cost') {
      loadTaskCostData();
    }
  }, [activeTab, taskCostSubTab]);

  const loadTaskCostData = async () => {
    try {
      setLoading(true);
      console.log('Loading task cost data...');
      
      // Add cache busting parameter
      const timestamp = Date.now();
      
      // Load task cost rates - only active ones
      const ratesUrl = `${API}/api/task-cost-rates/?is_active=true&_t=${timestamp}`;
      console.log('Fetching task cost rates with URL:', ratesUrl);
      const ratesResponse = await axios.get(ratesUrl);
      console.log('Task cost rates response:', ratesResponse.data);
      setTaskCostRates(ratesResponse.data);
      
      // Load task cost types - only active ones  
      const typesUrl = `${API}/api/task-cost-types/?is_active=true&_t=${timestamp}`;
      console.log('Fetching task cost types with URL:', typesUrl);
      const typesResponse = await axios.get(typesUrl);
      console.log('Task cost types response:', typesResponse.data);
      setTaskCostTypes(typesResponse.data);
      
      // Load task cost settings
      const settingsResponse = await axios.get(`${API}/api/task-cost-settings/`);
      setTaskCostSettings(settingsResponse.data);
      
      console.log('Task cost data loaded successfully');
    } catch (error) {
      console.error('Error loading task cost data:', error);
      toast.error('Lỗi khi tải dữ liệu chi phí task');
    } finally {
      setLoading(false);
    }
  };

  // Task Cost Rate functions
  const handleCreateRate = async (rateData) => {
    try {
      const response = await axios.post(`${API}/api/task-cost-rates/`, rateData);
      setTaskCostRates([response.data, ...taskCostRates]);
      setShowRateModal(false);
      toast.success('Tạo chi phí task thành công!');
    } catch (error) {
      console.error('Error creating rate:', error);
      toast.error(error.response?.data?.detail || 'Lỗi khi tạo chi phí task');
    }
  };

  const handleUpdateRate = async (rateId, rateData) => {
    try {
      const response = await axios.put(`${API}/api/task-cost-rates/${rateId}`, rateData);
      setTaskCostRates(taskCostRates.map(rate => rate.id === rateId ? response.data : rate));
      setShowRateModal(false);
      setEditingRate(null);
      toast.success('Cập nhật chi phí task thành công!');
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error(error.response?.data?.detail || 'Lỗi khi cập nhật chi phí task');
    }
  };

  const handleDeleteRate = async (rateId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chi phí task này?')) return;
    
    try {
      console.log('Deleting rate with ID:', rateId);
      await axios.delete(`${API}/api/task-cost-rates/${rateId}`);
      console.log('Rate deleted successfully, reloading data...');
      
      // Reload data from server to ensure consistency
      await loadTaskCostData();
      toast.success('Xóa chi phí task thành công!');
    } catch (error) {
      console.error('Error deleting rate:', error);
      toast.error(error.response?.data?.detail || 'Lỗi khi xóa chi phí task');
    }
  };

  // Task Cost Type functions
  const handleCreateType = async (typeData) => {
    try {
      const response = await axios.post(`${API}/api/task-cost-types/`, typeData);
      setTaskCostTypes([response.data, ...taskCostTypes]);
      setShowTypeModal(false);
      toast.success('Tạo loại task thành công!');
    } catch (error) {
      console.error('Error creating type:', error);
      toast.error(error.response?.data?.detail || 'Lỗi khi tạo loại task');
    }
  };

  const handleUpdateType = async (typeId, typeData) => {
    try {
      const response = await axios.put(`${API}/api/task-cost-types/${typeId}`, typeData);
      setTaskCostTypes(taskCostTypes.map(type => type.id === typeId ? response.data : type));
      setShowTypeModal(false);
      setEditingType(null);
      toast.success('Cập nhật loại task thành công!');
    } catch (error) {
      console.error('Error updating type:', error);
      toast.error(error.response?.data?.detail || 'Lỗi khi cập nhật loại task');
    }
  };

  const handleDeleteType = async (typeId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa loại task này?')) return;
    
    try {
      await axios.delete(`${API}/api/task-cost-types/${typeId}`);
      // Reload data from server to ensure consistency  
      await loadTaskCostData();
      toast.success('Xóa loại task thành công!');
    } catch (error) {
      console.error('Error deleting type:', error);
      toast.error(error.response?.data?.detail || 'Lỗi khi xóa loại task');
    }
  };

  // Filter functions
  const filteredRates = taskCostRates.filter(rate => 
    rate.task_type_name?.toLowerCase().includes(rateSearchTerm.toLowerCase()) ||
    rate.cost_per_hour?.toString().includes(rateSearchTerm)
  );

  const filteredTypes = taskCostTypes.filter(type => 
    type.name?.toLowerCase().includes(typeSearchTerm.toLowerCase()) ||
    type.description?.toLowerCase().includes(typeSearchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cài đặt hệ thống</h1>
        <p className="text-gray-600 mt-1">Cấu hình và quản lý hệ thống (Admin only)</p>
      </div>

      {/* Main Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="modern-card p-6">
        {activeTab === 'task-cost' && (
          <div className="space-y-6">
            {/* Sub Tab Navigation for Task Cost */}
            <div className="border-b border-gray-100">
              <nav className="-mb-px flex space-x-6">
                {taskCostSubTabs.map((subTab) => (
                  <button
                    key={subTab.id}
                    onClick={() => setTaskCostSubTab(subTab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      taskCostSubTab === subTab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{subTab.icon}</span>
                    {subTab.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Sub Tab Content */}
            {taskCostSubTab === 'list' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Danh sách Chi phí Task</h2>
                  <button
                    onClick={() => {
                      setEditingRate(null);
                      setShowRateModal(true);
                    }}
                    disabled={user?.role !== 'admin'}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      user?.role !== 'admin'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } transition-colors`}
                  >
                    + Thêm chi phí Task
                  </button>
                </div>

                {/* Search */}
                <div className="max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={rateSearchTerm}
                      onChange={(e) => setRateSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tìm kiếm chi phí task..."
                    />
                  </div>
                </div>

                {/* Task Cost Rates Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loại Task
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Chi phí / Giờ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày tạo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                              Đang tải...
                            </div>
                          </td>
                        </tr>
                      ) : filteredRates.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                            {rateSearchTerm ? 'Không tìm thấy chi phí task nào' : 'Chưa có chi phí task nào'}
                          </td>
                        </tr>
                      ) : (
                        filteredRates.map((rate) => (
                          <tr key={rate.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {rate.task_type_name || 'Unknown'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatCurrency(rate.cost_per_hour)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                rate.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {rate.is_active ? 'Hoạt động' : 'Tạm dừng'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {rate.created_at ? format(new Date(rate.created_at), 'dd/MM/yyyy') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingRate(rate);
                                    setShowRateModal(true);
                                  }}
                                  disabled={user?.role !== 'admin'}
                                  className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteRate(rate.id)}
                                  disabled={user?.role !== 'admin'}
                                  className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {taskCostSubTab === 'config' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Cấu hình Loại Task</h2>
                  <button
                    onClick={() => {
                      setEditingType(null);
                      setShowTypeModal(true);
                    }}
                    disabled={user?.role !== 'admin'}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      user?.role !== 'admin'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    } transition-colors`}
                  >
                    + Thêm loại Task
                  </button>
                </div>

                {/* Search */}
                <div className="max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={typeSearchTerm}
                      onChange={(e) => setTypeSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tìm kiếm loại task..."
                    />
                  </div>
                </div>

                {/* Task Cost Types Grid */}
                {loading ? (
                  <div className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
                      Đang tải...
                    </div>
                  </div>
                ) : filteredTypes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {typeSearchTerm ? 'Không tìm thấy loại task nào' : 'Chưa có loại task nào'}
                    </h3>
                    <p className="text-gray-500">
                      {typeSearchTerm ? 'Thử thay đổi từ khóa tìm kiếm' : 'Tạo loại task đầu tiên để bắt đầu'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTypes.map((type) => (
                      <div key={type.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h3 className="text-lg font-medium text-gray-900">{type.name}</h3>
                              <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                type.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {type.is_active ? 'Hoạt động' : 'Tạm dừng'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {type.description || 'Không có mô tả'}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              Tạo bởi: {type.created_by_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {type.created_at ? format(new Date(type.created_at), 'dd/MM/yyyy') : 'N/A'}
                            </p>
                          </div>
                          <div className="flex flex-col space-y-1 ml-2">
                            <button
                              onClick={() => {
                                setEditingType(type);
                                setShowTypeModal(true);
                              }}
                              disabled={user?.role !== 'admin'}
                              className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 text-sm"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteType(type.id)}
                              disabled={user?.role !== 'admin'}
                              className="text-red-600 hover:text-red-900 disabled:text-gray-400 text-sm"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'other' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">⚙️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Các cài đặt khác</h3>
            <p className="text-gray-500">Chức năng này sẽ được phát triển trong tương lai</p>
          </div>
        )}
      </div>

      {/* Task Cost Rate Modal */}
      {showRateModal && (
        <TaskCostRateModal
          isOpen={showRateModal}
          onClose={() => {
            setShowRateModal(false);
            setEditingRate(null);
          }}
          onSubmit={editingRate ? 
            (data) => handleUpdateRate(editingRate.id, data) : 
            handleCreateRate
          }
          editingData={editingRate}
          taskTypes={taskCostTypes}
        />
      )}

      {/* Task Cost Type Modal */}
      {showTypeModal && (
        <TaskCostTypeModal
          isOpen={showTypeModal}
          onClose={() => {
            setShowTypeModal(false);
            setEditingType(null);
          }}
          onSubmit={editingType ? 
            (data) => handleUpdateType(editingType.id, data) : 
            handleCreateType
          }
          editingData={editingType}
        />
      )}
    </div>
  );
};

// Task Cost Rate Modal Component
const TaskCostRateModal = ({ isOpen, onClose, onSubmit, editingData, taskTypes }) => {
  const [formData, setFormData] = useState({
    task_type_id: '',
    cost_per_hour: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingData) {
      setFormData({
        task_type_id: editingData.task_type_id || '',
        cost_per_hour: editingData.cost_per_hour || '',
        is_active: editingData.is_active ?? true
      });
    } else {
      setFormData({
        task_type_id: '',
        cost_per_hour: '',
        is_active: true
      });
    }
  }, [editingData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.task_type_id || !formData.cost_per_hour) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        cost_per_hour: parseFloat(formData.cost_per_hour)
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingData ? 'Sửa chi phí Task' : 'Thêm chi phí Task'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại Task *
              </label>
              <select
                value={formData.task_type_id}
                onChange={(e) => setFormData({ ...formData, task_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Chọn loại task</option>
                {taskTypes.filter(type => type.is_active).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chi phí / Giờ (VND) *
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.cost_per_hour}
                onChange={(e) => setFormData({ ...formData, cost_per_hour: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nhập chi phí theo giờ"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Kích hoạt
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : (editingData ? 'Cập nhật' : 'Tạo mới')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Task Cost Type Modal Component
const TaskCostTypeModal = ({ isOpen, onClose, onSubmit, editingData }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingData) {
      setFormData({
        name: editingData.name || '',
        description: editingData.description || '',
        is_active: editingData.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true
      });
    }
  }, [editingData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên loại task');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingData ? 'Sửa loại Task' : 'Thêm loại Task'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên loại Task *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="VD: Content Writing, Design, Development"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Mô tả chi tiết về loại task này"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="type_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="type_is_active" className="ml-2 block text-sm text-gray-900">
                Kích hoạt
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : (editingData ? 'Cập nhật' : 'Tạo mới')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// LeadsComponent - Simple placeholder for Lead management
const LeadsComponent = ({ user }) => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Lead</h1>
        <p className="text-gray-600 mt-1">Quản lý thông tin và theo dõi tiềm năng khách hàng</p>
      </div>
      <button
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
        title="Thêm lead mới"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Thêm Lead
      </button>
    </div>

    {/* Statistics */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Tổng Lead</dt>
              <dd className="text-lg font-semibold text-gray-900">0</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Lead Qualified</dt>
              <dd className="text-lg font-semibold text-gray-900">0</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Chờ Follow-up</dt>
              <dd className="text-lg font-semibold text-gray-900">0</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6h6v11H9V6z" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
              <dd className="text-lg font-semibold text-gray-900">0%</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>

    {/* Content Placeholder */}
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="text-center py-20">
        <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Lead Management</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Tính năng quản lý Lead đang được phát triển. Sẽ sớm được cập nhật với đầy đủ tính năng quản lý tiềm năng khách hàng.
        </p>
        <div className="mt-6">
          <div className="text-sm text-gray-500">
            Các tính năng sắp tới:
          </div>
          <ul className="mt-2 text-sm text-gray-600 space-y-1">
            <li>• Quản lý thông tin Lead</li>
            <li>• Theo dõi trạng thái Lead</li>
            <li>• Phân công Sales</li>
            <li>• Báo cáo conversion</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

export default App;