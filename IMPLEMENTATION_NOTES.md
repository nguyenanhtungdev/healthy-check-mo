# Triển khai Logic Modal Chỉnh Sửa Lịch Hẹn từ Thông Báo

## Tổng quan

Đã triển khai logic để khi người dùng bấm vào thông báo lịch khám, hiển thị modal chỉnh sửa với phân quyền:

- **Người tạo lịch**: Có thể chỉnh sửa đầy đủ thông tin
- **Người được thêm**: Chỉ xem thông tin, không thể chỉnh sửa

## Các thay đổi đã thực hiện

### 1. NotificationScreen.jsx

- Thêm `appointmentId` vào mapping dữ liệu từ API
- Truyền parameter `fromNotification: true` khi navigate từ thông báo

### 2. AppointmentDetailScreen.jsx

- Thêm modal chỉnh sửa lịch hẹn
- Logic phân quyền dựa trên người tạo
- Form chỉnh sửa với validation
- Hiển thị danh sách thành viên tham gia
- Auto-show modal khi mở từ thông báo

## API Requirements

### Thông báo cần có fields:

```json
{
  "id": "notification-id",
  "title": "Tạo lịch khám thành công",
  "content": "Bạn đã tạo lịch khám tại Bệnh viện Bạch Mai",
  "type": "lich_kham",
  "isRead": false,
  "createdAt": "2025-11-07T12:54:15.906704",
  "appointmentId": "appointment-id" // QUAN TRỌNG: Cần có field này
}
```

### Chi tiết lịch hẹn cần có fields:

```json
{
  "id": "appointment-id",
  "hospitalName": "Bệnh viện Bạch Mai",
  "frequency": "Hàng tháng",
  "firstDate": "2025-11-10",
  "note": "Khám định kỳ cho gia đình",
  "createdBy": "Nguyễn Anh Tùng", // QUAN TRỌNG: Để phân quyền
  "participants": [
    {
      "userId": "user-id",
      "imageUrl": "avatar-url",
      "fullName": "Lâm Minh Thái",
      "email": "email@example.com"
    }
  ]
}
```

## Luồng hoạt động

1. **Từ thông báo**:

   - User bấm vào thông báo loại `"lich_kham"`
   - Navigate đến `AppointmentDetailScreen` với `fromNotification: true`
   - Auto hiển thị modal chỉnh sửa

2. **Phân quyền**:

   - So sánh `currentUser.fullName` với `appointment.createdBy`
   - Người tạo: Hiển thị form có thể chỉnh sửa + nút "Lưu thay đổi"
   - Người khác: Hiển thị form chỉ đọc + thông báo không có quyền chỉnh sửa

3. **Chỉnh sửa**:
   - PUT request đến `/appointments/{id}` với dữ liệu mới
   - Refresh dữ liệu sau khi cập nhật thành công
   - Hiển thị thông báo thành công/lỗi

## Các tính năng đã implement

✅ Modal chỉnh sửa với form đầy đủ
✅ Logic phân quyền người tạo/người tham gia  
✅ Auto-show modal khi mở từ thông báo
✅ Validation và xử lý lỗi
✅ Hiển thị danh sách thành viên với avatar
✅ UI responsive và user-friendly
✅ Loading states và error handling

## Test Case

1. **Người tạo lịch**:

   - Bấm thông báo → Modal mở → Có thể chỉnh sửa → Lưu thành công

2. **Người được thêm**:

   - Bấm thông báo → Modal mở → Chỉ xem được → Thông báo không có quyền

3. **Edge cases**:
   - Không có appointmentId → Navigate về tab Family
   - Lỗi API → Hiển thị thông báo lỗi
   - Avatar không load được → Hiển thị placeholder

## Notes

- Cần đảm bảo API trả về đúng format như mô tả
- Logic phân quyền có thể cần điều chỉnh tùy theo cách API định danh người tạo
- Modal responsive trên cả Android và iOS
