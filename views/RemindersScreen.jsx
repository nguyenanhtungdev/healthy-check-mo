import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Platform,
  Animated,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";

let DateTimePicker = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch (e) {
  DateTimePicker = null;
}
let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (e) {
  Notifications = null;
}

const PRIMARY = "#6366f1";
const SECONDARY = "#8b5cf6";
const ACCENT = "#f093fb";
const ICON_SIZE = 18;

export default function RemindersScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("SUC_KHOE"); // Đổi default sang SUC_KHOE theo API
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Hàm lấy token từ AsyncStorage
  const getToken = async () => {
    try {
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) return token;
      }

      const accStr = await AsyncStorage.getItem("account");
      if (accStr) {
        const acc = JSON.parse(accStr);
        return acc?.token || acc?.accessToken;
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  // Hàm lấy danh sách nhắc nhở từ API
  const loadReminders = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không tìm thấy token xác thực");
        return;
      }

      const response = await fetch(`${config.API_BASE}/reminders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Reminders response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(
          "Reminders loaded successfully:",
          data?.length || 0,
          "items"
        );
        setReminders(data || []);
      } else {
        // Detailed error handling based on status code
        let errorMessage = "Không thể tải danh sách nhắc nhở";
        if (response.status === 401) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        } else if (response.status === 403) {
          errorMessage = "Bạn không có quyền truy cập danh sách nhắc nhở.";
        } else if (response.status === 500) {
          errorMessage =
            "Lỗi server. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
        } else if (response.status >= 500) {
          errorMessage = "Server đang gặp sự cố. Vui lòng thử lại sau.";
        }

        console.error(
          "Failed to load reminders:",
          response.status,
          errorMessage
        );
        Alert.alert("Lỗi", errorMessage);

        // Set empty array to prevent UI issues
        setReminders([]);
      }
    } catch (error) {
      console.error("Error loading reminders:", error);
      const errorMessage = error.message.includes("Network")
        ? "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet."
        : "Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);

      // Set empty array to prevent UI issues
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Load danh sách nhắc nhở từ API
    loadReminders();
  }, []);

  // Hàm tạo nhắc nhở mới qua API
  const createReminder = async (reminderData) => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không tìm thấy token xác thực");
        return false;
      }

      console.log("Creating reminder with data:", reminderData);
      console.log("API URL:", `${config.API_BASE}/reminders`);

      const response = await fetch(`${config.API_BASE}/reminders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reminderData),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Create reminder success:", result);
        return true;
      } else {
        const errorText = await response.text();
        console.error("Failed to create reminder:", response.status, errorText);
        Alert.alert(
          "Lỗi API",
          `Server trả về lỗi ${response.status}: ${errorText}`
        );
        return false;
      }
    } catch (error) {
      console.error("Error creating reminder:", error);
      Alert.alert("Lỗi kết nối", error.message);
      return false;
    }
  };

  // Hàm cập nhật nhắc nhở qua API
  const updateReminder = async (id, reminderData) => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không tìm thấy token xác thực");
        return false;
      }

      console.log("Updating reminder:", id, "with data:", reminderData);

      const response = await fetch(`${config.API_BASE}/reminders/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reminderData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Update reminder success:", result);
        return true;
      } else {
        const errorText = await response.text();
        console.error("Failed to update reminder:", response.status, errorText);
        
        // Parse error message from backend
        let errorMessage = "Không thể cập nhật nhắc nhở";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.includes("đã được gửi")) {
            Alert.alert(
              "Không thể chỉnh sửa",
              "Nhắc nhở này đã được gửi và không thể chỉnh sửa nữa.",
              [{ text: "Đã hiểu", style: "default" }]
            );
          } else {
            errorMessage = errorData.error || errorMessage;
            Alert.alert("Lỗi cập nhật", errorMessage);
          }
        } catch (parseError) {
          // If can't parse, show generic error
          if (response.status === 404) {
            Alert.alert(
              "Không thể chỉnh sửa",
              "Nhắc nhở này có thể đã được gửi hoặc không tồn tại.",
              [{ text: "Đã hiểu", style: "default" }]
            );
          } else {
            Alert.alert("Lỗi cập nhật", errorMessage);
          }
        }
        return false;
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến server. Vui lòng thử lại.");
      return false;
    }
  };

  async function scheduleNotificationIfPossible(reminder) {
    if (!Notifications) return null;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;
      if (finalStatus !== "granted") {
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
      }
      if (finalStatus !== "granted") return null;

      const trigger = reminder.remindAt
        ? new Date(reminder.remindAt)
        : new Date();
      if (trigger <= new Date()) return null;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title || "Nhắc nhở",
          body: reminder.note || "Bạn có nhắc nhở",
          data: { reminderId: reminder.id },
        },
        trigger,
      });
      return id;
    } catch (e) {
      console.warn("Failed to schedule notification", e);
      return null;
    }
  }

  const onSave = async () => {
    if (!title.trim()) return Alert.alert("Lỗi", "Vui lòng nhập tiêu đề");

    setLoading(true);
    try {
      // Format date theo đúng format API yêu cầu (YYYY-MM-DDTHH:mm:ss)
      const formattedDateTime = dateTime.toISOString().slice(0, 19);

      const reminderData = {
        title: title.trim(),
        note: note.trim() || "",
        category,
        remindAt: formattedDateTime,
      };

      console.log("Prepared reminder data:", reminderData);

      let success = false;

      if (editing) {
        // Cập nhật nhắc nhở
        success = await updateReminder(editing, reminderData);
        if (success) {
          Alert.alert("Thành công", "Cập nhật nhắc nhở thành công");
        } else {
          Alert.alert("Lỗi", "Không thể cập nhật nhắc nhở");
        }
      } else {
        // Tạo mới nhắc nhở
        success = await createReminder(reminderData);
        if (success) {
          Alert.alert("Thành công", "Tạo nhắc nhở thành công");
        } else {
          Alert.alert("Lỗi", "Không thể tạo nhắc nhở");
        }
      }

      if (success) {
        // Reload danh sách sau khi thao tác thành công
        await loadReminders();
        setEditing(null);
        setModalVisible(false);
        resetForm();
      }
    } catch (e) {
      console.error("Failed to save reminder", e);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi lưu nhắc nhở");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setNote("");
    setCategory("SUC_KHOE"); // Default category theo API
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setDateTime(d);
    setShowDatePicker(false);
  };

  // Hàm format ngày giờ
  const formatDateTime = (date) => {
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Hàm xử lý thay đổi ngày (chỉ dùng cho Android)
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateTime(selectedDate);
    }
  };

  const onEdit = (r) => {
    setEditing(r.id);
    setTitle(r.title);
    setNote(r.note || "");
    setCategory(r.category || "SUC_KHOE");
    setDateTime(new Date(r.remindAt)); // API sử dụng remindAt thay vì date
    setModalVisible(true);
  };

  // Hàm xóa nhắc nhở qua API
  const deleteReminder = async (id) => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không tìm thấy token xác thực");
        return false;
      }

      console.log("Deleting reminder:", id);

      const response = await fetch(`${config.API_BASE}/reminders/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("Delete reminder success");
        return true;
      } else {
        const errorText = await response.text();
        console.error("Failed to delete reminder:", response.status, errorText);
        
        // Parse error message from backend
        let errorMessage = "Không thể xóa nhắc nhở";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.includes("đã được gửi")) {
            Alert.alert(
              "Không thể xóa",
              "Nhắc nhở này đã được gửi và không thể xóa nữa. Bạn có thể tạo nhắc nhở mới thay thế.",
              [
                { text: "Tạo mới", onPress: () => {
                  setEditing(null);
                  resetForm();
                  setModalVisible(true);
                }, style: "default" },
                { text: "Đóng", style: "cancel" }
              ]
            );
          } else {
            errorMessage = errorData.error || errorMessage;
            Alert.alert("Lỗi xóa", errorMessage);
          }
        } catch (parseError) {
          // If can't parse, show generic error
          if (response.status === 404) {
            Alert.alert(
              "Không thể xóa",
              "Nhắc nhở này có thể đã được gửi hoặc không tồn tại.",
              [{ text: "Đã hiểu", style: "default" }]
            );
          } else {
            Alert.alert("Lỗi xóa", errorMessage);
          }
        }
        return false;
      }
    } catch (error) {
      console.error("Error deleting reminder:", error);
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến server. Vui lòng thử lại.");
      return false;
    }
  };

  const onDelete = async (id) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa nhắc nhở này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            // Hủy notification nếu có
            const r = reminders.find((x) => x.id === id);
            if (r && r.notificationId && Notifications) {
              try {
                await Notifications.cancelScheduledNotificationAsync(
                  r.notificationId
                );
              } catch (e) {
                console.warn("Failed to cancel notification:", e);
              }
            }

            // Xóa qua API
            const success = await deleteReminder(id);
            if (success) {
              Alert.alert("Thành công", "Xóa nhắc nhở thành công");
              // Reload danh sách
              await loadReminders();
            } else {
              Alert.alert("Lỗi", "Không thể xóa nhắc nhở");
            }
          } catch (error) {
            console.error("Error in delete process:", error);
            Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa nhắc nhở");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Loại bỏ toggleComplete vì API không có trường completed
  // Có thể thêm lại sau nếu BE có API cập nhật trạng thái sent

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "SUC_KHOE":
        return "medical-outline";
      case "health":
        return "medical-outline";
      case "work":
        return "business-outline";
      case "personal":
        return "person-outline";
      case "general":
        return "notifications-outline";
      default:
        return "notifications-outline";
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "SUC_KHOE":
        return "#10b981";
      case "health":
        return "#10b981";
      case "work":
        return "#3b82f6";
      case "personal":
        return "#8b5cf6";
      case "general":
        return "#6366f1";
      default:
        return "#6366f1";
    }
  };

  const getFilteredReminders = () => {
    let filtered = reminders;

    if (filterCategory !== "all") {
      filtered = filtered.filter((r) => r.category === filterCategory);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.note && r.note.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const getTimeUntil = (dateStr) => {
    const now = new Date();
    const target = new Date(dateStr);
    const diff = target - now;

    if (diff < 0) return "Đã qua";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Còn ${days} ngày`;
    if (hours > 0) return `Còn ${hours} giờ`;
    if (minutes > 0) return `Còn ${minutes} phút`;
    return "Sắp tới";
  };

  const categories = [
    { value: "all", label: "Tất cả", icon: "apps" },
    { value: "SUC_KHOE", label: "Sức khỏe", icon: "fitness" },
    { value: "general", label: "Chung", icon: "calendar" },
    { value: "work", label: "Công việc", icon: "briefcase" },
    { value: "personal", label: "Cá nhân", icon: "person" },
  ];

  const filteredReminders = getFilteredReminders();
  const stats = {
    total: reminders.length,
    sent: reminders.filter((r) => r.sent).length, // Sử dụng sent thay vì completed
    upcoming: reminders.filter(
      (r) => new Date(r.remindAt) > new Date() && !r.sent
    ).length,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[PRIMARY, SECONDARY]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nhắc nhở</Text>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Thanh tìm kiếm */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm nhắc nhở..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Thống kê đơn giản */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: PRIMARY }]}>
            <View style={styles.statRow}>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.statNumber}>{stats.total}</Text>
            </View>
            <Text style={styles.statLabel}>Tổng số</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#ff6b6b" }]}>
            <View style={styles.statRow}>
              <Ionicons name="time-outline" size={20} color="#fff" />
              <Text style={styles.statNumber}>{stats.upcoming}</Text>
            </View>
            <Text style={styles.statLabel}>Sắp tới</Text>
          </View>
        </View>

        {/* Bộ lọc danh mục */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.filterChip,
                filterCategory === cat.value && styles.filterChipActive,
              ]}
              onPress={() => setFilterCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={filterCategory === cat.value ? "#fff" : "#667eea"}
              />
              <Text
                style={[
                  styles.filterChipText,
                  filterCategory === cat.value && styles.filterChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Danh sách nhắc nhở */}
        {filteredReminders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? "Không tìm thấy nhắc nhở" : "Chưa có nhắc nhở nào"}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? "Thử tìm với từ khóa khác"
                : "Nhấn nút bên dưới để tạo nhắc nhở mới"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredReminders}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadReminders}
                colors={[PRIMARY]}
                tintColor={PRIMARY}
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View
                style={[
                  styles.reminderCard,
                  item.sent && styles.reminderCardSent,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.categoryIcon,
                        {
                          backgroundColor: getCategoryColor(item.category),
                        },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIcon(item.category)}
                        size={16}
                        color="#fff"
                      />
                    </View>
                    <View style={styles.headerInfo}>
                      <Text
                        style={[
                          styles.reminderTitle,
                          item.sent && styles.reminderTitleSent,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.statusContainer}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: item.sent
                                ? "#dcfce7"
                                : "#fef3c7",
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.sent ? "checkmark-circle" : "time"}
                            size={12}
                            color={item.sent ? "#16a34a" : "#f59e0b"}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: item.sent ? "#16a34a" : "#f59e0b",
                              },
                            ]}
                          >
                            {item.sent ? "Đã gửi" : "Chưa gửi"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.reminderActions}>
                    <TouchableOpacity
                      onPress={() => onEdit(item)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="pencil" size={16} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDelete(item.id)}
                      style={styles.actionBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  {item.note && (
                    <Text style={styles.reminderNote} numberOfLines={2}>
                      {item.note}
                    </Text>
                  )}

                  <View style={styles.reminderMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#6b7280"
                      />
                      <Text style={styles.reminderDate}>
                        {new Date(item.remindAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.timeUntil,
                        new Date(item.remindAt) < new Date() &&
                          styles.timeUntilPast,
                      ]}
                    >
                      {getTimeUntil(item.remindAt)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}
          />
        )}
      </Animated.View>

      {/* Nút tạo nhắc nhở floating */}
      <Animated.View style={[styles.fab, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {
            setEditing(null);
            resetForm();
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Modal tạo/sửa */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editing ? "Chỉnh sửa nhắc nhở" : "Tạo nhắc nhở mới"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editing
                    ? "Cập nhật thông tin nhắc nhở"
                    : "Thêm nhắc nhở cho lịch trình"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="pencil" size={ICON_SIZE} color={PRIMARY} />
                  <Text style={[styles.label, styles.labelInline]}>
                    Tiêu đề *
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ví dụ: Khám bệnh định kỳ"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Ionicons
                    name="document-text"
                    size={ICON_SIZE}
                    color={PRIMARY}
                  />
                  <Text style={[styles.label, styles.labelInline]}>
                    Ghi chú
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Thêm chi tiết..."
                  placeholderTextColor="#ccc"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="pricetag" size={ICON_SIZE} color={PRIMARY} />
                  <Text style={[styles.label, styles.labelInline]}>
                    Danh mục
                  </Text>
                </View>
                <View style={styles.categorySelector}>
                  {categories
                    .filter((c) => c.value !== "all")
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        style={[
                          styles.categoryOption,
                          category === cat.value && {
                            backgroundColor: getCategoryColor(cat.value),
                          },
                        ]}
                        onPress={() => setCategory(cat.value)}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={20}
                          color={category === cat.value ? "#fff" : "#666"}
                        />
                        <Text
                          style={[
                            styles.categoryOptionText,
                            category === cat.value && { color: "#fff" },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="calendar" size={16} color="#666" /> Ngày & giờ
                  nhắc nhở
                </Text>
                <TouchableOpacity
                  style={[styles.textInput, styles.datePickerInput]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {formatDateTime(dateTime)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={dateTime}
                      mode="datetime"
                      is24Hour={true}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onDateChange}
                      minimumDate={new Date()} // Không cho chọn ngày trong quá khứ
                      style={styles.datePickerStyle}
                    />
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={onSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                )}
                <Text style={styles.saveBtnText}>
                  {loading
                    ? "Đang lưu..."
                    : editing
                    ? "Cập nhật"
                    : "Tạo nhắc nhở"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fd",
  },
  header: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#333",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#fff",
    marginTop: 4,
    opacity: 0.9,
  },
  filterContainer: {
    marginBottom: 16,
    maxHeight: 42,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#e8eaf6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    elevation: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    color: "#667eea",
    fontWeight: "600",
    marginLeft: 6,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  list: {
    flex: 1,
  },
  reminderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  reminderCardSent: {
    opacity: 0.8,
    backgroundColor: "#f8fafc",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  reminderTitleSent: {
    color: "#6b7280",
    fontWeight: "600",
  },
  statusContainer: {
    alignItems: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  reminderNote: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  reminderMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderDate: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 6,
    fontWeight: "500",
  },
  timeUntil: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeUntilPast: {
    color: "#ef4444",
    backgroundColor: "#fecaca",
  },
  reminderActions: {
    flexDirection: "row",
    gap: 4,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#666",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    elevation: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "#f8f9fd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e8eaf6",
  },
  datePickerInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  datePickerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  datePickerStyle: {
    width: "100%",
    alignSelf: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelInline: {
    marginBottom: 0,
    marginLeft: 8,
    lineHeight: 18,
  },
  input: {
    backgroundColor: "#f8f9fd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e8eaf6",
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#e8eaf6",
    minWidth: 80,
    justifyContent: "center",
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 6,
  },

  saveBtn: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 4,
    elevation: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
});
