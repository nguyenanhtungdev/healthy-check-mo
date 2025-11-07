# Debug và Test Instructions

## Các vấn đề đã sửa:

### 1. ✅ Sửa logic load ảnh thành viên:

- Đổi từ `appointment.members` thành `appointment.participants` (theo API)
- Khôi phục logic load ảnh với Image component
- Thêm fallback avatar placeholder với chữ cái đầu

### 2. ✅ Sửa logic phân quyền chỉnh sửa:

- Thêm debug logs để kiểm tra user và creator data
- Cải thiện logic so sánh với nhiều trường ID khác nhau
- Thêm `selectTextOnFocus={isCreator()}` để prevent selection khi không phải creator
- Cải thiện styles cho disabled inputs

## Để test và debug:

### 1. Mở Console và kiểm tra logs:

Khi mở modal, xem Console để thấy:

```
=== DEBUG CREATOR CHECK ===
Current user: { id: "xxx", fullName: "Nguyễn Anh Tùng", ... }
Appointment: { createdBy: "Nguyễn Anh Tùng", ... }
Is creator result: true/false
=== END DEBUG ===
```

### 2. Test cases:

**Case 1 - Người tạo lịch:**

- Bấm thông báo của lịch do mình tạo
- Console phải show `Is creator result: true`
- Form phải có thể chỉnh sửa được
- Hiển thị nút "Lưu thay đổi"

**Case 2 - Người được thêm:**

- Bấm thông báo của lịch do người khác tạo
- Console phải show `Is creator result: false`
- Form phải bị disable (màu xám, không edit được)
- Hiển thị thông báo "Chỉ người tạo mới có thể chỉnh sửa"
- KHÔNG hiển thị nút "Lưu thay đổi"

### 3. Kiểm tra load ảnh:

- Thành viên có `imageUrl` → hiển thị ảnh
- Thành viên không có `imageUrl` hoặc ảnh lỗi → hiển thị placeholder với chữ cái đầu

## Nếu vẫn có vấn đề:

### Logic phân quyền không đúng:

1. Check console logs để xem data structure
2. Có thể API trả về field khác để identify creator
3. Có thể cần so sánh với email thay vì name

### Load ảnh không hoạt động:

1. Check network tab để xem URL ảnh có đúng không
2. Check `participant.imageUrl` có giá trị không
3. Có thể cần thêm headers cho image request

## Sau khi test, bạn có thể:

- Tắt debug logs bằng cách comment các console.log
- Báo cáo kết quả để tôi điều chỉnh thêm nếu cần
