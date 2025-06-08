import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = process.env.REACT_APP_BACKEND_URL;

// Task Row Component
const TaskRow = ({ 
  task, 
  selectedTasks, 
  setSelectedTasks, 
  onStatusChange, 
  onEdit, 
  onDelete, 
  onView, 
  onFeedback,
  getStatusIcon,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLink, setReportLink] = useState('');

  const handleStatusUpdate = (newStatus) => {
    if (newStatus === 'completed') {
      setShowReportModal(true);
    } else {
      onStatusChange(task.id, newStatus);
    }
  };

  const submitCompletion = () => {
    if (!reportLink.trim()) {
      toast.error('Vui lòng nhập link báo cáo');
      return;
    }
    onStatusChange(task.id, 'completed', reportLink);
    setShowReportModal(false);
    setReportLink('');
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const getActionButton = () => {
    switch (task.status) {
      case 'not_started':
        return (
          <button
            onClick={() => handleStatusUpdate('in_progress')}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
          >
            Bắt đầu
          </button>
        );
      case 'in_progress':
        return (
          <button
            onClick={() => handleStatusUpdate('completed')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
          >
            Hoàn thành
          </button>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-sm">
            Đã hoàn thành
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={selectedTasks.includes(task.id)}
            onChange={() => toggleTaskSelection(task.id)}
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center">
            {getStatusIcon(task.status)}
            <span className="ml-3 text-sm font-medium text-gray-900 truncate max-w-xs">
              {task.name}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => onView(task)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Chi tiết
          </button>
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          {new Date(task.deadline).toLocaleString('vi-VN')}
        </td>
        <td className="px-6 py-4">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => onFeedback(task)}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Feedback
          </button>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm text-gray-600">
            {getStatusLabel(task.status)}
          </span>
        </td>
        <td className="px-6 py-4">
          {task.report_link ? (
            <a
              href={task.report_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Xem báo cáo
            </a>
          ) : (
            <span className="text-sm text-gray-400">Chưa có</span>
          )}
        </td>
        <td className="px-6 py-4">
          {getActionButton()}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(task)}
              className="text-gray-400 hover:text-gray-600"
              title="Xem chi tiết"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={() => onEdit(task)}
              className="text-gray-400 hover:text-gray-600"
              title="Sửa"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(task.id)}
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

      {/* Report Link Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Hoàn thành công việc</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vui lòng nhập link báo cáo để hoàn thành công việc
            </p>
            <input
              type="text"
              placeholder="Nhập link báo cáo..."
              value={reportLink}
              onChange={(e) => setReportLink(e.target.value)}
              className="modern-input w-full mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Hủy
              </button>
              <button
                onClick={submitCompletion}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Task Modal Component
const TaskModal = ({ task, users, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    document_links: task?.document_links || [],
    assigned_to: task?.assigned_to || '',
    deadline: task?.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
    priority: task?.priority || 'normal'
  });
  const [newLink, setNewLink] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên công việc');
      return;
    }
    
    if (!formData.assigned_to) {
      toast.error('Vui lòng chọn người nhận');
      return;
    }
    
    if (!formData.deadline) {
      toast.error('Vui lòng chọn deadline');
      return;
    }

    const submitData = {
      ...formData,
      deadline: new Date(formData.deadline).toISOString()
    };

    onSubmit(submitData);
  };

  const addDocumentLink = () => {
    if (newLink.trim()) {
      setFormData(prev => ({
        ...prev,
        document_links: [...prev.document_links, newLink.trim()]
      }));
      setNewLink('');
    }
  };

  const removeDocumentLink = (index) => {
    setFormData(prev => ({
      ...prev,
      document_links: prev.document_links.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {task ? 'Sửa công việc' : 'Thêm công việc mới'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên công việc *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
              className="modern-input w-full"
              placeholder="Nhập tên công việc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              rows={4}
              className="modern-input w-full"
              placeholder="Nhập mô tả công việc..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link tài liệu
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                className="modern-input flex-1"
                placeholder="Nhập link tài liệu..."
              />
              <button
                type="button"
                onClick={addDocumentLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Thêm
              </button>
            </div>
            {formData.document_links.length > 0 && (
              <div className="space-y-1">
                {formData.document_links.map((link, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 truncate"
                    >
                      {link}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocumentLink(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người nhận *
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData(prev => ({...prev, assigned_to: e.target.value}))}
                className="modern-input w-full"
              >
                <option value="">Chọn người nhận...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ưu tiên
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value}))}
                className="modern-input w-full"
              >
                <option value="low">Thấp</option>
                <option value="normal">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline *
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({...prev, deadline: e.target.value}))}
              className="modern-input w-full"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {task ? 'Cập nhật' : 'Tạo công việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Task Detail Modal Component
const TaskDetailModal = ({ task, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Chi tiết công việc</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tên công việc</h3>
            <p className="text-gray-900">{task.name}</p>
          </div>

          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Mô tả</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>
          )}

          {task.document_links && task.document_links.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Link tài liệu</h3>
              <div className="space-y-2">
                {task.document_links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Người giao</h3>
              <p className="text-gray-900">{task.assigned_by_name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Người nhận</h3>
              <p className="text-gray-900">{task.assigned_to_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Deadline</h3>
              <p className="text-gray-900">{new Date(task.deadline).toLocaleString('vi-VN')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Ưu tiên</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                task.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {task.priority === 'high' ? 'Cao' : task.priority === 'normal' ? 'Trung bình' : 'Thấp'}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Trạng thái</h3>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              task.status === 'completed' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status === 'completed' ? 'Hoàn thành' : 
               task.status === 'in_progress' ? 'Đang làm' : 'Chưa làm'}
            </span>
          </div>

          {task.report_link && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Link báo cáo</h3>
              <a
                href={task.report_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded block"
              >
                {task.report_link}
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
            <div>
              <span className="font-medium">Tạo lúc:</span><br/>
              {new Date(task.created_at).toLocaleString('vi-VN')}
            </div>
            <div>
              <span className="font-medium">Cập nhật:</span><br/>
              {new Date(task.updated_at).toLocaleString('vi-VN')}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// Feedback Modal Component
const FeedbackModal = ({ task, feedbacks, newFeedback, setNewFeedback, onClose, onAddFeedback }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Feedback - {task.name}
            {feedbacks.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                {feedbacks.length}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Feedback List */}
        <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
          {feedbacks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có feedback nào</p>
          ) : (
            feedbacks.map((feedback) => (
              <div key={feedback.id} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-sm text-gray-900">
                    {feedback.user_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(feedback.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{feedback.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Feedback */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Thêm feedback</h3>
          <div className="flex space-x-2">
            <textarea
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              placeholder="Nhập feedback..."
              rows={3}
              className="modern-input flex-1"
            />
            <button
              onClick={onAddFeedback}
              disabled={!newFeedback.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Gửi
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Task Management Component
const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({});
  const [selectedTasks, setSelectedTasks] = useState([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [feedbackTask, setFeedbackTask] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [newFeedback, setNewFeedback] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchStatistics();
  }, [statusFilter, priorityFilter, dateFilter, showCompleted]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          params.append('status', 'not_started');
          // Will also include in_progress through multiple calls
        } else {
          params.append('status', statusFilter);
        }
      }
      
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      // Date filter
      if (dateFilter === 'today') {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        params.append('start_date', startOfDay.toISOString());
        params.append('end_date', endOfDay.toISOString());
      }
      
      const response = await axios.get(`${API}/api/internal-tasks/?${params}`);
      
      // Filter completed tasks based on showCompleted state
      let filteredTasks = response.data;
      if (showCompleted) {
        filteredTasks = response.data.filter(task => task.status === 'completed');
      } else {
        filteredTasks = response.data.filter(task => task.status !== 'completed');
      }
      
      setTasks(filteredTasks);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách công việc');
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/api/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      
      // Add date filter to statistics
      if (dateFilter === 'today') {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        params.append('start_date', startOfDay.toISOString());
        params.append('end_date', endOfDay.toISOString());
      }
      
      const response = await axios.get(`${API}/api/internal-tasks/statistics?${params}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await axios.post(`${API}/api/internal-tasks/`, taskData);
      toast.success('Tạo công việc thành công!');
      setShowCreateModal(false);
      fetchTasks();
      fetchStatistics();
    } catch (error) {
      toast.error('Lỗi khi tạo công việc');
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      await axios.put(`${API}/api/internal-tasks/${editingTask.id}`, taskData);
      toast.success('Cập nhật công việc thành công!');
      setEditingTask(null);
      fetchTasks();
      fetchStatistics();
    } catch (error) {
      toast.error('Lỗi khi cập nhật công việc');
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
      try {
        await axios.delete(`${API}/api/internal-tasks/${taskId}`);
        toast.success('Xóa công việc thành công!');
        fetchTasks();
        fetchStatistics();
      } catch (error) {
        toast.error('Lỗi khi xóa công việc');
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) {
      toast.warning('Vui lòng chọn công việc cần xóa');
      return;
    }
    
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTasks.length} công việc đã chọn?`)) {
      try {
        await axios.post(`${API}/api/internal-tasks/bulk-delete`, selectedTasks);
        toast.success(`Xóa ${selectedTasks.length} công việc thành công!`);
        setSelectedTasks([]);
        fetchTasks();
        fetchStatistics();
      } catch (error) {
        toast.error('Lỗi khi xóa công việc');
        console.error('Error bulk deleting tasks:', error);
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus, reportLink = null) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'completed' && reportLink) {
        payload.report_link = reportLink;
      }
      
      await axios.patch(`${API}/api/internal-tasks/${taskId}/status`, payload);
      toast.success('Cập nhật trạng thái thành công!');
      fetchTasks();
      fetchStatistics();
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái');
      console.error('Error updating status:', error);
    }
  };

  const handleAddFeedback = async () => {
    if (!newFeedback.trim()) return;
    
    try {
      await axios.post(`${API}/api/internal-tasks/${feedbackTask.id}/feedback/`, {
        message: newFeedback
      });
      setNewFeedback('');
      fetchTaskFeedbacks(feedbackTask.id);
      toast.success('Thêm feedback thành công!');
    } catch (error) {
      toast.error('Lỗi khi thêm feedback');
      console.error('Error adding feedback:', error);
    }
  };

  const fetchTaskFeedbacks = async (taskId) => {
    try {
      const response = await axios.get(`${API}/api/internal-tasks/${taskId}/feedback/`);
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'not_started':
        return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
      case 'in_progress':
        return <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>;
      case 'completed':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'normal':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return 'Cao';
      case 'normal':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return 'Không xác định';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'not_started':
        return 'Chưa làm';
      case 'in_progress':
        return 'Đang làm';
      case 'completed':
        return 'Hoàn thành';
      default:
        return 'Không xác định';
    }
  };

  const StatCard = ({ title, count, color, onClick, isActive }) => (
    <div 
      className={`modern-card p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isActive ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{count}</p>
        </div>
        <div className={`w-12 h-12 rounded-full ${color.replace('text', 'bg').replace('-600', '-100')} flex items-center justify-center`}>
          <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Công việc</h1>
          <p className="text-gray-600 mt-1">Quản lý công việc nội bộ giữa các bộ phận</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="modern-input w-auto"
          >
            <option value="all">Tất cả thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <StatCard
          title="Tổng Task"
          count={statistics.total_tasks || 0}
          color="text-blue-600"
          onClick={() => {
            setStatusFilter('all');
            setPriorityFilter('all');
          }}
          isActive={statusFilter === 'all' && priorityFilter === 'all'}
        />
        <StatCard
          title="Chưa làm"
          count={statistics.not_started || 0}
          color="text-gray-600"
          onClick={() => {
            setStatusFilter('not_started');
            setPriorityFilter('all');
          }}
          isActive={statusFilter === 'not_started'}
        />
        <StatCard
          title="Hoàn thành"
          count={statistics.completed || 0}
          color="text-green-600"
          onClick={() => {
            setStatusFilter('completed');
            setPriorityFilter('all');
          }}
          isActive={statusFilter === 'completed'}
        />
        <StatCard
          title="Cao"
          count={statistics.high_priority || 0}
          color="text-red-600"
          onClick={() => {
            setPriorityFilter('high');
            setStatusFilter('all');
          }}
          isActive={priorityFilter === 'high'}
        />
        <StatCard
          title="Trung bình"
          count={statistics.normal_priority || 0}
          color="text-yellow-600"
          onClick={() => {
            setPriorityFilter('normal');
            setStatusFilter('all');
          }}
          isActive={priorityFilter === 'normal'}
        />
        <StatCard
          title="Thấp"
          count={statistics.low_priority || 0}
          color="text-green-600"
          onClick={() => {
            setPriorityFilter('low');
            setStatusFilter('all');
          }}
          isActive={priorityFilter === 'low'}
        />
      </div>

      {/* Toolbar */}
      <div className="modern-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm công việc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="modern-input pl-10"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="modern-input w-auto"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="not_started">Chưa làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="completed">Hoàn thành</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="modern-input w-auto"
            >
              <option value="all">Tất cả ưu tiên</option>
              <option value="high">Cao</option>
              <option value="normal">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {selectedTasks.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa ({selectedTasks.length})
              </button>
            )}
            
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showCompleted 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showCompleted ? 'Trở về' : 'Hoàn thành'}
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm công việc
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="modern-card">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTasks(tasks.map(task => task.id));
                      } else {
                        setSelectedTasks([]);
                      }
                    }}
                    checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên công việc
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ưu tiên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  selectedTasks={selectedTasks}
                  setSelectedTasks={setSelectedTasks}
                  onStatusChange={handleStatusChange}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                  onView={setViewingTask}
                  onFeedback={(task) => {
                    setFeedbackTask(task);
                    fetchTaskFeedbacks(task.id);
                  }}
                  getStatusIcon={getStatusIcon}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getStatusLabel={getStatusLabel}
                />
              ))}
            </tbody>
          </table>
          
          {tasks.length === 0 && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có công việc</h3>
              <p className="text-gray-600">Bắt đầu bằng cách thêm công việc đầu tiên</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TaskModal
          users={users}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}
      
      {editingTask && (
        <TaskModal
          task={editingTask}
          users={users}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
        />
      )}
      
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          onClose={() => setViewingTask(null)}
        />
      )}
      
      {feedbackTask && (
        <FeedbackModal
          task={feedbackTask}
          feedbacks={feedbacks}
          newFeedback={newFeedback}
          setNewFeedback={setNewFeedback}
          onClose={() => setFeedbackTask(null)}
          onAddFeedback={handleAddFeedback}
        />
      )}
    </div>
  );
};

export default TaskManagement;