import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { AuthContext } from '../App.js';

// Use environment variable for API URL
const API = process.env.REACT_APP_BACKEND_URL || '';

const HumanResources = ({ user }) => {
  const [activeTab, setActiveTab] = useState('management'); // management, teams, performance, permissions
  
  // Tab content rendering
  const renderTabContent = () => {
    switch (activeTab) {
      case 'management':
        return <HumanResourcesManagement user={user} />;
      case 'teams':
        return <TeamManagement user={user} />;
      case 'performance':
        return <PerformanceTracking user={user} />;
      case 'permissions':
        return <PermissionManagement user={user} />;
      default:
        return <HumanResourcesManagement user={user} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý nhân sự</h2>
          <p className="text-gray-600">Quản lý thông tin và tài khoản nhân viên công ty</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('management')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'management'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Quản lý nhân sự
            </div>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'teams'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team
            </div>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'performance'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Hiệu suất
            </div>
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'permissions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Phân quyền
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

// Human Resources Management Tab (original functionality with Team column)
const HumanResourcesManagement = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'staff',
    password: '',
    is_active: true
  });

  // Role options in Vietnamese
  const roleOptions = [
    { value: 'admin', label: 'Quản trị viên', color: 'red' },
    { value: 'account', label: 'Account Manager', color: 'blue' },
    { value: 'manager', label: 'Quản lý dự án', color: 'purple' },
    { value: 'creative', label: 'Creative Director', color: 'indigo' },
    { value: 'content', label: 'Content Creator', color: 'green' },
    { value: 'design', label: 'Designer', color: 'pink' },
    { value: 'editor', label: 'Editor', color: 'orange' },
    { value: 'sale', label: 'Sales', color: 'yellow' },
    { value: 'staff', label: 'Nhân viên', color: 'gray' }
  ];

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter, statusFilter, searchTerm]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Filter by search term (searching in full_name and email)
      const response = await axios.get(`${API}/api/users/`);
      
      let filteredEmployees = response.data;
      
      // Apply filters
      if (roleFilter) {
        filteredEmployees = filteredEmployees.filter(emp => emp.role === roleFilter);
      }
      
      if (statusFilter) {
        const isActive = statusFilter === 'active';
        filteredEmployees = filteredEmployees.filter(emp => emp.is_active === isActive);
      }
      
      if (searchTerm) {
        filteredEmployees = filteredEmployees.filter(emp => 
          emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Không thể tải danh sách nhân sự');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // Update employee - need to construct proper request for user update
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role
        };
        
        // Since we don't have a specific user update endpoint by ID for other users,
        // we'll need to handle this differently based on API structure
        if (currentEmployee.id === user?.id) {
          // Update current user
          await axios.put(`${API}/api/users/me/`, updateData);
        } else {
          // For other users, we might need a different approach
          // Since backend doesn't have PUT /api/users/{id}, we'll use available endpoints
          toast.warning('Chỉ có thể chỉnh sửa thông tin cá nhân của bạn');
          return;
        }
        
        // Update status separately if needed
        if (formData.is_active !== currentEmployee.is_active) {
          await axios.put(`${API}/api/users/${currentEmployee.id}/status`, 
            { is_active: formData.is_active }
          );
        }
        
        toast.success('Cập nhật nhân sự thành công!');
      } else {
        // Create new employee
        await axios.post(`${API}/api/users/`, formData);
        toast.success('Thêm nhân sự mới thành công!');
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      const errorMessage = error.response?.data?.detail || 
        (isEditing ? 'Không thể cập nhật nhân sự' : 'Không thể tạo nhân sự mới');
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      role: 'staff',
      password: '',
      is_active: true
    });
    setIsEditing(false);
    setCurrentEmployee(null);
  };

  const handleEdit = (employee) => {
    setCurrentEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      email: employee.email,
      role: employee.role,
      password: '', // Don't show current password
      is_active: employee.is_active
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân sự này? Hành động này không thể hoàn tác.')) {
      try {
        await axios.delete(`${API}/api/users/${employeeId}`);
        toast.success('Xóa nhân sự thành công!');
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error(error.response?.data?.detail || 'Không thể xóa nhân sự');
      }
    }
  };

  const handleStatusToggle = async (employee) => {
    try {
      await axios.put(`${API}/api/users/${employee.id}/status`, 
        { is_active: !employee.is_active }
      );
      toast.success(`${!employee.is_active ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản thành công!`);
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error('Không thể cập nhật trạng thái tài khoản');
    }
  };

  const handleResetPassword = async (employee) => {
    const newPassword = prompt('Nhập mật khẩu mới cho nhân sự này:');
    if (newPassword && newPassword.length >= 6) {
      try {
        await axios.put(`${API}/api/users/${employee.id}/password`, 
          { new_password: newPassword }
        );
        toast.success('Reset mật khẩu thành công!');
      } catch (error) {
        console.error('Error resetting password:', error);
        toast.error('Không thể reset mật khẩu');
      }
    } else if (newPassword !== null) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(employees.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (employeeId) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const handleBulkStatusUpdate = async (isActive) => {
    try {
      // Note: This would need a bulk update API endpoint
      // For now, we'll update one by one
      for (const employeeId of selectedEmployees) {
        await axios.put(`${API}/api/users/${employeeId}/status`, 
          { is_active: isActive }
        );
      }
      toast.success(`${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản thành công!`);
      setSelectedEmployees([]);
      setBulkActionMenuOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error bulk updating status:', error);
      toast.error('Không thể cập nhật trạng thái hàng loạt');
    }
  };

  const getRoleInfo = (role) => {
    const roleInfo = roleOptions.find(opt => opt.value === role);
    return roleInfo || { label: role, color: 'gray' };
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'green' : 'red';
  };

  const getStatusLabel = (isActive) => {
    return isActive ? 'Hoạt động' : 'Vô hiệu hóa';
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải danh sách nhân sự...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
          title="Thêm nhân sự mới"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm nhân sự
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả vị trí</option>
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Vô hiệu hóa</option>
            </select>
          </div>
          <div className="relative">
            <button
              onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)}
              disabled={selectedEmployees.length === 0}
              className={`w-full px-3 py-2 text-sm border rounded-md ${
                selectedEmployees.length === 0 
                  ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Thao tác hàng loạt ({selectedEmployees.length})
            </button>
            {bulkActionMenuOpen && selectedEmployees.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleBulkStatusUpdate(true)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Kích hoạt tất cả
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate(false)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Vô hiệu hóa tất cả
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 flex items-center">
            Tổng: {employees.length} nhân sự
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng nhân sự</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
              <p className="text-2xl font-bold text-green-600">
                {employees.filter(emp => emp.is_active).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vô hiệu hóa</p>
              <p className="text-2xl font-bold text-red-600">
                {employees.filter(emp => !emp.is_active).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Quản lý</p>
              <p className="text-2xl font-bold text-purple-600">
                {employees.filter(emp => ['admin', 'manager', 'account'].includes(emp.role)).length}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhân sự
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vị trí
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tham gia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => {
                const roleInfo = getRoleInfo(employee.role);
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleSelectEmployee(employee.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {employee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        roleInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                        roleInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        roleInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                        roleInfo.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                        roleInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                        roleInfo.color === 'pink' ? 'bg-pink-100 text-pink-800' :
                        roleInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                        roleInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.team_names && employee.team_names.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {employee.team_names.map((teamName, index) => (
                              <span key={index} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {teamName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chưa có team</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getStatusColor(employee.is_active) === 'green' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {getStatusLabel(employee.is_active)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(employee.created_at), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === employee.id ? null : employee.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                        {actionMenuOpen === employee.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleEdit(employee);
                                  setActionMenuOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Chỉnh sửa thông tin
                              </button>
                              <button
                                onClick={() => {
                                  handleStatusToggle(employee);
                                  setActionMenuOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {employee.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản
                              </button>
                              <button
                                onClick={() => {
                                  handleResetPassword(employee);
                                  setActionMenuOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Reset mật khẩu
                              </button>
                              {user?.role === 'admin' && employee.id !== user.id && (
                                <button
                                  onClick={() => {
                                    handleDelete(employee.id);
                                    setActionMenuOpen(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  Xóa nhân sự
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {employees.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            Chưa có nhân sự nào
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Employee */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Chỉnh sửa thông tin nhân sự' : 'Thêm nhân sự mới'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vị trí công việc *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Kích hoạt tài khoản ngay
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {isEditing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Team Management Tab
const TeamManagement = ({ user }) => {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTeamMemberModalOpen, setIsTeamMemberModalOpen] = useState(false);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    is_active: true
  });

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue', class: 'bg-blue-500' },
    { value: '#10B981', label: 'Green', class: 'bg-green-500' },
    { value: '#F59E0B', label: 'Yellow', class: 'bg-yellow-500' },
    { value: '#EF4444', label: 'Red', class: 'bg-red-500' },
    { value: '#8B5CF6', label: 'Purple', class: 'bg-purple-500' },
    { value: '#EC4899', label: 'Pink', class: 'bg-pink-500' },
    { value: '#06B6D4', label: 'Cyan', class: 'bg-cyan-500' },
    { value: '#84CC16', label: 'Lime', class: 'bg-lime-500' }
  ];

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, [searchTerm]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/teams/`, {
        params: { search: searchTerm }
      });
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Không thể tải danh sách team');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/api/users/`);
      setUsers(response.data.filter(u => u.is_active));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTeamMembers = async (teamId) => {
    try {
      const response = await axios.get(`${API}/api/teams/${teamId}/members/`);
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Không thể tải danh sách thành viên');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`${API}/api/teams/${currentTeam.id}`, formData);
        toast.success('Cập nhật team thành công!');
      } else {
        await axios.post(`${API}/api/teams/`, formData);
        toast.success('Tạo team mới thành công!');
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      const errorMessage = error.response?.data?.detail || 
        (isEditing ? 'Không thể cập nhật team' : 'Không thể tạo team mới');
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3B82F6',
      is_active: true
    });
    setIsEditing(false);
    setCurrentTeam(null);
  };

  const handleEdit = (team) => {
    setCurrentTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color,
      is_active: team.is_active
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (teamId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa team này? Hành động này không thể hoàn tác.')) {
      try {
        await axios.delete(`${API}/api/teams/${teamId}`);
        toast.success('Xóa team thành công!');
        fetchTeams();
      } catch (error) {
        console.error('Error deleting team:', error);
        toast.error(error.response?.data?.detail || 'Không thể xóa team');
      }
    }
  };

  const handleManageMembers = (team) => {
    setSelectedTeamForMembers(team);
    fetchTeamMembers(team.id);
    setIsTeamMemberModalOpen(true);
  };

  const handleAddMember = async (userId) => {
    try {
      await axios.post(`${API}/api/teams/${selectedTeamForMembers.id}/members/`, {
        user_id: userId,
        role: 'member'
      });
      toast.success('Thêm thành viên thành công!');
      fetchTeamMembers(selectedTeamForMembers.id);
      fetchTeams(); // Refresh to update member count
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error.response?.data?.detail || 'Không thể thêm thành viên');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await axios.delete(`${API}/api/teams/${selectedTeamForMembers.id}/members/${userId}`);
      toast.success('Xóa thành viên thành công!');
      fetchTeamMembers(selectedTeamForMembers.id);
      fetchTeams(); // Refresh to update member count
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Không thể xóa thành viên');
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/api/teams/${selectedTeamForMembers.id}/members/${userId}`, {
        new_role: newRole
      });
      toast.success('Cập nhật role thành công!');
      fetchTeamMembers(selectedTeamForMembers.id);
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Không thể cập nhật role');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải danh sách team...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tạo team mới
        </button>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Team Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: team.color }}
                  ></div>
                  <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    team.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {team.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </span>
                </div>
              </div>

              {/* Team Description */}
              <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
                {team.description || 'Chưa có mô tả'}
              </p>

              {/* Team Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {team.member_count} thành viên
                </div>
                <div className="text-xs text-gray-400">
                  {format(new Date(team.created_at), 'dd/MM/yyyy')}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleManageMembers(team)}
                  className="flex-1 bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Quản lý thành viên
                </button>
                <button
                  onClick={() => handleEdit(team)}
                  className="bg-gray-50 text-gray-700 text-sm px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Sửa
                </button>
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md hover:bg-red-100 transition-colors"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-20">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có team nào</h3>
          <p className="mt-1 text-sm text-gray-500">Bắt đầu bằng cách tạo team đầu tiên.</p>
        </div>
      )}

      {/* Modal for Add/Edit Team */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Chỉnh sửa team' : 'Tạo team mới'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên team *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ví dụ: Marketing Team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Mô tả ngắn về team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Màu đại diện
                </label>
                <div className="flex space-x-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Kích hoạt team
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {isEditing ? 'Cập nhật' : 'Tạo team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members Modal */}
      {isTeamMemberModalOpen && selectedTeamForMembers && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Quản lý thành viên - {selectedTeamForMembers.name}
              </h3>
              <button
                onClick={() => setIsTeamMemberModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Members */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Thành viên hiện tại ({teamMembers.length})</h4>
              {teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-gray-700">
                            {member.user_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.user_name}</div>
                          <div className="text-xs text-gray-500">{member.user_email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="member">Thành viên</option>
                          <option value="leader">Leader</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Chưa có thành viên nào</p>
              )}
            </div>

            {/* Add Members */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Thêm thành viên</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users
                  .filter(u => !teamMembers.some(m => m.user_id === u.id))
                  .map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-gray-700">
                            {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">{user.email} • {user.role}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user.id)}
                        className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700"
                      >
                        Thêm
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Performance Tracking Tab
const PerformanceTracking = ({ user }) => {
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUserPerformance, setSelectedUserPerformance] = useState(null);

  const periodOptions = [
    { value: 'daily', label: 'Hôm nay' },
    { value: 'weekly', label: 'Tuần này' },
    { value: 'monthly', label: 'Tháng này' },
    { value: 'quarterly', label: 'Quý này' },
    { value: 'yearly', label: 'Năm này' }
  ];

  useEffect(() => {
    fetchPerformanceData();
    fetchTeams();
  }, [selectedPeriod, selectedTeam]);

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API}/api/teams/`);
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const params = {
        period_type: selectedPeriod,
        ...(selectedTeam && { team_id: selectedTeam })
      };
      const response = await axios.get(`${API}/api/performance/summary`, { params });
      setPerformanceData(response.data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Không thể tải dữ liệu hiệu suất');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const getPerformanceLabel = (score) => {
    if (score >= 80) return 'Xuất sắc';
    if (score >= 60) return 'Tốt';
    if (score >= 40) return 'Trung bình';
    return 'Cần cải thiện';
  };

  const handleViewDetails = async (userData) => {
    try {
      const response = await axios.get(`${API}/api/performance/users/${userData.user_id}`, {
        params: { period_type: selectedPeriod }
      });
      setSelectedUserPerformance({
        ...userData,
        detailed_metrics: response.data
      });
      setDetailModalOpen(true);
    } catch (error) {
      console.error('Error fetching detailed performance:', error);
      toast.error('Không thể tải chi tiết hiệu suất');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu hiệu suất...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              Tổng: {performanceData.length} nhân sự
            </div>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performanceData.map((userData) => {
          const performance = userData.current_performance;
          const performanceColor = getPerformanceColor(performance.overall_performance_score);
          const performanceLabel = getPerformanceLabel(performance.overall_performance_score);

          return (
            <div key={userData.user_id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                 onClick={() => handleViewDetails(userData)}>
              <div className="p-6">
                {/* User Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-gray-700">
                        {userData.user_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{userData.user_name}</h3>
                      <p className="text-sm text-gray-500">{userData.user_role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      #{performance.productivity_rank || '--'}
                    </div>
                    <div className="text-xs text-gray-500">Xếp hạng</div>
                  </div>
                </div>

                {/* Teams */}
                {userData.team_names.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {userData.team_names.map((teamName, index) => (
                        <span key={index} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {teamName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Điểm tổng thể</span>
                    <span className={`text-sm font-semibold ${
                      performanceColor === 'green' ? 'text-green-600' :
                      performanceColor === 'yellow' ? 'text-yellow-600' :
                      performanceColor === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(performance.overall_performance_score)}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        performanceColor === 'green' ? 'bg-green-500' :
                        performanceColor === 'yellow' ? 'bg-yellow-500' :
                        performanceColor === 'orange' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${performance.overall_performance_score}%` }}
                    ></div>
                  </div>
                  <div className="text-center mt-1">
                    <span className={`text-xs font-medium ${
                      performanceColor === 'green' ? 'text-green-600' :
                      performanceColor === 'yellow' ? 'text-yellow-600' :
                      performanceColor === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {performanceLabel}
                    </span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {performance.completed_tasks}/{performance.total_tasks}
                    </div>
                    <div className="text-xs text-gray-500">Tasks hoàn thành</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.round(performance.task_completion_rate)}%
                    </div>
                    <div className="text-xs text-gray-500">Tỷ lệ hoàn thành</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {performance.total_projects}
                    </div>
                    <div className="text-xs text-gray-500">Dự án tham gia</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {performance.overdue_tasks}
                    </div>
                    <div className="text-xs text-gray-500">Tasks quá hạn</div>
                  </div>
                </div>

                {/* Trends */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    {userData.task_completion_trend >= 0 ? (
                      <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    <span className={userData.task_completion_trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(Math.round(userData.task_completion_trend))}% hoàn thành
                    </span>
                  </div>
                  <div className="flex items-center">
                    {userData.performance_trend >= 0 ? (
                      <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    <span className={userData.performance_trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(Math.round(userData.performance_trend))}% tổng thể
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {performanceData.length === 0 && (
        <div className="text-center py-20">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có dữ liệu hiệu suất</h3>
          <p className="mt-1 text-sm text-gray-500">Dữ liệu hiệu suất sẽ hiển thị khi có hoạt động từ nhân sự.</p>
        </div>
      )}

      {/* Detailed Performance Modal */}
      {detailModalOpen && selectedUserPerformance && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Chi tiết hiệu suất - {selectedUserPerformance.user_name}
              </h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Overview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Tổng quan</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {Math.round(selectedUserPerformance.detailed_metrics.overall_performance_score)}
                    </div>
                    <div className="text-sm text-gray-600">Điểm tổng thể</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      #{selectedUserPerformance.current_performance.productivity_rank || '--'}
                    </div>
                    <div className="text-sm text-gray-600">Xếp hạng</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(selectedUserPerformance.detailed_metrics.task_completion_rate)}%
                    </div>
                    <div className="text-sm text-gray-600">Tỷ lệ hoàn thành</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedUserPerformance.detailed_metrics.total_projects}
                    </div>
                    <div className="text-sm text-gray-600">Dự án</div>
                  </div>
                </div>
              </div>

              {/* Task Metrics */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Hiệu suất công việc</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">
                      {selectedUserPerformance.detailed_metrics.total_tasks}
                    </div>
                    <div className="text-sm text-gray-600">Tổng số task</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-green-600">
                      {selectedUserPerformance.detailed_metrics.completed_tasks}
                    </div>
                    <div className="text-sm text-gray-600">Hoàn thành</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-red-600">
                      {selectedUserPerformance.detailed_metrics.overdue_tasks}
                    </div>
                    <div className="text-sm text-gray-600">Quá hạn</div>
                  </div>
                </div>
              </div>

              {/* Project Metrics */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Tham gia dự án</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-blue-600">
                      {selectedUserPerformance.detailed_metrics.active_projects}
                    </div>
                    <div className="text-sm text-gray-600">Đang thực hiện</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-green-600">
                      {selectedUserPerformance.detailed_metrics.completed_projects}
                    </div>
                    <div className="text-sm text-gray-600">Hoàn thành</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-indigo-600">
                      {Math.round(selectedUserPerformance.detailed_metrics.project_involvement_score)}
                    </div>
                    <div className="text-sm text-gray-600">Điểm tham gia</div>
                  </div>
                </div>
              </div>

              {/* Quality Metrics */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Chất lượng</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-purple-600">
                      {selectedUserPerformance.detailed_metrics.total_feedbacks}
                    </div>
                    <div className="text-sm text-gray-600">Feedback nhận được</div>
                  </div>
                  <div className="bg-white p-4 border rounded-lg">
                    <div className="text-lg font-semibold text-yellow-600">
                      {selectedUserPerformance.detailed_metrics.avg_task_completion_time 
                        ? `${Math.round(selectedUserPerformance.detailed_metrics.avg_task_completion_time)}h`
                        : '--'
                      }
                    </div>
                    <div className="text-sm text-gray-600">Thời gian TB/task</div>
                  </div>
                </div>
              </div>

              {/* Financial Impact */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Đóng góp tài chính</h4>
                <div className="bg-white p-4 border rounded-lg">
                  <div className="text-lg font-semibold text-green-600">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(selectedUserPerformance.detailed_metrics.revenue_contribution)}
                  </div>
                  <div className="text-sm text-gray-600">Doanh thu đóng góp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Permission Management Tab  
const PermissionManagement = ({ user }) => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [permissionMode, setPermissionMode] = useState('role'); // 'role' or 'user'
  const [selectedTarget, setSelectedTarget] = useState('');
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissionMatrix, setPermissionMatrix] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTarget) {
      fetchPermissionMatrix();
    }
  }, [permissionMode, selectedTarget]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [rolesResponse, usersResponse] = await Promise.all([
        axios.get(`${API}/api/permissions/roles`),
        axios.get(`${API}/api/permissions/users`)
      ]);
      
      setRoles(rolesResponse.data);
      setUsers(usersResponse.data);
      
      // Set default selection
      if (rolesResponse.data.length > 0) {
        setSelectedTarget(rolesResponse.data[0].value);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Không thể tải dữ liệu phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionMatrix = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/permissions/matrix/${permissionMode}/${selectedTarget}`);
      setPermissionMatrix(response.data);
      
      // Initialize permissions state
      const initialPermissions = {};
      response.data.current_permissions.forEach(perm => {
        initialPermissions[perm.permission_id] = {
          can_view: perm.can_view,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
          override_role: perm.override_role || false
        };
      });
      setPermissions(initialPermissions);
    } catch (error) {
      console.error('Error fetching permission matrix:', error);
      toast.error('Không thể tải ma trận phân quyền');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permissionId, permissionType, value) => {
    setPermissions(prev => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        [permissionType]: value
      }
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setSaving(true);
      
      // Convert permissions to API format
      const permissionList = Object.entries(permissions).map(([permissionId, perms]) => ({
        permission_id: permissionId,
        can_view: perms.can_view || false,
        can_edit: perms.can_edit || false,
        can_delete: perms.can_delete || false,
        ...(permissionMode === 'user' && { override_role: perms.override_role || false })
      }));

      const endpoint = permissionMode === 'role' 
        ? `/api/permissions/role/${selectedTarget}/update`
        : `/api/permissions/user/${selectedTarget}/update`;

      await axios.post(`${API}${endpoint}`, permissionList);
      toast.success('Cập nhật phân quyền thành công!');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Không thể lưu phân quyền');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionValue = (permissionId, permissionType) => {
    return permissions[permissionId]?.[permissionType] || false;
  };

  const getSelectedTargetName = () => {
    if (permissionMode === 'role') {
      const role = roles.find(r => r.value === selectedTarget);
      return role?.label || selectedTarget;
    } else {
      const user = users.find(u => u.id === selectedTarget);
      return user?.full_name || selectedTarget;
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu phân quyền...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quản lý Phân quyền</h3>
          <p className="text-gray-600">Cấu hình quyền truy cập cho từng vị trí và nhân sự</p>
        </div>
        {selectedTarget && (
          <button
            onClick={handleSavePermissions}
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang lưu...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Lưu phân quyền
              </>
            )}
          </button>
        )}
      </div>

      {/* Mode Selection */}
      <div className="bg-white rounded-lg border p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Chế độ phân quyền</h4>
        
        <div className="flex space-x-4 mb-6">
          <label className="flex items-center">
            <input
              type="radio"
              value="role"
              checked={permissionMode === 'role'}
              onChange={(e) => {
                setPermissionMode(e.target.value);
                setSelectedTarget(roles[0]?.value || '');
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium">Phân quyền theo vị trí</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="user"
              checked={permissionMode === 'user'}
              onChange={(e) => {
                setPermissionMode(e.target.value);
                setSelectedTarget(users[0]?.id || '');
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium">Phân quyền theo nhân sự</span>
          </label>
        </div>

        {/* Target Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {permissionMode === 'role' ? 'Chọn vị trí' : 'Chọn nhân sự'}
          </label>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">-- Chọn --</option>
            {(permissionMode === 'role' ? roles : users).map(item => (
              <option key={permissionMode === 'role' ? item.value : item.id} value={permissionMode === 'role' ? item.value : item.id}>
                {permissionMode === 'role' ? item.label : `${item.full_name} (${item.email})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permission Matrix */}
      {selectedTarget && permissionMatrix && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-md font-semibold text-gray-900">
              Phân quyền cho: <span className="text-indigo-600">{getSelectedTargetName()}</span>
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Tích chọn các quyền tương ứng cho từng hạng mục
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                    Hạng mục
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Xem
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Sửa
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Xóa
                  </th>
                  {permissionMode === 'user' && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ghi đè Role
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissionMatrix.categories.map(category => {
                  const categoryItems = permissionMatrix.items.filter(item => item.category_id === category.id);
                  
                  return (
                    <React.Fragment key={category.id}>
                      {/* Category Header */}
                      <tr className="bg-blue-50">
                        <td colSpan={permissionMode === 'user' ? 5 : 4} className="px-6 py-3">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V9a2 2 0 00-2-2H5z" />
                            </svg>
                            <span className="font-semibold text-blue-900">{category.display_name}</span>
                            {category.description && (
                              <span className="ml-2 text-sm text-blue-700">({category.description})</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Category Items */}
                      {categoryItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.display_name}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500">{item.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={getPermissionValue(item.id, 'can_view')}
                              onChange={(e) => handlePermissionChange(item.id, 'can_view', e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={getPermissionValue(item.id, 'can_edit')}
                              onChange={(e) => handlePermissionChange(item.id, 'can_edit', e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={getPermissionValue(item.id, 'can_delete')}
                              onChange={(e) => handlePermissionChange(item.id, 'can_delete', e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          {permissionMode === 'user' && (
                            <td className="px-6 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={getPermissionValue(item.id, 'override_role')}
                                onChange={(e) => handlePermissionChange(item.id, 'override_role', e.target.checked)}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                title="Ghi đè quyền từ vị trí"
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="space-y-1">
                <div>• <strong>Xem:</strong> Quyền xem và truy cập</div>
                <div>• <strong>Sửa:</strong> Quyền chỉnh sửa và cập nhật</div>
                <div>• <strong>Xóa:</strong> Quyền xóa và loại bỏ</div>
              </div>
              {permissionMode === 'user' && (
                <div className="text-right">
                  <div className="text-red-600">• <strong>Ghi đè Role:</strong> Ưu tiên quyền cá nhân hơn quyền vị trí</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedTarget && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn đối tượng phân quyền</h3>
          <p className="text-gray-600">
            Vui lòng chọn vị trí hoặc nhân sự để cấu hình phân quyền
          </p>
        </div>
      )}
    </div>
  );
};

export default HumanResources;