import React, { useState, useEffect, createContext } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import "./App.css";
import DocumentsComponent from "./components/Documents";
import ProjectsComponent from "./components/Projects";
import CampaignsComponent from "./components/Campaigns";
import CampaignDetailComponent from "./components/CampaignDetail";
import TemplatesComponent from "./components/Templates";
import { ExpenseOverview, ExpenseList, ExpenseConfig } from "./components/ExpenseComponents";
import ClientDetail from './components/ClientDetail';

// Auth context
const AuthContext = createContext();
export { AuthContext };

const ExpenseManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
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
            onClick={() => setActiveTab('list')}
            className={`${
              activeTab === 'list'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Danh sách chi phí
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
      {activeTab === 'overview' && <ExpenseOverview />}
      {activeTab === 'list' && <ExpenseList />}
      {activeTab === 'config' && <ExpenseConfig />}
    </div>
  );
};

// ================= TASK MANAGEMENT COMPONENTS =================

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
// Duplicate TaskModal removed

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
// Duplicate FeedbackModal removed

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/api/clients/`);
      setClients(response.data);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (clientData) => {
    try {
      await axios.post(`${API}/api/clients/`, clientData);
      toast.success('Tạo khách hàng thành công!');
      setShowCreateModal(false);
      fetchClients();
    } catch (error) {
      toast.error('Lỗi khi tạo khách hàng');
    }
  };

  const handleUpdateClient = async (clientData) => {
    try {
      await axios.put(`${API}/api/clients/${editingClient.id}`, clientData);
      toast.success('Cập nhật khách hàng thành công!');
      setEditingClient(null);
      fetchClients();
    } catch (error) {
      toast.error('Lỗi khi cập nhật khách hàng');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      try {
        await axios.delete(`${API}/api/clients/${clientId}`);
        toast.success('Xóa khách hàng thành công!');
        fetchClients();
      } catch (error) {
        toast.error('Lỗi khi xóa khách hàng');
      }
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý khách hàng</h1>
          <p className="text-gray-600 mt-1">Quản lý thông tin khách hàng và mối quan hệ</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div className="modern-card p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="modern-input pl-10"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="modern-card p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-semibold text-lg">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600">{client.company}</p>
                </div>
              </div>
              <div className="relative">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {client.contact_email || 'Chưa có email'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {client.phone || 'Chưa có SĐT'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {client.industry || 'Chưa phân loại'}
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => navigate(`/clients/${client.id}`)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Xem chi tiết
              </button>
              <button
                onClick={() => setEditingClient(client)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Sửa
              </button>
              <button
                onClick={() => handleDeleteClient(client.id)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="modern-card p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có khách hàng</h3>
          <p className="text-gray-600">Bắt đầu bằng cách thêm khách hàng đầu tiên của bạn</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingClient) && (
        <ClientModal
          client={editingClient}
          onClose={() => {
            setShowCreateModal(false);
            setEditingClient(null);
          }}
          onSubmit={editingClient ? handleUpdateClient : handleCreateClient}
        />
      )}
    </div>
  );
};

// Client Detail Component

// Project Detail Placeholder
const ProjectDetail = () => <div className="modern-card p-6"><h2>Project Detail</h2></div>;

// SidebarContent Component  
const SidebarContent = ({ user, logout }) => {
  const navigate = useNavigate();
  const location = useLocation().pathname;
  const [openSubmenus, setOpenSubmenus] = useState({
    project: false,
    finance: false,
    sales: false
  });

  const toggleSubmenu = (menu) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  return (
    <div className="h-screen w-64 bg-white shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">CRM AUS</h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {/* Dashboard */}
        <button
          onClick={() => navigate("/")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location === "/"
              ? "active text-white bg-blue-600"
              : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          Dashboard
        </button>

        {/* Client */}
        <button
          onClick={() => navigate("/clients")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/clients")
              ? "active text-white bg-purple-600"
              : "text-gray-700 hover:bg-purple-50 hover:text-purple-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Client
        </button>

        {/* Task */}
        <button
          onClick={() => navigate("/task")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/task")
              ? "active text-white bg-green-600"
              : "text-gray-700 hover:bg-green-50 hover:text-green-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Task
        </button>

        {/* Dự án (Projects) Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('project')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-orange-50 hover:text-orange-700"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4L12 3 5 7v4a7 7 0 1014 0V7z" />
              </svg>
              Dự án
            </div>
            <svg className={`w-4 h-4 transition-transform duration-200 ${openSubmenus.project ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {openSubmenus.project && (
            <div className="ml-4 space-y-1">
              <button
                onClick={() => navigate("/projects")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/projects")
                    ? "active text-white bg-orange-600"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Danh sách dự án
              </button>
              <button
                onClick={() => navigate("/campaigns")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/campaigns")
                    ? "active text-white bg-orange-600"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Chiến dịch
              </button>
              <button
                onClick={() => navigate("/task-templates")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/task-templates")
                    ? "active text-white bg-orange-600"
                    : "text-gray-600 hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v1a1 1 0 001 1h6a1 1 0 011-1V5a2 2 0 012 2v1a1 1 0 001 1v9a4 4 0 01-4 4H7z" />
                </svg>
                Template dịch vụ
              </button>
            </div>
          )}
        </div>

        {/* Tài chính (Finance) Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('finance')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tài chính
            </div>
            <svg className={`w-4 h-4 transition-transform duration-200 ${openSubmenus.finance ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {openSubmenus.finance && (
            <div className="ml-4 space-y-1">
              <button
                onClick={() => navigate("/invoices")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/invoices")
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Hóa đơn
              </button>
              <button
                onClick={() => navigate("/contracts")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/contracts")
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Hợp đồng
              </button>
              <button
                onClick={() => navigate("/expenses")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/expenses")
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Quản lý chi phí
              </button>
              <button
                onClick={() => navigate("/financial-reports")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/financial-reports")
                    ? "active text-white bg-emerald-600"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Báo cáo tài chính
              </button>
            </div>
          )}
        </div>

        {/* Bán hàng (Sales) Submenu */}
        <div className="space-y-1">
          <button
            onClick={() => toggleSubmenu('sales')}
            className="sidebar-nav-item w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-700 hover:bg-pink-50 hover:text-pink-700"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Bán hàng
            </div>
            <svg className={`w-4 h-4 transition-transform duration-200 ${openSubmenus.sales ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {openSubmenus.sales && (
            <div className="ml-4 space-y-1">
              <button
                onClick={() => navigate("/clients")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/clients")
                    ? "active text-white bg-pink-600"
                    : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Khách hàng
              </button>
              <button
                onClick={() => navigate("/opportunities")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/opportunities")
                    ? "active text-white bg-pink-600"
                    : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Cơ hội
              </button>
              <button
                onClick={() => navigate("/sales-reports")}
                className={`w-full flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                  location.startsWith("/sales-reports")
                    ? "active text-white bg-pink-600"
                    : "text-gray-600 hover:bg-pink-50 hover:text-pink-700"
                }`}
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Báo cáo
              </button>
            </div>
          )}
        </div>

        {/* Tài liệu */}
        <button
          onClick={() => navigate("/documents")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/documents")
              ? "active text-white bg-indigo-600"
              : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Tài liệu
        </button>

        {/* Báo cáo */}
        <button
          onClick={() => navigate("/reports")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/reports")
              ? "active text-white bg-yellow-600"
              : "text-gray-700 hover:bg-yellow-50 hover:text-yellow-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Báo cáo
        </button>

        {/* Tài khoản */}
        <button
          onClick={() => navigate("/account")}
          className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            location.startsWith("/account")
              ? "active text-white bg-red-600"
              : "text-gray-700 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Tài khoản
        </button>

        {/* Cài đặt (Admin only) */}
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate("/settings")}
            className={`sidebar-nav-item w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.startsWith("/settings")
                ? "active text-white bg-gray-600"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-700"
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cài đặt
          </button>
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-semibold text-gray-700">
                {user?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginComponent = ({ login }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Login attempt with:', { email: credentials.email });
      console.log('🌐 API URL:', API);
      
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      console.log('📤 Sending login request...');
      const response = await axios.post(`${API}/api/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Login response:', response.data);
      
      console.log('👤 Fetching user info...');
      const userResponse = await axios.get(`${API}/api/users/me/`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` }
      });

      console.log('👤 User data:', userResponse.data);
      
      login(userResponse.data, response.data.access_token);
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(`Đăng nhập thất bại! ${error.response?.data?.detail || 'Vui lòng kiểm tra thông tin.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-20 w-20 bg-indigo-600 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0a2 2 0 002-2v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập CRM AUS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hệ thống quản lý khách hàng toàn diện
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mật khẩu"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="spinner mr-2"></div>
                  Đang đăng nhập...
                </div>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600">
              <strong>Thông tin đăng nhập demo:</strong>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Email: admin@example.com<br />
              Password: admin123
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Task Management Component with full functionality
const Task = () => {
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
const Contracts = () => <div className="modern-card p-6"><h2>Contracts</h2></div>;
const Invoices = () => <div className="modern-card p-6"><h2>Invoices</h2></div>;
const Settings = () => <div className="modern-card p-6"><h2>Settings</h2></div>;
const Account = () => <div className="modern-card p-6"><h2>Account</h2></div>;
const Reports = () => <div className="modern-card p-6"><h2>Reports</h2></div>;
const FinancialReports = () => <div className="modern-card p-6"><h2>Financial Reports</h2></div>;
const Opportunities = () => <div className="modern-card p-6"><h2>Opportunities</h2></div>;
const SalesReports = () => <div className="modern-card p-6"><h2>Sales Reports</h2></div>;

export default App;

