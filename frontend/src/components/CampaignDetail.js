import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { toast } from 'react-toastify';
import axios from 'axios';

const CampaignDetail = () => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [campaign, setCampaign] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState([]);

  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [copyingTask, setCopyingTask] = useState(null);

  // Form data
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    sort_order: 0,
    description: ''
  });

  const [taskFormData, setTaskFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'not_started',
    template_id: '',
    description: ''
  });

  const [copyQuantity, setCopyQuantity] = useState(1);

  // API base URL
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Fetch campaign details
  const fetchCampaign = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/campaigns/${campaignId}`);
      setCampaign(response.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Lỗi khi tải thông tin chiến dịch');
      navigate('/campaigns');
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/campaigns/${campaignId}/services/`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Lỗi khi tải danh sách dịch vụ');
    }
  };

  // Fetch tasks for selected service
  const fetchTasks = async (serviceId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/services/${serviceId}/tasks/`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Lỗi khi tải danh sách nhiệm vụ');
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/templates/`, {
        params: { template_type: 'service', archived: false }
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Create service
  const handleCreateService = async () => {
    try {
      if (!serviceFormData.name.trim()) {
        toast.error('Vui lòng nhập tên dịch vụ');
        return;
      }

      await axios.post(`${API_BASE_URL}/api/campaigns/${campaignId}/services/`, serviceFormData);
      toast.success('Tạo dịch vụ thành công');
      setShowServiceModal(false);
      setServiceFormData({ name: '', sort_order: 0, description: '' });
      fetchServices();
    } catch (error) {
      console.error('Error creating service:', error);
      toast.error('Lỗi khi tạo dịch vụ');
    }
  };

  // Update service
  const handleUpdateService = async () => {
    try {
      if (!serviceFormData.name.trim()) {
        toast.error('Vui lòng nhập tên dịch vụ');
        return;
      }

      await axios.put(`${API_BASE_URL}/api/services/${editingService.id}`, serviceFormData);
      toast.success('Cập nhật dịch vụ thành công');
      setShowServiceModal(false);
      setEditingService(null);
      setServiceFormData({ name: '', sort_order: 0, description: '' });
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Lỗi khi cập nhật dịch vụ');
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa dịch vụ này? Tất cả nhiệm vụ trong dịch vụ cũng sẽ bị xóa.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/services/${serviceId}`);
      toast.success('Xóa dịch vụ thành công');
      fetchServices();
      if (selectedService?.id === serviceId) {
        setSelectedService(null);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Lỗi khi xóa dịch vụ');
    }
  };

  // Create task
  const handleCreateTask = async () => {
    try {
      if (!taskFormData.name.trim()) {
        toast.error('Vui lòng nhập tên nhiệm vụ');
        return;
      }

      const taskData = { ...taskFormData };
      
      // Convert date strings to ISO format
      if (taskData.start_date) {
        taskData.start_date = new Date(taskData.start_date).toISOString();
      }
      if (taskData.end_date) {
        taskData.end_date = new Date(taskData.end_date).toISOString();
      }

      await axios.post(`${API_BASE_URL}/api/services/${selectedService.id}/tasks/`, taskData);
      toast.success('Tạo nhiệm vụ thành công');
      setShowTaskModal(false);
      setTaskFormData({
        name: '',
        start_date: '',
        end_date: '',
        status: 'not_started',
        template_id: '',
        description: ''
      });
      fetchTasks(selectedService.id);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Lỗi khi tạo nhiệm vụ');
    }
  };

  // Update task
  const handleUpdateTask = async () => {
    try {
      if (!taskFormData.name.trim()) {
        toast.error('Vui lòng nhập tên nhiệm vụ');
        return;
      }

      const taskData = { ...taskFormData };
      
      // Convert date strings to ISO format
      if (taskData.start_date) {
        taskData.start_date = new Date(taskData.start_date).toISOString();
      }
      if (taskData.end_date) {
        taskData.end_date = new Date(taskData.end_date).toISOString();
      }

      await axios.put(`${API_BASE_URL}/api/tasks/${editingTask.id}`, taskData);
      toast.success('Cập nhật nhiệm vụ thành công');
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskFormData({
        name: '',
        start_date: '',
        end_date: '',
        status: 'not_started',
        template_id: '',
        description: ''
      });
      fetchTasks(selectedService.id);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Lỗi khi cập nhật nhiệm vụ');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`);
      toast.success('Xóa nhiệm vụ thành công');
      fetchTasks(selectedService.id);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Lỗi khi xóa nhiệm vụ');
    }
  };

  // Copy task
  const handleCopyTask = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/tasks/${copyingTask.id}/copy`, {
        quantity: copyQuantity
      });
      toast.success(`Sao chép ${copyQuantity} nhiệm vụ thành công`);
      setShowCopyModal(false);
      setCopyingTask(null);
      setCopyQuantity(1);
      fetchTasks(selectedService.id);
    } catch (error) {
      console.error('Error copying task:', error);
      toast.error('Lỗi khi sao chép nhiệm vụ');
    }
  };

  // Modal handlers
  const openCreateServiceModal = () => {
    setEditingService(null);
    setServiceFormData({ name: '', sort_order: 0, description: '' });
    setShowServiceModal(true);
  };

  const openEditServiceModal = (service) => {
    setEditingService(service);
    setServiceFormData({
      name: service.name,
      sort_order: service.sort_order,
      description: service.description || ''
    });
    setShowServiceModal(true);
  };

  const openCreateTaskModal = () => {
    setEditingTask(null);
    setTaskFormData({
      name: '',
      start_date: '',
      end_date: '',
      status: 'not_started',
      template_id: '',
      description: ''
    });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskFormData({
      name: task.name,
      start_date: task.start_date ? new Date(task.start_date).toISOString().slice(0, 16) : '',
      end_date: task.end_date ? new Date(task.end_date).toISOString().slice(0, 16) : '',
      status: task.status,
      template_id: task.template_id || '',
      description: task.description || ''
    });
    setShowTaskModal(true);
  };

  const openCopyModal = (task) => {
    setCopyingTask(task);
    setCopyQuantity(1);
    setShowCopyModal(true);
  };

  // Select service and load its tasks
  const handleSelectService = (service) => {
    setSelectedService(service);
    fetchTasks(service.id);
    setSelectedTasks([]);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '--/--/----';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '--/--/---- --:--';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // Status display
  const getStatusDisplay = (status) => {
    const statusMap = {
      'not_started': { text: 'Chưa làm', color: 'bg-gray-100 text-gray-800' },
      'in_progress': { text: 'Đang làm', color: 'bg-blue-100 text-blue-800' },
      'completed': { text: 'Hoàn thành', color: 'bg-green-100 text-green-800' }
    };
    return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
  };

  // Select task handlers
  const handleSelectAllTasks = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(task => task.id));
    }
  };

  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Bulk delete tasks
  const handleBulkDeleteTasks = async () => {
    if (selectedTasks.length === 0) {
      toast.error('Vui lòng chọn ít nhất một nhiệm vụ để xóa');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTasks.length} nhiệm vụ đã chọn?`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/tasks/bulk`, {
        data: selectedTasks,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(`Đã xóa ${response.data.deleted_count} nhiệm vụ thành công`);
      setSelectedTasks([]); // Clear selection
      
      // Refresh tasks list for all services
      services.forEach(service => {
        fetchTasks(service.id);
      });
    } catch (error) {
      console.error('Error bulk deleting tasks:', error);
      toast.error('Có lỗi xảy ra khi xóa nhiệm vụ');
    }
  };

  // Effects
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchCampaign(),
      fetchServices(),
      fetchTemplates()
    ]).finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Không tìm thấy chiến dịch</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/campaigns')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Chi tiết chiến dịch</h1>
            </div>
            <h2 className="text-xl text-gray-600">{campaign.name}</h2>
            {campaign.description && (
              <p className="text-gray-500 mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Services Panel */}
        <div className="w-1/3">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Dịch vụ</h3>
                <button
                  onClick={openCreateServiceModal}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm dịch vụ
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {services.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Chưa có dịch vụ nào
                </div>
              ) : (
                <div className="p-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                        selectedService?.id === service.id
                          ? 'bg-indigo-50 border-2 border-indigo-200'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                      onClick={() => handleSelectService(service)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Thứ tự: {service.sort_order}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditServiceModal(service);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {(user?.role === 'admin' || user?.role === 'account') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteService(service.id);
                              }}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tasks Panel */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Nhiệm vụ {selectedService && `- ${selectedService.name}`}
                  {selectedTasks.length > 0 && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({selectedTasks.length} đã chọn)
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {selectedTasks.length > 0 && (
                    <button
                      onClick={handleBulkDeleteTasks}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Xóa ({selectedTasks.length})
                    </button>
                  )}
                  {selectedService && (
                    <button
                      onClick={openCreateTaskModal}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Thêm nhiệm vụ
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {!selectedService ? (
                <div className="p-4 text-center text-gray-500">
                  Vui lòng chọn một dịch vụ để xem nhiệm vụ
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Chưa có nhiệm vụ nào trong dịch vụ này
                </div>
              ) : (
                <div className="table-container h-full">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="relative px-6 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTasks.length > 0 && selectedTasks.length === tasks.length}
                            onChange={handleSelectAllTasks}
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tên nhiệm vụ
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timeline
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tiến độ
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Hành động</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tasks.map((task) => {
                        const statusDisplay = getStatusDisplay(task.status);
                        return (
                          <tr key={task.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedTasks.includes(task.id)}
                                onChange={() => handleSelectTask(task.id)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <button
                                  onClick={() => {
                                    // TODO: Open task detail modal
                                    console.log('Open task detail:', task.id);
                                  }}
                                  className="text-sm font-medium text-indigo-600 hover:text-indigo-900 text-left"
                                >
                                  {task.name}
                                </button>
                                {task.template_name && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Template: {task.template_name}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-col">
                                <div>Bắt đầu: {formatDate(task.start_date)}</div>
                                <div>Kết thúc: {formatDate(task.end_date)}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.color}`}>
                                {statusDisplay.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openCopyModal(task)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Sao chép"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openEditTaskModal(task)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Sửa"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-400 hover:text-red-600"
                                  title="Xóa"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingService ? 'Sửa dịch vụ' : 'Tạo dịch vụ mới'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên dịch vụ *
                  </label>
                  <input
                    type="text"
                    value={serviceFormData.name}
                    onChange={(e) => setServiceFormData({...serviceFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập tên dịch vụ"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thứ tự sắp xếp
                  </label>
                  <input
                    type="number"
                    value={serviceFormData.sort_order}
                    onChange={(e) => setServiceFormData({...serviceFormData, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập mô tả dịch vụ"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowServiceModal(false);
                    setEditingService(null);
                    setServiceFormData({ name: '', sort_order: 0, description: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={editingService ? handleUpdateService : handleCreateService}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingService ? 'Cập nhật' : 'Tạo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTask ? 'Sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên nhiệm vụ *
                  </label>
                  <input
                    type="text"
                    value={taskFormData.name}
                    onChange={(e) => setTaskFormData({...taskFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập tên nhiệm vụ"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày bắt đầu
                    </label>
                    <input
                      type="datetime-local"
                      value={taskFormData.start_date}
                      onChange={(e) => setTaskFormData({...taskFormData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày kết thúc
                    </label>
                    <input
                      type="datetime-local"
                      value={taskFormData.end_date}
                      onChange={(e) => setTaskFormData({...taskFormData, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiến độ
                  </label>
                  <select
                    value={taskFormData.status}
                    onChange={(e) => setTaskFormData({...taskFormData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="not_started">Chưa làm</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template dịch vụ
                  </label>
                  <select
                    value={taskFormData.template_id}
                    onChange={(e) => setTaskFormData({...taskFormData, template_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">-- Không chọn template --</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập mô tả nhiệm vụ"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                    setTaskFormData({
                      name: '',
                      start_date: '',
                      end_date: '',
                      status: 'not_started',
                      template_id: '',
                      description: ''
                    });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={editingTask ? handleUpdateTask : handleCreateTask}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingTask ? 'Cập nhật' : 'Tạo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && copyingTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Sao chép nhiệm vụ
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Nhiệm vụ: <strong>{copyingTask.name}</strong>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng cần sao chép *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={copyQuantity}
                    onChange={(e) => setCopyQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tối đa 20 bản sao</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopyingTask(null);
                    setCopyQuantity(1);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCopyTask}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Sao chép
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetail;