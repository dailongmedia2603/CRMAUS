import React, { useState, useEffect, createContext } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
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
import ClientDetail from './components/ClientDetail';

// Environment variables
const API = process.env.REACT_APP_BACKEND_URL;

// Auth context
const AuthContext = createContext();

// Export AuthContext for use in other components
export { AuthContext };

// Expense Management Main Component
const ExpenseManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý chi phí</h1>
          <p className="text-gray-600 mt-1">Theo dõi và quản lý chi phí doanh nghiệp</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-lg shadow-sm">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
          >
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Bộ lọc
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`${
              activeTab === 'expenses'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
          >
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Chi phí
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`${
              activeTab === 'config'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200`}
          >
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cấu hình
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'overview' && (
          <div className="p-6">
            <ExpenseOverview />
          </div>
        )}
        {activeTab === 'expenses' && (
          <div className="p-6">
            <ExpenseList />
          </div>
        )}
        {activeTab === 'config' && (
          <div className="p-6">
            <ExpenseConfig />
          </div>
        )}
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
                  <Route path="/expenses" element={<ExpenseManagement />} />
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
  const [stats, setStats] = useState({
    totalClients: 0,
    totalProjects: 0,
    totalRevenue: 0,
    pendingInvoices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [clientsRes, projectsRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/api/clients/`),
        axios.get(`${API}/api/projects/`),
        axios.get(`${API}/api/invoices/`)
      ]);

      const totalRevenue = invoicesRes.data
        .filter(invoice => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0);

      const pendingInvoices = invoicesRes.data
        .filter(invoice => invoice.status === 'sent' || invoice.status === 'overdue')
        .length;

      setStats({
        totalClients: clientsRes.data.length,
        totalProjects: projectsRes.data.length,
        totalRevenue: totalRevenue,
        pendingInvoices: pendingInvoices
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Chào mừng trở lại hệ thống CRM!</p>
        </div>
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
                <dt className="text-sm font-medium text-gray-500 truncate">Doanh thu</dt>
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
                <dt className="text-sm font-medium text-gray-500 truncate">HĐ chờ thanh toán</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {loading ? '...' : stats.pendingInvoices}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="modern-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => window.location.href = '/clients'}
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div>
                <div className="font-medium text-gray-900">Khách hàng</div>
                <div className="text-sm text-gray-600">Quản lý khách hàng</div>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/projects'}
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <div className="font-medium text-gray-900">Dự án</div>
                <div className="text-sm text-gray-600">Quản lý dự án</div>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/invoices'}
              className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <svg className="w-8 h-8 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <div className="font-medium text-gray-900">Hóa đơn</div>
                <div className="text-sm text-gray-600">Quản lý hóa đơn</div>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/expenses'}
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <svg className="w-8 h-8 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <div>
                <div className="font-medium text-gray-900">Chi phí</div>
                <div className="text-sm text-gray-600">Quản lý chi phí</div>
              </div>
            </button>
          </div>
        </div>

        <div className="modern-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Hệ thống CRM đang hoạt động bình thường</p>
                <p className="text-xs text-gray-500">Vừa xong</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Dữ liệu mẫu đã được tạo</p>
                <p className="text-xs text-gray-500">Vài phút trước</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Admin user đã đăng nhập</p>
                <p className="text-xs text-gray-500">Vừa xong</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between">
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

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/api/clients/`);
      setClients(response.data);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (clientData) => {
    try {
      await axios.post(`${API}/api/clients/`, clientData);
      toast.success('Tạo khách hàng thành công!');
      setShowCreateModal(false);
      fetchClients();
    } catch (error) {
      toast.error('Lỗi khi tạo khách hàng');
    }
  };

  const handleUpdateClient = async (clientData) => {
    try {
      await axios.put(`${API}/api/clients/${editingClient.id}`, clientData);
      toast.success('Cập nhật khách hàng thành công!');
      setEditingClient(null);
      fetchClients();
    } catch (error) {
      toast.error('Lỗi khi cập nhật khách hàng');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      try {
        await axios.delete(`${API}/api/clients/${clientId}`);
        toast.success('Xóa khách hàng thành công!');
        fetchClients();
      } catch (error) {
        toast.error('Lỗi khi xóa khách hàng');
      }
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý khách hàng</h1>
          <p className="text-gray-600 mt-1">Quản lý thông tin khách hàng và mối quan hệ</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div className="modern-card p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modern-input pl-10"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="modern-card p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-semibold text-lg">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600">{client.company}</p>
                </div>
              </div>
              <div className="relative">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {client.contact_email || 'Chưa có email'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {client.phone || 'Chưa có SĐT'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {client.industry || 'Chưa phân loại'}
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Xem chi tiết
              </button>
              <button
                onClick={() => setEditingClient(client)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Sửa
              </button>
              <button
                onClick={() => handleDeleteClient(client.id)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="modern-card p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có khách hàng</h3>
          <p className="text-gray-600">Bắt đầu bằng cách thêm khách hàng đầu tiên của bạn</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingClient) && (
        <ClientModal
          client={editingClient}
          onClose={() => {
            setShowCreateModal(false);
            setEditingClient(null);
          }}
          onSubmit={editingClient ? handleUpdateClient : handleCreateClient}
        />
      )}
    </div>
  );
};

// Client Detail Component

// Project Detail Placeholder
const ProjectDetail = () => <div className="modern-card p-6"><h2>Project Detail</h2></div>;

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
          </div>
        </form>
      </div>
    </div>
  );
};





