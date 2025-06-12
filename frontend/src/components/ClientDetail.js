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
  const [contracts, setContracts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [formData, setFormData] = useState({
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
      const [clientRes, projectsRes, invoicesRes, contractsRes] = await Promise.all([
        axios.get(`${API}/clients/${id}`),
        axios.get(`${API}/projects/client/${id}`),
        axios.get(`${API}/invoices/client/${id}`),
        axios.get(`${API}/contracts/client/${id}`)
      ]);

      setClient(clientRes.data);
      setProjects(projectsRes.data);
      setInvoices(invoicesRes.data);
      setContracts(contractsRes.data);
      
      // Fetch chat messages
      await fetchChatMessages();
      
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
      'signed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã ký' },
      'active': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đang hiệu lực' },
      'expired': { bg: 'bg-red-100', text: 'text-red-800', label: 'Hết hạn' },
      'terminated': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Đã chấm dứt' }
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
      'completed': 'Hoàn thành',
      'signed': 'Đã ký',
      'active': 'Đang hiệu lực',
      'expired': 'Hết hạn',
      'terminated': 'Đã chấm dứt'
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

      {/* Main Content Layout - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Client Information */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Basic Info Card */}
          <div className="modern-card p-6">
            <div className="text-center mb-6">
              {client.avatar_url ? (
                <img className="h-20 w-20 rounded-full mx-auto mb-4" src={client.avatar_url} alt="" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-medium text-gray-700">
                    {client.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
              <p className="text-sm text-gray-600">{client.company || 'Không có công ty'}</p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Ngành nghề</label>
                <p className="text-sm text-gray-900">{client.industry || '-'}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Quy mô</label>
                <p className="text-sm text-gray-900">{client.size || '-'}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Website</label>
                {client.website ? (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 break-all">
                    {client.website}
                  </a>
                ) : (
                  <p className="text-sm text-gray-900">-</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Số điện thoại</label>
                <p className="text-sm text-gray-900">{client.phone || '-'}</p>
              </div>
              
              {client.tags && client.tags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Tags</label>
                  <div className="flex flex-wrap gap-1">
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

          {/* Contact Info Card */}
          <div className="modern-card p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Thông tin liên hệ</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Người liên hệ</label>
                <p className="text-sm text-gray-900">{client.contact_name || '-'}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Email</label>
                {client.contact_email ? (
                  <a href={`mailto:${client.contact_email}`} className="text-sm text-blue-600 hover:text-blue-800 break-all">
                    {client.contact_email}
                  </a>
                ) : (
                  <p className="text-sm text-gray-900">-</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">SĐT liên hệ</label>
                <p className="text-sm text-gray-900">{client.contact_phone || '-'}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Địa chỉ</label>
                <p className="text-sm text-gray-900">{client.address || '-'}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase">Trạng thái</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  client.archived ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                }`}>
                  {client.archived ? 'Đã lưu trữ' : 'Hoạt động'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          {client.notes && (
            <div className="modern-card p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Ghi chú</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column - Tabs Content */}
        <div className="lg:col-span-2">
          
          {/* Tab Navigation */}
          <div className="modern-card mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'projects'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dự án ({projects.length})
                </button>
                
                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'contracts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Hợp đồng ({contracts.length})
                </button>
                
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'invoices'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Hóa đơn ({invoices.length})
                </button>
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="p-6">
              
              {/* Projects Tab */}
              {activeTab === 'projects' && (
                <div>
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
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
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
              )}

              {/* Contracts Tab */}
              {activeTab === 'contracts' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Hợp đồng ({contracts.length})</h3>
                    <button className="btn-primary text-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Tạo hợp đồng mới
                    </button>
                  </div>
                  
                  {contracts.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500">Chưa có hợp đồng nào</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tiêu đề
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Trạng thái
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Giá trị
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Thời hạn
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contracts.map((contract) => (
                            <tr key={contract.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => navigate(`/contracts/${contract.id}`)}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                  {contract.title}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={getStatusBadge(contract.status)}>
                                  {getStatusLabel(contract.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(contract.value)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(contract.start_date).toLocaleDateString('vi-VN')} - {new Date(contract.end_date).toLocaleDateString('vi-VN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <div>
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
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                      </svg>
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
              )}
              
            </div>
          </div>
        </div>
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
