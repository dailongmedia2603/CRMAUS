import React, { useState, useEffect, createContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

// Biến môi trường
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context để quản lý trạng thái đăng nhập
export const AuthContext = createContext();

// Component chính
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Kiểm tra token và lấy thông tin người dùng
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await axios.get(`${API}/users/me/`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Authentication error:", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };

    // Kiểm tra xem hệ thống đã được khởi tạo chưa
    const checkInitialization = async () => {
      try {
        await axios.get(`${API}/health`);
        setInitialized(true);
      } catch (error) {
        console.error("API connection error:", error);
      }
    };

    checkAuth();
    checkInitialization();
  }, []);

  // Thiết lập axios interceptor để xử lý token
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          setUser(null);
          toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Các hàm xử lý đăng nhập, đăng xuất
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/token`, new URLSearchParams({
        'username': email,
        'password': password
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      localStorage.setItem("token", response.data.access_token);
      
      // Lấy thông tin người dùng
      const userResponse = await axios.get(`${API}/users/me/`, {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`
        }
      });
      
      setUser(userResponse.data);
      toast.success("Đăng nhập thành công!");
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    toast.info("Đã đăng xuất");
  };

  // Thiết lập ban đầu cho hệ thống
  const setupSystem = async () => {
    try {
      const response = await axios.post(`${API}/setup`);
      toast.success("Hệ thống đã được khởi tạo thành công!");
      toast.info(`Email: ${response.data.email}, Mật khẩu: ${response.data.password}`);
      return response.data;
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Không thể khởi tạo hệ thống");
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-700">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Nếu chưa khởi tạo hệ thống, hiển thị trang thiết lập
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <ToastContainer />
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Hệ thống CRM chưa được khởi tạo
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Vui lòng nhấn nút bên dưới để thiết lập hệ thống
          </p>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <button
                onClick={setupSystem}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Khởi tạo hệ thống
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <div className="App">
          <ToastContainer position="top-right" autoClose={3000} />
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/*" element={user ? <MainLayout /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

// Component đăng nhập
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Đăng nhập hệ thống CRM
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Dành cho Agency Marketing
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Layout chính của ứng dụng
const MainLayout = () => {
  const { user, logout } = React.useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar for mobile */}
      <div className={`md:hidden ${sidebarOpen ? "block" : "hidden"} fixed inset-0 flex z-40`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-700">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Đóng sidebar</span>
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SidebarContent user={user} logout={logout} />
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-indigo-700">
            <SidebarContent user={user} logout={logout} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <form className="w-full flex md:ml-0" action="#" method="GET">
                <label htmlFor="search-field" className="sr-only">
                  Tìm kiếm
                </label>
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="search-field"
                    className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                    placeholder="Tìm kiếm"
                    type="search"
                    name="search"
                  />
                </div>
              </form>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Profile dropdown */}
              <div className="ml-3 relative">
                <div>
                  <button
                    className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    id="user-menu"
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      {user.full_name.charAt(0)}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Nội dung sidebar
const SidebarContent = ({ user, logout }) => {
  const navigate = useNavigate();
  const location = window.location.pathname;
  
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Khách hàng", path: "/clients", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { name: "Dự án", path: "/projects", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { name: "Công việc", path: "/tasks", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { name: "Hợp đồng", path: "/contracts", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Hóa đơn", path: "/invoices", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  ];

  if (user.role === "admin") {
    navItems.push({ name: "Cài đặt", path: "/settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" });
  }

  return (
    <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <span className="text-white text-xl font-bold">CRM Marketing</span>
      </div>
      <div className="mt-5 flex-1 flex flex-col">
        <nav className="flex-1 px-2 bg-indigo-700 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`${
                location === item.path
                  ? "bg-indigo-800 text-white"
                  : "text-indigo-100 hover:bg-indigo-600"
              } group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left`}
            >
              <svg
                className="mr-3 h-6 w-6 text-indigo-300"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              {item.name}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t border-indigo-800 p-4">
        <div className="flex items-center">
          <div>
            <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              {user.full_name.charAt(0)}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user.full_name}</p>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-indigo-200 hover:text-white"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Các component cho từng trang
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API}/dashboard`);
        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Không thể tải dữ liệu Dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  if (!dashboardData) {
    return <div className="text-center py-10">Không thể tải dữ liệu Dashboard</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      {/* Thống kê */}
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Thẻ thống kê khách hàng */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Tổng số khách hàng
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {dashboardData.client_count}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <a href="/clients" className="font-medium text-indigo-600 hover:text-indigo-500">
                Xem tất cả khách hàng
              </a>
            </div>
          </div>
        </div>

        {/* Thẻ thống kê dự án */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Dự án đang chạy
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {dashboardData.projects_by_status.in_progress}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <a href="/projects" className="font-medium text-indigo-600 hover:text-indigo-500">
                Xem tất cả dự án
              </a>
            </div>
          </div>
        </div>

        {/* Thẻ thống kê tài chính */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Hóa đơn chờ thanh toán
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {dashboardData.invoices_by_status.sent}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <a href="/invoices" className="font-medium text-indigo-600 hover:text-indigo-500">
                Xem tất cả hóa đơn
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Công việc gần đến hạn */}
      <div className="mt-8">
        <h2 className="text-lg leading-6 font-medium text-gray-900">
          Công việc sắp đến hạn
        </h2>
        <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {dashboardData.upcoming_tasks && dashboardData.upcoming_tasks.length > 0 ? (
              dashboardData.upcoming_tasks.map((task) => (
                <li key={task.id}>
                  <a href={`/tasks/${task.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {task.title}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            task.priority === "high" 
                              ? "bg-red-100 text-red-800" 
                              : task.priority === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                            {task.priority === "high" 
                              ? "Cao" 
                              : task.priority === "medium"
                              ? "Trung bình"
                              : "Thấp"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {task.project_id}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <p>
                            Đến hạn {new Date(task.due_date).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                Không có công việc nào sắp đến hạn
              </li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Hợp đồng sắp hết hạn */}
      <div className="mt-8">
        <h2 className="text-lg leading-6 font-medium text-gray-900">
          Hợp đồng sắp hết hạn
        </h2>
        <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {dashboardData.expiring_contracts && dashboardData.expiring_contracts.length > 0 ? (
              dashboardData.expiring_contracts.map((contract) => (
                <li key={contract.id}>
                  <a href={`/contracts/${contract.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {contract.title}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            Sắp hết hạn
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {contract.client_id}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <p>
                            Hết hạn {new Date(contract.end_date).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                Không có hợp đồng nào sắp hết hạn
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Component Clients
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    industry: "",
    size: "",
    website: "",
    phone: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
    tags: []
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/clients/`);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Không thể tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tagInput.trim()]
        });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/clients/`, formData);
      toast.success("Thêm khách hàng thành công!");
      setIsModalOpen(false);
      resetForm();
      fetchClients();
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Không thể tạo khách hàng mới");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      company: "",
      industry: "",
      size: "",
      website: "",
      phone: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      notes: "",
      tags: []
    });
    setTagInput("");
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Khách hàng</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm khách hàng
        </button>
      </div>

      {/* Danh sách khách hàng */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {clients.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {clients.map((client) => (
              <li key={client.id}>
                <a href={`/clients/${client.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {client.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        {client.tags && client.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 mr-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                          {client.company}
                        </p>
                        {client.industry && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {client.industry}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <p>
                          {client.contact_email || "Không có email"}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Chưa có khách hàng nào. Bắt đầu bằng cách thêm khách hàng mới.
          </div>
        )}
      </div>

      {/* Modal thêm khách hàng */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Thêm khách hàng mới
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Tên
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              required
                              value={formData.name}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                            Công ty
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="company"
                              id="company"
                              required
                              value={formData.company}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                            Ngành
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="industry"
                              id="industry"
                              value={formData.industry}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                            Quy mô
                          </label>
                          <div className="mt-1">
                            <select
                              id="size"
                              name="size"
                              value={formData.size}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Chọn quy mô</option>
                              <option value="1-10">1-10 nhân viên</option>
                              <option value="11-50">11-50 nhân viên</option>
                              <option value="51-200">51-200 nhân viên</option>
                              <option value="201-500">201-500 nhân viên</option>
                              <option value="501+">501+ nhân viên</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                            Website
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="website"
                              id="website"
                              value={formData.website}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                            Số điện thoại
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="phone"
                              id="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
                            Tên người liên hệ
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="contact_name"
                              id="contact_name"
                              value={formData.contact_name}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                            Email liên hệ
                          </label>
                          <div className="mt-1">
                            <input
                              type="email"
                              name="contact_email"
                              id="contact_email"
                              value={formData.contact_email}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                            SĐT liên hệ
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="contact_phone"
                              id="contact_phone"
                              value={formData.contact_phone}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                            Tags
                          </label>
                          <div className="mt-1">
                            <div className="flex flex-wrap items-center">
                              {formData.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2 mb-2"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                    className="ml-1.5 inline-flex text-indigo-400 focus:outline-none"
                                  >
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                id="tagInput"
                                value={tagInput}
                                onChange={handleTagInputChange}
                                onKeyDown={handleTagInputKeyDown}
                                placeholder="Thêm tag và nhấn Enter"
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md mt-2"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                            Ghi chú
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="notes"
                              name="notes"
                              rows="3"
                              value={formData.notes}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Thêm khách hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientDetail = () => {
  return <div>Chi tiết khách hàng (đang phát triển)</div>;
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    description: "",
    start_date: "",
    end_date: "",
    budget: "",
    status: "planning"
  });

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/projects/`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Không thể tải danh sách dự án");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients/`);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Không thể tải danh sách khách hàng");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/projects/`, formData);
      toast.success("Thêm dự án thành công!");
      setIsModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Không thể tạo dự án mới");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      client_id: "",
      description: "",
      start_date: "",
      end_date: "",
      budget: "",
      status: "planning"
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Không xác định";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "planning":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-green-100 text-green-800";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "planning":
        return "Lên kế hoạch";
      case "in_progress":
        return "Đang thực hiện";
      case "on_hold":
        return "Tạm dừng";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dự án</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm dự án
        </button>
      </div>

      {/* Danh sách dự án */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {projects.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {projects.map((project) => (
              <li key={project.id}>
                <a href={`/projects/${project.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {project.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                          {getClientName(project.client_id)}
                        </p>
                        {project.budget && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(project.budget)}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {project.start_date ? (
                          <p>
                            {new Date(project.start_date).toLocaleDateString('vi-VN')}
                            {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString('vi-VN')}`}
                          </p>
                        ) : (
                          <p>Chưa có thời gian</p>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Chưa có dự án nào. Bắt đầu bằng cách thêm dự án mới.
          </div>
        )}
      </div>

      {/* Modal thêm dự án */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Thêm dự án mới
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Tên dự án
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              required
                              value={formData.name}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                            Khách hàng
                          </label>
                          <div className="mt-1">
                            <select
                              id="client_id"
                              name="client_id"
                              required
                              value={formData.client_id}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Chọn khách hàng</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                  {client.name} - {client.company}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Mô tả
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="description"
                              name="description"
                              rows="3"
                              value={formData.description}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                            Ngày bắt đầu
                          </label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="start_date"
                              id="start_date"
                              value={formData.start_date}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                            Ngày kết thúc
                          </label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="end_date"
                              id="end_date"
                              value={formData.end_date}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                            Ngân sách
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="budget"
                              id="budget"
                              value={formData.budget}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Trạng thái
                          </label>
                          <div className="mt-1">
                            <select
                              id="status"
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="planning">Lên kế hoạch</option>
                              <option value="in_progress">Đang thực hiện</option>
                              <option value="on_hold">Tạm dừng</option>
                              <option value="completed">Hoàn thành</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Thêm dự án
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectDetail = () => {
  return <div>Chi tiết dự án (đang phát triển)</div>;
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    project_id: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: "medium",
    status: "to_do"
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/tasks/`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Không thể tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects/`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Không thể tải danh sách dự án");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      console.log("Hiện tại không thể tải danh sách người dùng. Sẽ sử dụng danh sách trống.");
      setUsers([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/tasks/`, formData);
      toast.success("Thêm công việc thành công!");
      setIsModalOpen(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Không thể tạo công việc mới");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      project_id: "",
      description: "",
      assigned_to: "",
      due_date: "",
      priority: "medium",
      status: "to_do"
    });
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : "Không xác định";
  };

  const getUserName = (userId) => {
    if (!userId) return "Chưa phân công";
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : "Không xác định";
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "to_do":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high":
        return "Cao";
      case "medium":
        return "Trung bình";
      case "low":
        return "Thấp";
      default:
        return priority;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "to_do":
        return "Cần làm";
      case "in_progress":
        return "Đang làm";
      case "review":
        return "Đang xem xét";
      case "completed":
        return "Hoàn thành";
      default:
        return status;
    }
  };

  // Hàm xử lý cập nhật trạng thái công việc
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        toast.error("Không tìm thấy công việc");
        return;
      }
      
      await axios.put(`${API}/tasks/${taskId}`, {
        ...task,
        status: newStatus
      });
      
      toast.success("Cập nhật trạng thái thành công!");
      fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Không thể cập nhật trạng thái công việc");
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Công việc</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm công việc
        </button>
      </div>

      {/* Danh sách công việc */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {tasks.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <li key={task.id}>
                <div className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {task.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeClass(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                          {getProjectName(task.project_id)}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {getUserName(task.assigned_to)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {task.due_date ? (
                          <p>
                            Đến hạn: {new Date(task.due_date).toLocaleDateString('vi-VN')}
                          </p>
                        ) : (
                          <p>Chưa có thời hạn</p>
                        )}
                      </div>
                    </div>
                    {task.description && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">{task.description}</p>
                      </div>
                    )}
                    <div className="mt-3 flex justify-end space-x-2">
                      {task.status !== "completed" && (
                        <button
                          onClick={() => handleUpdateStatus(task.id, "completed")}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Hoàn thành
                        </button>
                      )}
                      
                      {task.status === "to_do" && (
                        <button
                          onClick={() => handleUpdateStatus(task.id, "in_progress")}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Bắt đầu
                        </button>
                      )}
                      
                      {task.status === "in_progress" && (
                        <button
                          onClick={() => handleUpdateStatus(task.id, "review")}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          Gửi xem xét
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Chưa có công việc nào. Bắt đầu bằng cách thêm công việc mới.
          </div>
        )}
      </div>

      {/* Modal thêm công việc */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Thêm công việc mới
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Tiêu đề
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="title"
                              id="title"
                              required
                              value={formData.title}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="project_id" className="block text-sm font-medium text-gray-700">
                            Dự án
                          </label>
                          <div className="mt-1">
                            <select
                              id="project_id"
                              name="project_id"
                              required
                              value={formData.project_id}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Chọn dự án</option>
                              {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Mô tả
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="description"
                              name="description"
                              rows="3"
                              value={formData.description}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">
                            Người phụ trách
                          </label>
                          <div className="mt-1">
                            <select
                              id="assigned_to"
                              name="assigned_to"
                              value={formData.assigned_to}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Chưa phân công</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.full_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                            Thời hạn
                          </label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="due_date"
                              id="due_date"
                              value={formData.due_date}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                            Độ ưu tiên
                          </label>
                          <div className="mt-1">
                            <select
                              id="priority"
                              name="priority"
                              value={formData.priority}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="low">Thấp</option>
                              <option value="medium">Trung bình</option>
                              <option value="high">Cao</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Trạng thái
                          </label>
                          <div className="mt-1">
                            <select
                              id="status"
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="to_do">Cần làm</option>
                              <option value="in_progress">Đang làm</option>
                              <option value="review">Đang xem xét</option>
                              <option value="completed">Hoàn thành</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Thêm công việc
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    project_id: "",
    title: "",
    start_date: "",
    end_date: "",
    value: "",
    status: "draft",
    terms: ""
  });

  useEffect(() => {
    fetchContracts();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/contracts/`);
      setContracts(response.data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Không thể tải danh sách hợp đồng");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients/`);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Không thể tải danh sách khách hàng");
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects/`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Không thể tải danh sách dự án");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/contracts/`, formData);
      toast.success("Thêm hợp đồng thành công!");
      setIsModalOpen(false);
      resetForm();
      fetchContracts();
    } catch (error) {
      console.error("Error creating contract:", error);
      toast.error("Không thể tạo hợp đồng mới");
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      project_id: "",
      title: "",
      start_date: "",
      end_date: "",
      value: "",
      status: "draft",
      terms: ""
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Không xác định";
  };

  const getProjectName = (projectId) => {
    if (!projectId) return "Không có";
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : "Không xác định";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "signed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-indigo-100 text-indigo-800";
      case "expired":
        return "bg-yellow-100 text-yellow-800";
      case "terminated":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "draft":
        return "Dự thảo";
      case "sent":
        return "Đã gửi";
      case "signed":
        return "Đã ký";
      case "active":
        return "Đang hiệu lực";
      case "expired":
        return "Hết hạn";
      case "terminated":
        return "Đã chấm dứt";
      default:
        return status;
    }
  };

  // Hàm xử lý cập nhật trạng thái hợp đồng
  const handleUpdateStatus = async (contractId, newStatus) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) {
        toast.error("Không tìm thấy hợp đồng");
        return;
      }
      
      await axios.put(`${API}/contracts/${contractId}`, {
        ...contract,
        status: newStatus
      });
      
      toast.success("Cập nhật trạng thái thành công!");
      fetchContracts();
    } catch (error) {
      console.error("Error updating contract status:", error);
      toast.error("Không thể cập nhật trạng thái hợp đồng");
    }
  };

  // Kiểm tra xem hợp đồng đã sắp hết hạn chưa (trong vòng 30 ngày)
  const isNearExpiry = (endDate) => {
    if (!endDate) return false;
    const today = new Date();
    const expiryDate = new Date(endDate);
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Hợp đồng</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm hợp đồng
        </button>
      </div>

      {/* Danh sách hợp đồng */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {contracts.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {contracts.map((contract) => (
              <li key={contract.id}>
                <div className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {contract.title}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(contract.status)}`}>
                          {getStatusText(contract.status)}
                        </span>
                        {isNearExpiry(contract.end_date) && contract.status === "active" && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            Sắp hết hạn
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                          {getClientName(contract.client_id)}
                        </p>
                        {contract.project_id && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            {getProjectName(contract.project_id)}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <p>
                          {new Date(contract.start_date).toLocaleDateString('vi-VN')} - {new Date(contract.end_date).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-sm text-gray-700 font-medium">
                        Giá trị: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.value)}
                      </p>
                      <div className="flex space-x-2">
                        {contract.status === "draft" && (
                          <button
                            onClick={() => handleUpdateStatus(contract.id, "sent")}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Gửi hợp đồng
                          </button>
                        )}
                        {contract.status === "sent" && (
                          <button
                            onClick={() => handleUpdateStatus(contract.id, "signed")}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Đánh dấu đã ký
                          </button>
                        )}
                        {contract.status === "signed" && (
                          <button
                            onClick={() => handleUpdateStatus(contract.id, "active")}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Kích hoạt
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Chưa có hợp đồng nào. Bắt đầu bằng cách thêm hợp đồng mới.
          </div>
        )}
      </div>

      {/* Modal thêm hợp đồng */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Thêm hợp đồng mới
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Tiêu đề hợp đồng
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="title"
                              id="title"
                              required
                              value={formData.title}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                            Khách hàng
                          </label>
                          <div className="mt-1">
                            <select
                              id="client_id"
                              name="client_id"
                              required
                              value={formData.client_id}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Chọn khách hàng</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                  {client.name} - {client.company}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="project_id" className="block text-sm font-medium text-gray-700">
                            Dự án (tùy chọn)
                          </label>
                          <div className="mt-1">
                            <select
                              id="project_id"
                              name="project_id"
                              value={formData.project_id}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Không liên kết với dự án</option>
                              {projects.filter(p => p.client_id === formData.client_id).map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                            Ngày bắt đầu
                          </label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="start_date"
                              id="start_date"
                              required
                              value={formData.start_date}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                            Ngày kết thúc
                          </label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="end_date"
                              id="end_date"
                              required
                              value={formData.end_date}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="value" className="block text-sm font-medium text-gray-700">
                            Giá trị hợp đồng (VND)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="value"
                              id="value"
                              required
                              value={formData.value}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Trạng thái
                          </label>
                          <div className="mt-1">
                            <select
                              id="status"
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="draft">Dự thảo</option>
                              <option value="sent">Đã gửi</option>
                              <option value="signed">Đã ký</option>
                              <option value="active">Đang hiệu lực</option>
                              <option value="expired">Hết hạn</option>
                              <option value="terminated">Đã chấm dứt</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="terms" className="block text-sm font-medium text-gray-700">
                            Điều khoản
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="terms"
                              name="terms"
                              rows="3"
                              value={formData.terms}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Thêm hợp đồng
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    project_id: "",
    contract_id: "",
    title: "",
    amount: "",
    due_date: "",
    status: "draft",
    notes: ""
  });

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchProjects();
    fetchContracts();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/invoices/`);
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Không thể tải danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients/`);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Không thể tải danh sách khách hàng");
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects/`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Không thể tải danh sách dự án");
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts/`);
      setContracts(response.data);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Không thể tải danh sách hợp đồng");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setFormData({ 
      ...formData, 
      client_id: clientId,
      project_id: "",
      contract_id: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/invoices/`, formData);
      toast.success("Thêm hóa đơn thành công!");
      setIsModalOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Không thể tạo hóa đơn mới");
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      project_id: "",
      contract_id: "",
      title: "",
      amount: "",
      due_date: "",
      status: "draft",
      notes: ""
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Không xác định";
  };

  const getProjectName = (projectId) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : "Không xác định";
  };

  const getContractTitle = (contractId) => {
    if (!contractId) return null;
    const contract = contracts.find(c => c.id === contractId);
    return contract ? contract.title : "Không xác định";
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "draft":
        return "Dự thảo";
      case "sent":
        return "Đã gửi";
      case "paid":
        return "Đã thanh toán";
      case "overdue":
        return "Quá hạn";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  // Hàm xử lý cập nhật trạng thái hóa đơn
  const handleUpdateStatus = async (invoiceId, newStatus) => {
    try {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) {
        toast.error("Không tìm thấy hóa đơn");
        return;
      }
      
      await axios.put(`${API}/invoices/${invoiceId}`, {
        ...invoice,
        status: newStatus
      });
      
      toast.success("Cập nhật trạng thái thành công!");
      fetchInvoices();
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast.error("Không thể cập nhật trạng thái hóa đơn");
    }
  };

  // Kiểm tra xem hóa đơn đã quá hạn chưa
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date();
    const dueDateObj = new Date(dueDate);
    return dueDateObj < today;
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Hóa đơn</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm hóa đơn
        </button>
      </div>

      {/* Danh sách hóa đơn */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {invoices.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <div className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {invoice.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Mã: {invoice.invoice_number}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(invoice.status)}`}>
                          {getStatusText(invoice.status)}
                        </span>
                        {isOverdue(invoice.due_date) && invoice.status !== "paid" && invoice.status !== "cancelled" && (
                          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Quá hạn
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                          {getClientName(invoice.client_id)}
                        </p>
                        {getProjectName(invoice.project_id) && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            {getProjectName(invoice.project_id)}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <p>
                          Hạn thanh toán: {new Date(invoice.due_date).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-sm text-gray-700 font-medium">
                        Số tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.amount)}
                      </p>
                      <div className="flex space-x-2">
                        {invoice.status === "draft" && (
                          <button
                            onClick={() => handleUpdateStatus(invoice.id, "sent")}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Gửi hóa đơn
                          </button>
                        )}
                        {invoice.status === "sent" && (
                          <button
                            onClick={() => handleUpdateStatus(invoice.id, "paid")}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Đánh dấu đã thanh toán
                          </button>
                        )}
                        {(invoice.status === "sent" || invoice.status === "overdue") && (
                          <button
                            onClick={() => handleUpdateStatus(invoice.id, "cancelled")}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-10 text-gray-500">
            Chưa có hóa đơn nào. Bắt đầu bằng cách thêm hóa đơn mới.
          </div>
        )}
      </div>

      {/* Modal thêm hóa đơn */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Thêm hóa đơn mới
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Tiêu đề hóa đơn
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="title"
                              id="title"
                              required
                              value={formData.title}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                            Khách hàng
                          </label>
                          <div className="mt-1">
                            <select
                              id="client_id"
                              name="client_id"
                              required
                              value={formData.client_id}
                              onChange={handleClientChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Chọn khách hàng</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                  {client.name} - {client.company}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {formData.client_id && (
                          <>
                            <div className="sm:col-span-6">
                              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700">
                                Dự án (tùy chọn)
                              </label>
                              <div className="mt-1">
                                <select
                                  id="project_id"
                                  name="project_id"
                                  value={formData.project_id}
                                  onChange={handleInputChange}
                                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                >
                                  <option value="">Không liên kết với dự án</option>
                                  {projects
                                    .filter(p => p.client_id === formData.client_id)
                                    .map((project) => (
                                      <option key={project.id} value={project.id}>
                                        {project.name}
                                      </option>
                                    ))
                                  }
                                </select>
                              </div>
                            </div>

                            <div className="sm:col-span-6">
                              <label htmlFor="contract_id" className="block text-sm font-medium text-gray-700">
                                Hợp đồng (tùy chọn)
                              </label>
                              <div className="mt-1">
                                <select
                                  id="contract_id"
                                  name="contract_id"
                                  value={formData.contract_id}
                                  onChange={handleInputChange}
                                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                >
                                  <option value="">Không liên kết với hợp đồng</option>
                                  {contracts
                                    .filter(c => c.client_id === formData.client_id)
                                    .map((contract) => (
                                      <option key={contract.id} value={contract.id}>
                                        {contract.title} ({new Date(contract.start_date).toLocaleDateString('vi-VN')})
                                      </option>
                                    ))
                                  }
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="sm:col-span-6">
                          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                            Số tiền (VND)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="amount"
                              id="amount"
                              required
                              value={formData.amount}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                            Hạn thanh toán
                          </label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="due_date"
                              id="due_date"
                              required
                              value={formData.due_date}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Trạng thái
                          </label>
                          <div className="mt-1">
                            <select
                              id="status"
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="draft">Dự thảo</option>
                              <option value="sent">Đã gửi</option>
                              <option value="paid">Đã thanh toán</option>
                              <option value="overdue">Quá hạn</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                            Ghi chú
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="notes"
                              name="notes"
                              rows="3"
                              value={formData.notes}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Thêm hóa đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Settings = () => {
  return <div>Cài đặt hệ thống (đang phát triển)</div>;
};

export default App;
