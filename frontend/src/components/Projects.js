import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Projects = ({ user }) => {
  // State management
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);  // Thêm campaigns
  const [usersByRole, setUsersByRole] = useState({  // Thêm users theo role
    manager: [],
    account: [],
    content: [],
    design: [],
    editor: [],
    sale: []
  });
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [timeFilter, setTimeFilter] = useState({ type: 'year', year: new Date().getFullYear(), quarter: null, month: null });
  const [statusFilter, setStatusFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  
  // UI states
  const [showTimeFilterDropdown, setShowTimeFilterDropdown] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({});
  
  // Form state
  const [projectForm, setProjectForm] = useState({
    name: '',
    client_id: '',
    campaign_id: '',  // Thêm campaign_id
    description: '',
    start_date: '',
    end_date: '',
    status: 'planning',
    team: [],
    contract_value: '',
    debt: '',
    // Nhân sự triển khai theo vai trò
    manager_ids: [],
    account_ids: [],
    content_ids: [],
    design_ids: [],
    editor_ids: [],
    sale_ids: []
  });

  // Fetch data
  useEffect(() => {
    fetchProjects();
    fetchStatistics();
  }, [timeFilter, statusFilter, teamFilter, searchTerm, showArchived]);

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionDropdownOpen && !event.target.closest('button')) {
        setActionDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionDropdownOpen]);

  // Calculate dropdown position based on screen space
  const calculateDropdownPosition = (projectId, event) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 160; // Estimated height of dropdown
    
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    let position = {};
    
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      // Show above
      position = {
        bottom: '100%',
        right: '0',
        marginBottom: '4px'
      };
    } else {
      // Show below (default)
      position = {
        top: '100%',
        right: '0',
        marginTop: '4px'
      };
    }
    
    setDropdownPosition(prev => ({ ...prev, [projectId]: position }));
  };

  const handleDropdownToggle = (projectId, event) => {
    if (actionDropdownOpen === projectId) {
      setActionDropdownOpen(null);
    } else {
      calculateDropdownPosition(projectId, event);
      setActionDropdownOpen(projectId);
    }
  };

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams({
        archived: showArchived,
        ...(statusFilter && { status: statusFilter }),
        ...(teamFilter && { team_member: teamFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(timeFilter.year && { year: timeFilter.year }),
        ...(timeFilter.quarter && { quarter: timeFilter.quarter }),
        ...(timeFilter.month && { month: timeFilter.month })
      });

      const response = await axios.get(`${API}/projects/?${params}`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Không thể tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams({
        ...(timeFilter.year && { year: timeFilter.year }),
        ...(timeFilter.quarter && { quarter: timeFilter.quarter }),
        ...(timeFilter.month && { month: timeFilter.month })
      });

      const response = await axios.get(`${API}/projects/statistics?${params}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients/`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/`);
      setCampaigns(response.data.filter(campaign => !campaign.archived));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchUsersByRole = async () => {
    const roles = ['manager', 'account', 'content', 'design', 'editor', 'sale'];
    const roleUsers = {};
    
    try {
      for (const role of roles) {
        const response = await axios.get(`${API}/users/by-role/${role}`);
        roleUsers[role] = response.data;
      }
      setUsersByRole(roleUsers);
    } catch (error) {
      console.error('Error fetching users by role:', error);
    }
  };

  // Time filter helpers
  const getTimeFilterLabel = () => {
    if (timeFilter.type === 'year') {
      return `Năm ${timeFilter.year}`;
    } else if (timeFilter.type === 'quarter') {
      return `Quý ${timeFilter.quarter} - ${timeFilter.year}`;
    } else if (timeFilter.type === 'month') {
      const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
      return `${monthNames[timeFilter.month]} - ${timeFilter.year}`;
    }
    return 'Thời gian';
  };

  const handleTimeFilterChange = (type, year, quarter = null, month = null) => {
    setTimeFilter({ type, year, quarter, month });
    setShowTimeFilterDropdown(false);
  };

  // Project CRUD operations
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const projectData = {
        ...projectForm,
        start_date: projectForm.start_date ? new Date(projectForm.start_date).toISOString() : null,
        end_date: projectForm.end_date ? new Date(projectForm.end_date).toISOString() : null,
        budget: projectForm.budget ? parseFloat(projectForm.budget) : null,
        contract_value: projectForm.contract_value ? parseFloat(projectForm.contract_value) : null,
        debt: projectForm.debt ? parseFloat(projectForm.debt) : null
      };

      if (editingProject) {
        await axios.put(`${API}/projects/${editingProject.id}`, projectData);
        toast.success('Cập nhật dự án thành công!');
      } else {
        await axios.post(`${API}/projects/`, projectData);
        toast.success('Tạo dự án thành công!');
      }

      setShowProjectModal(false);
      resetForm();
      fetchProjects();
      fetchStatistics();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Không thể lưu dự án');
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      client_id: project.client_id,
      description: project.description || '',
      start_date: project.start_date ? new Date(project.start_date).toISOString().slice(0, 10) : '',
      end_date: project.end_date ? new Date(project.end_date).toISOString().slice(0, 10) : '',
      budget: project.budget || '',
      status: project.status,
      team: project.team || [],
      contract_value: project.contract_value || '',
      debt: project.debt || ''
    });
    setShowProjectModal(true);
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('Bạn có chắc muốn xóa dự án này?')) {
      try {
        await axios.delete(`${API}/projects/${projectId}`);
        toast.success('Xóa dự án thành công!');
        fetchProjects();
        fetchStatistics();
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Không thể xóa dự án');
      }
    }
  };

  const handleArchive = async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId);
      await axios.put(`${API}/projects/${projectId}`, { ...project, archived: !project.archived });
      toast.success(project.archived ? 'Khôi phục dự án thành công!' : 'Lưu trữ dự án thành công!');
      fetchProjects();
      fetchStatistics();
    } catch (error) {
      console.error('Error archiving project:', error);
      toast.error('Không thể thực hiện thao tác');
    }
  };

  // Bulk operations
  const handleBulkArchive = async () => {
    try {
      await axios.post(`${API}/projects/bulk-archive`, selectedProjects);
      toast.success('Lưu trữ các dự án thành công!');
      setSelectedProjects([]);
      fetchProjects();
      fetchStatistics();
    } catch (error) {
      console.error('Error bulk archiving:', error);
      toast.error('Không thể lưu trữ dự án');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm('Bạn có chắc muốn xóa các dự án đã chọn?')) {
      try {
        await axios.post(`${API}/projects/bulk-delete`, selectedProjects);
        toast.success('Xóa các dự án thành công!');
        setSelectedProjects([]);
        fetchProjects();
        fetchStatistics();
      } catch (error) {
        console.error('Error bulk deleting:', error);
        toast.error('Không thể xóa dự án');
      }
    }
  };

  const resetForm = () => {
    setProjectForm({
      name: '',
      client_id: '',
      description: '',
      start_date: '',
      end_date: '',
      budget: '',
      status: 'planning',
      team: [],
      contract_value: '',
      debt: ''
    });
    setEditingProject(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProjects(projects.map(project => project.id));
    } else {
      setSelectedProjects([]);
    }
  };

  // Helper functions
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'N/A';
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'N/A';
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      overdue: 'bg-red-100 text-red-800',
      pending: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      planning: 'Lập kế hoạch',
      in_progress: 'Đang chạy',
      on_hold: 'Tạm dừng',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      overdue: 'Quá hạn',
      pending: 'Pending'
    };
    return texts[status] || status;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Danh sách dự án</h1>
          
          {/* Time Filter */}
          <div className="relative">
            <button
              onClick={() => setShowTimeFilterDropdown(!showTimeFilterDropdown)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {getTimeFilterLabel()}
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTimeFilterDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <div className="flex border-b">
                    <button 
                      onClick={() => setTimeFilter({...timeFilter, type: 'year', quarter: null, month: null})}
                      className={`px-4 py-2 text-sm font-medium ${timeFilter.type === 'year' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Năm
                    </button>
                    <button 
                      onClick={() => setTimeFilter({...timeFilter, type: 'quarter'})}
                      className={`px-4 py-2 text-sm font-medium ${timeFilter.type === 'quarter' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Quý
                    </button>
                    <button 
                      onClick={() => setTimeFilter({...timeFilter, type: 'month'})}
                      className={`px-4 py-2 text-sm font-medium ${timeFilter.type === 'month' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Tháng
                    </button>
                  </div>
                  
                  {/* Year Tab */}
                  {timeFilter.type === 'year' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Chọn năm:</label>
                      <select
                        value={timeFilter.year}
                        onChange={(e) => handleTimeFilterChange('year', parseInt(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        {[2020, 2021, 2022, 2023, 2024, 2025].map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quarter Tab */}
                  {timeFilter.type === 'quarter' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn năm:</label>
                        <select
                          value={timeFilter.year}
                          onChange={(e) => setTimeFilter({...timeFilter, year: parseInt(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          {[2020, 2021, 2022, 2023, 2024, 2025].map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn quý:</label>
                        <select
                          value={timeFilter.quarter || ''}
                          onChange={(e) => handleTimeFilterChange('quarter', timeFilter.year, parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Chọn quý</option>
                          <option value="1">Quý 1 (Tháng 1-3)</option>
                          <option value="2">Quý 2 (Tháng 4-6)</option>
                          <option value="3">Quý 3 (Tháng 7-9)</option>
                          <option value="4">Quý 4 (Tháng 10-12)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Month Tab */}
                  {timeFilter.type === 'month' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn năm:</label>
                        <select
                          value={timeFilter.year}
                          onChange={(e) => setTimeFilter({...timeFilter, year: parseInt(e.target.value)})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          {[2020, 2021, 2022, 2023, 2024, 2025].map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn tháng:</label>
                        <select
                          value={timeFilter.month || ''}
                          onChange={(e) => handleTimeFilterChange('month', timeFilter.year, null, parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Chọn tháng</option>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                            <option key={month} value={month}>Tháng {month}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div 
          className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng dự án</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.total_projects || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('in_progress')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đang chạy</p>
              <p className="text-2xl font-bold text-blue-900">{statistics.in_progress || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('completed')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hoàn thành</p>
              <p className="text-2xl font-bold text-green-900">{statistics.completed || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-purple-900">{statistics.pending || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div 
          className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setStatusFilter('overdue')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Quá hạn</p>
              <p className="text-2xl font-bold text-red-900">{statistics.overdue || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-3 overflow-x-auto">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-40 pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Tìm kiếm..."
            />
          </div>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="flex-shrink-0 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 min-w-28 max-w-32"
          >
            <option value="">Nhân sự</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.full_name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-shrink-0 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 min-w-28 max-w-32"
          >
            <option value="">Tiến độ</option>
            <option value="planning">Kế hoạch</option>
            <option value="in_progress">Đang chạy</option>
            <option value="completed">Hoàn thành</option>
            <option value="overdue">Quá hạn</option>
            <option value="pending">Pending</option>
          </select>

          {/* Advanced Filter */}
          <button
            onClick={() => setShowAdvancedFilter(true)}
            className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            title="Bộ lọc nâng cao"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </button>

          {/* Archive Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md border whitespace-nowrap ${
              showArchived 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showArchived ? 'Hoạt động' : 'Lưu trữ'}
          </button>

          {/* Spacer */}
          <div className="flex-1 min-w-4"></div>

          {/* Bulk Actions */}
          {selectedProjects.length > 0 && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setBulkActionOpen(!bulkActionOpen)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap"
              >
                Hàng loạt ({selectedProjects.length})
                <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {bulkActionOpen && (
                <>
                  <div 
                    className="dropdown-backdrop" 
                    onClick={() => setBulkActionOpen(false)}
                  />
                  <div className="dropdown-menu">
                    <div className="py-1">
                      <button
                        onClick={handleBulkArchive}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {showArchived ? 'Khôi phục' : 'Lưu trữ'}
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={handleBulkDelete}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Xóa vĩnh viễn
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Add Project */}
          <button
            onClick={() => {
              resetForm();
              setShowProjectModal(true);
            }}
            className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Thêm dự án
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="relative px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedProjects.length > 0 && selectedProjects.length === projects.length}
                    onChange={handleSelectAll}
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên dự án
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá trị HD
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Công nợ
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiến độ
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => {
                        if (selectedProjects.includes(project.id)) {
                          setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                        } else {
                          setSelectedProjects([...selectedProjects, project.id]);
                        }
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getClientName(project.client_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-gray-500 max-w-xs truncate">{project.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{formatDate(project.start_date)} - {formatDate(project.end_date)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.team && project.team.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {project.team.slice(0, 2).map(userId => (
                          <span key={userId} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getUserName(userId)}
                          </span>
                        ))}
                        {project.team.length > 2 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{project.team.length - 2}
                          </span>
                        )}
                      </div>
                    ) : 'Chưa phân công'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(project.contract_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(project.debt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative">
                      <button 
                        className="text-gray-400 hover:text-gray-600 p-1"
                        onClick={(e) => handleDropdownToggle(project.id, e)}
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      
                      {/* Dropdown menu */}
                      {actionDropdownOpen === project.id && (
                        <>
                          <div 
                            className="dropdown-backdrop" 
                            onClick={() => setActionDropdownOpen(null)}
                          />
                          <div 
                            className="dropdown-menu"
                            style={dropdownPosition[project.id] || {}}
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  // Chi tiết dự án - có thể navigate tới trang chi tiết
                                  console.log('View project details:', project.id);
                                  setActionDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Chi tiết
                              </button>
                              <button
                                onClick={() => {
                                  handleEdit(project);
                                  setActionDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => {
                                  handleArchive(project.id);
                                  setActionDropdownOpen(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {project.archived ? 'Khôi phục' : 'Lưu trữ'}
                              </button>
                              {(user?.role === 'admin' || user?.role === 'account') && (
                                <button
                                  onClick={() => {
                                    handleDelete(project.id);
                                    setActionDropdownOpen(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không có dự án</h3>
            <p className="mt-1 text-sm text-gray-500">Bắt đầu bằng cách tạo dự án mới.</p>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-2xl">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProject ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Tên dự án</label>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client</label>
                    <select
                      value={projectForm.client_id}
                      onChange={(e) => setProjectForm({...projectForm, client_id: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Chọn client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                    <select
                      value={projectForm.status}
                      onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="planning">Lập kế hoạch</option>
                      <option value="in_progress">Đang chạy</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="overdue">Quá hạn</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngân sách</label>
                    <input
                      type="number"
                      value={projectForm.budget}
                      onChange={(e) => setProjectForm({...projectForm, budget: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Giá trị hợp đồng</label>
                    <input
                      type="number"
                      value={projectForm.contract_value}
                      onChange={(e) => setProjectForm({...projectForm, contract_value: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Công nợ</label>
                    <input
                      type="number"
                      value={projectForm.debt}
                      onChange={(e) => setProjectForm({...projectForm, debt: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                    <textarea
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows="3"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowProjectModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {editingProject ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      {showAdvancedFilter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Bộ lọc nâng cao</h3>
                <button
                  onClick={() => setShowAdvancedFilter(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Basic Info */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 text-sm border-b pb-2">Thông tin cơ bản</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option value="">Tất cả client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên dự án</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Nhập tên dự án..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option value="">Tất cả trạng thái</option>
                      <option value="planning">Lập kế hoạch</option>
                      <option value="in_progress">Đang chạy</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="overdue">Quá hạn</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option value="">Tất cả nhân sự</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Column 2: Time & Financial */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 text-sm border-b pb-2">Thời gian & Tài chính</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu từ</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu đến</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc từ</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc đến</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Column 3: Budget & Contract */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 text-sm border-b pb-2">Ngân sách & Hợp đồng</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách từ</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="VNĐ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách đến</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="VNĐ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị HĐ từ</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="VNĐ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị HĐ đến</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="VNĐ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Công nợ từ</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="VNĐ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Công nợ đến</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="VNĐ"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t">
                <button
                  onClick={() => setShowAdvancedFilter(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    // Reset all filters
                    setSearchTerm('');
                    setStatusFilter('');
                    setTeamFilter('');
                    // Reset other advanced filter states when implemented
                    setShowAdvancedFilter(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Xóa bộ lọc
                </button>
                <button
                  onClick={() => {
                    // Apply advanced filters logic would go here
                    setShowAdvancedFilter(false);
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;