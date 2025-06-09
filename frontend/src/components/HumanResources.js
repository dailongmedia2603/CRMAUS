import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

// Use environment variable for API URL
const API = process.env.REACT_APP_BACKEND_URL || '/api';

const HumanResources = ({ user }) => {
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
      const params = new URLSearchParams();
      
      // Filter by search term (searching in full_name and email)
      const response = await axios.get(`${API}/users/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
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
          await axios.put(`${API}/api/users/me/`, updateData, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
        } else {
          // For other users, we might need a different approach
          // Since backend doesn't have PUT /api/users/{id}, we'll use available endpoints
          toast.warning('Chỉ có thể chỉnh sửa thông tin cá nhân của bạn');
          return;
        }
        
        // Update status separately if needed
        if (formData.is_active !== currentEmployee.is_active) {
          await axios.put(`${API}/api/users/${currentEmployee.id}/status`, 
            { is_active: formData.is_active }, 
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
        }
        
        toast.success('Cập nhật nhân sự thành công!');
      } else {
        // Create new employee
        await axios.post(`${API}/api/users/`, formData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
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
        await axios.delete(`${API}/users/${employeeId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
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
      await axios.put(`${API}/users/${employee.id}/status`, 
        { is_active: !employee.is_active }, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
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
        await axios.put(`${API}/users/${employee.id}/password`, 
          { new_password: newPassword }, 
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
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
        await axios.put(`${API}/users/${employeeId}/status`, 
          { is_active: isActive }, 
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý nhân sự</h2>
          <p className="text-gray-600">Quản lý thông tin và tài khoản nhân viên công ty</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
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

export default HumanResources;