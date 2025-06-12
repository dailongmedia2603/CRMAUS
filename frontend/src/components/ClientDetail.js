import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = '/api';

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
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

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [clientRes, projectsRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/clients/${id}`),
        axios.get(`${API}/projects/client/${id}`),
        axios.get(`${API}/invoices/client/${id}`)
      ]);

      setClient(clientRes.data);
      setProjects(projectsRes.data);
      setInvoices(invoicesRes.data);
      
      // Set form data for editing
      setFormData({
        name: clientRes.data.name || "",
        company: clientRes.data.company || "",
        industry: clientRes.data.industry || "",
        size: clientRes.data.size || "",
        website: clientRes.data.website || "",
        phone: clientRes.data.phone || "",
        contact_name: clientRes.data.contact_name || "",
        contact_email: clientRes.data.contact_email || "",
        contact_phone: clientRes.data.contact_phone || "",
        notes: clientRes.data.notes || "",
        address: clientRes.data.address || "",
        tags: clientRes.data.tags || []
      });
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast.error('Không thể tải thông tin khách hàng');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/clients/${id}`, formData);
      toast.success('Cập nhật thông tin thành công!');
      setIsEditModalOpen(false);
      fetchClientData();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Có lỗi xảy ra khi cập nhật');
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
      'draft': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Nháp' },
      'sent': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đã gửi' },
      'paid': { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã thanh toán' },
      'overdue': { bg: 'bg-red-100', text: 'text-red-800', label: 'Quá hạn' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Đã hủy' },
      'planning': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Lên kế hoạch' },
      'in_progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Đang thực hiện' },
      'on_hold': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Tạm dừng' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Hoàn thành' },
      'cancelled': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Đã hủy' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Nháp',
      'sent': 'Đã gửi',
      'paid': 'Đã thanh toán',
      'overdue': 'Quá hạn',
      'cancelled': 'Đã hủy',
      'planning': 'Lên kế hoạch',
      'in_progress': 'Đang thực hiện',
      'on_hold': 'Tạm dừng',
      'completed': 'Hoàn thành'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy khách hàng</h3>
        <button
          onClick={() => navigate('/clients')}
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
            onClick={() => navigate('/clients')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600 mt-1">Chi tiết thông tin khách hàng</p>
          </div>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Chỉnh sửa
        </button>
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info Card */}
        <div className="lg:col-span-2">
          <div className="modern-card p-6">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {client.avatar_url ? (
                  <img className="h-24 w-24 rounded-full" src={client.avatar_url} alt="" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-2xl font-medium text-gray-700">
                      {client.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tên khách hàng</label>
                    <p className="mt-1 text-sm text-gray-900">{client.name || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Công ty</label>
                    <p className="mt-1 text-sm text-gray-900">{client.company || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngành nghề</label>
                    <p className="mt-1 text-sm text-gray-900">{client.industry || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Quy mô</label>
                    <p className="mt-1 text-sm text-gray-900">{client.size || '-'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Website</label>
                    {client.website ? (
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-blue-600 hover:text-blue-800">
                        {client.website}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">-</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Số điện thoại</label>
                    <p className="mt-1 text-sm text-gray-900">{client.phone || '-'}</p>
                  </div>
                </div>
                
                {client.tags && client.tags.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {client.tags.map(tag => (
                        <span key={tag} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div>
          <div className="modern-card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin liên hệ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Người liên hệ</label>
                <p className="mt-1 text-sm text-gray-900">{client.contact_name || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                {client.contact_email ? (
                  <a href={`mailto:${client.contact_email}`} className="mt-1 text-sm text-blue-600 hover:text-blue-800">
                    {client.contact_email}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-gray-900">-</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">SĐT liên hệ</label>
                <p className="mt-1 text-sm text-gray-900">{client.contact_phone || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Địa chỉ</label>
                <p className="mt-1 text-sm text-gray-900">{client.address || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Trạng thái</label>
                <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  client.archived ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                }`}>
                  {client.archived ? 'Đã lưu trữ' : 'Hoạt động'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="modern-card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ghi chú</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Projects */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Dự án ({projects.length})</h3>
          <button className="btn-primary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tạo dự án mới
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Chưa có dự án nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên dự án
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giá trị
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày bắt đầu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {project.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(project.status)}>
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.contract_value ? formatCurrency(project.contract_value) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('vi-VN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="modern-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Hóa đơn ({invoices.length})</h3>
          <button className="btn-primary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tạo hóa đơn mới
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {invoice.invoice_number || invoice.title}
                      </button>
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

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Chỉnh sửa thông tin khách hàng</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên khách hàng *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="modern-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Công ty
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="modern-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    className="modern-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="modern-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={4}
                  className="modern-input"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
