import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import config from "../config";

const PRIMARY = "#6366f1";
const SECONDARY = "#8b5cf6";
const SUCCESS = "#10b981";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";
const INFO = "#3b82f6";

const NotificationScreen = ({ onUnreadCountChange, forceRefresh }) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Get token for API calls
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

  // Load notifications from API
  const loadNotifications = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);

      const token = await getToken();
      if (!token) {
        loadMockData();
        return;
      }

      const response = await fetch(
        `${config.API_BASE}/notifications?_t=${Date.now()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Map API data to component format
      const mappedNotifications = (data || []).map((notification) => ({
        id: notification.id,
        type: notification.type || "general",
        title: notification.title,
        message: notification.content,
        time: formatTime(notification.createdAt),
        icon: getIconForType(notification.type),
        color: getColorForType(notification.type),
        isRead: notification.isRead,
        priority: "medium",
      }));

      setNotifications(mappedNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Keep using mock data if API fails
      loadMockData();
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(
        `${config.API_BASE}/notifications/count-unread?_t=${Date.now()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const count = data.count || 0;
        setUnreadCount(count);
        // Update parent component (AppNavigator)
        if (onUnreadCountChange) {
          onUnreadCountChange(count);
        }
      } else {
        console.warn("Failed to load unread count:", response.status);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${config.API_BASE}/notifications/${notificationId}/mark-read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        // Update unread count
        const newCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newCount);
        // Update parent component (AppNavigator)
        if (onUnreadCountChange) {
          onUnreadCountChange(newCount);
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        `${config.API_BASE}/notifications/mark-read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        // Update parent component (AppNavigator)
        if (onUnreadCountChange) {
          onUnreadCountChange(0);
        }
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Helper functions
  const getIconForType = (type) => {
    switch (type) {
      case "lich_kham":
        return "calendar";
      case "suc_khoe":
        return "heart";
      case "cap_nhat":
        return "download";
      case "nhac_nho":
        return "medical";
      case "bao_mat":
        return "shield-checkmark";
      default:
        return "notifications";
    }
  };

  const getColorForType = (type) => {
    switch (type) {
      case "lich_kham":
        return PRIMARY;
      case "suc_khoe":
        return SUCCESS;
      case "cap_nhat":
        return INFO;
      case "nhac_nho":
        return WARNING;
      case "bao_mat":
        return DANGER;
      default:
        return PRIMARY;
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 60) {
        return `${diffMinutes} phút trước`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
      } else if (diffDays < 7) {
        return `${diffDays} ngày trước`;
      } else {
        return `${Math.floor(diffDays / 7)} tuần trước`;
      }
    } catch (error) {
      return "Vừa xong";
    }
  };

  // Fallback mock data
  const loadMockData = () => {
    const mockNotifications = [
      {
        id: "1",
        type: "lich_kham",
        title: "Nhắc nhở lịch khám định kỳ",
        message: "Bạn có lịch khám tại Bệnh viện Chợ Rẫy vào ngày 15/11/2025",
        time: "2 giờ trước",
        icon: "calendar",
        color: PRIMARY,
        isRead: false,
        priority: "high",
      },
      {
        id: "2",
        type: "cap_nhat",
        title: "Cập nhật ứng dụng",
        message: "Phiên bản 2.1.0 đã có sẵn với nhiều tính năng mới",
        time: "1 ngày trước",
        icon: "download",
        color: INFO,
        isRead: true,
        priority: "medium",
      },
      {
        id: "3",
        type: "suc_khoe",
        title: "Kết quả sức khỏe",
        message: "Báo cáo sức khỏe tháng 11 của bạn đã sẵn sàng",
        time: "2 ngày trước",
        icon: "heart",
        color: SUCCESS,
        isRead: false,
        priority: "medium",
      },
    ];
    setNotifications(mockNotifications);
    const mockUnreadCount = mockNotifications.filter((n) => !n.isRead).length;
    setUnreadCount(mockUnreadCount);
    // Update parent component (AppNavigator)
    if (onUnreadCountChange) {
      onUnreadCountChange(mockUnreadCount);
    }
  };

  // Handle force refresh
  useEffect(() => {
    if (forceRefresh && Date.now() - lastRefresh > 2000) {
      // Prevent too frequent calls
      loadNotifications(false);
      loadUnreadCount();
      setLastRefresh(Date.now());
    }
  }, [forceRefresh]);

  // Load data on component mount
  useEffect(() => {
    loadNotifications(true); // Show loader on initial load
    loadUnreadCount();
  }, []);

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
      loadUnreadCount();
    }, [])
  );

  // Auto-refresh every 10 seconds when screen is active
  useFocusEffect(
    React.useCallback(() => {
      const interval = setInterval(() => {
        loadNotifications();
        loadUnreadCount();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }, [])
  );

  const filterTypes = [
    { id: "all", label: "Tất cả", count: notifications.length },
    {
      id: "lich_kham",
      label: "Lịch khám",
      count: notifications.filter((n) => n.type === "lich_kham").length,
    },
    {
      id: "suc_khoe",
      label: "Sức khỏe",
      count: notifications.filter((n) => n.type === "suc_khoe").length,
    },
    {
      id: "cap_nhat",
      label: "Cập nhật",
      count: notifications.filter((n) => n.type === "cap_nhat").length,
    },
    {
      id: "nhac_nho",
      label: "Nhắc nhở",
      count: notifications.filter((n) => n.type === "nhac_nho").length,
    },
  ];

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(false), loadUnreadCount()]);
    setRefreshing(false);
  };

  const markAsRead = async (id) => {
    await markNotificationAsRead(id);
  };

  const markAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  const renderNotificationItem = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.isRead && styles.unreadCard,
      ]}
      onPress={() => markAsRead(notification.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        {/* Unread indicator bar */}
        {!notification.isRead && <View style={styles.unreadIndicator} />}

        <View
          style={[
            styles.notificationIcon,
            !notification.isRead && styles.unreadIcon,
          ]}
        >
          <Ionicons
            name={notification.icon}
            size={20}
            color={notification.color}
          />
        </View>

        <View style={styles.notificationText}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                !notification.isRead && styles.unreadTitle,
              ]}
            >
              {notification.title}
            </Text>
            {notification.priority === "high" && !notification.isRead && (
              <View style={styles.priorityDot} />
            )}
          </View>
          <Text
            style={[
              styles.notificationMessage,
              !notification.isRead && styles.unreadMessage,
            ]}
          >
            {notification.message}
          </Text>
          <Text style={styles.notificationTime}>{notification.time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[PRIMARY, SECONDARY]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTypes.map((filterType) => (
            <TouchableOpacity
              key={filterType.id}
              style={[
                styles.filterTab,
                filter === filterType.id && styles.filterTabActive,
              ]}
              onPress={() => setFilter(filterType.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === filterType.id && styles.filterTabTextActive,
                ]}
              >
                {filterType.label}
              </Text>
              {filterType.count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    filter === filterType.id && styles.filterBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      filter === filterType.id && styles.filterBadgeTextActive,
                    ]}
                  >
                    {filterType.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length > 0 ? (
          <View style={styles.notificationsContainer}>
            {filteredNotifications.map(renderNotificationItem)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Không có thông báo</Text>
            <Text style={styles.emptySubtitle}>
              {filter === "all"
                ? "Bạn chưa có thông báo nào"
                : `Không có thông báo loại "${
                    filterTypes.find((f) => f.id === filter)?.label
                  }"`}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 27,
    paddingBottom: 27,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  markAllButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    gap: 4,
  },
  filterTabActive: {
    backgroundColor: "#e2e8f0",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  filterTabTextActive: {
    color: "#374151",
  },
  filterBadge: {
    backgroundColor: "#cbd5e1",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: "center",
  },
  filterBadgeActive: {
    backgroundColor: "#94a3b8",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  filterBadgeTextActive: {
    color: "#fff",
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContainer: {
    padding: 20,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: "#f8fafc", // Background mặc định cho thông báo đã đọc (xám nhạt)
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    opacity: 0.7, // Làm mờ thông báo đã đọc
    overflow: "hidden", // Để clip unreadIndicator
  },
  unreadCard: {
    backgroundColor: "#f0f9ff", // Background xanh nhạt cho thông báo chưa đọc
    borderColor: "#38bdf8", // Border xanh cho thông báo chưa đọc
    borderWidth: 1.5, // Border dày hơn một chút
    opacity: 1, // Đậm hơn cho thông báo chưa đọc
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    transform: [{ scale: 1.01 }], // Nhỏ hiệu ứng scale để nổi bật
  },
  notificationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative",
  },
  unreadIndicator: {
    position: "absolute",
    left: -16,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#38bdf8",
    borderRadius: 2,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9", // Background mặc định cho icon
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  unreadIcon: {
    backgroundColor: "#dbeafe", // Background xanh nhạt cho icon thông báo chưa đọc
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280", // Màu xám cho thông báo đã đọc
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
    color: "#1f2937", // Màu đen đậm cho thông báo chưa đọc
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginLeft: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#9ca3af", // Màu xám nhạt cho message đã đọc
    lineHeight: 18,
    marginBottom: 6,
  },
  unreadMessage: {
    color: "#6b7280", // Màu đậm hơn cho message chưa đọc
  },
  notificationTime: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default NotificationScreen;
