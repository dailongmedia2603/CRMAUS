# 🔐 CRM AUS - DEMO ACCOUNTS

## 📋 DANH SÁCH TÀI KHOẢN DEMO

### 👑 **ADMIN - Quản trị viên**
- **Email:** admin@example.com
- **Mật khẩu:** admin123
- **Role:** admin
- **Quyền:** Toàn quyền quản trị hệ thống

### 💼 **SALE - Nhân viên kinh doanh**
- **Email:** sale@crm.com
- **Mật khẩu:** sale123
- **Role:** account
- **Quyền:** Quản lý khách hàng, dự án, hợp đồng

### ✏️ **EDITOR - Biên tập viên**
- **Email:** editor@crm.com
- **Mật khẩu:** editor123
- **Role:** creative
- **Quyền:** Quản lý nội dung, creative

### 📝 **CONTENT - Nhân viên nội dung**
- **Email:** content@crm.com
- **Mật khẩu:** content123
- **Role:** staff
- **Quyền:** Xem và chỉnh sửa nội dung

### 🎨 **DESIGN - Nhà thiết kế**
- **Email:** design@crm.com
- **Mật khẩu:** design123
- **Role:** creative
- **Quyền:** Quản lý thiết kế, creative

### 👨‍💼 **MANAGER - Quản lý**
- **Email:** manager@crm.com
- **Mật khẩu:** manager123
- **Role:** account
- **Quyền:** Quản lý dự án, theo dõi tiến độ

### 💰 **FINANCE - Tài chính**
- **Email:** finance@crm.com
- **Mật khẩu:** finance123
- **Role:** account
- **Quyền:** Quản lý tài chính, hóa đơn, hợp đồng

---

## 🎯 PHÂN QUYỀN THEO ROLE

### **ADMIN** 
- ✅ Toàn quyền trên tất cả modules
- ✅ Tạo và quản lý users
- ✅ Cài đặt hệ thống
- ✅ Xem tất cả báo cáo

### **ACCOUNT** (Sale, Manager, Finance)
- ✅ Quản lý khách hàng
- ✅ Tạo và quản lý dự án  
- ✅ Quản lý hợp đồng
- ✅ Quản lý hóa đơn
- ❌ Không thể tạo users mới

### **CREATIVE** (Editor, Design)
- ✅ Xem khách hàng và dự án
- ✅ Quản lý tasks được phân công
- ✅ Upload và quản lý files
- ❌ Không thể xóa dự án/khách hàng

### **STAFF** (Content)
- ✅ Xem thông tin cơ bản
- ✅ Cập nhật tasks được phân công
- ✅ Xem báo cáo cơ bản
- ❌ Giới hạn quyền chỉnh sửa

---

## 🚀 HƯỚNG DẪN SỬ DỤNG

1. **Truy cập:** [https://de7e1af5-1ae0-4625-927a-73a124f01177.preview.emergentagent.com)

2. **Đăng nhập:** Sử dụng một trong các tài khoản demo ở trên

3. **Khám phá:** Mỗi tài khoản sẽ hiển thị menu và tính năng khác nhau tùy theo quyền

---

## ✅ TRẠNG THÁI TESTING

- [x] ✅ **Backend APIs:** Đã test thành công tất cả endpoints
- [x] ✅ **Authentication:** Tất cả tài khoản đăng nhập thành công
- [x] ✅ **Role-based access:** Đã cấu hình đúng quyền
- [x] ✅ **Database:** MongoDB hoạt động ổn định
- [x] ✅ **Services:** Frontend và Backend đang chạy

---

**🎉 HỆ THỐNG SẴNG SÀNG SỬ DỤNG!**