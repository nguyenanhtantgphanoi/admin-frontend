# Admin Frontend

Hệ thống quản trị nội dung cho các trang lễ, lịch công giáo và nội dung phụ trợ, xây dựng bằng Fastify + EJS + MongoDB.

## Tổng quan

- Backend: Fastify
- Template: EJS
- Database: MongoDB
- Frontend: Bootstrap + custom CSS
- Mục tiêu: quản lý dữ liệu ngày lễ, lịch công giáo và các bài viết liên quan

## Yêu cầu hệ thống

- Node.js 18+
- MongoDB đang chạy
- NPM hoặc PNPM

## Cài đặt

```bash
npm install
```

## Cấu hình môi trường

Tạo file `.env` ở thư mục gốc:

```env
MONGODB_URI=mongodb://localhost:27017/admin-frontend
```

Nếu doanh nghiệp hoặc môi trường khác dùng MongoDB Atlas hoặc host khác, thay `MONGODB_URI` tương ứng.

## Chạy ứng dụng

### Development

```bash
npm run dev:server
```

Ứng dụng mặc định chạy tại:

- http://localhost:3000

### Production

```bash
npm start
```

### Chạy test

```bash
npm test
```

## Cấu trúc thư mục quan trọng

```text
app.js
routes/
  root.js
views/
public/
plugins/
```

## Các route chính

### Trang chủ

- `/`
- hiển thị dashboard/landing page

### Quản lý ngày lễ

- `/bien-tap-ngay-le`
- quản lý nội dung và ngày lễ

### Quản lý lịch công giáo

- `/showall-lich`
- xem danh sách lịch công giáo

### Route cập nhật ngày lễ

- `/update-ngay-le`
- cập nhật thông tin `assigned_date`, `title`, `date`, `bac_le`, `mau_ao_le`, ...
- đã được xử lý để kiểm tra `_id`, dữ liệu null, và lỗi hợp lệ để tránh 500 không cần thiết

## Hướng dẫn sử dụng

### 1. Truy cập dashboard

Mở browser tại:

```text
http://localhost:3000
```

### 2. Quản lý ngày lễ

- Vào trang `/bien-tap-ngay-le`
- Chọn hoặc tìm ngày lễ cần cập nhật
- Điền thông tin phù hợp
- Lưu thay đổi

### 3. Quản lý lịch công giáo

- Vào `/showall-lich`
- Duyệt các dữ liệu theo ngày
- Nếu cần cập nhật theo date của ngày lễ, phần `assigned_date` sẽ là nơi gắn dữ liệu lịch

### 4. Sử dụng form cập nhật

Trường `_id` là bắt buộc. Nếu thiếu hoặc không hợp lệ, hệ thống sẽ trả về lỗi rõ ràng theo chuẩn HTTP.

## Lưu ý kỹ thuật

- Không thay đổi cơ sở dữ liệu hiện có.
- Không đổi tên collection MongoDB đang sử dụng.
- Nếu cần thay đổi cấu trúc dữ liệu, hãy kiểm tra kỹ toàn bộ các route đang đọc/ghi `ngay-le` và `lich-cong-giao`.
- Tất cả logic validation nên ưu tiên kiểm tra dữ liệu đầu vào trước khi truy vấn database.

## Khuyến nghị cải tiến tiếp theo

- Tách logic MongoDB thành service layer riêng.
- Tạo helper để validate `_id`, `date`, và payload đầu vào thống nhất cho toàn bộ route.
- Chuyển form lớn sang component/JS riêng để dễ bảo trì.
- Thêm unit test cho route cập nhật và API GET dữ liệu.

## Tài liệu tham khảo

- Fastify: https://fastify.dev/
- MongoDB Node driver: https://www.mongodb.com/docs/drivers/node/current/
- Bootstrap: https://getbootstrap.com/

