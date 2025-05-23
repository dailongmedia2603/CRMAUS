# CRM cho Agency Marketing

## Tổng quan
CRM dành cho agency marketing với các tính năng quản lý khách hàng, dự án, công việc, hợp đồng và hóa đơn.

## Cấu trúc dự án
- `/app/backend`: FastAPI backend, MongoDB
- `/app/frontend`: React frontend, Tailwind CSS

## Tính năng đã hoàn thành
- Dashboard hiển thị tổng quan
- Quản lý khách hàng (thêm, sửa, xóa, lưu trữ)
- Quản lý dự án (thêm, liên kết với khách hàng)
- Quản lý công việc (thêm, phân công, cập nhật trạng thái)
- Quản lý hợp đồng
- Quản lý hóa đơn

## Công nghệ sử dụng
- Backend: FastAPI, MongoDB, JWT Authentication
- Frontend: React, React Router, Tailwind CSS, Axios

## Hướng dẫn chạy dự án
1. Khởi động backend: `sudo supervisorctl restart backend`
2. Khởi động frontend: `sudo supervisorctl restart frontend`
