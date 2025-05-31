import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// Biến môi trường
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewArchived, setViewArchived] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, [viewArchived, searchTerm]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        template_type: "service",
        archived: viewArchived.toString()
      });
      
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await axios.get(`${API}/templates/?${params}`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Không thể tải danh sách template");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTemplates(templates.map(template => template.id));
    } else {
      setSelectedTemplates([]);
    }
  };

  const handleSelectTemplate = (templateId) => {
    if (selectedTemplates.includes(templateId)) {
      setSelectedTemplates(selectedTemplates.filter(id => id !== templateId));
    } else {
      setSelectedTemplates([...selectedTemplates, templateId]);
    }
  };

  const toggleActionMenu = (templateId) => {
    if (actionMenuOpen === templateId) {
      setActionMenuOpen(null);
    } else {
      setActionMenuOpen(templateId);
    }
  };

  const toggleBulkActionMenu = () => {
    setBulkActionMenuOpen(!bulkActionMenuOpen);
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Vui lòng nhập tên template");
      return;
    }

    try {
      const response = await axios.post(`${API}/templates/`, {
        name: templateName,
        content: JSON.stringify([]), // Empty content initially
        template_type: "service"
      });

      toast.success("Tạo template thành công!");
      setIsCreateModalOpen(false);
      setTemplateName("");
      fetchTemplates();
      
      // Open designer for new template
      setCurrentTemplateId(response.data.id);
      setIsDesignerOpen(true);
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Không thể tạo template");
    }
  };

  const handleOpenDesigner = (templateId) => {
    setCurrentTemplateId(templateId);
    setIsDesignerOpen(true);
    setActionMenuOpen(null);
  };

  const handleEditTemplate = (template) => {
    setTemplateName(template.name);
    setCurrentTemplateId(template.id);
    setIsCreateModalOpen(true);
    setActionMenuOpen(null);
  };

  const handleUpdateTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Vui lòng nhập tên template");
      return;
    }

    try {
      await axios.put(`${API}/templates/${currentTemplateId}`, {
        name: templateName
      });

      toast.success("Cập nhật template thành công!");
      setIsCreateModalOpen(false);
      setTemplateName("");
      setCurrentTemplateId(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Không thể cập nhật template");
    }
  };

  const handleArchiveTemplate = async (templateId) => {
    try {
      await axios.put(`${API}/templates/${templateId}`, {
        archived: true
      });
      toast.success("Đã lưu trữ template");
      fetchTemplates();
      setActionMenuOpen(null);
    } catch (error) {
      console.error("Error archiving template:", error);
      toast.error("Không thể lưu trữ template");
    }
  };

  const handleRestoreTemplate = async (templateId) => {
    try {
      await axios.put(`${API}/templates/${templateId}`, {
        archived: false
      });
      toast.success("Đã khôi phục template");
      fetchTemplates();
      setActionMenuOpen(null);
    } catch (error) {
      console.error("Error restoring template:", error);
      toast.error("Không thể khôi phục template");
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa template này?")) {
      return;
    }

    try {
      await axios.delete(`${API}/templates/${templateId}`);
      toast.success("Đã xóa template");
      fetchTemplates();
      setActionMenuOpen(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Không thể xóa template");
    }
  };

  const handleDuplicateTemplate = async (templateId) => {
    try {
      await axios.post(`${API}/templates/${templateId}/duplicate`);
      toast.success("Đã nhân đôi template");
      fetchTemplates();
      setActionMenuOpen(null);
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Không thể nhân đôi template");
    }
  };

  const handleBulkArchive = async () => {
    try {
      await axios.post(`${API}/templates/bulk-archive`, selectedTemplates);
      toast.success(`Đã lưu trữ ${selectedTemplates.length} template`);
      setSelectedTemplates([]);
      fetchTemplates();
      setBulkActionMenuOpen(false);
    } catch (error) {
      console.error("Error bulk archiving:", error);
      toast.error("Không thể lưu trữ templates");
    }
  };

  const handleBulkRestore = async () => {
    try {
      await axios.post(`${API}/templates/bulk-restore`, selectedTemplates);
      toast.success(`Đã khôi phục ${selectedTemplates.length} template`);
      setSelectedTemplates([]);
      fetchTemplates();
      setBulkActionMenuOpen(false);
    } catch (error) {
      console.error("Error bulk restoring:", error);
      toast.error("Không thể khôi phục templates");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedTemplates.length} template?`)) {
      return;
    }

    try {
      await axios.post(`${API}/templates/bulk-delete`, selectedTemplates);
      toast.success(`Đã xóa ${selectedTemplates.length} template`);
      setSelectedTemplates([]);
      fetchTemplates();
      setBulkActionMenuOpen(false);
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Không thể xóa templates");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  if (isDesignerOpen) {
    return (
      <TemplateDesigner 
        templateId={currentTemplateId}
        onClose={() => setIsDesignerOpen(false)}
        onSave={() => {
          setIsDesignerOpen(false);
          fetchTemplates();
        }}
      />
    );
  }

  return (
    <div className="px-4">
      {/* Header và công cụ */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Template dịch vụ</h1>
          <div className="flex space-x-2">
            {/* Bulk Actions */}
            <div className="relative">
              <button
                onClick={toggleBulkActionMenu}
                disabled={selectedTemplates.length === 0}
                className={`inline-flex items-center px-4 py-2 border ${
                  selectedTemplates.length === 0 
                    ? 'border-gray-300 text-gray-400' 
                    : 'border-gray-300 text-gray-700'
                } rounded-md shadow-sm text-sm font-medium bg-white hover:bg-gray-50 focus:outline-none`}
              >
                Xóa / Lưu trữ
                <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {bulkActionMenuOpen && selectedTemplates.length > 0 && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {!viewArchived ? (
                      <button
                        onClick={handleBulkArchive}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Lưu trữ
                      </button>
                    ) : (
                      <button
                        onClick={handleBulkRestore}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Khôi phục
                      </button>
                    )}
                    <button
                      onClick={handleBulkDelete}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Archive Toggle */}
            <button
              onClick={() => setViewArchived(!viewArchived)}
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
                viewArchived 
                  ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              } focus:outline-none`}
            >
              <svg className="mr-2 -ml-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              {viewArchived ? 'Hoạt động' : 'Xem lưu trữ'}
            </button>

            {/* Add Template */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm template
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Tìm kiếm theo tên template..."
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md py-2"
            />
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4">
                <input
                  type="checkbox"
                  checked={templates.length > 0 && selectedTemplates.length === templates.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tên template
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Người tạo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày tạo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                  {viewArchived ? "Không có template nào trong lưu trữ" : "Chưa có template nào"}
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={() => handleSelectTemplate(template.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenDesigner(template.id)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      {template.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {template.creator_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(template.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                    <button
                      onClick={() => toggleActionMenu(template.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {actionMenuOpen === template.id && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleOpenDesigner(template.id)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Chi tiết
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template.id)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Nhân đôi
                          </button>
                          {!template.archived ? (
                            <button
                              onClick={() => handleArchiveTemplate(template.id)}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Lưu trữ
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestoreTemplate(template.id)}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Khôi phục
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Xóa
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Template Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {currentTemplateId ? 'Sửa template' : 'Thêm template mới'}
              </h3>
              <form onSubmit={currentTemplateId ? handleUpdateTemplate : handleCreateTemplate}>
                <div className="mb-4">
                  <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
                    Tên template
                  </label>
                  <input
                    type="text"
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập tên template..."
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setTemplateName("");
                      setCurrentTemplateId(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                  >
                    {currentTemplateId ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Template Designer Component - This will be expanded in Phase 3
const TemplateDesigner = ({ templateId, onClose, onSave }) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState([]);
  const [draggedComponent, setDraggedComponent] = useState(null);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await axios.get(`${API}/templates/${templateId}`);
      setTemplate(response.data);
      
      // Parse content if exists
      if (response.data.content) {
        try {
          const parsedContent = JSON.parse(response.data.content);
          setComponents(parsedContent);
        } catch (e) {
          console.log("Content is not valid JSON, starting with empty array");
          setComponents([]);
        }
      }
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("Không thể tải template");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    try {
      await axios.put(`${API}/templates/${templateId}`, {
        content: JSON.stringify(components)
      });
      toast.success("Đã lưu template!");
      onSave();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Không thể lưu template");
    }
  };

  const addComponent = (type) => {
    const newComponent = {
      id: Date.now().toString(),
      type: type,
      content: getDefaultContent(type),
      position: components.length
    };
    setComponents([...components, newComponent]);
  };

  const getDefaultContent = (type) => {
    switch (type) {
      case 'title':
        return { text: 'Tiêu đề mới', size: 'h2' };
      case 'text':
        return { text: 'Nội dung văn bản...' };
      case 'image':
        return { url: '', alt: '', caption: '' };
      case 'link':
        return { url: '', text: 'Link mới' };
      case 'date':
        return { format: 'dd/mm/yyyy' };
      case 'feedback':
        return { type: 'rating', question: 'Đánh giá dịch vụ?' };
      default:
        return {};
    }
  };

  const updateComponent = (id, newContent) => {
    setComponents(components.map(comp => 
      comp.id === id ? { ...comp, content: newContent } : comp
    ));
  };

  const deleteComponent = (id) => {
    setComponents(components.filter(comp => comp.id !== id));
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải template...</div>;
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Component Palette */}
      <div className="w-64 bg-white shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Thành phần</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          {[
            { type: 'title', label: 'Tiêu đề', icon: 'H' },
            { type: 'text', label: 'Văn bản', icon: 'T' },
            { type: 'image', label: 'Hình ảnh', icon: '🖼️' },
            { type: 'link', label: 'Liên kết', icon: '🔗' },
            { type: 'date', label: 'Ngày tháng', icon: '📅' },
            { type: 'feedback', label: 'Đánh giá', icon: '⭐' }
          ].map((component) => (
            <button
              key={component.type}
              onClick={() => addComponent(component.type)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <span className="mr-3 text-lg">{component.icon}</span>
              {component.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Canvas */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-lg min-h-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">{template?.name}</h1>
            <div className="space-x-2">
              <button
                onClick={saveTemplate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Lưu
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Đóng
              </button>
            </div>
          </div>

          {/* Template Components */}
          <div className="space-y-4">
            {components.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p>Chưa có thành phần nào. Hãy thêm thành phần từ bảng bên trái.</p>
              </div>
            ) : (
              components.map((component, index) => (
                <TemplateComponent
                  key={component.id}
                  component={component}
                  onUpdate={(newContent) => updateComponent(component.id, newContent)}
                  onDelete={() => deleteComponent(component.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual Template Component
const TemplateComponent = ({ component, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);

  const renderComponent = () => {
    switch (component.type) {
      case 'title':
        return (
          <div className="border border-gray-200 rounded-lg p-4 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="mr-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={component.content.text}
                onChange={(e) => onUpdate({ ...component.content, text: e.target.value })}
                onBlur={() => setIsEditing(false)}
                onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
                className="w-full text-2xl font-bold border-none outline-none"
                autoFocus
              />
            ) : (
              <h2 className="text-2xl font-bold">{component.content.text}</h2>
            )}
          </div>
        );
      
      case 'text':
        return (
          <div className="border border-gray-200 rounded-lg p-4 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="mr-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            {isEditing ? (
              <textarea
                value={component.content.text}
                onChange={(e) => onUpdate({ ...component.content, text: e.target.value })}
                onBlur={() => setIsEditing(false)}
                className="w-full border-none outline-none resize-none"
                rows="3"
                autoFocus
              />
            ) : (
              <p className="text-gray-700">{component.content.text}</p>
            )}
          </div>
        );

      case 'link':
        return (
          <div className="border border-gray-200 rounded-lg p-4 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="mr-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Văn bản hiển thị"
                  value={component.content.text}
                  onChange={(e) => onUpdate({ ...component.content, text: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="url"
                  placeholder="URL"
                  value={component.content.url}
                  onChange={(e) => onUpdate({ ...component.content, url: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                >
                  Xong
                </button>
              </div>
            ) : (
              <a
                href={component.content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 underline"
              >
                {component.content.text}
              </a>
            )}
          </div>
        );

      case 'feedback':
        return (
          <div className="border border-gray-200 rounded-lg p-4 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="mr-2 p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Câu hỏi đánh giá"
                  value={component.content.question}
                  onChange={(e) => onUpdate({ ...component.content, question: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                >
                  Xong
                </button>
              </div>
            ) : (
              <div>
                <p className="font-medium mb-2">{component.content.question}</p>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div className="p-4 border border-gray-200 rounded">Component type: {component.type}</div>;
    }
  };

  return renderComponent();
};

export default Templates;