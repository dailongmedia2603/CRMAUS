import React, { useState, useEffect, createContext } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import "./App.css";

// Auth context
const AuthContext = createContext();
export { AuthContext };

// Environment variables - Use relative path for API calls (will be proxied)
const API = '';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get(`${API}/api/users/me/`);
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setUser(null);
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
    <AuthContext.Provider value={{ user, logout }}>
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
                   window.location.pathname === "/clients" ? "Khách hàng" :
                   window.location.pathname === "/task" ? "Nhiệm vụ" :
                   window.location.pathname === "/projects" ? "Dự án" :
                   window.location.pathname === "/contracts" ? "Hợp đồng" :
                   window.location.pathname === "/invoices" ? "Hóa đơn" :
                   window.location.pathname === "/campaigns" ? "Chiến dịch" :
                   window.location.pathname === "/documents" ? "Tài liệu" :
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
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/task" element={<Task />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/task-templates" element={<TaskTemplates />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/expenses" element={<ExpenseManagement />} />
              <Route path="/financial-reports" element={<FinancialReports />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/sales-reports" element={<SalesReports />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/account" element={<Account />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
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

// SidebarContent Component  
const SidebarContent = ({ user, logout }) => {
  const navigate = useNavigate();
  const location = useLocation().pathname;
  const [openSubmenus, setOpenSubmenus] = useState({
    project: false,
    finance: false,
    sales: false
  });

  const toggleSubmenu = (menu) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  return (
    <div className="h-screen w-64 bg-white shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">CRM AUS</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <button
          onClick={() => navigate("/")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location === "/"
              ? "active text-white bg-blue-600"
              : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          Dashboard
        </button>

        {/* Client */}
        <button
          onClick={() => navigate("/clients")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/clients")
              ? "active text-white bg-purple-600"
              : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Client
        </button>

        {/* Task */}
        <button
          onClick={() => navigate("/task")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/task")
              ? "active text-white bg-green-600"
              : "text-gray-700 hover:bg-green-50 hover:text-green-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Task
        </button>

        {/* Dự án Section */}
        <div className="pt-2">
          <button
            onClick={() => toggleSubmenu('project')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Dự án
            </div>
            <svg className={`w-4 h-4 transform transition-transform ${openSubmenus.project ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {openSubmenus.project && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => navigate("/projects")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/projects")
                    ? "text-white bg-indigo-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Danh sách dự án
              </button>
              <button
                onClick={() => navigate("/campaigns")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/campaigns")
                    ? "text-white bg-indigo-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-5 8l3-3m0 0l-3-3m3 3H8" />
                </svg>
                Chiến dịch
              </button>
              <button
                onClick={() => navigate("/task-templates")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/task-templates")
                    ? "text-white bg-indigo-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Template dịch vụ
              </button>
            </div>
          )}
        </div>

        {/* Tài chính Section */}
        <div className="pt-2">
          <button
            onClick={() => toggleSubmenu('finance')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tài chính
            </div>
            <svg className={`w-4 h-4 transform transition-transform ${openSubmenus.finance ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {openSubmenus.finance && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => navigate("/invoices")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/invoices")
                    ? "text-white bg-yellow-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Hóa đơn
              </button>
              <button
                onClick={() => navigate("/contracts")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/contracts")
                    ? "text-white bg-yellow-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Hợp đồng
              </button>
              <button
                onClick={() => navigate("/expenses")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/expenses")
                    ? "text-white bg-yellow-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Quản lý chi phí
              </button>
              <button
                onClick={() => navigate("/financial-reports")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/financial-reports")
                    ? "text-white bg-yellow-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Báo cáo tài chính
              </button>
            </div>
          )}
        </div>

        {/* Bán hàng Section */}
        <div className="pt-2">
          <button
            onClick={() => toggleSubmenu('sales')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Bán hàng
            </div>
            <svg className={`w-4 h-4 transform transition-transform ${openSubmenus.sales ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {openSubmenus.sales && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => navigate("/clients")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/clients")
                    ? "text-white bg-green-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Khách hàng
              </button>
              <button
                onClick={() => navigate("/opportunities")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/opportunities")
                    ? "text-white bg-green-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Cơ hội
              </button>
              <button
                onClick={() => navigate("/sales-reports")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/sales-reports")
                    ? "text-white bg-green-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/documents")
              ? "active text-white bg-orange-600"
              : "text-gray-700 hover:bg-orange-50 hover:text-orange-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2H8.5a2.5 2.5 0 01-2.5-2.5v-8.5z" />
          </svg>
          Tài liệu
        </button>

        {/* Báo cáo */}
        <button
          onClick={() => navigate("/reports")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/reports")
              ? "active text-white bg-pink-600"
              : "text-gray-700 hover:bg-pink-50 hover:text-pink-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Báo cáo
        </button>

        {/* Tài khoản */}
        <button
          onClick={() => navigate("/account")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/account")
              ? "active text-white bg-teal-600"
              : "text-gray-700 hover:bg-teal-50 hover:text-teal-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Tài khoản
        </button>

        {/* Cài đặt - Only for Admin */}
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate("/settings")}
            className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.startsWith("/settings")
                ? "active text-white bg-gray-600"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cài đặt
          </button>
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-semibold text-gray-700">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      const response = await axios.get(`${API}/api/work-items/?${params}`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Lỗi khi tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/api/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('date_filter', dateFilter);
      
      // For now, we'll calculate statistics from the tasks array
      // In a real implementation, this would be a separate API endpoint
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
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      // For demo purposes, we'll create a mock task
      const newTask = {
        id: Date.now().toString(),
        name: taskData.name,
        description: taskData.description,
        assigned_to: taskData.assigned_to,
        assigned_by: 'current-user-id',
        deadline: taskData.deadline,
        priority: taskData.priority,
        status: 'not_started',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_links: taskData.document_links || [],
        assigned_to_name: users.find(u => u.id === taskData.assigned_to)?.full_name || 'Unknown',
        assigned_by_name: 'Current User'
      };
      
      setTasks(prev => [newTask, ...prev]);
      setShowCreateModal(false);
      toast.success('Tạo công việc thành công!');
      fetchStatistics();
    } catch (error) {
      toast.error('Lỗi khi tạo công việc');
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      const updatedTask = {
        ...editingTask,
        ...taskData,
        updated_at: new Date().toISOString(),
        assigned_to_name: users.find(u => u.id === taskData.assigned_to)?.full_name || 'Unknown'
      };
      
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updatedTask : t));
      setEditingTask(null);
      toast.success('Cập nhật công việc thành công!');
      fetchStatistics();
    } catch (error) {
      toast.error('Lỗi khi cập nhật công việc');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      try {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        toast.success('Xóa công việc thành công!');
        fetchStatistics();
      } catch (error) {
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
        setTasks(prev => prev.filter(t => !selectedTasks.includes(t.id)));
        setSelectedTasks([]);
        toast.success(`Xóa ${selectedTasks.length} công việc thành công!`);
        fetchStatistics();
      } catch (error) {
        toast.error('Lỗi khi xóa công việc');
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus, reportLink = null) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const updatedTask = {
        ...task,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (reportLink) {
        updatedTask.report_link = reportLink;
      }
      
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      toast.success('Cập nhật trạng thái thành công!');
      fetchStatistics();
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleAddFeedback = async () => {
    try {
      const newFeedbackItem = {
        id: Date.now().toString(),
        work_item_id: feedbackTask.id,
        user_id: 'current-user-id',
        user_name: 'Current User',
        message: newFeedback,
        created_at: new Date().toISOString()
      };
      
      setFeedbacks(prev => [...prev, newFeedbackItem]);
      setNewFeedback('');
      toast.success('Thêm feedback thành công!');
    } catch (error) {
      toast.error('Lỗi khi thêm feedback');
    }
  };

  const fetchFeedbacks = async (taskId) => {
    try {
      // For demo purposes, return empty array
      // In real implementation: const response = await axios.get(`${API}/api/work-items/${taskId}/feedback/`);
      setFeedbacks([]);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
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
              className="btn-primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm công việc
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="modern-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Công việc
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ưu tiên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-4 text-center">
                    <div className="spinner mx-auto"></div>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
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
                    onFeedback={(task) => {
                      setFeedbackTask(task);
                      fetchFeedbacks(task.id);
                    }}
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
        />
      )}
    </div>
  );
};

// TaskRow Component
const TaskRow = ({ 
  task, 
  selectedTasks, 
  setSelectedTasks, 
  onStatusChange, 
  onEdit, 
  onDelete, 
  onView, 
  onFeedback,
  getStatusIcon,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLink, setReportLink] = useState('');

  const toggleTaskSelection = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const handleStatusUpdate = (newStatus) => {
    if (newStatus === 'completed') {
      setShowReportModal(true);
    } else {
      onStatusChange(task.id, newStatus);
    }
  };

  const submitCompletion = () => {
    onStatusChange(task.id, 'completed', reportLink);
    setShowReportModal(false);
    setReportLink('');
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
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={selectedTasks.includes(task.id)}
            onChange={() => toggleTaskSelection(task.id)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {getStatusIcon(task.status)}
            <span className="ml-2 text-sm font-medium text-gray-900 truncate max-w-xs">
              {task.name}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <button
            onClick={() => onView(task)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Chi tiết
          </button>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {new Date(task.deadline).toLocaleString('vi-VN')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <button
            onClick={() => onFeedback(task)}
            className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
          >
            Feedback (0)
          </button>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {getStatusLabel(task.status)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
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
        <td className="px-6 py-4 whitespace-nowrap">
          {getActionButton()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

      {/* Report Link Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Hoàn thành công việc</h3>
            <p className="text-sm text-gray-600 mb-4">Vui lòng cung cấp link báo cáo để hoàn thành công việc:</p>
            <input
              type="url"
              placeholder="Nhập link báo cáo..."
              value={reportLink}
              onChange={(e) => setReportLink(e.target.value)}
              className="modern-input mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                onClick={submitCompletion}
                disabled={!reportLink.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {task ? 'Sửa công việc' : 'Thêm công việc mới'}
          </h2>
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
              Tên công việc *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
              className="modern-input"
              placeholder="Nhập tên công việc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              rows={4}
              className="modern-input"
              placeholder="Mô tả chi tiết công việc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link tài liệu
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                className="modern-input flex-1"
                placeholder="Nhập link tài liệu..."
              />
              <button
                type="button"
                onClick={addDocumentLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Thêm
              </button>
            </div>
            {formData.document_links.length > 0 && (
              <div className="space-y-2">
                {formData.document_links.map((link, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm truncate"
                    >
                      {link}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocumentLink(index)}
                      className="text-red-600 hover:text-red-800"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Người nhận *
            </label>
            <select
              required
              value={formData.assigned_to}
              onChange={(e) => setFormData(prev => ({...prev, assigned_to: e.target.value}))}
              className="modern-input"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ưu tiên
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
              className="modern-input"
            >
              <option value="low">Thấp</option>
              <option value="normal">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({...prev, deadline: e.target.value}))}
              className="modern-input"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

// FeedbackModal Component
const FeedbackModal = ({ task, feedbacks, newFeedback, setNewFeedback, onClose, onAddFeedback }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Feedback - {task.name}
            {feedbacks.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                {feedbacks.length}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feedback List */}
        <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
          {feedbacks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có feedback nào</p>
          ) : (
            feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm text-gray-900">
                    {feedback.user_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(feedback.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{feedback.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Feedback */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Thêm feedback</label>
          <textarea
            value={newFeedback}
            onChange={(e) => setNewFeedback(e.target.value)}
            placeholder="Nhập feedback..."
            rows={3}
            className="modern-input mb-3"
          />
          <div className="flex justify-between">
            <button
              onClick={onAddFeedback}
              disabled={!newFeedback.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Gửi feedback
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ExpenseManagement Component (placeholder for future implementation)
const ExpenseManagement = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chi phí</h1>
        <p className="text-gray-600 mt-1">Theo dõi và quản lý chi phí dự án</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Thêm chi phí
      </button>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="modern-card p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Tổng chi phí</dt>
              <dd className="text-lg font-semibold text-gray-900">0 VND</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="modern-card p-6">
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
              <dt className="text-sm font-medium text-gray-500 truncate">Chi phí tháng này</dt>
              <dd className="text-lg font-semibold text-gray-900">0 VND</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="modern-card p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Số giao dịch</dt>
              <dd className="text-lg font-semibold text-gray-900">0</dd>
            </dl>
          </div>
        </div>
      </div>
      
      <div className="modern-card p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Danh mục</dt>
              <dd className="text-lg font-semibold text-gray-900">0</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
    
    <div className="modern-card p-6">
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Module Expense Management</h3>
        <p className="text-gray-600 mb-4">Backend đã hoàn thiện, frontend đang được phát triển</p>
        <div className="text-sm text-gray-500">
          <p>✅ Expense Categories API</p>
          <p>✅ Expense Folders API</p>
          <p>✅ Expenses CRUD API</p>
          <p>🔄 Frontend Interface (Coming Soon)</p>
        </div>
      </div>
    </div>
  </div>
);

// Component placeholders with proper Vietnamese interface
const Clients = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý khách hàng</h1>
        <p className="text-gray-600 mt-1">Quản lý thông tin và quan hệ khách hàng</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Thêm khách hàng
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Danh sách khách hàng</h2>
      <p className="text-gray-600">Module khách hàng sẽ được triển khai từ codebase hiện có.</p>
    </div>
  </div>
);

const Projects = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý dự án</h1>
        <p className="text-gray-600 mt-1">Theo dõi tiến độ và quản lý dự án khách hàng</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Tạo dự án mới
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Danh sách dự án</h2>
      <p className="text-gray-600">Module quản lý dự án với tính năng advanced filtering.</p>
    </div>
  </div>
);

const Campaigns = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý chiến dịch</h1>
        <p className="text-gray-600 mt-1">Tạo và quản lý chiến dịch marketing</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Tạo chiến dịch
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Chiến dịch hiện tại</h2>
      <p className="text-gray-600">Hierarchy: Campaign → Service → Task</p>
    </div>
  </div>
);

const TaskTemplates = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Template dịch vụ</h1>
        <p className="text-gray-600 mt-1">Tạo và quản lý template cho các dịch vụ</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Tạo template
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Template Designer</h2>
      <p className="text-gray-600">Drag-drop template designer với các component types.</p>
    </div>
  </div>
);

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

const Documents = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý tài liệu</h1>
        <p className="text-gray-600 mt-1">Lưu trữ và quản lý tài liệu dự án</p>
      </div>
      <button className="btn-primary">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Thêm tài liệu
      </button>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Thư mục tài liệu</h2>
      <p className="text-gray-600">Folder structure với permission-based access.</p>
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

const Account = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Tài khoản của tôi</h1>
      <p className="text-gray-600 mt-1">Quản lý thông tin cá nhân và cài đặt</p>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">Thông tin cá nhân</h2>
      <p className="text-gray-600">Profile management và password changes.</p>
    </div>
  </div>
);

const Settings = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Cài đặt hệ thống</h1>
      <p className="text-gray-600 mt-1">Cấu hình và quản lý hệ thống (Admin only)</p>
    </div>
    <div className="modern-card p-6">
      <h2 className="text-lg font-medium mb-4">User Management</h2>
      <p className="text-gray-600">Quản lý người dùng và phân quyền.</p>
    </div>
  </div>
);

export default App;