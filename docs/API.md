# API Inventory (prefix `/api`)

Port mặc định: `4100`, bắt đầu từ `http://localhost:4100/api`. Mọi endpoint trừ auth yêu cầu header `Authorization: Bearer <accessToken>`.

## Xác thực

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/login` | `{email, password}` → accessToken, refreshToken, user |
| POST | `/auth/refresh` | `{refreshToken}` → cấp bộ token mới và thu hồi token cũ |
| POST | `/auth/logout` | `{refreshToken}` → thu hồi refresh token |
| POST | `/auth/change-password` | Bearer + `{oldPassword,newPassword}` |

## Danh mục

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/categories`, `/products`, `/warehouses`, `/suppliers` | Mọi tài khoản đăng nhập |
| GET | `/{resource}/:id` | Mọi tài khoản đăng nhập |
| POST | `/{resource}` | super_admin, warehouse_manager |
| PATCH | `/{resource}/:id` | super_admin, warehouse_manager |
| DELETE | `/{resource}/:id` | Soft disable, không xóa lịch sử |
| GET | `/products/:id/movements` | Mọi tài khoản đăng nhập |

GET danh sách nhận query `q`, `page`, `limit`, `status=active|inactive`, Product còn hỗ trợ `category`. Response: `{items,total,page,pages}`.

Tạo Product: `{name,sku,category,unit,costPrice,salePrice,minStockThreshold,description?,imageUrl?}`. SKU và mã dùng chữ/số/`_`/`-`. Tạo Warehouse: `{name,code,address?}`. Supplier: `{name,code,contactName?,phone?,email?,address?,taxCode?}`. Category: `{name,code,parent?}`.

## Users

`GET /users/me`, `PATCH /users/me` dành cho chính mình. Admin có `GET /users`, `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/status`; manager/admin có `GET /users/:id`.

Các role: `super_admin`, `warehouse_manager`, `warehouse_staff`, `viewer`. Admin tạo user qua `{fullName,email,role,warehouses?}`; phản hồi chứa `temporaryPassword` chỉ một lần.

## Tồn kho

`GET /stock-levels?warehouse=...`, `GET /stock-levels/low-stock?warehouse=...`, phản hồi `{items}`.

**Nhập kho:**

```json
{
  "warehouse": "OBJECT_ID_KHO",
  "supplier": "OBJECT_ID_NHA_CUNG_CAP",
  "invoiceNo": "HD-001",
  "note": "Nhap hang thu nghiem",
  "items": [
    { "product": "OBJECT_ID_SP_1", "quantity": 10, "costPrice": 120000 },
    { "product": "OBJECT_ID_SP_2", "quantity": 3, "costPrice": 45000 }
  ]
}
```

`POST /stock-in` và `GET /stock-in`, `GET /stock-in/:id`.

**Xuất kho:** `POST /stock-out`:

```json
{
  "warehouse": "OBJECT_ID_KHO",
  "reason": "Ban hang",
  "items": [{ "product": "OBJECT_ID_SP", "quantity": 2 }],
  "note": "Test xuat kho"
}
```

`GET /stock-out`, `GET /stock-out/:id`.

**Chuyển kho:** `POST /stock-transfers`:

```json
{
  "fromWarehouse": "OBJECT_ID_KHO_A",
  "toWarehouse": "OBJECT_ID_KHO_B",
  "items": [{ "product": "OBJECT_ID_SP", "quantity": 3 }],
  "note": "Dieu chuyen"
}
```

`GET /stock-transfers`, `GET /stock-transfers/:id`. Mọi phiếu đã xác nhận là bất biến, không có PATCH/DELETE. Nếu không đủ hàng trả 409.

## Kiểm kê

- `POST /stock-audits` `{warehouse,note?}` → tạo phiếu `in_progress`.
- `GET /stock-audits`, `GET /stock-audits/:id` → snapshot theo sản phẩm.
- `PATCH /stock-audits/:id/confirm` chỉ manager/admin, body:

```json
{
  "items": [{ "product": "OBJECT_ID_SP", "actualQuantity": 12 }],
  "note": "Chenh lech do hang hong"
}
```

Phải gửi toàn bộ dòng sản phẩm trong phiếu; nếu có chênh lệch phải có lý do.

## Cảnh báo

`GET /alerts?status=open|resolved`, `PATCH /alerts/:id/resolve` (manager/admin). Cảnh báo open tự tạo khi tồn nhỏ hơn `minStockThreshold`, tự đóng khi bổ sung đủ ngưỡng qua biến động tồn.

## Báo cáo

- `GET /reports/summary` → totals, biểu đồ 6 tháng, top 5 xuất kho, hàng thiếu, biến động gần nhất.
- `GET /reports/movements?product=&warehouse=&type=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=50`.
- `GET /reports/inventory?warehouse=` → giá trị tồn theo kho.
- `GET /reports/export?type=inventory|movements` → Excel (.xlsx), manager/admin.

## Lưu ý về tính toàn vẹn

`MONGO_TRANSACTIONS=false` mặc định để chạy MongoDB standalone ở Windows. Khi dùng replica set, có thể bật transaction. Mọi lệnh trừ tồn dùng điều kiện `quantity >= requested` để chặn xuất âm. Xem phần Giới hạn trong README.
