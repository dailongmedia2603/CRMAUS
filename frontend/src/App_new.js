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

// Documents component wrapper
const Documents = () => {
  const { user } = React.useContext(AuthContext);
  return <DocumentsComponent user={user} />;
};

// Templates component wrapper
const Templates = () => {
  const { user } = React.useContext(AuthContext);
  return <TemplatesComponent user={user} />;
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
          <div className="py-6 px-8 max-w-none">
            <div className="w-full max-w-none">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/task" element={<Task />} />
                <Route path="/task-templates" element={<Templates />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/revenue" element={<Revenue />} />
                <Route path="/expense" element={<Expense />} />
                <Route path="/campaigns" element={<CampaignsComponent />} />
                <Route path="/campaigns/:id" element={<CampaignDetailComponent />} />
                <Route path="/documents" element={<Documents />} />
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

          {/* Task */}
          <button
            onClick={() => navigate("/task")}
            className={`${
              location.startsWith("/task")
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
            Task
          </button>

          {/* Dự án (với submenu) */}
          <div>
            <button
              onClick={() => toggleSubmenu("project")}
              className={`${
                location.startsWith("/projects") || location.startsWith("/campaigns")
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
                  onClick={() => navigate("/campaigns")}
                  className={`${
                    location.startsWith("/campaigns")
                      ? "bg-indigo-700 text-white"
                      : "text-indigo-100 hover:bg-indigo-600"
                  } group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left`}
                >
                  Chiến dịch
                </button>
                <button
                  onClick={() => navigate("/task-templates")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Template dịch vụ
                </button>
              </div>
            )}
          </div>

          {/* Tài chính (với submenu) */}
          <div>
            <button
              onClick={() => toggleSubmenu("finance")}
              className={`${
                location.startsWith("/invoices") || location.startsWith("/finance-reports") || location.startsWith("/revenue") || location.startsWith("/expense")
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
                  Hợp đồng - Hóa đơn
                </button>
                <button
                  onClick={() => navigate("/revenue")}
                  className="text-indigo-100 hover:bg-indigo-600 group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left"
                >
                  Thu
                </button>
                <button
                  onClick={() => navigate("/expense")}
                  className={`${
                    location.startsWith("/expense")
                      ? "bg-indigo-700 text-white"
                      : "text-indigo-100 hover:bg-indigo-600"
                  } group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-left`}
                >
                  Chi
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

// Component Expense Management (Quản lý Chi phí)
const Expense = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, expenses, config
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-none">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý Chi phí</h1>
        <p className="text-gray-600">Theo dõi và quản lý tất cả chi phí của doanh nghiệp</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`${
              activeTab === 'expenses'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Chi phí
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`${
              activeTab === 'config'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Cấu hình
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === 'overview' && <ExpenseOverview />}
        {activeTab === 'expenses' && <ExpenseList />}
        {activeTab === 'config' && <ExpenseConfig />}
      </div>
    </div>
  );
};

// Component placeholder cho Revenue
const Revenue = () => (
  <div>
    <h1 className="text-2xl font-semibold text-gray-900">Revenue</h1>
    <p className="text-gray-600">Quản lý doanh thu</p>
  </div>
);

export default App;