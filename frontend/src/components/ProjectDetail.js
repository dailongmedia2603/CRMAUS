import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = '/api';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProjectDetail();
    fetchProjectWorkItems();
    fetchProjectContracts();
    fetchProjectInvoices();
  }, [id]);

  const fetchProjectDetail = async () => {
    try {
      const response = await axios.get(`${API}/projects/${id}`);
      setProject(response.data);
      
      // Fetch client info
      if (response.data.client_id) {
        const clientResponse = await axios.get(`${API}/clients/${response.data.client_id}`);
        setClient(clientResponse.data);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Không thể tải thông tin dự án");
      navigate('/projects');
    }
  };

  const fetchProjectWorkItems = async () => {
    try {
      const response = await axios.get(`${API}/projects/${id}/work-items/`);
      setWorkItems(response.data);
    } catch (error) {
      console.error("Error fetching work items:", error);
    }
  };

  const fetchProjectContracts = async () => {
    try {
      const response = await axios.get(`${API}/contracts/`);
      const projectContracts = response.data.filter(contract => contract.project_id === id);
      setContracts(projectContracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const fetchProjectInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices/`);
      const projectInvoices = response.data.filter(invoice => invoice.project_id === id);
      setInvoices(projectInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      'planning': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Lên kế hoạch' },
      'in_progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đang thực hiện' },
      'on_hold': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Tạm dừng' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Hoàn thành' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Đã hủy' },
      'overdue': { bg: 'bg-red-100', text: 'text-red-800', label: 'Quá hạn' },
      'pending': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Chờ duyệt' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'planning': 'Lên kế hoạch',
      'in_progress': 'Đang thực hiện',
      'on_hold': 'Tạm dừng',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
      'overdue': 'Quá hạn',
      'pending': 'Chờ duyệt'
    };
    return labels[status] || status;
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'urgent': { bg: 'bg-red-100', text: 'text-red-800', label: 'Khẩn cấp' },
      'high': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Cao' },
      'normal': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trung bình' },
      'low': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Thấp' }
    };
    
    const config = priorityConfig[priority] || { bg: 'bg-gray-100', text: 'text-gray-800', label: priority };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy dự án</h3>
        <button
          onClick={() => navigate('/projects')}
          className="btn-primary"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">Chi tiết dự án</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={getStatusBadge(project.status)}>
            {getStatusLabel(project.status)}
          </span>
          <button className="btn-primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Chỉnh sửa
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Tổng quan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { id: 'tasks', name: 'Công việc', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
            { id: 'contracts', name: 'Hợp đồng', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            { id: 'invoices', name: 'Hóa đơn', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Info */}
          <div className="lg:col-span-2">
            <div className="modern-card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin dự án</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Tên dự án</label>
                  <p className="mt-1 text-sm text-gray-900">{project.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Khách hàng</label>
                  {client ? (
                    <button
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {client.name}
                    </button>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">-</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Ngày bắt đầu</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {project.start_date ? new Date(project.start_date).toLocaleDateString('vi-VN') : '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Ngày kết thúc</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {project.end_date ? new Date(project.end_date).toLocaleDateString('vi-VN') : '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Giá trị hợp đồng</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {project.contract_value ? formatCurrency(project.contract_value) : '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Công nợ</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {project.debt ? formatCurrency(project.debt) : '0 VND'}
                  </p>
                </div>
              </div>
              
              {project.description && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Mô tả</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Team & Stats */}
          <div>
            <div className="modern-card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Thống kê</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Công việc</span>
                  <span className="text-sm font-medium text-gray-900">{workItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Hợp đồng</span>
                  <span className="text-sm font-medium text-gray-900">{contracts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Hóa đơn</span>
                  <span className="text-sm font-medium text-gray-900">{invoices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Tiến độ</span>
                  <span className="text-sm font-medium text-gray-900">
                    {workItems.length > 0 
                      ? Math.round((workItems.filter(t => t.status === 'completed').length / workItems.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              {project.team && project.team.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Nhóm</h4>
                  <div className="space-y-2">
                    {project.team.map((memberId, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                          <span className="text-xs font-medium text-gray-700">U</span>
                        </div>
                        <span className="text-sm text-gray-900">Member {index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Công việc ({workItems.length})</h3>
            <button className="btn-primary text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tạo công việc
            </button>
          </div>
          
          {workItems.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-500">Chưa có công việc nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên công việc
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ưu tiên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(item.status)}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getPriorityBadge(item.priority)}>
                          {item.priority === 'urgent' ? 'Khẩn cấp' : 
                           item.priority === 'high' ? 'Cao' :
                           item.priority === 'normal' ? 'Trung bình' : 'Thấp'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.deadline ? new Date(item.deadline).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Hợp đồng ({contracts.length})</h3>
            <button className="btn-primary text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tạo hợp đồng
            </button>
          </div>
          
          {contracts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chưa có hợp đồng nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{contract.title}</h4>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(contract.value)} • 
                        {new Date(contract.start_date).toLocaleDateString('vi-VN')} - 
                        {new Date(contract.end_date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span className={getStatusBadge(contract.status)}>
                      {getStatusLabel(contract.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Hóa đơn ({invoices.length})</h3>
            <button className="btn-primary text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tạo hóa đơn
            </button>
          </div>
          
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chưa có hóa đơn nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số hóa đơn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hạn thanh toán
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {invoice.invoice_number || invoice.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(invoice.status)}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;