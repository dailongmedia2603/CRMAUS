import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { toast } from 'react-toastify';
import axios from 'axios';

const Campaigns = () => {
  const { user } = useContext(AuthContext);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(null);

  // Form data for create/edit
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // API base URL
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/campaigns/`, {
        params: {
          search: searchTerm || undefined,
          archived: showArchived
        }
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Lỗi khi tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  // Create campaign
  const handleCreate = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Vui lòng nhập tên chiến dịch');
        return;
      }

      await axios.post(`${API_BASE_URL}/api/campaigns/`, formData);
      toast.success('Tạo chiến dịch thành công');
      setShowModal(false);
      setFormData({ name: '', description: '' });
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Lỗi khi tạo chiến dịch');
    }
  };

  // Update campaign
  const handleUpdate = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Vui lòng nhập tên chiến dịch');
        return;
      }

      await axios.put(`${API_BASE_URL}/api/campaigns/${editingCampaign.id}`, formData);
      toast.success('Cập nhật chiến dịch thành công');
      setShowModal(false);
      setEditingCampaign(null);
      setFormData({ name: '', description: '' });
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Lỗi khi cập nhật chiến dịch');
    }
  };

  // Delete campaign
  const handleDelete = async (campaignId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chiến dịch này?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/campaigns/${campaignId}`);
      toast.success('Xóa chiến dịch thành công');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Lỗi khi xóa chiến dịch');
    }
  };

  // Archive/restore campaign
  const handleArchive = async (campaignId, archived = true) => {
    try {
      await axios.put(`${API_BASE_URL}/api/campaigns/${campaignId}`, { archived });
      toast.success(archived ? 'Lưu trữ chiến dịch thành công' : 'Khôi phục chiến dịch thành công');
      fetchCampaigns();
    } catch (error) {
      console.error('Error archiving campaign:', error);
      toast.error('Lỗi khi cập nhật chiến dịch');
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedCampaigns.length === 0) {
      toast.error('Vui lòng chọn ít nhất một chiến dịch');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/campaigns/bulk-action`, {
        action,
        campaign_ids: selectedCampaigns
      });
      
      const actionMessages = {
        archive: 'Lưu trữ các chiến dịch thành công',
        restore: 'Khôi phục các chiến dịch thành công',
        delete: 'Xóa các chiến dịch thành công'
      };
      
      toast.success(actionMessages[action]);
      setSelectedCampaigns([]);
      setBulkActionOpen(false);
      fetchCampaigns();
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Lỗi khi thực hiện hành động hàng loạt');
    }
  };

  // Handle modal
  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData({ name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || ''
    });
    setShowModal(true);
  };

  // Handle select
  const handleSelectAll = () => {
    if (selectedCampaigns.length === campaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(campaigns.map(campaign => campaign.id));
    }
  };

  const handleSelectCampaign = (campaignId) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Effects
  useEffect(() => {
    fetchCampaigns();
  }, [searchTerm, showArchived]);

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Mẫu dịch vụ</h1>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên chiến dịch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {/* Toggle Archived */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-md border text-sm font-medium ${
                  showArchived 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {showArchived ? 'Xem đang hoạt động' : 'Xem lưu trữ'}
              </button>

              {/* Bulk Actions */}
              {selectedCampaigns.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setBulkActionOpen(!bulkActionOpen)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-200 text-sm font-medium"
                  >
                    Hành động ({selectedCampaigns.length})
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
                            onClick={() => handleBulkAction(showArchived ? 'restore' : 'archive')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {showArchived ? 'Khôi phục' : 'Lưu trữ'}
                          </button>
                          {(user?.role === 'admin' || user?.role === 'account') && (
                            <button
                              onClick={() => handleBulkAction('delete')}
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

              {/* Add Campaign */}
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Chiến dịch mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow flex-1 overflow-hidden">
        <div className="table-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="relative px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.length > 0 && selectedCampaigns.length === campaigns.length}
                    onChange={handleSelectAll}
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên chiến dịch
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người tạo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian tạo
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Hành động</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    Không có chiến dịch nào
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.includes(campaign.id)}
                        onChange={() => handleSelectCampaign(campaign.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600">
                            {campaign.name}
                          </div>
                          {campaign.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {campaign.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.created_by_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(campaign.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative">
                        <button 
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => setActionDropdownOpen(actionDropdownOpen === campaign.id ? null : campaign.id)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        
                        {/* Dropdown menu */}
                        {actionDropdownOpen === campaign.id && (
                          <>
                            <div 
                              className="dropdown-backdrop" 
                              onClick={() => setActionDropdownOpen(null)}
                            />
                            <div className="dropdown-menu">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    // Chi tiết chiến dịch - có thể implement sau
                                    console.log('View campaign details:', campaign.id);
                                    setActionDropdownOpen(null);
                                  }}
                                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Xem chi tiết
                                </button>
                                <button
                                  onClick={() => {
                                    openEditModal(campaign);
                                    setActionDropdownOpen(null);
                                  }}
                                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Sửa
                                </button>
                                <button
                                  onClick={() => {
                                    handleArchive(campaign.id, !campaign.archived);
                                    setActionDropdownOpen(null);
                                  }}
                                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6 5l-3 3a2 2 0 01-2.828 0L9 12" />
                                  </svg>
                                  {campaign.archived ? 'Khôi phục' : 'Lưu trữ'}
                                </button>
                                {(user?.role === 'admin' || user?.role === 'account') && (
                                  <button
                                    onClick={() => {
                                      handleDelete(campaign.id);
                                      setActionDropdownOpen(null);
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                  >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCampaign ? 'Sửa chiến dịch' : 'Tạo chiến dịch mới'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên chiến dịch *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập tên chiến dịch"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập mô tả chiến dịch"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingCampaign(null);
                    setFormData({ name: '', description: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={editingCampaign ? handleUpdate : handleCreate}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingCampaign ? 'Cập nhật' : 'Tạo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;