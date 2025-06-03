import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Component placeholder cho các trang khác
const Revenue = () => (
  <div>
    <h1 className="text-2xl font-semibold text-gray-900">Revenue</h1>
    <p className="text-gray-600">Quản lý doanh thu</p>
  </div>
);

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

// Tab 1: Tổng quan với charts và thống kê
const ExpenseOverview = () => {
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

// Placeholder components for other tabs
const ExpenseList = () => <div>Danh sách chi phí (đang phát triển)</div>;
const ExpenseConfig = () => <div>Cấu hình chi phí (đang phát triển)</div>;

export { Revenue, Expense };