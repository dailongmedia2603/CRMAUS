import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = process.env.REACT_APP_BACKEND_URL;

// Client Detail Component
const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const [clientRes, projectsRes, contractsRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/api/clients/${id}`),
        axios.get(`${API}/api/projects/client/${id}`),
        axios.get(`${API}/api/contracts/client/${id}`),
        axios.get(`${API}/api/invoices/client/${id}`)
      ]);

      setClient(clientRes.data);
      setProjects(projectsRes.data);
      setContracts(contractsRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.error('Error fetching client details:', error);
      toast.error('Lỗi khi tải thông tin khách hàng');
      navigate('/clients');
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

  const getStatusColor = (status) => {
    const colors = {
      'planning': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'on_hold': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
      'draft': 'bg-gray-100 text-gray-800',
      'sent': 'bg-blue-100 text-blue-800',
      'paid': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800',
      'signed': 'bg-green-100 text-green-800',
      'active': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Không tìm thấy khách hàng</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600 mt-1">{client.company}</p>
          </div>
        </div>
      </div>

      {/* Client Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="modern-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Thông tin khách hàng</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tên công ty</label>
                <p className="text-gray-900">{client.company}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Lĩnh vực</label>
                <p className="text-gray-900">{client.industry || 'Chưa cập nhật'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Quy mô</label>
                <p className="text-gray-900">{client.size || 'Chưa cập nhật'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
                {client.website ? (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:text-blue-800 hover:underline">
                    {client.website}
                  </a>
                ) : (
                  <p className="text-gray-900">Chưa cập nhật</p>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin liên hệ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Người liên hệ</label>
                  <p className="text-gray-900">{client.contact_name || 'Chưa cập nhật'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email liên hệ</label>
                  <p className="text-gray-900">{client.contact_email || 'Chưa cập nhật'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Địa chỉ</label>
                  <p className="text-gray-900">{client.address || 'Chưa cập nhật'}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ghi chú</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}

            {/* Tags */}
            {client.tags && client.tags.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-6">
          <div className="modern-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Dự án</span>
                <span className="font-semibold text-gray-900">{projects.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Hợp đồng</span>
                <span className="font-semibold text-gray-900">{contracts.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Hóa đơn</span>
                <span className="font-semibold text-gray-900">{invoices.length}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tổng giá trị</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(contracts.reduce((sum, contract) => sum + contract.value, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Dự án</h2>
            <span className="text-sm text-gray-500">{projects.length} dự án</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-gray-900 text-sm">{project.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                <div className="text-sm text-gray-500">
                  <p>Giá trị: {formatCurrency(project.contract_value)}</p>
                  <p>Từ: {new Date(project.start_date).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts Section */}
      {contracts.length > 0 && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Hợp đồng</h2>
            <span className="text-sm text-gray-500">{contracts.length} hợp đồng</span>
          </div>
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{contract.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium">Giá trị</p>
                    <p>{formatCurrency(contract.value)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Bắt đầu</p>
                    <p>{new Date(contract.start_date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="font-medium">Kết thúc</p>
                    <p>{new Date(contract.end_date).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices Section */}
      {invoices.length > 0 && (
        <div className="modern-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Hóa đơn</h2>
            <span className="text-sm text-gray-500">{invoices.length} hóa đơn</span>
          </div>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{invoice.title}</h3>
                    <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium">Số tiền</p>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(invoice.amount)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Hạn thanh toán</p>
                    <p>{new Date(invoice.due_date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="font-medium">Ngày thanh toán</p>
                    <p>{invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString('vi-VN') : 'Chưa thanh toán'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;