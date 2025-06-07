import React, { useState, useEffect, createContext } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import "./App.css";
import DocumentsComponent from "./components/Documents";
import ProjectsComponent from "./components/Projects";
import CampaignsComponent from "./components/Campaigns";
import CampaignDetailComponent from "./components/CampaignDetail";
import TemplatesComponent from "./components/Templates";
import { ExpenseOverview, ExpenseList, ExpenseConfig } from "./components/ExpenseComponents";

// Environment variables
const API = process.env.REACT_APP_BACKEND_URL;

// Auth context
const AuthContext = createContext();

// Export AuthContext for use in other components
export { AuthContext };

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
          const response = await axios.get(`${API}/users/me/`);
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
      <div className="flex h-screen bg-gray-50">
        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col h-0 flex-1">
              <SidebarContent user={user} logout={logout} />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden bg-gray-50">
          {/* Modern Header */}
          <div className="modern-header flex items-center justify-between px-6 py-4">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                <span className="breadcrumb-item">Trang chủ</span>
                {window.location.pathname !== '/' && (
                  <>
                    <svg className="w-4 h-4 mx-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="breadcrumb-item active">
                      {window.location.pathname.startsWith('/clients') ? 'Khách hàng' :
                       window.location.pathname.startsWith('/projects') ? 'Dự án' :
                       window.location.pathname.startsWith('/task-templates') ? 'Template dịch vụ' :
                       window.location.pathname.startsWith('/task') ? 'Nhiệm vụ' :
                       window.location.pathname.startsWith('/campaigns') ? 'Chiến dịch' :
                       window.location.pathname.startsWith('/invoices') ? 'Hóa đơn' :
                       window.location.pathname.startsWith('/contracts') ? 'Hợp đồng' :
                       window.location.pathname.startsWith('/expenses') ? 'Quản lý chi phí' :
                       window.location.pathname.startsWith('/documents') ? 'Tài liệu' :
                       window.location.pathname.startsWith('/settings') ? 'Cài đặt' :
                       window.location.pathname.startsWith('/account') ? 'Tài khoản' :
                       window.location.pathname.startsWith('/reports') ? 'Báo cáo' :
                       'Trang'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Search Button */}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM5.07 7A7.002 7.002 0 0112 2c1.857 0 3.547.72 4.816 1.898M15 17h5l-5 5v-5z" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Settings */}
              <button 
                onClick={() => {
                  if (user?.role === 'admin') {
                    window.location.href = '/settings';
                  }
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                disabled={user?.role !== 'admin'}
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
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/projects" element={<ProjectsComponent />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/task" element={<Task />} />
                  <Route path="/task-templates" element={<TemplatesComponent />} />
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/expenses" element={<ExpenseOverview />} />
                  <Route path="/campaigns" element={<CampaignsComponent />} />
                  <Route path="/campaigns/:id" element={<CampaignDetailComponent />} />
                  <Route path="/documents" element={<DocumentsComponent />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/financial-reports" element={<FinancialReports />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/sales-reports" element={<SalesReports />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </div>
            </div>
          </main>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthContext.Provider>
  );
}

export default App;

// Simple components placeholders (will be completed)
const Dashboard = () => {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Chào mừng trở lại hệ thống CRM!</p>
        </div>
      </div>
      <div className="modern-card p-6">
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hệ thống CRM đang hoạt động</h3>
          <p className="text-gray-600">Dashboard sẽ được phát triển đầy đủ trong phiên bản tiếp theo</p>
        </div>
      </div>
    </div>
  );
};

const Clients = () => {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Khách hàng</h1>
          <p className="text-gray-600 mt-1">Quản lý thông tin khách hàng và mối quan hệ</p>
        </div>
      </div>
      <div className="modern-card p-6">
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Quản lý khách hàng</h3>
          <p className="text-gray-600">Tính năng quản lý khách hàng sẽ được khôi phục đầy đủ</p>
        </div>
      </div>
    </div>
  );
};

const ClientDetail = () => {
  const { id } = useParams();
  
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết khách hàng</h1>
          <p className="text-gray-600 mt-1">ID: {id}</p>
        </div>
      </div>
      <div className="modern-card p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chi tiết khách hàng</h3>
          <p className="text-gray-600">Trang chi tiết sẽ được phát triển đầy đủ</p>
        </div>
      </div>
    </div>
  );
};

// Basic login component
const LoginComponent = ({ login }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Login attempt with:', { email: credentials.email });
      console.log('🌐 API URL:', API);
      
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      console.log('📤 Sending login request...');
      const response = await axios.post(`${API}/api/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Login response:', response.data);
      
      console.log('👤 Fetching user info...');
      const userResponse = await axios.get(`${API}/api/users/me/`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` }
      });

      console.log('👤 User data:', userResponse.data);
      
      login(userResponse.data, response.data.access_token);
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(`Đăng nhập thất bại! ${error.response?.data?.detail || 'Vui lòng kiểm tra thông tin.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập CRM
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="modern-input w-full"
                placeholder="Email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <input
                type="password"
                required
                className="modern-input w-full"
                placeholder="Mật khẩu"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sidebar component
const SidebarContent = ({ user, logout }) => {
  const navigate = useNavigate();
  const location = window.location.pathname;
  
  const [openSubmenus, setOpenSubmenus] = useState({
    project: false,
    finance: false,
    sales: false
  });

  const toggleSubmenu = (menu) => {
    setOpenSubmenus({
      ...openSubmenus,
      [menu]: !openSubmenus[menu]
    });
  };
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="modern-sidebar flex flex-col h-full">
      {/* Logo Section */}
      <div className="sidebar-logo m-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg">CRM Pro</div>
            <div className="text-blue-100 text-xs">Marketing System</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
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

        {/* Dự án (Projects) Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('project')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-orange-50 hover:text-orange-700"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4L12 3 5 7v4a7 7 0 1014 0V7z" />
              </svg>
              Dự án
            </div>
            <svg className={`w-4 h-4 transition-transform duration-200 ${openSubmenus.project ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {openSubmenus.project && (
            <div className="ml-4 space-y-1">
              <button
                onClick={() => navigate("/projects")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/projects")
                    ? "active text-white bg-orange-600"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
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
                    ? "active text-white bg-orange-600"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Chiến dịch
              </button>
              <button
                onClick={() => navigate("/task-templates")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/task-templates")
                    ? "active text-white bg-orange-600"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v1a1 1 0 001 1h6a1 1 0 011-1V5a2 2 0 012 2v1a1 1 0 001 1v9a4 4 0 01-4 4H7z" />
                </svg>
                Template dịch vụ
              </button>
            </div>
          )}
        </div>

        {/* Tài chính (Finance) Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('finance')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tài chính
            </div>
            <svg className={`w-4 h-4 transition-transform duration-200 ${openSubmenus.finance ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {openSubmenus.finance && (
            <div className="ml-4 space-y-1">
              <button
                onClick={() => navigate("/invoices")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/invoices")
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
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
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
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
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
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
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
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

        {/* Bán hàng (Sales) Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('sales')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-pink-50 hover:text-pink-700"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Bán hàng
            </div>
            <svg className={`w-4 h-4 transition-transform duration-200 ${openSubmenus.sales ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {openSubmenus.sales && (
            <div className="ml-4 space-y-1">
              <button
                onClick={() => navigate("/clients")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/clients")
                    ? "active text-white bg-pink-600"
                    : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
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
                    ? "active text-white bg-pink-600"
                    : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Cơ hội
              </button>
              <button
                onClick={() => navigate("/sales-reports")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/sales-reports")
                    ? "active text-white bg-pink-600"
                    : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
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
              ? "active text-white bg-indigo-600"
              : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Tài liệu
        </button>

        {/* Báo cáo */}
        <button
          onClick={() => navigate("/reports")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/reports")
              ? "active text-white bg-yellow-600"
              : "text-gray-700 hover:bg-yellow-50 hover:text-yellow-700"
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
              ? "active text-white bg-red-600"
              : "text-gray-700 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Tài khoản
        </button>

        {/* Cài đặt (Admin only) */}
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

      {/* User Profile Section */}
      <div className="p-4">
        <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
            title="Đăng xuất"
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

// Project detail placeholder  
const ProjectDetail = () => {
  const { id } = useParams();
  
  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết dự án</h1>
          <p className="text-gray-600 mt-1">ID: {id}</p>
        </div>
      </div>
      <div className="modern-card p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chi tiết dự án</h3>
          <p className="text-gray-600">Trang chi tiết sẽ được phát triển đầy đủ</p>
        </div>
      </div>
    </div>
  );
};

// Remaining component placeholders
const Task = () => <div className="modern-card p-6"><h2>Task Management</h2></div>;
const Contracts = () => <div className="modern-card p-6"><h2>Contracts</h2></div>;
const Invoices = () => <div className="modern-card p-6"><h2>Invoices</h2></div>;
const Settings = () => <div className="modern-card p-6"><h2>Settings</h2></div>;
const Account = () => <div className="modern-card p-6"><h2>Account</h2></div>;
const Reports = () => <div className="modern-card p-6"><h2>Reports</h2></div>;
const FinancialReports = () => <div className="modern-card p-6"><h2>Financial Reports</h2></div>;
const Opportunities = () => <div className="modern-card p-6"><h2>Opportunities</h2></div>;
const SalesReports = () => <div className="modern-card p-6"><h2>Sales Reports</h2></div>;