# Ghi chú Phát triển CRM Agency Marketing

## Cấu trúc Backend

### Models chính
- Client: Quản lý thông tin khách hàng
- Project: Quản lý dự án, liên kết với khách hàng
- Task: Quản lý công việc, liên kết với dự án
- Contract: Quản lý hợp đồng, liên kết với khách hàng và dự án
- Invoice: Quản lý hóa đơn, liên kết với khách hàng, dự án và hợp đồng

### API Endpoints
- `/api/users`: Quản lý người dùng
- `/api/clients`: Quản lý khách hàng
- `/api/projects`: Quản lý dự án
- `/api/tasks`: Quản lý công việc
- `/api/contracts`: Quản lý hợp đồng
- `/api/invoices`: Quản lý hóa đơn
- `/api/dashboard`: Lấy dữ liệu dashboard

## Cấu trúc Frontend

### Components chính
- Dashboard: Hiển thị tổng quan
- Clients: Quản lý khách hàng
- Projects: Quản lý dự án
- Tasks: Quản lý công việc
- Contracts: Quản lý hợp đồng
- Invoices: Quản lý hóa đơn

### Giao diện
- Sử dụng Tailwind CSS
- Layout: Menu bên trái, nội dung chính bên phải
- Modal forms: Thêm/sửa dữ liệu

## Lệnh hữu ích

### Khởi động/Dừng Services
```bash
# Khởi động tất cả
sudo supervisorctl restart all

# Khởi động riêng backend
sudo supervisorctl restart backend

# Khởi động riêng frontend
sudo supervisorctl restart frontend
```

### Kiểm tra logs
```bash
# Xem log backend
tail -n 100 /var/log/supervisor/backend.*.log

# Xem log frontend
tail -n 100 /var/log/supervisor/frontend.*.log
```

### Kiểm tra API
```bash
# Kiểm tra health check
curl -s ${REACT_APP_BACKEND_URL}/api/health | jq

# Kiểm tra setup
curl -s -X POST ${REACT_APP_BACKEND_URL}/api/setup | jq
```

## Vấn đề đã sửa
1. Hiển thị menu dropdown bị cắt - Đã sửa bằng cách tính toán vị trí động
2. Icon tìm kiếm chồng lên chữ - Đã tăng padding-left
3. Sửa chức năng chỉnh sửa khách hàng
