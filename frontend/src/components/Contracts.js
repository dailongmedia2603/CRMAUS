import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = '/api';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    total_value: 0,
    active_value: 0,
    total_paid: 0,
    total_debt: 0,
    total_contracts: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hasDebtFilter, setHasDebtFilter] = useState(null);
  const [viewArchived, setViewArchived] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState([]);

  // Time filters
  const [timeFilter, setTimeFilter] = useState('all');
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [customQuarter, setCustomQuarter] = useState('');
  const [customMonth, setCustomMonth] = useState('');
  const [customWeek, setCustomWeek] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentContractId, setCurrentContractId] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    project_id: '',
    contract_link: '',
    value: '',
    status: 'active',
    start_date: '',
    end_date: '',
    payment_schedules: []
  });

  useEffect(() => {
    fetchData();
  }, [timeFilter, customYear, customQuarter, customMonth, customWeek, searchTerm, statusFilter, hasDebtFilter, viewArchived]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (hasDebtFilter !== null) params.append('has_debt', hasDebtFilter);
      params.append('archived', viewArchived);

      // Time filters
      if (timeFilter !== 'all') {
        params.append('year', customYear);
        if (customQuarter) params.append('quarter', customQuarter);
        if (customMonth) params.append('month', customMonth);
        if (customWeek) params.append('week', customWeek);
      }

      const [contractsRes, clientsRes, projectsRes, statsRes] = await Promise.all([
        axios.get(`${API}/contracts/?${params}`),
        axios.get(`${API}/clients/`),
        axios.get(`${API}/projects/`),
        axios.get(`${API}/contracts/statistics?${params}`)
      ]);

      setContracts(contractsRes.data);
      setClients(clientsRes.data);
      setProjects(projectsRes.data);
      setStatistics(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const contractData = {
        ...formData,
        value: parseFloat(formData.value) || 0
      };

      if (isEditing) {
        await axios.put(`${API}/contracts/${currentContractId}`, contractData);
        toast.success('Cập nhật hợp đồng thành công!');
      } else {
        await axios.post(`${API}/contracts/`, contractData);
        toast.success('Thêm hợp đồng thành công!');
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Có lỗi xảy ra khi lưu hợp đồng');
    }
  };

  const handleDelete = async (contractId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) {
      try {
        await axios.delete(`${API}/contracts/${contractId}`);
        toast.success('Xóa hợp đồng thành công!');
        fetchData();
      } catch (error) {
        console.error('Error deleting contract:', error);
        toast.error('Có lỗi xảy ra khi xóa hợp đồng');
      }
    }
  };

  const markPaymentPaid = async (scheduleId, isPaid) => {
    try {
      await axios.patch(`${API}/payment-schedules/${scheduleId}/mark-paid?is_paid=${isPaid}`);
      toast.success(`Đánh dấu thanh toán ${isPaid ? 'đã' : 'chưa'} thanh toán thành công!`);
      fetchData();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Có lỗi xảy ra khi cập nhật thanh toán');
    }
  };



  const resetForm = () => {
    setFormData({
      title: '',
      client_id: '',
      project_id: '',
      contract_link: '',
      value: '',
      status: 'active',
      start_date: '',
      end_date: '',
      payment_schedules: []
    });
    setIsEditing(false);
    setCurrentContractId(null);
  };

  const openEditModal = (contract) => {
    setFormData({
      title: contract.title || '',
      client_id: contract.client_id || '',
      project_id: contract.project_id || '',
      contract_link: contract.contract_link || '',
      value: contract.value || '',
      status: contract.status || 'active',
      start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
      end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
      payment_schedules: contract.payment_schedules || []
    });
    setIsEditing(true);
    setCurrentContractId(contract.id);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Nháp' },
      'sent': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đã gửi' },
      'signed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã ký' },
      'active': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đang chạy' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Hoàn thành' },
      'expired': { bg: 'bg-red-100', text: 'text-red-800', label: 'Hết hạn' },
      'terminated': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Đã chấm dứt' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const addPaymentSchedule = () => {
    setFormData({
      ...formData,
      payment_schedules: [
        ...formData.payment_schedules,
        { amount: '', due_date: '', description: '' }
      ]
    });
  };

  const removePaymentSchedule = (index) => {
    const newSchedules = formData.payment_schedules.filter((_, i) => i !== index);
    setFormData({ ...formData, payment_schedules: newSchedules });
  };

  const updatePaymentSchedule = (index, field, value) => {
    const newSchedules = [...formData.payment_schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setFormData({ ...formData, payment_schedules: newSchedules });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý hợp đồng</h1>
          <p className="text-gray-600 mt-1">Theo dõi hợp đồng và thỏa thuận</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tạo hợp đồng
        </button>
      </div>

      {/* Time Filter Widget */}
      <div className="modern-card p-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bộ lọc thời gian</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="modern-input"
            >
              <option value="all">Tất cả</option>
              <option value="year">Năm</option>
              <option value="quarter">Quý</option>
              <option value="month">Tháng</option>
              <option value="week">Tuần</option>
            </select>
          </div>

          {timeFilter !== 'all' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Năm</label>
                <input
                  type="number"
                  value={customYear}
                  onChange={(e) => setCustomYear(parseInt(e.target.value))}
                  className="modern-input"
                  min="2020"
                  max="2030"
                />
              </div>

              {timeFilter === 'quarter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quý</label>
                  <select
                    value={customQuarter}
                    onChange={(e) => setCustomQuarter(e.target.value)}
                    className="modern-input"
                  >
                    <option value="">Chọn quý</option>
                    <option value="1">Quý 1</option>
                    <option value="2">Quý 2</option>
                    <option value="3">Quý 3</option>
                    <option value="4">Quý 4</option>
                  </select>
                </div>
              )}

              {timeFilter === 'month' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
                  <select
                    value={customMonth}
                    onChange={(e) => setCustomMonth(e.target.value)}
                    className="modern-input"
                  >
                    <option value="">Chọn tháng</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}

              {timeFilter === 'week' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tuần</label>
                  <input
                    type="number"
                    value={customWeek}
                    onChange={(e) => setCustomWeek(e.target.value)}
                    className="modern-input"
                    min="1"
                    max="53"
                    placeholder="Tuần số"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                <dt className="text-sm font-medium text-gray-500 truncate">Tổng giá trị hợp đồng</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.total_value)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Giá trị hợp đồng đang làm</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.active_value)}</dd>
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
                <dt className="text-sm font-medium text-gray-500 truncate">Đã thanh toán</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.total_paid)}</dd>
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
                <dt className="text-sm font-medium text-gray-500 truncate">Công nợ</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.total_debt)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="modern-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Tổng hợp đồng</dt>
                <dd className="text-lg font-semibold text-gray-900">{statistics.total_contracts}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="modern-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm hợp đồng..."
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
              <option value="completed">Hoàn thành</option>
              <option value="active">Đang chạy</option>
              <option value="draft">Nháp</option>
            </select>

            <button
              onClick={() => setHasDebtFilter(hasDebtFilter === true ? null : true)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                hasDebtFilter === true 
                  ? 'bg-red-100 text-red-700 border-red-300' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Hợp đồng còn nợ
            </button>

            <button
              onClick={() => setViewArchived(!viewArchived)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                viewArchived 
                  ? 'bg-gray-100 text-gray-700 border-gray-300' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {viewArchived ? 'Ẩn lưu trữ' : 'Xem lưu trữ'}
            </button>
          </div>

          {/* Bulk Actions - Only show when contracts are selected */}
          {selectedContracts.length > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-700">
                Đã chọn {selectedContracts.length} hợp đồng
              </span>
              
              {!viewArchived ? (
                <>
                  <button
                    onClick={handleBulkArchive}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium hover:bg-orange-200 transition-colors"
                    title="Lưu trữ các hợp đồng đã chọn"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 0V6a2 2 0 114 0v2h4l-1 12H6L5 8z" />
                    </svg>
                    Lưu trữ
                  </button>
                  
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                    title="Xóa vĩnh viễn các hợp đồng đã chọn"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa
                  </button>
                </>
              ) : (
                <button
                  onClick={handleBulkRestore}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                  title="Khôi phục các hợp đồng đã chọn"
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Khôi phục
                </button>
              )}
              
              <button
                onClick={() => setSelectedContracts([])}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 transition-colors"
                title="Bỏ chọn tất cả"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contract List */}
      <div className="modern-card overflow-hidden">
        <div className="min-w-full overflow-x-auto">
          <table className="w-full divide-y divide-gray-200" style={{ minWidth: '1200px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedContracts.length === contracts.length && contracts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedContracts(contracts.map(c => c.id));
                      } else {
                        setSelectedContracts([]);
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiêu đề
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link hợp đồng
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dự án
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đợt thanh toán
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá trị hợp đồng
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đã thanh toán
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Công nợ
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="11" className="px-6 py-4 text-center">
                    <div className="spinner mx-auto"></div>
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-4 text-center text-gray-500">
                    Không có hợp đồng nào
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedContracts.includes(contract.id)}
                        onChange={() => {
                          if (selectedContracts.includes(contract.id)) {
                            setSelectedContracts(selectedContracts.filter(id => id !== contract.id));
                          } else {
                            setSelectedContracts([...selectedContracts, contract.id]);
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 max-w-32 truncate">{contract.title}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {contract.contract_link ? (
                        <a 
                          href={contract.contract_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Xem hợp đồng
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 max-w-32 truncate">
                      {contract.client_name || '-'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 max-w-32 truncate">
                      {contract.project_name || '-'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="space-y-1 max-w-40">
                        {contract.payment_schedules?.map((schedule, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-xs">{formatCurrency(schedule.amount)}</span>
                            <button
                              onClick={() => markPaymentPaid(schedule.id, !schedule.is_paid)}
                              className={`p-1 rounded-full ${
                                schedule.is_paid 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                              }`}
                              title={schedule.is_paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          </div>
                        )) || <span className="text-gray-500 text-xs">Chưa có đợt thanh toán</span>}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(contract.value)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(contract.total_paid || 0)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(contract.remaining_debt || 0)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal(contract)}
                          className="text-green-600 hover:text-green-800 transition-colors p-1 hover:bg-green-50 rounded-full"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded-full"
                          title="Xóa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditing ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới'}
                  </h2>
                  <p className="text-gray-600 mt-1 text-sm">
                    {isEditing ? 'Cập nhật thông tin hợp đồng và đợt thanh toán' : 'Tạo hợp đồng mới với các đợt thanh toán'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tiêu đề hợp đồng *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="modern-input w-full"
                      placeholder="Nhập tiêu đề hợp đồng"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client *
                    </label>
                    <select
                      required
                      value={formData.client_id}
                      onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                      className="modern-input w-full"
                    >
                      <option value="">Chọn client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giá trị hợp đồng *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.value}
                      onChange={(e) => setFormData({...formData, value: e.target.value})}
                      className="modern-input w-full"
                      min="0"
                      step="1000"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dự án
                    </label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                      className="modern-input w-full"
                    >
                      <option value="">Chọn dự án</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tình trạng
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="modern-input w-full"
                    >
                      <option value="draft">Chưa chạy</option>
                      <option value="active">Đang chạy</option>
                      <option value="completed">Hoàn thành</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link hợp đồng
                    </label>
                    <input
                      type="url"
                      value={formData.contract_link}
                      onChange={(e) => setFormData({...formData, contract_link: e.target.value})}
                      className="modern-input w-full"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày bắt đầu
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="modern-input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="modern-input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Schedules Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Đợt thanh toán
                    </h3>
                    <p className="text-sm text-gray-600 ml-7">Thiết lập các đợt thanh toán cho hợp đồng</p>
                  </div>
                  <button
                    type="button"
                    onClick={addPaymentSchedule}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Thêm đợt thanh toán
                  </button>
                </div>

                {formData.payment_schedules.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500">Chưa có đợt thanh toán nào</p>
                    <p className="text-gray-400 text-sm">Bấm "Thêm đợt thanh toán" để thêm đợt thanh toán đầu tiên</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.payment_schedules.map((schedule, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                              #{index + 1}
                            </span>
                            Đợt thanh toán #{index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removePaymentSchedule(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                            title="Xóa đợt thanh toán này"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Số tiền *
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={schedule.amount}
                              onChange={(e) => updatePaymentSchedule(index, 'amount', e.target.value)}
                              className="modern-input w-full"
                              min="0"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ngày đến hạn *
                            </label>
                            <input
                              type="date"
                              value={schedule.due_date}
                              onChange={(e) => updatePaymentSchedule(index, 'due_date', e.target.value)}
                              className="modern-input w-full"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Mô tả
                            </label>
                            <input
                              type="text"
                              placeholder="Ví dụ: Thanh toán đợt 1"
                              value={schedule.description}
                              onChange={(e) => updatePaymentSchedule(index, 'description', e.target.value)}
                              className="modern-input w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? 'Cập nhật hợp đồng' : 'Tạo hợp đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;