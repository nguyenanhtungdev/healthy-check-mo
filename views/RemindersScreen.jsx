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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const PRIMARY = "#667eea";
const SECONDARY = "#764ba2";
const ACCENT = "#f093fb";
const ICON_SIZE = 18;

export default function RemindersScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("general"); // general, health, work, personal
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    (async () => {
      try {
        const str = await AsyncStorage.getItem("reminders");
        if (str) setReminders(JSON.parse(str));
      } catch (e) {
        console.warn("Failed to load reminders", e);
      }
    })();
  }, []);

  const persist = async (list) => {
    await AsyncStorage.setItem("reminders", JSON.stringify(list));
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

      const trigger = reminder.date ? new Date(reminder.date) : new Date();
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
    if (!title.trim()) return Alert.alert("Vui lòng nhập tiêu đề");

    try {
      if (editing) {
        const next = reminders.map((r) =>
          r.id === editing
            ? { ...r, title, note, category, date: dateTime.toISOString() }
            : r
        );
        setReminders(next);
        await persist(next);
        setEditing(null);
        setModalVisible(false);
        resetForm();
        Alert.alert("✅ Lưu thành công");
        return;
      }

      const id = String(Date.now());
      const r = {
        id,
        title,
        note,
        category,
        date: dateTime.toISOString(),
        completed: false,
        notificationId: null,
      };

      // schedule notification but don't block save on scheduling errors
      try {
        const notifId = await scheduleNotificationIfPossible(r);
        if (notifId) r.notificationId = notifId;
      } catch (e) {
        console.warn("Notification scheduling failed", e);
      }

      const next = [r, ...reminders].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setReminders(next);
      await persist(next);
      setModalVisible(false);
      resetForm();
      Alert.alert("✅ Tạo nhắc nhở thành công");
    } catch (e) {
      console.warn("Failed to create reminder", e);
      Alert.alert("Lỗi", "Không thể tạo nhắc nhở. Vui lòng thử lại.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setNote("");
    setCategory("general");
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setDateTime(d);
  };

  const onEdit = (r) => {
    setEditing(r.id);
    setTitle(r.title);
    setNote(r.note || "");
    setCategory(r.category || "general");
    setDateTime(new Date(r.date));
    setModalVisible(true);
  };

  const onDelete = async (id) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa nhắc nhở này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const r = reminders.find((x) => x.id === id);
          if (r && r.notificationId && Notifications) {
            try {
              await Notifications.cancelScheduledNotificationAsync(
                r.notificationId
              );
            } catch (e) {
              console.warn(e);
            }
          }
          const next = reminders.filter((x) => x.id !== id);
          setReminders(next);
          await persist(next);
        },
      },
    ]);
  };

  const toggleComplete = async (id) => {
    const next = reminders.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    setReminders(next);
    await persist(next);
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "health":
        return "fitness";
      case "work":
        return "briefcase";
      case "personal":
        return "person";
      default:
        return "calendar";
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "health":
        return "#ff6b6b";
      case "work":
        return "#4ecdc4";
      case "personal":
        return "#ffd93d";
      default:
        return "#667eea";
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

    if (days > 0) return `Còn ${days} ngày`;
    if (hours > 0) return `Còn ${hours} giờ`;
    return "Sắp tới";
  };

  const categories = [
    { value: "all", label: "Tất cả", icon: "apps" },
    { value: "general", label: "Chung", icon: "calendar" },
    { value: "health", label: "Sức khỏe", icon: "fitness" },
    { value: "work", label: "Công việc", icon: "briefcase" },
    { value: "personal", label: "Cá nhân", icon: "person" },
  ];

  const filteredReminders = getFilteredReminders();
  const stats = {
    total: reminders.length,
    completed: reminders.filter((r) => r.completed).length,
    upcoming: reminders.filter(
      (r) => new Date(r.date) > new Date() && !r.completed
    ).length,
  };

  return (
    <View style={styles.container}>
      {/* Header với gradient */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhắc nhở</Text>
        <TouchableOpacity onPress={() => setSearchQuery("")}>
          <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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

        {/* Thống kê */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: "#667eea" }]}>
            <Ionicons name="calendar-outline" size={24} color="#fff" />
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng số</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#4ecdc4" }]}>
            <Ionicons name="checkmark-done-outline" size={24} color="#fff" />
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Hoàn thành</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#ffd93d" }]}>
            <Ionicons name="time-outline" size={24} color="#fff" />
            <Text style={styles.statNumber}>{stats.upcoming}</Text>
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
            renderItem={({ item, index }) => (
              <Animated.View
                style={[
                  styles.reminderCard,
                  item.completed && styles.reminderCardCompleted,
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
                <View style={styles.reminderCardLeft}>
                  <TouchableOpacity
                    onPress={() => toggleComplete(item.id)}
                    style={[
                      styles.checkbox,
                      { borderColor: getCategoryColor(item.category) },
                      item.completed && {
                        backgroundColor: getCategoryColor(item.category),
                      },
                    ]}
                  >
                    {item.completed && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>

                  <View style={styles.reminderInfo}>
                    <View style={styles.reminderTitleRow}>
                      <Text
                        style={[
                          styles.reminderTitle,
                          item.completed && styles.reminderTitleCompleted,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor:
                              getCategoryColor(item.category) + "20",
                          },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryIcon(item.category)}
                          size={12}
                          color={getCategoryColor(item.category)}
                        />
                      </View>
                    </View>

                    {item.note && (
                      <Text style={styles.reminderNote} numberOfLines={1}>
                        {item.note}
                      </Text>
                    )}

                    <View style={styles.reminderMeta}>
                      <Ionicons name="time-outline" size={14} color="#999" />
                      <Text style={styles.reminderDate}>
                        {new Date(item.date).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      <Text
                        style={[
                          styles.timeUntil,
                          new Date(item.date) < new Date() &&
                            styles.timeUntilPast,
                        ]}
                      >
                        • {getTimeUntil(item.date)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.reminderActions}>
                  <TouchableOpacity
                    onPress={() => onEdit(item)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="pencil" size={18} color="#667eea" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onDelete(item.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          />
        )}
      </Animated.View>

      {/* Nút tạo nhắc nhở floating */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditing(null);
          resetForm();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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
              <Text style={styles.modalTitle}>
                {editing ? "✏️ Chỉnh sửa nhắc nhở" : "➕ Tạo nhắc nhở mới"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
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

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="time" size={ICON_SIZE} color={PRIMARY} />
                  <Text style={[styles.label, styles.labelInline]}>
                    Ngày & giờ
                  </Text>
                </View>
                {DateTimePicker ? (
                  <DateTimePicker
                    value={dateTime}
                    mode={Platform.OS === "ios" ? "datetime" : "datetime"}
                    display="default"
                    onChange={(e, d) => {
                      if (d) setDateTime(new Date(d));
                    }}
                  />
                ) : (
                  <View style={styles.dateButtons}>
                    <TouchableOpacity
                      style={styles.dateBtn}
                      onPress={() => {
                        const d = new Date(dateTime);
                        d.setDate(d.getDate() - 1);
                        setDateTime(d);
                      }}
                    >
                      <Ionicons name="remove" size={18} color="#667eea" />
                      <Text style={styles.dateBtnText}>-1 ngày</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateBtn}
                      onPress={() => {
                        const d = new Date(dateTime);
                        d.setDate(d.getDate() + 1);
                        setDateTime(d);
                      }}
                    >
                      <Ionicons name="add" size={18} color="#667eea" />
                      <Text style={styles.dateBtnText}>+1 ngày</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.dateDisplay}>
                  <Ionicons name="calendar" size={ICON_SIZE} color="#667eea" />
                  <Text style={styles.dateDisplayText}>
                    {dateTime.toLocaleString("vi-VN")}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>
                  {editing ? "Cập nhật" : "Tạo nhắc nhở"}
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
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#333",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 8,
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#667eea",
  },
  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
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
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  reminderCardCompleted: {
    opacity: 0.6,
    borderLeftColor: "#ccc",
  },
  reminderCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  reminderTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  reminderNote: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  reminderMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderDate: {
    fontSize: 12,
    color: "#999",
    marginLeft: 4,
  },
  timeUntil: {
    fontSize: 12,
    color: "#4ecdc4",
    fontWeight: "600",
    marginLeft: 4,
  },
  timeUntilPast: {
    color: "#ff6b6b",
  },
  reminderActions: {
    flexDirection: "row",
    marginLeft: 8,
  },
  actionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e8eaf6",
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 6,
  },
  dateButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fd",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e8eaf6",
  },
  dateBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
    marginLeft: 6,
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fd",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  dateDisplayText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    elevation: 3,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 8,
  },
});
