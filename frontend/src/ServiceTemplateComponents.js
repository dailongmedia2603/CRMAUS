import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

// Service Templates Components
export const ServiceTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    status: "active",
    estimated_duration: "",
    base_price: ""
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, [searchTerm, categoryFilter, statusFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await axios.get(`${API}/service-templates?${params.toString()}`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Không thể tải danh sách mẫu dịch vụ");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/service-templates/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const templateData = {
        ...formData,
        estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
        base_price: formData.base_price ? parseFloat(formData.base_price) : null
      };

      if (isEditing) {
        await axios.put(`${API}/service-templates/${currentTemplateId}`, templateData);
        toast.success("Cập nhật mẫu dịch vụ thành công!");
      } else {
        await axios.post(`${API}/service-templates`, templateData);
        toast.success("Thêm mẫu dịch vụ thành công!");
      }

      setIsModalOpen(false);
      resetForm();
      fetchTemplates();
      fetchCategories();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(isEditing ? "Không thể cập nhật mẫu dịch vụ" : "Không thể tạo mẫu dịch vụ mới");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      status: "active",
      estimated_duration: "",
      base_price: ""
    });
    setIsEditing(false);
    setCurrentTemplateId(null);
  };

  const handleEdit = (template) => {
    setIsEditing(true);
    setCurrentTemplateId(template.id);
    setFormData({
      name: template.name || "",
      description: template.description || "",
      category: template.category || "",
      status: template.status || "active",
      estimated_duration: template.estimated_duration ? template.estimated_duration.toString() : "",
      base_price: template.base_price ? template.base_price.toString() : ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mẫu dịch vụ này? Thao tác này sẽ xóa tất cả dữ liệu liên quan.")) {
      return;
    }

    try {
      await axios.delete(`${API}/service-templates/${templateId}`);
      toast.success("Xóa mẫu dịch vụ thành công!");
      fetchTemplates();
      fetchCategories();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Không thể xóa mẫu dịch vụ");
    }
  };

  const handleClone = async (templateId) => {
    try {
      await axios.post(`${API}/service-templates/${templateId}/clone`);
      toast.success("Sao chép mẫu dịch vụ thành công!");
      fetchTemplates();
    } catch (error) {
      console.error("Error cloning template:", error);
      toast.error("Không thể sao chép mẫu dịch vụ");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Đang sử dụng";
      case "inactive":
        return "Không sử dụng";
      default:
        return status;
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Mẫu dịch vụ</h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tạo mẫu dịch vụ
        </button>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.count})
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang sử dụng</option>
            <option value="inactive">Không sử dụng</option>
          </select>
        </div>
      </div>

      {/* Danh sách mẫu dịch vụ */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {templates.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên dịch vụ
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian ước tính
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá cơ bản
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{template.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {template.category || "Chưa phân loại"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.estimated_duration ? `${template.estimated_duration} ngày` : "Chưa xác định"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.base_price 
                      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(template.base_price)
                      : "Chưa xác định"
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(template.status)}`}>
                      {getStatusText(template.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(template.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/service-templates/${template.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Xem chi tiết"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Chỉnh sửa"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleClone(template.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Sao chép"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Xóa"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-10 text-gray-500">
            {searchTerm || categoryFilter || statusFilter ? "Không tìm thấy mẫu dịch vụ nào phù hợp với bộ lọc." : "Chưa có mẫu dịch vụ nào. Bắt đầu bằng cách tạo mẫu dịch vụ mới."}
          </div>
        )}
      </div>

      {/* Modal thêm/sửa mẫu dịch vụ */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {isEditing ? "Chỉnh sửa mẫu dịch vụ" : "Tạo mẫu dịch vụ mới"}
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Tên mẫu dịch vụ *
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              required
                              value={formData.name}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Mô tả
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="description"
                              name="description"
                              rows="3"
                              value={formData.description}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Danh mục
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="category"
                              id="category"
                              value={formData.category}
                              onChange={handleInputChange}
                              placeholder="Ví dụ: Web Design, SEO, Marketing"
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                            Trạng thái
                          </label>
                          <div className="mt-1">
                            <select
                              id="status"
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="active">Đang sử dụng</option>
                              <option value="inactive">Không sử dụng</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="estimated_duration" className="block text-sm font-medium text-gray-700">
                            Thời gian ước tính (ngày)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="estimated_duration"
                              id="estimated_duration"
                              min="1"
                              value={formData.estimated_duration}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="base_price" className="block text-sm font-medium text-gray-700">
                            Giá cơ bản (VND)
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="base_price"
                              id="base_price"
                              min="0"
                              step="1000"
                              value={formData.base_price}
                              onChange={handleInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {isEditing ? "Cập nhật" : "Tạo mẫu"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
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

export const ServiceTemplateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [hierarchy, setHierarchy] = useState(null);

  useEffect(() => {
    fetchTemplate();
    fetchHierarchy();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/service-templates/${id}`);
      setTemplate(response.data);
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("Không thể tải thông tin mẫu dịch vụ");
      navigate('/service-templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchHierarchy = async () => {
    try {
      const response = await axios.get(`${API}/service-templates/${id}/hierarchy`);
      setHierarchy(response.data);
    } catch (error) {
      console.error("Error fetching hierarchy:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  if (!template) {
    return <div className="text-center py-10">Không tìm thấy mẫu dịch vụ</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/service-templates')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại danh sách
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">{template.name}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              template.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {template.status === 'active' ? 'Đang sử dụng' : 'Không sử dụng'}
            </span>
          </div>
        </div>
        
        {template.description && (
          <p className="mt-2 text-gray-600">{template.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "services"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Dịch vụ
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "preview"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Xem trước
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <ServiceTemplateOverview template={template} />
        )}
        {activeTab === "services" && (
          <ServiceTemplateServices templateId={id} hierarchy={hierarchy} onUpdate={fetchHierarchy} />
        )}
        {activeTab === "preview" && (
          <ServiceTemplatePreview hierarchy={hierarchy} />
        )}
      </div>
    </div>
  );
};

// Tab components for Service Template Detail
export const ServiceTemplateOverview = ({ template }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin cơ bản</h3>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Tên mẫu dịch vụ</dt>
            <dd className="text-sm text-gray-900">{template.name}</dd>
          </div>
          {template.category && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Danh mục</dt>
              <dd className="text-sm text-gray-900">{template.category}</dd>
            </div>
          )}
          {template.estimated_duration && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Thời gian ước tính</dt>
              <dd className="text-sm text-gray-900">{template.estimated_duration} ngày</dd>
            </div>
          )}
          {template.base_price && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Giá cơ bản</dt>
              <dd className="text-sm text-gray-900">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(template.base_price)}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Ngày tạo</dt>
            <dd className="text-sm text-gray-900">{new Date(template.created_at).toLocaleDateString('vi-VN')}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Cập nhật gần nhất</dt>
            <dd className="text-sm text-gray-900">{new Date(template.updated_at).toLocaleDateString('vi-VN')}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Mô tả</h3>
        <p className="text-sm text-gray-700">
          {template.description || "Chưa có mô tả cho mẫu dịch vụ này."}
        </p>
      </div>
    </div>
  );
};

export const ServiceTemplateServices = ({ templateId, hierarchy, onUpdate }) => {
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: "",
    description: "",
    order_index: 0,
    estimated_hours: "",
    required_skills: [],
    dependencies: []
  });

  const services = hierarchy?.services || [];

  const handleServiceInputChange = (e) => {
    const { name, value } = e.target;
    setServiceFormData({ ...serviceFormData, [name]: value });
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      const serviceData = {
        ...serviceFormData,
        template_id: templateId,
        estimated_hours: serviceFormData.estimated_hours ? parseFloat(serviceFormData.estimated_hours) : null
      };

      if (selectedService) {
        await axios.put(`${API}/services/${selectedService.id}`, serviceData);
        toast.success("Cập nhật dịch vụ thành công!");
      } else {
        await axios.post(`${API}/services`, serviceData);
        toast.success("Thêm dịch vụ thành công!");
      }

      setIsServiceModalOpen(false);
      resetServiceForm();
      onUpdate();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error(selectedService ? "Không thể cập nhật dịch vụ" : "Không thể tạo dịch vụ mới");
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      name: "",
      description: "",
      order_index: 0,
      estimated_hours: "",
      required_skills: [],
      dependencies: []
    });
    setSelectedService(null);
  };

  const handleEditService = (service) => {
    setSelectedService(service);
    setServiceFormData({
      name: service.name || "",
      description: service.description || "",
      order_index: service.order_index || 0,
      estimated_hours: service.estimated_hours ? service.estimated_hours.toString() : "",
      required_skills: service.required_skills || [],
      dependencies: service.dependencies || []
    });
    setIsServiceModalOpen(true);
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa dịch vụ này? Thao tác này sẽ xóa tất cả task templates liên quan.")) {
      return;
    }

    try {
      await axios.delete(`${API}/services/${serviceId}`);
      toast.success("Xóa dịch vụ thành công!");
      onUpdate();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Không thể xóa dịch vụ");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Dịch vụ trong mẫu</h3>
        <button
          onClick={() => {
            resetServiceForm();
            setIsServiceModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm dịch vụ
        </button>
      </div>

      <div className="space-y-4">
        {services.length > 0 ? (
          services.map((service) => (
            <div key={service.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-md font-medium text-gray-900">{service.name}</h4>
                  {service.description && (
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  )}
                  <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                    <span>Thứ tự: {service.order_index}</span>
                    {service.estimated_hours && <span>Ước tính: {service.estimated_hours} giờ</span>}
                    {service.tasks && <span>Tasks: {service.tasks.length}</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditService(service)}
                    className="text-gray-600 hover:text-gray-900"
                    title="Chỉnh sửa"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Xóa"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Task Templates */}
              {service.tasks && service.tasks.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Nhiệm vụ:</h5>
                  <div className="space-y-2">
                    {service.tasks.map((task) => (
                      <div key={task.id} className="text-sm text-gray-600">
                        <span className="font-medium">{task.name}</span>
                        {task.estimated_hours && <span className="ml-2 text-gray-500">({task.estimated_hours}h)</span>}
                        {task.components && task.components.length > 0 && (
                          <span className="ml-2 text-gray-400">• {task.components.length} components</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có dịch vụ nào. Bắt đầu bằng cách thêm dịch vụ mới.
          </div>
        )}
      </div>

      {/* Modal thêm/sửa dịch vụ */}
      {isServiceModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleServiceSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {selectedService ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-6">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Tên dịch vụ *
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              required
                              value={serviceFormData.name}
                              onChange={handleServiceInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Mô tả
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="description"
                              name="description"
                              rows="3"
                              value={serviceFormData.description}
                              onChange={handleServiceInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            ></textarea>
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="order_index" className="block text-sm font-medium text-gray-700">
                            Thứ tự sắp xếp
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="order_index"
                              id="order_index"
                              min="0"
                              value={serviceFormData.order_index}
                              onChange={handleServiceInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700">
                            Giờ ước tính
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="estimated_hours"
                              id="estimated_hours"
                              min="0"
                              step="0.5"
                              value={serviceFormData.estimated_hours}
                              onChange={handleServiceInputChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {selectedService ? "Cập nhật" : "Thêm dịch vụ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Hủy
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

export const ServiceTemplatePreview = ({ hierarchy }) => {
  if (!hierarchy) {
    return <div className="text-center py-10">Đang tải dữ liệu xem trước...</div>;
  }

  const services = hierarchy.services || [];

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Xem trước mẫu dịch vụ: {hierarchy.name}</h3>
        
        {services.length > 0 ? (
          <div className="space-y-6">
            {services.map((service, serviceIndex) => (
              <div key={service.id} className="border-l-4 border-indigo-500 pl-4">
                <h4 className="text-md font-medium text-gray-900 mb-2">
                  {serviceIndex + 1}. {service.name}
                </h4>
                {service.description && (
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                )}

                {service.tasks && service.tasks.length > 0 && (
                  <div className="ml-4 space-y-3">
                    {service.tasks.map((task, taskIndex) => (
                      <div key={task.id} className="border-l-2 border-gray-300 pl-3">
                        <h5 className="text-sm font-medium text-gray-800">
                          {serviceIndex + 1}.{taskIndex + 1} {task.name}
                        </h5>
                        {task.description && (
                          <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          {task.estimated_hours && <span>⏱ {task.estimated_hours}h</span>}
                          {task.priority && (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                            </span>
                          )}
                          {task.components && task.components.length > 0 && (
                            <span>🧩 {task.components.length} components</span>
                          )}
                        </div>

                        {task.required_deliverables && task.required_deliverables.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700">Sản phẩm cần giao:</p>
                            <ul className="text-xs text-gray-600 ml-2">
                              {task.required_deliverables.map((deliverable, index) => (
                                <li key={index}>• {deliverable}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Mẫu dịch vụ này chưa có dịch vụ nào được cấu hình.
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="text-md font-medium text-gray-900 mb-2">Tóm tắt</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Tổng số dịch vụ:</span>
            <span className="ml-2 text-gray-600">{services.length}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Tổng số nhiệm vụ:</span>
            <span className="ml-2 text-gray-600">
              {services.reduce((total, service) => total + (service.tasks?.length || 0), 0)}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Tổng thời gian ước tính:</span>
            <span className="ml-2 text-gray-600">
              {services.reduce((total, service) => {
                const serviceHours = service.tasks?.reduce((taskTotal, task) => taskTotal + (task.estimated_hours || 0), 0) || 0;
                return total + serviceHours;
              }, 0)} giờ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};