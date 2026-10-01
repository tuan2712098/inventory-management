# Inventory Management System

Dự án quản lý hàng hóa và kho nội bộ sử dụng **Express.js + MongoDB/Mongoose + React.js**. Repo tách Backend và Frontend. Đây là bản demo thực tập, ưu tiên những luồng nghiệp vụ có thể chạy và kiểm tra thực tế trên máy cá nhân.

## 1. Cài nhanh trên Windows

**Yêu cầu:** Node.js 20 trở lên, npm, MongoDB Community Server đang chạy trên cổng `27017`.

1. Giải nén ZIP vào thư mục riêng, ví dụ `C:\Downloads\Inventory_Management_System`.
2. Mở thư mục này bằng VS Code, mở Terminal PowerShell ngay tại **thư mục gốc**, không phải `backend` hay `frontend`.
3. Chạy:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\setup.ps1
   ```

   Lệnh trên tự tạo `backend/.env` với hai khóa JWT ngẫu nhiên, chạy `npm install` cho Backend/Frontend và tạo dữ liệu demo trong MongoDB. **Hãy lưu mật khẩu demo xuất hiện trong Terminal; mật khẩu chỉ in khi tài khoản được tạo lần đầu.**

4. Mở cả Backend và Frontend bằng:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start.ps1
   ```

5. Mở trang **http://localhost:5174**. Server API chạy tại **http://localhost:4100**, kiểm tra qua `http://localhost:4100/health`.

Có thể chạy thủ công bằng hai Terminal: `cd backend; npm run dev` và `cd frontend; npm run dev`. Nếu không muốn dùng script PowerShell, tạo file `backend/.env` từ `.env.example`, tự thay `JWT_SECRET` / `JWT_REFRESH_SECRET` bằng chuỗi ngẫu nhiên dài tối thiểu 32 ký tự, rồi cài dependencies.

### Tài khoản demo

| Vai trò | Email |
|---|---|
| Quản trị toàn bộ | `admin@inventory.local` |
| Quản lý kho | `manager@inventory.local` |
| Nhân viên kho | `staff@inventory.local` |
| Người chỉ xem | `viewer@inventory.local` |

Tất cả tài khoản demo dùng **mật khẩu ngẫu nhiên giống nhau**, in ở cuối lệnh `npm run seed --prefix .\backend`. Không có mật khẩu cố định trong source. Nếu quên, chạy trong Terminal gốc:

```powershell
npm run demo:reset-password --prefix .\backend
```

Lệnh này chỉ đổi mật khẩu **4 tài khoản demo trong database Inventory**, không xóa dữ liệu kho. Sau đó đăng nhập lại bằng mật khẩu vừa in.

**Cổng đã chọn để không đụng project khác:** Banking dùng cổng riêng; HR đang dùng Backend `4000` / Frontend `5173`; Inventory dùng Backend **`4100`** / Frontend **`5174`**. Database MongoDB riêng là **`inventory_management`**, không phải `hr_leave_management`.

## 2. Chức năng trong bản demo

| Nhóm | Nội dung |
|---|---|
| Auth & User | JWT access/refresh token, bcrypt, đăng nhập/đăng xuất, đổi mật khẩu, tự sửa hồ sơ; admin tạo user, sửa role, khoá/mở khóa tài khoản. |
| Danh mục | Category có danh mục cha, Product có SKU duy nhất, giá vốn/giá bán, đơn vị, ngưỡng tồn; Warehouse và Supplier. Có tìm kiếm, thêm, sửa và ngừng sử dụng (soft disable). |
| Tồn kho | `StockLevel` theo cặp sản phẩm + kho, chặn số âm; theo dõi thiếu hàng. |
| Nhập kho | Chọn kho, nhà cung cấp, nhiều dòng sản phẩm, số lượng, giá vốn, số hóa đơn; cập nhật tồn và ghi `StockMovement`. |
| Xuất kho | Kiểm tra đủ hàng, cập nhật tồn, ghi audit log và cảnh báo thấp. |
| Chuyển kho | Trừ kho nguồn, cộng kho đích, ghi hai dòng `StockMovement`. |
| Kiểm kê | Chụp số dư theo kho, nhập số đếm thực tế, manager xác nhận điều chỉnh, ghi lịch sử. |
| Cảnh báo | Hiển thị alert khi tồn xuống dưới ngưỡng; manager có thể đánh dấu xử lý. |
| Dashboard / báo cáo | Tổng sản phẩm, số kho, giá trị tồn, phiếu nhập/xuất hôm nay, biểu đồ 6 tháng, sản phẩm xuất nhiều, lịch sử biến động và xuất Excel. |
| Frontend | Giao diện React responsive, đăng nhập theo 4 vai trò, tạo phiếu nhập/xuất/chuyển, form kiểm kê, bảng lọc và lịch sử. |

