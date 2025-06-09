import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

// Use relative API path (will be proxied)
const API = '/api';

// Tab 1: Tổng quan với charts và thống kê
export const ExpenseOverview = () => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    quarter: null,
    month: null,
    category_id: null
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchStatistics();
    fetchCategories();
  }, [filters]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      if (filters.quarter) params.append('quarter', filters.quarter);
      if (filters.month) params.append('month', filters.month);
      if (filters.category_id) params.append('category_id', filters.category_id);

      const response = await axios.get(`${API}/expenses/statistics?${params}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Không thể tải thống kê chi phí');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/expense-categories/`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải thống kê...</div>;
  }

  if (!statistics) {
    return <div className="text-center py-10">Không thể tải dữ liệu thống kê</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium mb-4">Bộ lọc</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quý</label>
            <select
              value={filters.quarter || ''}
              onChange={(e) => handleFilterChange('quarter', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả các quý</option>
              <option value={1}>Quý 1</option>
              <option value={2}>Quý 2</option>
              <option value={3}>Quý 3</option>
              <option value={4}>Quý 4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
            <select
              value={filters.month || ''}
              onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả các tháng</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hạng mục</label>
            <select
              value={filters.category_id || ''}
              onChange={(e) => handleFilterChange('category_id', e.target.value || null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả hạng mục</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tổng chi phí</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.amounts.total.toLocaleString('vi-VN')} VNĐ
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chờ duyệt</p>
              <p className="text-2xl font-bold text-orange-600">
                {statistics.amounts.pending.toLocaleString('vi-VN')} VNĐ
              </p>
              <p className="text-xs text-gray-500">{statistics.counts.pending} khoản</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đã duyệt</p>
              <p className="text-2xl font-bold text-blue-600">
                {statistics.amounts.approved.toLocaleString('vi-VN')} VNĐ
              </p>
              <p className="text-xs text-gray-500">{statistics.counts.approved} khoản</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Đã thanh toán</p>
              <p className="text-2xl font-bold text-green-600">
                {statistics.amounts.paid.toLocaleString('vi-VN')} VNĐ
              </p>
              <p className="text-xs text-gray-500">{statistics.counts.paid} khoản</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4">Chi phí theo hạng mục</h3>
          <div className="space-y-3">
            {statistics.by_category.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.category_name}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{item.total_amount.toLocaleString('vi-VN')} VNĐ</span>
                  <span className="text-xs text-gray-500">({item.count} khoản)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium mb-4">Xu hướng chi phí theo tháng</h3>
          {statistics.monthly_trends && statistics.monthly_trends.length > 0 ? (
            <div className="space-y-2">
              {statistics.monthly_trends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Tháng {trend.month}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{trend.total_amount.toLocaleString('vi-VN')} VNĐ</span>
                    <span className="text-xs text-gray-500">({trend.count} khoản)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Không có dữ liệu xu hướng</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Tab 2: Danh sách chi phí với CRUD operations
export const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category_id: '',
    folder_id: '',
    project_id: '',
    client_id: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    vendor: '',
    payment_method: 'cash',
    status: 'pending',
    tags: []
  });

  // Reference data
  const [categories, setCategories] = useState([]);
  const [folders, setFolders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);

  const paymentMethods = [
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'credit_card', label: 'Thẻ tín dụng' },
    { value: 'bank_transfer', label: 'Chuyển khoản' },
    { value: 'check', label: 'Séc' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Chờ duyệt', color: 'orange' },
    { value: 'approved', label: 'Đã duyệt', color: 'blue' },
    { value: 'rejected', label: 'Từ chối', color: 'red' },
    { value: 'paid', label: 'Đã thanh toán', color: 'green' }
  ];

  useEffect(() => {
    fetchExpenses();
    fetchReferenceData();
  }, [statusFilter, categoryFilter, searchTerm]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await axios.get(`${API}/expenses/?${params}`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Không thể tải danh sách chi phí');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [categoriesRes, foldersRes, projectsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/expense-categories/`),
        axios.get(`${API}/expense-folders/`),
        axios.get(`${API}/projects/`),
        axios.get(`${API}/clients/`)
      ]);

      setCategories(categoriesRes.data);
      setFolders(foldersRes.data);
      setProjects(projectsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`${API}/expenses/${currentExpense.id}`, formData);
        toast.success('Cập nhật chi phí thành công!');
      } else {
        await axios.post(`${API}/expenses/`, formData);
        toast.success('Thêm chi phí thành công!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(isEditing ? 'Không thể cập nhật chi phí' : 'Không thể tạo chi phí mới');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category_id: '',
      folder_id: '',
      project_id: '',
      client_id: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      vendor: '',
      payment_method: 'cash',
      status: 'pending',
      tags: []
    });
    setIsEditing(false);
    setCurrentExpense(null);
  };

  const handleEdit = (expense) => {
    setCurrentExpense(expense);
    setFormData({
      title: expense.title,
      amount: expense.amount,
      category_id: expense.category_id,
      folder_id: expense.folder_id || '',
      project_id: expense.project_id || '',
      client_id: expense.client_id || '',
      expense_date: format(new Date(expense.expense_date), 'yyyy-MM-dd'),
      description: expense.description || '',
      vendor: expense.vendor || '',
      payment_method: expense.payment_method,
      status: expense.status,
      tags: expense.tags || []
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chi phí này?')) {
      try {
        await axios.delete(`${API}/expenses/${expenseId}`);
        toast.success('Xóa chi phí thành công!');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Không thể xóa chi phí');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedExpenses.length} chi phí đã chọn?`)) {
      try {
        await axios.post(`${API}/expenses/bulk-delete`, selectedExpenses);
        toast.success('Xóa các chi phí thành công!');
        setSelectedExpenses([]);
        fetchExpenses();
      } catch (error) {
        console.error('Error bulk deleting expenses:', error);
        toast.error('Không thể xóa chi phí');
      }
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    try {
      await axios.post(`${API}/expenses/bulk-update-status`, selectedExpenses, {
        params: { status }
      });
      toast.success('Cập nhật trạng thái thành công!');
      setSelectedExpenses([]);
      setBulkActionMenuOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error bulk updating status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedExpenses(expenses.map(expense => expense.id));
    } else {
      setSelectedExpenses([]);
    }
  };

  const handleSelectExpense = (expenseId) => {
    if (selectedExpenses.includes(expenseId)) {
      setSelectedExpenses(selectedExpenses.filter(id => id !== expenseId));
    } else {
      setSelectedExpenses([...selectedExpenses, expenseId]);
    }
  };

  const getStatusColor = (status) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    return statusConfig ? statusConfig.color : 'gray';
  };

  const getStatusLabel = (status) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    return statusConfig ? statusConfig.label : status;
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải danh sách chi phí...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header và Filter */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Danh sách chi phí</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          title="Thêm chi phí"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Tất cả hạng mục</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <button
              onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)}
              disabled={selectedExpenses.length === 0}
              className={`w-full px-3 py-2 text-sm border rounded-md ${
                selectedExpenses.length === 0 
                  ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Thao tác hàng loạt ({selectedExpenses.length})
            </button>
            {bulkActionMenuOpen && selectedExpenses.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleBulkStatusUpdate('approved')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Duyệt tất cả
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('rejected')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Từ chối tất cả
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('paid')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Đánh dấu đã thanh toán
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Xóa tất cả
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedExpenses.length === expenses.length && expenses.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mã số / Tiêu đề
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hạng mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày chi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedExpenses.includes(expense.id)}
                      onChange={() => handleSelectExpense(expense.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{expense.expense_number}</div>
                    <div className="text-sm text-gray-500">{expense.title}</div>
                    {expense.vendor && (
                      <div className="text-xs text-gray-400">Nhà cung cấp: {expense.vendor}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {expense.amount.toLocaleString('vi-VN')} VNĐ
                    </div>
                    <div className="text-xs text-gray-500">{expense.payment_method}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{expense.category_name}</div>
                    {expense.folder_name && (
                      <div className="text-xs text-gray-500">{expense.folder_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(expense.expense_date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      getStatusColor(expense.status) === 'orange' ? 'bg-orange-100 text-orange-800' :
                      getStatusColor(expense.status) === 'blue' ? 'bg-blue-100 text-blue-800' :
                      getStatusColor(expense.status) === 'red' ? 'bg-red-100 text-red-800' :
                      getStatusColor(expense.status) === 'green' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusLabel(expense.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuOpen(actionMenuOpen === expense.id ? null : expense.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {actionMenuOpen === expense.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                handleEdit(expense);
                                setActionMenuOpen(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(expense.id);
                                setActionMenuOpen(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {expenses.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            Chưa có chi phí nào
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Chỉnh sửa chi phí' : 'Thêm chi phí mới'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hạng mục *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Chọn hạng mục</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thư mục
                  </label>
                  <select
                    value={formData.folder_id}
                    onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Chọn thư mục</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dự án
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Chọn dự án</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khách hàng
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Chọn khách hàng</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày chi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phương thức thanh toán
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {paymentMethods.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhà cung cấp
                  </label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                  {isEditing ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Tab 3: Cấu hình hạng mục và thư mục
export const ExpenseConfig = () => {
  const [activeConfigTab, setActiveConfigTab] = useState('categories'); // categories, folders
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Cấu hình hạng mục và thư mục</h3>
      
      {/* Sub-tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveConfigTab('categories')}
            className={`${
              activeConfigTab === 'categories'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Hạng mục chi phí
          </button>
          <button
            onClick={() => setActiveConfigTab('folders')}
            className={`${
              activeConfigTab === 'folders'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Thư mục
          </button>
        </nav>
      </div>

      {/* Sub-tab Content */}
      {activeConfigTab === 'categories' && <ExpenseCategoryManager />}
      {activeConfigTab === 'folders' && <ExpenseFolderManager />}
    </div>
  );
};

// Component quản lý hạng mục chi phí
export const ExpenseCategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    is_active: true
  });

  const colorOptions = [
    { value: '#3B82F6', label: 'Xanh dương', class: 'bg-blue-500' },
    { value: '#10B981', label: 'Xanh lá', class: 'bg-green-500' },
    { value: '#F59E0B', label: 'Vàng', class: 'bg-yellow-500' },
    { value: '#EF4444', label: 'Đỏ', class: 'bg-red-500' },
    { value: '#8B5CF6', label: 'Tím', class: 'bg-purple-500' },
    { value: '#F97316', label: 'Cam', class: 'bg-orange-500' },
    { value: '#06B6D4', label: 'Cyan', class: 'bg-cyan-500' },
    { value: '#84CC16', label: 'Lime', class: 'bg-lime-500' }
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/expense-categories/`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Không thể tải danh sách hạng mục');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`${API}/expense-categories/${currentCategory.id}`, formData);
        toast.success('Cập nhật hạng mục thành công!');
      } else {
        await axios.post(`${API}/expense-categories/`, formData);
        toast.success('Thêm hạng mục thành công!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(isEditing ? 'Không thể cập nhật hạng mục' : 'Không thể tạo hạng mục mới');
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
    setCurrentCategory(null);
  };

  const handleEdit = (category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      is_active: category.is_active
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hạng mục này? Hành động này không thể hoàn tác.')) {
      try {
        await axios.delete(`${API}/expense-categories/${categoryId}`);
        toast.success('Xóa hạng mục thành công!');
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        if (error.response?.status === 400) {
          toast.error('Không thể xóa hạng mục đã có chi phí');
        } else {
          toast.error('Không thể xóa hạng mục');
        }
      }
    }
  };

  const toggleStatus = async (category) => {
    try {
      await axios.put(`${API}/expense-categories/${category.id}`, {
        ...category,
        is_active: !category.is_active
      });
      toast.success('Cập nhật trạng thái thành công!');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải danh sách hạng mục...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h4 className="text-md font-medium">Quản lý hạng mục chi phí</h4>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          title="Thêm hạng mục"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                ></div>
                <div>
                  <h5 className="font-medium text-gray-900">{category.name}</h5>
                  {category.description && (
                    <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {category.is_active ? 'Hoạt động' : 'Tạm dừng'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => toggleStatus(category)}
                className={`text-xs px-3 py-1 rounded ${
                  category.is_active 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {category.is_active ? 'Tạm dừng' : 'Kích hoạt'}
              </button>
              <button
                onClick={() => handleEdit(category)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Sửa
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          Chưa có hạng mục nào. Hãy thêm hạng mục đầu tiên.
        </div>
      )}

      {/* Modal for Add/Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Chỉnh sửa hạng mục' : 'Thêm hạng mục mới'}
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
                  Tên hạng mục *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Màu sắc
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-2 rounded-md border-2 ${
                        formData.color === color.value ? 'border-gray-400' : 'border-gray-200'
                      } hover:border-gray-400 transition-colors`}
                    >
                      <div className={`w-6 h-6 rounded-full mx-auto ${color.class}`}></div>
                      <div className="text-xs mt-1 text-center">{color.label}</div>
                    </button>
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
                  Kích hoạt ngay
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
                  {isEditing ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Component quản lý thư mục chi phí
export const ExpenseFolderManager = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#10B981',
    is_active: true
  });

  const colorOptions = [
    { value: '#10B981', label: 'Xanh lá', class: 'bg-green-500' },
    { value: '#3B82F6', label: 'Xanh dương', class: 'bg-blue-500' },
    { value: '#F59E0B', label: 'Vàng', class: 'bg-yellow-500' },
    { value: '#EF4444', label: 'Đỏ', class: 'bg-red-500' },
    { value: '#8B5CF6', label: 'Tím', class: 'bg-purple-500' },
    { value: '#F97316', label: 'Cam', class: 'bg-orange-500' },
    { value: '#06B6D4', label: 'Cyan', class: 'bg-cyan-500' },
    { value: '#84CC16', label: 'Lime', class: 'bg-lime-500' }
  ];

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/expense-folders/`);
      setFolders(response.data);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Không thể tải danh sách thư mục');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`${API}/expense-folders/${currentFolder.id}`, formData);
        toast.success('Cập nhật thư mục thành công!');
      } else {
        await axios.post(`${API}/expense-folders/`, formData);
        toast.success('Thêm thư mục thành công!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchFolders();
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error(isEditing ? 'Không thể cập nhật thư mục' : 'Không thể tạo thư mục mới');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#10B981',
      is_active: true
    });
    setIsEditing(false);
    setCurrentFolder(null);
  };

  const handleEdit = (folder) => {
    setCurrentFolder(folder);
    setFormData({
      name: folder.name,
      description: folder.description || '',
      color: folder.color,
      is_active: folder.is_active
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (folderId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thư mục này? Hành động này không thể hoàn tác.')) {
      try {
        await axios.delete(`${API}/expense-folders/${folderId}`);
        toast.success('Xóa thư mục thành công!');
        fetchFolders();
      } catch (error) {
        console.error('Error deleting folder:', error);
        if (error.response?.status === 400) {
          toast.error('Không thể xóa thư mục đã có chi phí');
        } else {
          toast.error('Không thể xóa thư mục');
        }
      }
    }
  };

  const toggleStatus = async (folder) => {
    try {
      await axios.put(`${API}/expense-folders/${folder.id}`, {
        ...folder,
        is_active: !folder.is_active
      });
      toast.success('Cập nhật trạng thái thành công!');
      fetchFolders();
    } catch (error) {
      console.error('Error updating folder status:', error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải danh sách thư mục...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h4 className="text-md font-medium">Quản lý thư mục chi phí</h4>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          title="Thêm thư mục"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map((folder) => (
          <div key={folder.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: folder.color }}
                ></div>
                <div>
                  <h5 className="font-medium text-gray-900">{folder.name}</h5>
                  {folder.description && (
                    <p className="text-sm text-gray-500 mt-1">{folder.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  folder.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {folder.is_active ? 'Hoạt động' : 'Tạm dừng'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => toggleStatus(folder)}
                className={`text-xs px-3 py-1 rounded ${
                  folder.is_active 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {folder.is_active ? 'Tạm dừng' : 'Kích hoạt'}
              </button>
              <button
                onClick={() => handleEdit(folder)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Sửa
              </button>
              <button
                onClick={() => handleDelete(folder.id)}
                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {folders.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          Chưa có thư mục nào. Hãy thêm thư mục đầu tiên.
        </div>
      )}

      {/* Modal for Add/Edit Folder */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Chỉnh sửa thư mục' : 'Thêm thư mục mới'}
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
                  Tên thư mục *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Màu sắc
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-2 rounded-md border-2 ${
                        formData.color === color.value ? 'border-gray-400' : 'border-gray-200'
                      } hover:border-gray-400 transition-colors`}
                    >
                      <div className={`w-6 h-6 rounded-full mx-auto ${color.class}`}></div>
                      <div className="text-xs mt-1 text-center">{color.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="folder_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="folder_is_active" className="ml-2 text-sm text-gray-700">
                  Kích hoạt ngay
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
                  {isEditing ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};