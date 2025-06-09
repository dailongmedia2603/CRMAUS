// Component Documents Management
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = '/api';

const Documents = ({ user }) => {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // active, archived
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  
  // Form states
  const [folderForm, setFolderForm] = useState({
    name: "",
    color: "#3B82F6",
    permissions: "all",
    description: ""
  });
  
  const [documentForm, setDocumentForm] = useState({
    title: "",
    folder_id: "",
    link: "",
    description: ""
  });

  // Màu sắc cho folder
  const folderColors = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", 
    "#8B5CF6", "#F97316", "#06B6D4", "#EC4899"
  ];

  // Permission options
  const permissionOptions = [
    { value: "all", label: "Tất cả" },
    { value: "admin", label: "Admin" },
    { value: "account", label: "Account" },
    { value: "creative", label: "Creative" },
    { value: "staff", label: "Staff" }
  ];

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      fetchDocuments();
    }
  }, [selectedFolder, statusFilter]);

  const fetchFolders = async () => {
    try {
      const response = await axios.get(`${API}/folders/`);
      setFolders(response.data);
      
      // Tự động chọn folder đầu tiên nếu có
      if (response.data.length > 0 && !selectedFolder) {
        setSelectedFolder(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      toast.error("Không thể tải danh sách thư mục");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!selectedFolder) return;
    
    try {
      const archived = statusFilter === "archived";
      const response = await axios.get(`${API}/documents/folder/${selectedFolder.id}?archived=${archived}`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Không thể tải danh sách tài liệu");
    }
  };

  const handleFolderSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFolder) {
        await axios.put(`${API}/folders/${editingFolder.id}`, folderForm);
        toast.success("Cập nhật thư mục thành công!");
      } else {
        await axios.post(`${API}/folders/`, folderForm);
        toast.success("Tạo thư mục thành công!");
      }
      
      setShowFolderModal(false);
      resetFolderForm();
      fetchFolders();
    } catch (error) {
      console.error("Error saving folder:", error);
      toast.error("Không thể lưu thư mục");
    }
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    try {
      const documentData = {
        ...documentForm,
        folder_id: documentForm.folder_id || selectedFolder?.id
      };

      if (editingDocument) {
        await axios.put(`${API}/documents/${editingDocument.id}`, documentData);
        toast.success("Cập nhật tài liệu thành công!");
      } else {
        await axios.post(`${API}/documents/`, documentData);
        toast.success("Tạo tài liệu thành công!");
      }
      
      setShowDocumentModal(false);
      resetDocumentForm();
      fetchDocuments();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Không thể lưu tài liệu");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Bạn có chắc muốn xóa thư mục này? (Chỉ có thể xóa thư mục không có tài liệu)")) return;
    
    try {
      await axios.delete(`${API}/folders/${folderId}`);
      toast.success("Xóa thư mục thành công!");
      
      // Reset selected folder if it was deleted
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
        setDocuments([]);
      }
      
      fetchFolders();
    } catch (error) {
      console.error("Error deleting folder:", error);
      if (error.response?.status === 400) {
        toast.error("Không thể xóa thư mục có chứa tài liệu");
      } else {
        toast.error("Không thể xóa thư mục");
      }
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa tài liệu này?")) return;
    
    try {
      await axios.delete(`${API}/documents/${documentId}`);
      toast.success("Xóa tài liệu thành công!");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Không thể xóa tài liệu");
    }
  };

  const handleBulkArchive = async () => {
    try {
      await axios.post(`${API}/documents/bulk-archive`, selectedDocuments);
      toast.success("Đã lưu trữ tài liệu thành công!");
      setSelectedDocuments([]);
      fetchDocuments();
    } catch (error) {
      console.error("Error archiving documents:", error);
      toast.error("Không thể lưu trữ tài liệu");
    }
  };

  const handleBulkRestore = async () => {
    try {
      await axios.post(`${API}/documents/bulk-restore`, selectedDocuments);
      toast.success("Đã khôi phục tài liệu thành công!");
      setSelectedDocuments([]);
      fetchDocuments();
    } catch (error) {
      console.error("Error restoring documents:", error);
      toast.error("Không thể khôi phục tài liệu");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa các tài liệu đã chọn?")) return;
    
    try {
      await axios.post(`${API}/documents/bulk-delete`, selectedDocuments);
      toast.success("Đã xóa tài liệu thành công!");
      setSelectedDocuments([]);
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting documents:", error);
      toast.error("Không thể xóa tài liệu");
    }
  };

  const resetFolderForm = () => {
    setFolderForm({
      name: "",
      color: "#3B82F6",
      permissions: "all",
      description: ""
    });
    setEditingFolder(null);
  };

  const resetDocumentForm = () => {
    setDocumentForm({
      title: "",
      folder_id: "",
      link: "",
      description: ""
    });
    setEditingDocument(null);
  };

  const openFolderModal = (folder = null) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderForm({
        name: folder.name,
        color: folder.color,
        permissions: folder.permissions,
        description: folder.description || ""
      });
    } else {
      resetFolderForm();
    }
    setShowFolderModal(true);
  };

  const openDocumentModal = (document = null) => {
    if (document) {
      setEditingDocument(document);
      setDocumentForm({
        title: document.title,
        folder_id: document.folder_id,
        link: document.link || "",
        description: document.description || ""
      });
    } else {
      resetDocumentForm();
    }
    setShowDocumentModal(true);
  };

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="text-center py-10">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý Tài liệu</h1>
        
        {/* Toolbar */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Tìm kiếm tài liệu..."
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="active">Hoạt động</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>

          {/* Actions */}
          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            {/* Bulk Actions */}
            <div className="relative">
              <button
                onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)}
                disabled={selectedDocuments.length === 0}
                className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                  selectedDocuments.length === 0 
                    ? 'border-gray-300 text-gray-400 bg-white' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Thao tác hàng loạt
                <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {bulkActionMenuOpen && selectedDocuments.length > 0 && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {statusFilter === "active" ? (
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
                    {user?.role === "admin" && (
                      <button
                        onClick={handleBulkDelete}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Xóa vĩnh viễn
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => openFolderModal()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm thư mục
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Widget - Folders */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Thư mục</h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFolder?.id === folder.id 
                        ? 'bg-indigo-50 border-indigo-200' 
                        : 'hover:bg-gray-50 border-transparent'
                    } border`}
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: folder.color }}
                      ></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{folder.name}</p>
                        <p className="text-xs text-gray-500">{folder.permissions}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openFolderModal(folder);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {user?.role === "admin" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Widget - Documents */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedFolder ? `Tài liệu trong "${selectedFolder.name}"` : "Chọn thư mục để xem tài liệu"}
              </h3>
              {selectedFolder && (
                <button
                  onClick={() => openDocumentModal()}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Thêm tài liệu
                </button>
              )}
            </div>
            
            {selectedFolder ? (
              <div className="p-4">
                {filteredDocuments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocuments(filteredDocuments.map(doc => doc.id));
                                } else {
                                  setSelectedDocuments([]);
                                }
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tên tài liệu
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mô tả
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
                        {filteredDocuments.map((document) => (
                          <tr key={document.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.includes(document.id)}
                                onChange={() => {
                                  if (selectedDocuments.includes(document.id)) {
                                    setSelectedDocuments(selectedDocuments.filter(id => id !== document.id));
                                  } else {
                                    setSelectedDocuments([...selectedDocuments, document.id]);
                                  }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{document.title}</div>
                              {document.link && (
                                <a
                                  href={document.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 hover:text-indigo-900"
                                >
                                  Xem liên kết
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {document.description || "Không có mô tả"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {document.created_by}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(document.created_at).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                {document.link && (
                                  <a
                                    href={document.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-900"
                                    title="Xem chi tiết"
                                  >
                                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </a>
                                )}
                                <button
                                  onClick={() => openDocumentModal(document)}
                                  className="text-gray-600 hover:text-gray-900"
                                  title="Sửa"
                                >
                                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(document.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Xóa"
                                >
                                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có tài liệu</h3>
                    <p className="mt-1 text-sm text-gray-500">Bắt đầu bằng cách tạo tài liệu mới.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => openDocumentModal()}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Thêm tài liệu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5L12 5H5a2 2 0 00-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Chọn thư mục</h3>
                <p className="mt-1 text-sm text-gray-500">Chọn một thư mục từ danh sách bên trái để xem tài liệu.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingFolder ? "Chỉnh sửa thư mục" : "Thêm thư mục mới"}
              </h3>
              <form onSubmit={handleFolderSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Tên thư mục</label>
                  <input
                    type="text"
                    value={folderForm.name}
                    onChange={(e) => setFolderForm({...folderForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Màu sắc</label>
                  <div className="mt-2 flex space-x-2">
                    {folderColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFolderForm({...folderForm, color})}
                        className={`w-8 h-8 rounded-full border-2 ${
                          folderForm.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Phân quyền</label>
                  <select
                    value={folderForm.permissions}
                    onChange={(e) => setFolderForm({...folderForm, permissions: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {permissionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    value={folderForm.description}
                    onChange={(e) => setFolderForm({...folderForm, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows="3"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {editingFolder ? "Cập nhật" : "Tạo mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingDocument ? "Chỉnh sửa tài liệu" : "Thêm tài liệu mới"}
              </h3>
              <form onSubmit={handleDocumentSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Tên tài liệu</label>
                  <input
                    type="text"
                    value={documentForm.title}
                    onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Thư mục</label>
                  <select
                    value={documentForm.folder_id || selectedFolder?.id || ""}
                    onChange={(e) => setDocumentForm({...documentForm, folder_id: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Link tài liệu</label>
                  <input
                    type="url"
                    value={documentForm.link}
                    onChange={(e) => setDocumentForm({...documentForm, link: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://..."
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    value={documentForm.description}
                    onChange={(e) => setDocumentForm({...documentForm, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows="4"
                    placeholder="Mô tả chi tiết về tài liệu..."
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDocumentModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {editingDocument ? "Cập nhật" : "Tạo mới"}
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

export default Documents;