Phân quyền: `viewer` chỉ đọc; `warehouse_staff` được nhập, xuất và mở kiểm kê; `warehouse_manager` được quản lý danh mục, kho, sản phẩm, nhà cung cấp, chuyển kho, xác nhận kiểm kê, xử lý cảnh báo và xuất Excel; `super_admin` có toàn bộ quyền, kể cả quản lý nhân viên.

## 3. Test nhanh sau khi cài

1. Đăng nhập bằng `admin@inventory.local` và mật khẩu vừa in trong Terminal.
2. Trang Tổng quan hiển thị kho Hà Nội và kho Ninh Bình, 6 mặt hàng demo, tồn kho và biểu đồ nhập.
3. Vào **Nhập kho**, chọn kho, nhà cung cấp, SKU, số lượng. Tạo phiếu và đối chiếu **Tồn kho hiện tại**.
4. Vào **Xuất kho** và xuất số lượng nhỏ. Tồn phải giảm. Thử xuất vượt tồn để thấy phản hồi lỗi.
5. Vào **Chuyển kho**, chọn hai kho khác nhau và một sản phẩm; đối chiếu số lượng kho nguồn/đích.
6. Vào **Kiểm kê**, tạo phiếu, sửa số thực tế, ghi chú và xác nhận bằng admin/manager; vào **Lịch sử & báo cáo** để xem bản ghi điều chỉnh.
7. Tại **Lịch sử & báo cáo** chọn **Xuất Excel** để tải file `.xlsx`.

Nếu muốn test nhanh server, login, danh mục và phân quyền sau khi khởi chạy, trong Terminal gốc chạy `powershell -ExecutionPolicy Bypass -File .\verify.ps1`. Script này chỉ gửi một request bị từ chối để kiểm tra viewer, không tạo dữ liệu thật.

Hướng dẫn test cụ thể hơn: `docs/TESTING.md`. API: `docs/API.md`.

## 4. Cấu trúc thư mục

```text
Inventory_Management_System/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── scripts/
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/components/
│   ├── src/pages/
│   ├── src/lib/
│   ├── .env.example
│   └── package.json
├── docs/
├── postman/
├── setup.ps1
└── start.ps1
```

## 5. Điểm cần phân biệt với sản phẩm triển khai thật

- **Tính toàn vẹn:** MongoDB chạy như Windows service thông thường thường là standalone, không hỗ trợ transaction xuyên nhiều collection. Mặc định `MONGO_TRANSACTIONS=false` để máy Windows chạy ngay. Ở cấu hình này, ứng dụng tuần tự hóa thao tác tồn kho **trong một tiến trình Node** và sử dụng điều kiện atomic khi trừ tồn; tuy nhiên nếu máy chủ ngắt giữa một phiếu nhiều dòng, có thể phát sinh cập nhật dở dang. Đây **không phải bảo đảm ACID cho production hoặc nhiều instance**. Với MongoDB replica set, có thể đổi `MONGO_TRANSACTIONS=true` để dùng transaction MongoDB. Trước khi triển khai thật cần kiểm thử lỗi giữa chừng, transaction/idempotency, load test và quy trình đối soát.
- Bản demo **chưa có**: gửi email cảnh báo; hàng đợi Redis/Bull; upload ảnh/hoá đơn; kiểm kê lịch sử tại một thời điểm bất kỳ; phân quyền giới hạn từng kho được gán trong API; Docker Compose production; phân trang phía server cho mọi bảng; bộ test Postman tự động hoá toàn bộ endpoint (chỉ có collection mẫu). Các trường ảnh có thể nhập URL nhưng chưa có upload nội bộ.
- Refresh token được lưu dạng hash trên MongoDB, còn Frontend demo lưu token trong `sessionStorage`. Production nên dùng refresh token cookie HttpOnly/Secure, CSP, HTTPS, giám sát và chính sách bảo mật phù hợp.
- Tính `inventoryValue` sử dụng **giá vốn hiện tại trong Product**, không phải phương pháp FIFO hoặc bình quân gia quyền. Phiếu nhập lưu giá vốn theo dòng lúc nhập để phục vụ đối chiếu. Cảnh báo chỉ tự cập nhật khi có biến động tồn, chưa tự đồng bộ khi đổi ngưỡng trong Product.
- Seed chỉ được dùng trên database thử nghiệm, **không chạy trong production**. Mật khẩu tạm user được trả một lần để admin chuyển qua kênh riêng; email tự động chưa tích hợp.

## 6. Test mã nguồn và đóng gói

Từ thư mục gốc:

```powershell
npm test --prefix .\backend
npm run build --prefix .\frontend
```

Chỉ chạy sau khi đã `npm install`. Source không kèm `node_modules`, file build hay `.env` để giữ ZIP gọn và tránh lộ cấu hình.
