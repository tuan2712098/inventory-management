# Các kịch bản kiểm thử Inventory

## Chuẩn bị

- Chạy `setup.ps1`, kiểm tra MongoDB `inventory_management` và mở `http://localhost:5174`.
- Đăng nhập tài khoản admin demo, mật khẩu lấy từ Terminal sau seed.
- Không sử dụng database đang chứa dữ liệu thật.

## T01 — Đăng nhập và phân quyền

Đăng nhập bằng admin, manager, staff, viewer. Viewer không thấy nút tạo mới trên danh mục và không thấy form tạo phiếu. Staff thấy form nhập/xuất và mở kiểm kê nhưng không được xác nhận kiểm kê hoặc chuyển kho. Manager có thể tạo sản phẩm/kho, chuyển kho, xem Excel. Admin có trang quản lý nhân viên. Thử mật khẩu sai phải nhận HTTP 401.

## T02 — Danh mục, kho và nhà cung cấp

Tạo Category mới, Product với SKU duy nhất, Warehouse và Supplier. Tạo lại cùng SKU hoặc mã kho sẽ nhận HTTP 409. Thử ngưỡng tồn âm và giá vốn âm phải trả HTTP 400. Ngừng sử dụng một sản phẩm; dữ liệu lịch sử vẫn giữ lại.

## T03 — Nhập kho

Vào Nhập kho, chọn Kho Hà Nội, Nhà cung cấp Demo, Chuột không dây, số lượng 6, giá vốn 95000. Xác nhận. Kiểm tra phiếu `IN-*`, số tồn tăng 6, lịch sử có `stock_in` với biến động +6.

## T04 — Xuất kho và không đủ tồn

Vào Xuất kho, chọn sản phẩm vừa nhập, số lượng 2. Xác nhận. Tồn giảm 2. Thử xuất 999999 đơn vị: API phải trả HTTP 409 và tồn kho không được âm. Không thể thêm cùng SKU nhiều lần trong một phiếu.

## T05 — Chuyển kho

Chuyển 3 chuột từ Hà Nội sang Ninh Bình. Kho Hà Nội giảm 3, kho Ninh Bình tăng 3. Báo cáo có hai bản ghi: `transfer_out = -3` và `transfer_in = +3`. Hai kho không thể giống nhau.

## T06 — Kiểm kê

Mở phiếu cho một kho có tồn. Chọn số lượng đếm thực tế khác số hệ thống. Xác nhận **không ghi lý do** phải trả HTTP 400. Điền ghi chú rồi manager/admin xác nhận. Kiểm tra đã cộng/trừ chênh lệch, ghi `audit_adjustment`, phiếu chuyển sang `completed`. Nếu tồn đã đổi từ lúc mở kiểm kê, xác nhận trả HTTP 409 và nên tạo phiếu mới.

## T07 — Cảnh báo tồn kho

Tạo sản phẩm có `minStockThreshold=5`, nhập 6 chiếc, xuất 3 chiếc. `GET /api/alerts` xuất hiện cảnh báo open ở kho liên quan. Sau khi nhập bù lên 6, cảnh báo được đánh dấu resolved tự động.

## T08 — Báo cáo và Excel

Vào Lịch sử & báo cáo, lọc theo kho, loại, thời gian; chọn xuất Excel khi đăng nhập manager/admin. File phải có các cột biến động, trước, sau, người thao tác. Viewer/staff không được gọi API export (HTTP 403).

## T09 — User

Admin tạo user với email mới, nhận mật khẩu tạm đúng một lần. Khóa user; đăng nhập user đó phải thất bại. Thử user không phải admin gọi `POST /api/users` phải nhận HTTP 403.

## Chạy test tự động

```powershell
npm test --prefix .\backend
```

Hiện có các unit test chạy trực tiếp bằng Node.js cho quy tắc nhập liệu. Chưa có bộ integration test MongoDB đầy đủ; cần chạy T01–T09 thủ công trên môi trường MongoDB của bạn trước khi nộp.
