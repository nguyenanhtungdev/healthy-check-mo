# 📦 Offline Storage - Hướng dẫn sử dụng

## 🎯 Tổng quan

Hệ thống offline storage cho phép app hoạt động **hoàn toàn khi không có mạng** bằng cách:

- ✅ Lưu dữ liệu vào **SQLite** (database local)
- ✅ Cache ảnh với **expo-image** (memory + disk)
- ✅ Tự động đồng bộ khi có mạng trở lại
- ✅ Hiển thị dữ liệu ngay lập tức từ cache

---

## 🗄️ Cấu trúc Database

### 1. **Bảng `profiles`**

Lưu thông tin profile người dùng:

```sql
- id (PRIMARY KEY)
- accountId (UNIQUE)
- fullName, email, phone, birth
- address, height, weight, bloodType, gender
- image (URL ảnh)
- lastSyncedAt (lần sync cuối)
- updatedAt (lần update cuối)
```

### 2. **Bảng `cache_data`**

Cache bất kỳ dữ liệu nào với TTL:

```sql
- id (PRIMARY KEY)
- key (tên cache)
- value (JSON data)
- expiresAt (thời gian hết hạn)
- createdAt
```

### 3. **Bảng `sync_queue`**

Hàng đợi các thay đổi chưa đồng bộ:

```sql
- id (PRIMARY KEY)
- type (profile, appointment, etc.)
- action (update, create, delete)
- payload (dữ liệu cần sync)
- retryCount
- createdAt
```

---

## 🚀 Cách sử dụng trong Component

### Import service

```javascript
import offlineStorage from "../services/offlineStorage";
```

### 1. **Khởi tạo (trong useEffect)**

```javascript
useEffect(() => {
  offlineStorage.init();
}, []);
```

### 2. **Lưu Profile**

```javascript
await offlineStorage.saveProfile({
  accountId: "123",
  fullName: "Nguyễn Văn A",
  email: "a@gmail.com",
  phone: "0123456789",
  // ... các field khác
});
```

### 3. **Lấy Profile**

```javascript
const profile = await offlineStorage.getProfile("accountId");
if (profile) {
  console.log("Loaded from offline DB:", profile);
}
```

### 4. **Cache dữ liệu tùy chỉnh**

```javascript
// Cache 1 giờ
await offlineStorage.cacheData(
  "appointments_2024",
  appointmentsArray,
  3600 // TTL: 1 hour
);

// Lấy từ cache
const cached = await offlineStorage.getCachedData("appointments_2024");
```

### 5. **Kiểm tra trạng thái mạng**

```javascript
const isOnline = offlineStorage.checkOnlineStatus();
if (!isOnline) {
  Alert.alert("Offline", "Đang hoạt động offline");
}
```

---

## 🔄 Flow Offline-First

### **Khi Load Data:**

```
1. Load từ SQLite NGAY LẬP TỨC → Hiển thị cho user
2. Kiểm tra online status
3. Nếu ONLINE → Fetch từ server → Update DB + UI
4. Nếu OFFLINE → Dùng data cached
```

### **Khi Update Data:**

```
1. Lưu vào SQLite NGAY
2. Update UI optimistic
3. Nếu ONLINE → Gửi lên server
4. Nếu OFFLINE → Thêm vào sync_queue → Sync khi có mạng
```

---

## 📱 UI Indicators

### Offline Banner

```jsx
{
  !isOnline && (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text>Chế độ offline</Text>
    </View>
  );
}
```

---

## 🛠️ API Reference

### `init()`

Khởi tạo database (tự động tạo bảng nếu chưa có)

### `saveProfile(profileData)`

Lưu profile vào DB (INSERT OR REPLACE)

### `getProfile(accountId)`

Lấy profile từ DB theo accountId

### `cacheData(key, data, ttlSeconds)`

Cache bất kỳ data nào với TTL (mặc định 1 giờ)

### `getCachedData(key)`

Lấy data từ cache (auto check TTL)

### `syncPendingChanges()`

Đồng bộ tất cả thay đổi trong queue (tự động gọi khi có mạng)

### `clearExpiredCache()`

Xóa cache đã hết hạn (nên gọi định kỳ)

### `checkOnlineStatus()`

Kiểm tra trạng thái mạng hiện tại

---

## 🎨 Best Practices

### 1. **Luôn load offline data trước**

```javascript
// ✅ ĐÚNG
const offlineData = await offlineStorage.getProfile(id);
setData(offlineData); // Hiển thị ngay

if (online) {
  const serverData = await fetchFromServer();
  await offlineStorage.saveProfile(serverData);
  setData(serverData); // Update
}

// ❌ SAI - User phải chờ
if (online) {
  const data = await fetchFromServer();
  setData(data);
}
```

### 2. **Optimistic UI Updates**

```javascript
// Update UI ngay, rồi mới gọi API
setProfile(newProfile);
await offlineStorage.saveProfile(newProfile);

if (online) {
  try {
    await api.updateProfile(newProfile);
  } catch (error) {
    // Rollback nếu lỗi
    setProfile(oldProfile);
  }
}
```

### 3. **Handle Network Changes**

Service tự động lắng nghe và sync khi có mạng trở lại.

### 4. **Cache với TTL hợp lý**

```javascript
// Dữ liệu ít thay đổi → TTL dài
await offlineStorage.cacheData("settings", data, 86400); // 24h

// Dữ liệu hay thay đổi → TTL ngắn
await offlineStorage.cacheData("notifications", data, 300); // 5 phút
```

---

## 🔧 Troubleshooting

### Database không khởi tạo?

```javascript
const success = await offlineStorage.init();
if (!success) {
  console.error("Failed to init DB");
}
```

### Data không sync?

Kiểm tra sync queue:

```sql
SELECT * FROM sync_queue WHERE retryCount < 3;
```

### Cache ảnh không hoạt động?

Kiểm tra `cachePolicy` trong Image component:

```jsx
<Image
  source={{ uri }}
  cachePolicy="memory-disk" // ← Quan trọng!
/>
```

---

## 📊 Performance Tips

1. **Batch updates**: Gom nhiều update thành 1 transaction
2. **Index**: Đã tạo index cho `accountId` và `key`
3. **Clean cache**: Gọi `clearExpiredCache()` định kỳ
4. **Lazy init**: DB chỉ khởi tạo khi cần

---

## 🎓 Ví dụ đầy đủ

Xem `ProfileScreen.jsx` để tham khảo implementation đầy đủ với:

- ✅ Offline-first data loading
- ✅ Optimistic updates
- ✅ Network status indicators
- ✅ Auto-sync on reconnect
- ✅ Image caching with expo-image

---

## 📞 Support

Có thắc mắc? Check logs:

```javascript
console.log("DB initialized:", await offlineStorage.init());
console.log("Online status:", offlineStorage.checkOnlineStatus());
```

Happy coding! 🚀
