import React, { useState, useEffect, createContext } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { ServiceTemplates, ServiceTemplateDetail } from './ServiceTemplateComponents';
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
      <div className="App">
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/*" element={user ? <MainLayout /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

// Component đăng nhập
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Phần bên trái - nền xanh với logo và hình ảnh */}
      <div className="hidden md:flex md:w-1/2 bg-blue-500 text-white flex-col p-12">
        <div className="flex items-center mb-8">
          <svg className="h-10 w-10 text-white mr-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 10a4 4 0 100-8 4 4 0 000 8zm-8.5 3a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19 21h-8.5v-2.1c0-2.2 1.8-4 4-4h1c2.2 0 4 1.8 4 4V21z" />
            <path d="M3 21h7v-2.1c0-1.7-1.1-3.2-2.8-3.7-1.5-.5-3.2-.5-4.8.1-1.2.5-2 1.8-1.9 3.1V21h2.5z" />
          </svg>
          <span className="text-xl font-bold">CRM Marketing</span>
        </div>
        
        <div className="flex-grow flex flex-col justify-center mb-10">
          <h2 className="text-4xl font-bold mb-4">Your place to work</h2>
          <h3 className="text-3xl font-bold mb-8">Plan. Create. Control.</h3>
          
          <div className="relative mt-6">
            <img 
              src="https://cdn.pixabay.com/photo/2022/05/20/13/29/project-management-7209803_1280.png" 
              alt="Workflow illustration" 
              className="w-full max-w-md mx-auto"
            />
          </div>
        </div>
      </div>
      
      {/* Phần bên phải - form đăng nhập */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Đăng nhập hệ thống CRM</h2>
            <p className="text-gray-600">Dành cho Agency Marketing</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 text-center">
                Email
              </label>
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 text-center">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Quên mật khẩu?
                </a>
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
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản? 
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
                Liên hệ Admin
              </a>
            </p>
          </div>
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
                <Route path="/service-templates" element={<ServiceTemplates />} />
                <Route path="/service-templates/:id" element={<ServiceTemplateDetail />} />
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
    <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
      <div className="flex items-center flex-shrink-0 px-4">
        <span className="text-white text-xl font-bold">CRM Marketing</span>
      </div>
      <div className="mt-5 flex-1 flex flex-col">
        <nav className="flex-1 px-2 bg-indigo-700 space-y-1">
          {/* Dashboard */}
          <button
            onClick={() => navigate("/")}
            className={`${
              location === "/"
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
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </button>

          {/* Client */}
          <button
            onClick={() => navigate("/clients")}
            className={`${
              location.startsWith("/clients")
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
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Client
          </button>

          {/* Công việc */}
          <button
            onClick={() => navigate("/tasks")}
            className={`${
              location.startsWith("/tasks")
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
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Công việc
          </button>

          {/* Dự án (với submenu) */}
          <div>
            <button
              onClick={() => toggleSubmenu("project")}
              className={`${
                location.startsWith("/projects")
                  ? "bg-indigo-800 text-white"
                  : "text-indigo-100 hover:bg-indigo-600"
              } group flex w-full items-center justify-between px-2 py-2 text-sm font-medium rounded-md text-left`}
            >
              <div className="flex items-center">
                <svg
                  className="mr-3 h-6 w-6 text-indigo-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Dự án
              </div>
              <svg
                className={`${openSubmenus.project ? "transform rotate-180" : ""} h-5 w-5 text-indigo-300`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {openSubmenus.project && (
              <div className="pl-8 space-y-1">
                <button
                  onClick={() => navigate("/projects")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Danh sách dự án
                </button>
                <button
                  onClick={() => navigate("/service-templates")}
                  className={`${
                    location.startsWith("/service-templates")
                      ? "bg-indigo-800 text-white"
                      : "text-indigo-100 hover:bg-indigo-600"
                  } group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left`}
                >
                  Mẫu dịch vụ
                </button>
                <button
                  onClick={() => navigate("/task-templates")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Template nhiệm vụ
                </button>
              </div>
            )}
          </div>

          {/* Tài chính (với submenu) */}
          <div>
            <button
              onClick={() => toggleSubmenu("finance")}
              className={`${
                location.startsWith("/invoices") || location.startsWith("/contracts") || location.startsWith("/finance-reports")
                  ? "bg-indigo-800 text-white"
                  : "text-indigo-100 hover:bg-indigo-600"
              } group flex w-full items-center justify-between px-2 py-2 text-sm font-medium rounded-md text-left`}
            >
              <div className="flex items-center">
                <svg
                  className="mr-3 h-6 w-6 text-indigo-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tài chính
              </div>
              <svg
                className={`${openSubmenus.finance ? "transform rotate-180" : ""} h-5 w-5 text-indigo-300`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {openSubmenus.finance && (
              <div className="pl-8 space-y-1">
                <button
                  onClick={() => navigate("/invoices")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Hóa đơn
                </button>
                <button
                  onClick={() => navigate("/contracts")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Hợp đồng
                </button>
                <button
                  onClick={() => navigate("/finance-reports")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Báo cáo tài chính
                </button>
              </div>
            )}
          </div>

          {/* Bán hàng (với submenu) */}
          <div>
            <button
              onClick={() => toggleSubmenu("sales")}
              className={`${
                location.startsWith("/sales")
                  ? "bg-indigo-800 text-white"
                  : "text-indigo-100 hover:bg-indigo-600"
              } group flex w-full items-center justify-between px-2 py-2 text-sm font-medium rounded-md text-left`}
            >
              <div className="flex items-center">
                <svg
                  className="mr-3 h-6 w-6 text-indigo-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Bán hàng
              </div>
              <svg
                className={`${openSubmenus.sales ? "transform rotate-180" : ""} h-5 w-5 text-indigo-300`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {openSubmenus.sales && (
              <div className="pl-8 space-y-1">
                <button
                  onClick={() => navigate("/sales/customers")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Khách hàng
                </button>
                <button
                  onClick={() => navigate("/sales/opportunities")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Cơ hội
                </button>
                <button
                  onClick={() => navigate("/sales/reports")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Báo cáo
                </button>
              </div>
            )}
          </div>

          {/* Tài liệu */}
          <button
            onClick={() => navigate("/documents")}
            className={`${
              location.startsWith("/documents")
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
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Tài liệu
          </button>

          {/* Báo cáo */}
          <button
            onClick={() => navigate("/reports")}
            className={`${
              location.startsWith("/reports")
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
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Báo cáo
          </button>

          {/* Tài khoản */}
          <button
            onClick={() => navigate("/account")}
            className={`${
              location.startsWith("/account")
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
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Tài khoản
          </button>

          {/* Cài đặt */}
          {user.role === "admin" && (
            <button
              onClick={() => navigate("/settings")}
              className={`${
                location.startsWith("/settings")
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
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Cài đặt
            </button>
          )}
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
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewArchived, setViewArchived] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [statusFilter, setStatusFilter] = useState("active"); // active, archived, all
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // Thêm state để kiểm tra đang chỉnh sửa hay thêm mới
  const [currentClientId, setCurrentClientId] = useState(null); // Lưu ID của client đang chỉnh sửa
  const [statsData, setStatsData] = useState({
    totalClients: 0,
    activeClients: 0,
    newClientsThisMonth: 0
  });
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
    address: "",
    tags: []
  });
  const [filterData, setFilterData] = useState({
    tags: [],
    hasProjects: null,
    hasInvoices: null,
    dateFrom: "",
    dateTo: ""
  });

  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);

  // Mẫu tag để lựa chọn
  const availableTags = ["Doanh nghiệp", "Cá nhân", "Mới", "VIP", "Tiềm năng"];

  useEffect(() => {
    fetchClients();
    fetchStats();
  }, [statusFilter, viewArchived]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      // Lấy danh sách khách hàng từ API
      const response = await axios.get(`${API}/clients/`);
      
      // Lọc dữ liệu dựa trên statusFilter
      let filteredClients = response.data;
      
      if (statusFilter === "active") {
        filteredClients = filteredClients.filter(client => !client.archived);
      } else if (statusFilter === "archived") {
        filteredClients = filteredClients.filter(client => client.archived);
      }

      // Lọc dựa trên từ khóa tìm kiếm
      if (searchTerm) {
        filteredClients = filteredClients.filter(client => 
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (client.contact_email && client.contact_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (client.contact_name && client.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (client.website && client.website.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      setClients(filteredClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Không thể tải danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Trong thực tế, bạn có thể gọi một API riêng để lấy thống kê
      const response = await axios.get(`${API}/clients/`);
      const allClients = response.data;
      
      // Tính toán các chỉ số thống kê
      const totalClients = allClients.length;
      
      const activeClients = allClients.filter(client => !client.archived).length;
      
      // Tính số khách hàng mới trong tháng
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newClientsThisMonth = allClients.filter(client => {
        const createdDate = new Date(client.created_at);
        return createdDate >= firstDayOfMonth;
      }).length;

      setStatsData({
        totalClients,
        activeClients,
        newClientsThisMonth
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClients(clients.map(client => client.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const toggleActionMenu = (clientId) => {
    if (actionMenuOpen === clientId) {
      setActionMenuOpen(null);
    } else {
      setActionMenuOpen(clientId);
    }
  };

  const toggleBulkActionMenu = () => {
    setBulkActionMenuOpen(!bulkActionMenuOpen);
  };
  
  // Xử lý upload avatar
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Xử lý thay đổi input trong form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Xử lý lựa chọn tag
  const handleTagSelect = (e) => {
    const tag = e.target.value;
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
  };
  
  // Xử lý xóa tag
  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };
  
  // Xử lý chỉnh sửa client
  const handleEditClient = (client) => {
    // Thiết lập trạng thái chỉnh sửa
    setIsEditing(true);
    setCurrentClientId(client.id);
    
    // Điền dữ liệu vào form
    setFormData({
      name: client.name || "",
      company: client.company || "",
      industry: client.industry || "",
      size: client.size || "",
      website: client.website || "",
      phone: client.phone || "",
      contact_name: client.contact_name || "",
      contact_email: client.contact_email || "",
      contact_phone: client.contact_phone || "",
      notes: client.notes || "",
      address: client.address || "",
      tags: client.tags || []
    });
    
    // Thiết lập avatar preview
    setAvatarPreview(client.avatar_url || null);
    
    // Mở modal
    setIsModalOpen(true);
  };
  
  // Xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Đảm bảo có tên công ty
      const clientData = {
        ...formData,
        company: formData.company || formData.name // Sử dụng tên client làm tên công ty nếu không có
      };

      // Xử lý upload avatar nếu có
      if (avatarFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', avatarFile);
        
        const uploadResponse = await axios.post(`${API}/upload-avatar/`, formDataUpload, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // Thêm avatar_url vào clientData
        clientData.avatar_url = uploadResponse.data.avatar_url;
      }

      let response;
      if (isEditing) {
        // Cập nhật client hiện có
        response = await axios.put(`${API}/clients/${currentClientId}`, clientData);
        toast.success("Cập nhật khách hàng thành công!");
      } else {
        // Tạo client mới
        response = await axios.post(`${API}/clients/`, clientData);
        toast.success("Thêm khách hàng thành công!");
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchClients();
      fetchStats();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(isEditing ? "Không thể cập nhật khách hàng" : "Không thể tạo khách hàng mới");
    }
  };
  
  // Reset form và trạng thái chỉnh sửa
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
      address: "",
      tags: []
    });
    setIsEditing(false);
    setCurrentClientId(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleArchiveClient = async (clientId) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      await axios.put(`${API}/clients/${clientId}`, {
        ...client,
        archived: true
      });

      toast.success("Đã lưu trữ khách hàng");
      fetchClients();
      fetchStats();
    } catch (error) {
      console.error("Error archiving client:", error);
      toast.error("Không thể lưu trữ khách hàng");
    }
  };

  const handleRestoreClient = async (clientId) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      await axios.put(`${API}/clients/${clientId}`, {
        ...client,
        archived: false
      });

      toast.success("Đã khôi phục khách hàng");
      fetchClients();
      fetchStats();
    } catch (error) {
      console.error("Error restoring client:", error);
      toast.error("Không thể khôi phục khách hàng");
    }
  };

  const handleDeleteClient = async (clientId) => {
    try {
      await axios.delete(`${API}/clients/${clientId}`);
      toast.success("Đã xóa khách hàng");
      fetchClients();
      fetchStats();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Không thể xóa khách hàng");
    }
  };

  const handleBulkArchive = async () => {
    try {
      for (const clientId of selectedClients) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
          await axios.put(`${API}/clients/${clientId}`, {
            ...client,
            archived: true
          });
        }
      }
      toast.success("Đã lưu trữ các khách hàng đã chọn");
      setSelectedClients([]);
      fetchClients();
      fetchStats();
    } catch (error) {
      console.error("Error archiving clients:", error);
      toast.error("Không thể lưu trữ khách hàng");
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const clientId of selectedClients) {
        await axios.delete(`${API}/clients/${clientId}`);
      }
      toast.success("Đã xóa các khách hàng đã chọn");
      setSelectedClients([]);
      fetchClients();
      fetchStats();
    } catch (error) {
      console.error("Error deleting clients:", error);
      toast.error("Không thể xóa khách hàng");
    }
  };

  const applyAdvancedFilters = () => {
    // Thực hiện lọc nâng cao và cập nhật danh sách clients
    // Trong môi trường thực, bạn có thể cần gọi API với các tham số lọc
    setIsFilterModalOpen(false);
    toast.info("Đã áp dụng bộ lọc");
  };

  const resetAdvancedFilters = () => {
    setFilterData({
      tags: [],
      hasProjects: null,
      hasInvoices: null,
      dateFrom: "",
      dateTo: ""
    });
    setIsFilterModalOpen(false);
    fetchClients();
  };

  const toggleTagFilter = (tag) => {
    if (filterData.tags.includes(tag)) {
      setFilterData({
        ...filterData,
        tags: filterData.tags.filter(t => t !== tag)
      });
    } else {
      setFilterData({
        ...filterData,
        tags: [...filterData.tags, tag]
      });
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="px-4">
      {/* Widget thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Tổng client</h3>
            <p className="text-4xl font-bold">{statsData.totalClients}</p>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Đang làm việc</h3>
            <p className="text-4xl font-bold">{statsData.activeClients}</p>
          </div>
          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Client mới trong tháng</h3>
            <p className="text-4xl font-bold">{statsData.newClientsThisMonth}</p>
          </div>
          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Header và công cụ */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <div className="flex space-x-2">
            <div className="relative">
              <button
                onClick={toggleBulkActionMenu}
                disabled={selectedClients.length === 0}
                className={`inline-flex items-center px-4 py-2 border ${selectedClients.length === 0 ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-700'} rounded-md shadow-sm text-sm font-medium bg-white hover:bg-gray-50 focus:outline-none`}
              >
                Xóa / Lưu trữ
                <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {bulkActionMenuOpen && selectedClients.length > 0 && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleBulkArchive();
                        setBulkActionMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Lưu trữ
                    </button>
                    <button
                      onClick={() => {
                        handleBulkDelete();
                        setBulkActionMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setViewArchived(!viewArchived)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <svg className="mr-2 -ml-0.5 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Xem lưu trữ
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm Client
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
          <div className="flex-1 mb-2 md:mb-0">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Tìm kiếm theo tên, email, website..."
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md py-2"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="focus:ring-indigo-500 focus:border-indigo-500 h-full py-2 pl-3 pr-10 border-gray-300 bg-white rounded-md shadow-sm text-sm appearance-none"
              >
                <option value="active">Đang hoạt động</option>
                <option value="archived">Đã lưu trữ</option>
                <option value="all">Tất cả</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách khách hàng */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedClients.length === clients.length && clients.length > 0}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => handleSelectClient(client.id)}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {client.avatar_url ? (
                          <img src={client.avatar_url} alt={client.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium text-gray-500">
                            {client.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div 
                          className="text-sm font-medium text-indigo-600 cursor-pointer hover:text-indigo-800"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          {client.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.company}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.contact_name || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.contact_email || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 hover:text-indigo-900">
                    {client.website ? (
                      <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer">
                        {client.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {client.tags && client.tags.length > 0 ? (
                        client.tags.map((tag, index) => (
                          <span key={index} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                    <div className="relative">
                      <button
                        onClick={() => toggleActionMenu(client.id)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {actionMenuOpen === client.id && (
                        <div 
                          className="fixed origin-top-right z-50 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                          style={{
                            top: 'auto',
                            right: 'auto',
                            left: 'auto'
                          }}
                          ref={(node) => {
                            if (node) {
                              const rect = node.getBoundingClientRect();
                              const buttonRect = node.parentElement.getBoundingClientRect();
                              
                              // Tính toán vị trí tốt nhất
                              let left = buttonRect.left - rect.width + 20;
                              
                              // Đảm bảo không vượt quá bên trái màn hình
                              if (left < 10) {
                                left = 10;
                              }
                              
                              // Đảm bảo không vượt quá bên phải màn hình
                              if (left + rect.width > window.innerWidth - 10) {
                                left = window.innerWidth - rect.width - 10;
                              }
                              
                              node.style.position = 'fixed';
                              node.style.top = `${buttonRect.bottom + window.scrollY}px`;
                              node.style.left = `${left}px`;
                            }
                          }}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => {
                                navigate(`/clients/${client.id}`);
                                setActionMenuOpen(null);
                              }}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Xem chi tiết
                            </button>
                            <button
                              onClick={() => {
                                handleEditClient(client);
                                setActionMenuOpen(null);
                              }}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Chỉnh sửa
                            </button>
                            {!client.archived ? (
                              <button
                                onClick={() => {
                                  handleArchiveClient(client.id);
                                  setActionMenuOpen(null);
                                }}
                                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                Lưu trữ
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleRestoreClient(client.id);
                                  setActionMenuOpen(null);
                                }}
                                className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                Khôi phục
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
                                  handleDeleteClient(client.id);
                                }
                                setActionMenuOpen(null);
                              }}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              <svg className="mr-3 h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Xóa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                  {statusFilter === "archived" ? (
                    "Không có khách hàng nào trong lưu trữ."
                  ) : searchTerm ? (
                    "Không tìm thấy khách hàng phù hợp với từ khóa."
                  ) : (
                    "Chưa có khách hàng nào. Bắt đầu bằng cách thêm khách hàng mới."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              <div className="px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isEditing ? "Chỉnh sửa client" : "Thêm client mới"}
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                  >
                    <span className="sr-only">Đóng</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="mt-6">
                  {/* Avatar */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl font-medium text-gray-500">
                            {formData.name ? formData.name.substring(0, 2).toUpperCase() : "CL"}
                          </span>
                        )}
                      </div>
                      <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 cursor-pointer">
                        <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </div>
                  </div>

                  {/* Tên client */}
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Tên client <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      placeholder="Nhập tên client"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Tên người liên hệ */}
                  <div className="mb-4">
                    <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Tên người liên hệ
                    </label>
                    <input
                      type="text"
                      name="contact_name"
                      id="contact_name"
                      placeholder="Nhập tên người liên hệ"
                      value={formData.contact_name || ""}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Email và SĐT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="contact_email"
                        id="contact_email"
                        placeholder="Email"
                        value={formData.contact_email || ""}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        name="contact_phone"
                        id="contact_phone"
                        placeholder="Số điện thoại"
                        value={formData.contact_phone || ""}
                        onChange={handleInputChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div className="mb-4">
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="text"
                      name="website"
                      id="website"
                      placeholder="www.example.com"
                      value={formData.website || ""}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Tags */}
                  <div className="mb-4">
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                      Tag
                    </label>
                    <div className="relative">
                      <select
                        id="tags"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value=""
                        onChange={handleTagSelect}
                      >
                        <option value="" disabled>Chọn tag</option>
                        {availableTags.map(tag => (
                          <option key={tag} value={tag} disabled={formData.tags.includes(tag)}>
                            {tag}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.tags.map(tag => (
                          <span 
                            key={tag} 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                          >
                            {tag}
                            <button 
                              type="button" 
                              className="ml-1.5 inline-flex text-indigo-400 hover:text-indigo-600"
                              onClick={() => removeTag(tag)}
                            >
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Địa chỉ */}
                  <div className="mb-4">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows="3"
                      placeholder="Địa chỉ"
                      value={formData.address || ""}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    ></textarea>
                  </div>

                  {/* Ghi chú */}
                  <div className="mb-4">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Ghi chú
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows="3"
                      placeholder="Ghi chú"
                      value={formData.notes || ""}
                      onChange={handleInputChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    ></textarea>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                      }}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                      {isEditing ? "Cập nhật" : "Thêm mới"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal lọc nâng cao */}
      {isFilterModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Bộ lọc danh sách Client
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Áp dụng các bộ lọc để tìm kiếm chính xác hơn.
                    </p>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTagFilter(tag)}
                            className={`px-3 py-1 rounded-full text-sm ${
                              filterData.tags.includes(tag)
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Trạng thái dự án</h4>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              id="has-projects"
                              type="checkbox"
                              checked={filterData.hasProjects === true}
                              onChange={() => setFilterData({...filterData, hasProjects: filterData.hasProjects === true ? null : true})}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="has-projects" className="ml-2 text-sm text-gray-700">
                              Có dự án
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              id="no-projects"
                              type="checkbox"
                              checked={filterData.hasProjects === false}
                              onChange={() => setFilterData({...filterData, hasProjects: filterData.hasProjects === false ? null : false})}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="no-projects" className="ml-2 text-sm text-gray-700">
                              Không có dự án
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Trạng thái hóa đơn</h4>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              id="has-invoices"
                              type="checkbox"
                              checked={filterData.hasInvoices === true}
                              onChange={() => setFilterData({...filterData, hasInvoices: filterData.hasInvoices === true ? null : true})}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="has-invoices" className="ml-2 text-sm text-gray-700">
                              Có hóa đơn
                            </label>
                          </div>
                          <div className="flex items-center">
                            <input
                              id="no-invoices"
                              type="checkbox"
                              checked={filterData.hasInvoices === false}
                              onChange={() => setFilterData({...filterData, hasInvoices: filterData.hasInvoices === false ? null : false})}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="no-invoices" className="ml-2 text-sm text-gray-700">
                              Không có hóa đơn
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ngày tạo</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="date-from" className="block text-xs text-gray-500 mb-1">
                            Từ ngày
                          </label>
                          <input
                            type="date"
                            id="date-from"
                            value={filterData.dateFrom}
                            onChange={(e) => setFilterData({...filterData, dateFrom: e.target.value})}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label htmlFor="date-to" className="block text-xs text-gray-500 mb-1">
                            Đến ngày
                          </label>
                          <input
                            type="date"
                            id="date-to"
                            value={filterData.dateTo}
                            onChange={(e) => setFilterData({...filterData, dateTo: e.target.value})}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={applyAdvancedFilters}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Áp dụng
                </button>
                <button
                  type="button"
                  onClick={resetAdvancedFilters}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Xóa bộ lọc
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, projects, tasks, contracts
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  useEffect(() => {
    fetchClientDetails();
  }, [id]);
  
  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/clients/${id}`);
      setClient(response.data);
    } catch (error) {
      console.error("Error fetching client details:", error);
      toast.error("Không thể tải thông tin chi tiết khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = () => {
    setIsEditModalOpen(true);
  };
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
        <p className="ml-2 text-gray-600">Đang tải thông tin...</p>
      </div>
    );
  }
  
  if (!client) {
    return (
      <div className="text-center py-10">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Không tìm thấy thông tin khách hàng</h3>
        <p className="mt-1 text-gray-500">Khách hàng này có thể đã bị xóa hoặc không tồn tại.</p>
        <div className="mt-6">
          <button 
            onClick={() => navigate("/clients")}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }
  
  // Lấy hai chữ cái đầu của tên client làm avatar
  const avatarText = client.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header với nút quay lại và tiêu đề */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/clients")}
              className="flex items-center text-gray-500 hover:text-gray-700 mr-4 focus:outline-none"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="ml-1 text-sm font-medium">Quay lại</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Chi tiết Client</h1>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Phần thông tin chi tiết client - bên trái */}
          <div className="w-full md:w-1/3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-medium text-gray-700 mb-4 overflow-hidden">
                  {client.avatar_url ? (
                    <img src={client.avatar_url} alt={client.name} className="h-full w-full object-cover" />
                  ) : (
                    avatarText
                  )}
                </div>
                <h2 className="text-xl font-bold text-center">{client.name}</h2>
                <p className="text-gray-600 text-center">{client.contact_name || "Chưa có tên liên hệ"}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {client.archived ? "Đã lưu trữ" : "Đang hoạt động"}
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <button 
                    className="flex items-center text-gray-700 hover:text-indigo-600"
                    onClick={handleEditClient}
                  >
                    <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Chỉnh sửa
                  </button>
                  <div className="relative">
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={toggleMenu}
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {menuOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button 
                            onClick={() => {
                              // Handle archive action
                              setMenuOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {client.archived ? "Khôi phục" : "Lưu trữ"}
                          </button>
                          <button 
                            onClick={() => {
                              // Handle delete action
                              if (window.confirm("Bạn có chắc chắn muốn xóa client này?")) {
                                // Delete logic
                              }
                              setMenuOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            Xóa client
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  {client.contact_email && (
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${client.contact_email}`} className="text-gray-700 hover:text-indigo-600">
                        {client.contact_email}
                      </a>
                    </div>
                  )}
                  
                  {client.contact_phone && (
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${client.contact_phone}`} className="text-gray-700 hover:text-indigo-600">
                        {client.contact_phone}
                      </a>
                    </div>
                  )}
                  
                  {client.website && (
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <a 
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:text-indigo-600"
                      >
                        {client.website}
                      </a>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-gray-400 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-gray-700">{client.address}</span>
                    </div>
                  )}
                </div>
                
                {client.tags && client.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {client.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Ghi chú</h3>
                    <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-600">{client.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Phần tab nội dung - bên phải */}
          <div className="w-full md:w-2/3">
            <div className="bg-white rounded-lg shadow-sm">
              {/* Tab navigation */}
              <div className="border-b">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === "overview"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } focus:outline-none transition duration-150 ease-in-out`}
                  >
                    Tổng quan
                  </button>
                  <button
                    onClick={() => setActiveTab("projects")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === "projects"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } focus:outline-none transition duration-150 ease-in-out`}
                  >
                    Dự án
                  </button>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === "tasks"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } focus:outline-none transition duration-150 ease-in-out`}
                  >
                    Công việc
                  </button>
                  <button
                    onClick={() => setActiveTab("contracts")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === "contracts"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } focus:outline-none transition duration-150 ease-in-out`}
                  >
                    Hợp đồng
                  </button>
                </nav>
              </div>
              
              {/* Tab content */}
              <div className="p-6">
                {activeTab === "overview" && <ClientOverviewTab clientId={id} />}
                {activeTab === "projects" && <ClientProjectsTab clientId={id} />}
                {activeTab === "tasks" && <ClientTasksTab clientId={id} />}
                {activeTab === "contracts" && <ClientContractsTab clientId={id} />}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal chỉnh sửa client */}
      {isEditModalOpen && (
        <EditClientModal 
          client={client} 
          onClose={() => setIsEditModalOpen(false)} 
          onUpdate={() => {
            fetchClientDetails();
            setIsEditModalOpen(false);
          }} 
        />
      )}
    </div>
  );
};

// Modal chỉnh sửa client
const EditClientModal = ({ client, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: client.name || "",
    company: client.company || "",
    contact_name: client.contact_name || "",
    contact_email: client.contact_email || "",
    contact_phone: client.contact_phone || "",
    website: client.website || "",
    address: client.address || "",
    notes: client.notes || "",
    tags: client.tags || []
  });
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    setIsSubmitting(true);
    try {
      await axios.put(`${API}/clients/${client.id}`, formData);
      toast.success("Cập nhật khách hàng thành công!");
      onUpdate();
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Không thể cập nhật thông tin khách hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Chỉnh sửa thông tin client
                </h3>
                <form onSubmit={handleSubmit} className="mt-2">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700">
                        Tên người liên hệ
                      </label>
                      <input
                        type="text"
                        name="contact_name"
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        name="contact_email"
                        id="contact_email"
                        value={formData.contact_email}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        name="contact_phone"
                        id="contact_phone"
                        value={formData.contact_phone}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                        Website
                      </label>
                      <input
                        type="text"
                        name="website"
                        id="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Địa chỉ
                      </label>
                      <textarea
                        name="address"
                        id="address"
                        rows="2"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      ></textarea>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                        Tags
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          name="tags"
                          id="tags"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Nhập tag và nhấn Enter"
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {formData.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1.5 text-indigo-400 hover:text-indigo-600 focus:outline-none"
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
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Ghi chú
                      </label>
                      <textarea
                        name="notes"
                        id="notes"
                        rows="3"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      ></textarea>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tab Tổng quan
const ClientOverviewTab = ({ clientId }) => {
  const [stats, setStats] = useState({
    projectCount: 0,
    revenue: 0,
    debt: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, [clientId]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch dự án của client
      const projectsResponse = await axios.get(`${API}/projects/client/${clientId}`);
      const projects = projectsResponse.data;
      
      // TODO: Trong thực tế, sẽ cần API để lấy doanh thu và công nợ
      // Giả lập dữ liệu cho mục đích demo
      setStats({
        projectCount: projects.length,
        revenue: 0, // Sẽ cập nhật khi có API thực tế
        debt: 0 // Sẽ cập nhật khi có API thực tế
      });
      
      // Fetch công việc gần đây của client
      // TODO: Trong thực tế, cần API để lấy công việc của client
      // Giả lập dữ liệu cho mục đích demo
      setRecentTasks([
        { id: '1', title: 'Thu tiền', completed: true, created_at: new Date('2023-05-17T19:37:00'), completed_at: new Date('2023-05-21T16:31:00') },
        { id: '2', title: 'Làm BBNT', completed: true, created_at: new Date('2023-05-17T19:19:00'), completed_at: new Date('2023-05-17T19:36:00') },
        { id: '3', title: 'Tạo hợp đồng', completed: true, created_at: new Date('2023-05-17T19:19:00'), completed_at: new Date('2023-05-17T19:36:00') }
      ]);
    } catch (error) {
      console.error("Error fetching client overview data:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }
  
  return (
    <div>
      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white overflow-hidden rounded-lg border">
          <div className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Dự án</h3>
                <p className="text-3xl font-bold">{stats.projectCount}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden rounded-lg border">
          <div className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Doanh thu</h3>
                <p className="text-3xl font-bold">0 đ</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden rounded-lg border">
          <div className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Công nợ</h3>
                <p className="text-3xl font-bold">0 đ</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Công việc gần đây */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Công việc gần đây</h3>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
          {recentTasks.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentTasks.map(task => (
                <li key={task.id} className="px-6 py-4 flex items-center">
                  <div className="flex-shrink-0">
                    <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <div className="ml-4 flex-1 flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-through">{task.title}</p>
                      <div className="text-xs text-gray-500">
                        <span>Tạo: {task.created_at.toLocaleDateString('vi-VN')} {task.created_at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="mx-2">•</span>
                        <span>Hoàn thành: {task.completed_at.toLocaleDateString('vi-VN')} {task.completed_at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">
              Không có công việc nào gần đây
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Tab Dự án
const ClientProjectsTab = ({ clientId }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProjects();
  }, [clientId]);
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/projects/client/${clientId}`);
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching client projects:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }
  
  // Mock dữ liệu dự án cho mục đích hiển thị
  const mockProjects = [
    { id: '1', name: 'vvvv', status: 'active', start_date: '2023-05-21', end_date: '2023-05-22' },
    { id: '2', name: 'jahsdjá', status: 'active', start_date: '2023-05-21', end_date: '2023-05-31' },
    { id: '3', name: 'Build Fanpage', status: 'active', start_date: '2023-05-19', end_date: '2023-05-31' },
    { id: '4', name: 'Dự án Test', status: 'active', start_date: '2023-05-19', end_date: '2023-06-18' },
    { id: '5', name: 'Marketing Vua Seeding', status: 'active', start_date: '2023-05-19', end_date: '2023-06-25' }
  ];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Dự án</h3>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Thêm dự án
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tên dự án
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày bắt đầu
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày kết thúc
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockProjects.map(project => (
              <tr key={project.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{project.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {project.status === 'active' ? 'Đang hoạt động' : project.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.start_date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.end_date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Tab Công việc
const ClientTasksTab = ({ clientId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTasks();
  }, [clientId]);
  
  const fetchTasks = async () => {
    try {
      setLoading(true);
      // TODO: Trong thực tế, cần API để lấy các task của client
      // Mock dữ liệu cho mục đích demo
      setTasks([
        { id: '1', title: 'Thu tiền', completed: true, created_at: new Date('2023-05-17T19:37:00'), completed_at: new Date('2023-05-21T16:31:00') },
        { id: '2', title: 'Làm BBNT', completed: true, created_at: new Date('2023-05-17T19:19:00'), completed_at: new Date('2023-05-17T19:36:00') },
        { id: '3', title: 'Tạo hợp đồng', completed: true, created_at: new Date('2023-05-17T19:19:00'), completed_at: new Date('2023-05-17T19:36:00') }
      ]);
    } catch (error) {
      console.error("Error fetching client tasks:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Thêm công việc mới..."
            className="w-full pl-3 pr-10 py-2 border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <button className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-600">
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-white shadow overflow-hidden rounded-lg border p-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                checked={task.completed}
                readOnly
              />
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${task.completed ? "text-gray-500 line-through" : "text-gray-900"}`}>
                  {task.title}
                </p>
                <div className="mt-1 text-xs text-gray-500">
                  <span>Tạo: {task.created_at.toLocaleDateString('vi-VN')} {task.created_at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  {task.completed && (
                    <>
                      <span className="mx-2">•</span>
                      <span>Hoàn thành: {task.completed_at.toLocaleDateString('vi-VN')} {task.completed_at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-500">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tab Hợp đồng
const ClientContractsTab = ({ clientId }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchContracts();
  }, [clientId]);
  
  const fetchContracts = async () => {
    try {
      setLoading(true);
      // TODO: Trong thực tế, cần API để lấy hợp đồng của client
      // Giả lập dữ liệu cho mục đích demo
      setContracts([
        { id: '1', name: 'Hợp đồng 2', status: 'signed', created_at: new Date(), url: '#' }
      ]);
    } catch (error) {
      console.error("Error fetching client contracts:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Hợp đồng</h3>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Thêm hợp đồng
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tên file
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Link
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.map(contract => (
              <tr key={contract.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{contract.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <a href={contract.url} className="text-indigo-600 hover:text-indigo-900 flex items-center text-sm">
                    <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Xem hợp đồng
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Đã ký
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-3">
                    <button className="text-indigo-600 hover:text-indigo-900">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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

// Component Quản lý Công việc mới
const Tasks = () => {
  return <WorkManagement />;
};

// Component Modal thêm/sửa task
const TaskModal = ({ isOpen, onClose, formData, setFormData, handleInputChange, handleSubmit, projects, users }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Thêm Công việc mới
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tên công việc *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Nhập tên công việc"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Loại công việc</label>
                      <select
                        name="task_type"
                        value={formData.task_type}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Chọn loại công việc</option>
                        <option value="development">Phát triển</option>
                        <option value="design">Thiết kế</option>
                        <option value="marketing">Marketing</option>
                        <option value="content">Nội dung</option>
                        <option value="testing">Kiểm thử</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dự án</label>
                      <select
                        name="project_id"
                        value={formData.project_id}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Không thuộc dự án nào</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Giao cho</label>
                      <select
                        name="assigned_to"
                        value={formData.assigned_to}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Chưa phân công</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Độ ưu tiên</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                        <option value="urgent">Gấp</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Deadline</label>
                      <input
                        type="datetime-local"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Mô tả ngắn</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Mô tả ngắn về công việc"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Nội dung chi tiết</label>
                    <textarea
                      name="rich_content"
                      value={formData.rich_content}
                      onChange={handleInputChange}
                      rows={5}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Nội dung chi tiết về công việc (hỗ trợ rich text sau)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Tạo công việc
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Component Modal feedback
const FeedbackModal = ({ isOpen, onClose, task, feedbacks, newFeedback, setNewFeedback, handleSendFeedback }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Feedback cho: {task.title}
                </h3>
                
                {/* Danh sách feedback */}
                <div className="mb-4 max-h-60 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {feedbacks.length > 0 ? (
                    <div className="space-y-3">
                      {feedbacks.map((feedback) => (
                        <div key={feedback.id} className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm text-gray-900">
                              {feedback.user_name || "Người dùng"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(feedback.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{feedback.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Chưa có feedback nào</p>
                  )}
                </div>

                {/* Form thêm feedback */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thêm feedback mới
                  </label>
                  <textarea
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    rows={3}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Nhập feedback của bạn..."
                  />
                  <button
                    onClick={handleSendFeedback}
                    disabled={!newFeedback.trim()}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Gửi Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    urgent: 0,
    todo: 0,
    in_progress: 0,
    due_today: 0,
    overdue: 0
  });
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  
  // Form states
  const [formData, setFormData] = useState({
    title: "",
    project_id: "",
    description: "",
    rich_content: "",
    task_type: "",
    assigned_to: "",
    due_date: "",
    priority: "medium",
    status: "todo"
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
      fetchStats();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Không thể cập nhật trạng thái công việc");
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Công việc</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
