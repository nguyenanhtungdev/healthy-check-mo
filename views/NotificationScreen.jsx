import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
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

const NotificationScreen = ({
  onUnreadCountChange,
  forceRefresh,
  stackNavigation,
  tabNavigation,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Pagination states - Trạng thái phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [allNotifications, setAllNotifications] = useState([]);
  const ITEMS_PER_PAGE = 10; // Số thông báo hiển thị mỗi lần

  // Modal states for appointment detail
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);

  // Modal states for reminder detail
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [reminderLoading, setReminderLoading] = useState(false);

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

  // Get current user info

  // Load appointment details for modal
  const loadAppointmentDetail = async (appointmentId) => {
    try {
      setAppointmentLoading(true);
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không thể xác thực người dùng");
        return;
      }

      const response = await fetch(
        `${config.API_BASE}/appointments/${appointmentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedAppointment(data);
        setShowAppointmentModal(true);
      } else {
        Alert.alert("Lỗi", "Không thể tải thông tin lịch hẹn");
      }
    } catch (error) {
      console.error("Error loading appointment detail:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setAppointmentLoading(false);
    }
  };

  // Load reminder details for modal
  const loadReminderDetail = async (reminderId) => {
    try {
      setReminderLoading(true);
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không thể xác thực người dùng");
        return;
      }

      const response = await fetch(
        `${config.API_BASE}/reminders/${reminderId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedReminder(data);
        setShowReminderModal(true);
      } else {
        Alert.alert("Lỗi", "Không thể tải thông tin nhắc nhở");
      }
    } catch (error) {
      console.error("Error loading reminder detail:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setReminderLoading(false);
    }
  };

  const closeModal = () => {
    setShowAppointmentModal(false);
  };

  const closeReminderModal = () => {
    setShowReminderModal(false);
  };

  // Load notifications from API - Tải thông báo từ API với phân trang
  const loadNotifications = async (
    showLoader = false,
    resetPagination = false
  ) => {
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
        appointmentId: notification.appointmentId, // Thêm appointmentId từ API
        reminderId: notification.reminderId, // Thêm reminderId từ API
      }));

      // Lưu tất cả thông báo vào allNotifications
      setAllNotifications(mappedNotifications);

      // Reset pagination nếu cần
      if (resetPagination) {
        setCurrentPage(1);
        setHasMoreData(mappedNotifications.length > ITEMS_PER_PAGE);
        // Hiển thị 10 thông báo đầu tiên
        setNotifications(mappedNotifications.slice(0, ITEMS_PER_PAGE));
      } else {
        // Giữ nguyên current page và hiển thị số thông báo tương ứng
        const endIndex = currentPage * ITEMS_PER_PAGE;
        setNotifications(mappedNotifications.slice(0, endIndex));
        setHasMoreData(mappedNotifications.length > endIndex);
      }
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
      if (!token) {
        Alert.alert("Lỗi", "Không thể xác thực. Vui lòng đăng nhập lại.");
        return;
      }

      console.log("Marking all notifications as read...");

      const response = await fetch(
        `${config.API_BASE}/notifications/mark-read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Mark all as read response:", response.status);

      if (response.ok) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        // Update parent component (AppNavigator)
        if (onUnreadCountChange) {
          onUnreadCountChange(0);
        }

        // Show success message
        Alert.alert("Thành công", "Đã đánh dấu tất cả thông báo đã đọc");

        // Refresh notifications to sync with server
        await loadNotifications(false);
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to mark all as read:",
          response.status,
          errorText
        );
        Alert.alert(
          "Lỗi",
          "Không thể đánh dấu tất cả thông báo đã đọc. Vui lòng thử lại."
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      Alert.alert(
        "Lỗi",
        "Đã xảy ra lỗi khi đánh dấu thông báo. Vui lòng thử lại."
      );
    }
  };

  // Delete all read notifications
  const deleteAllReadNotifications = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không thể xác thực. Vui lòng đăng nhập lại.");
        return;
      }

      console.log("Deleting all read notifications...");

      const response = await fetch(`${config.API_BASE}/notifications/read`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Delete all read response:", response.status);

      if (response.ok) {
        const result = await response.json();

        // Show success message with count
        Alert.alert("Thành công", result.message || "Đã xóa thông báo đã đọc");

        // Refresh notifications to sync with server
        await loadNotifications(false, true);
        await loadUnreadCount();
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to delete read notifications:",
          response.status,
          errorText
        );
        Alert.alert("Lỗi", "Không thể xóa thông báo đã đọc. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Error deleting read notifications:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi xóa thông báo. Vui lòng thử lại.");
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

  // Format reminder date for display
  const formatReminderDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Get category label for reminder
  const getCategoryLabel = (category) => {
    switch (category) {
      case "health":
        return "Sức khỏe";
      case "work":
        return "Công việc";
      case "personal":
        return "Cá nhân";
      case "general":
        return "Chung";
      default:
        return "Khác";
    }
  };

  // Load more notifications - Tải thêm thông báo khi scroll
  const loadMoreNotifications = async () => {
    // Nếu đang loading hoặc không có dữ liệu để load thêm thì return
    if (loadingMore || !hasMoreData) return;

    try {
      setLoadingMore(true);

      const nextPage = currentPage + 1;
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = nextPage * ITEMS_PER_PAGE;

      // Lấy thêm 10 thông báo tiếp theo từ allNotifications
      const moreNotifications = allNotifications.slice(startIndex, endIndex);

      if (moreNotifications.length > 0) {
        // Thêm thông báo mới vào danh sách hiện tại
        setNotifications((prev) => [...prev, ...moreNotifications]);
        setCurrentPage(nextPage);

        // Kiểm tra xem còn dữ liệu để load không
        setHasMoreData(allNotifications.length > endIndex);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error("Error loading more notifications:", error);
    } finally {
      setLoadingMore(false);
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

    // Áp dụng pagination cho mock data
    setAllNotifications(mockNotifications);
    setCurrentPage(1);
    setHasMoreData(mockNotifications.length > ITEMS_PER_PAGE);
    setNotifications(mockNotifications.slice(0, ITEMS_PER_PAGE));

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
      loadNotifications(false, true); // Reset pagination on refresh
      loadUnreadCount();
      setLastRefresh(Date.now());
    }
  }, [forceRefresh]);

  // Load data on component mount
  useEffect(() => {
    loadNotifications(true, true); // Show loader on initial load và reset pagination
    loadUnreadCount();
  }, []);

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications(false, true); // Reset pagination when screen focused
      loadUnreadCount();
    }, [])
  );

  // Auto-refresh every 10 seconds when screen is active
  useFocusEffect(
    React.useCallback(() => {
      const interval = setInterval(() => {
        loadNotifications(false, false); // Không reset pagination cho auto-refresh
        loadUnreadCount();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }, [])
  );

  const filterTypes = [
    { id: "all", label: "Tất cả", count: allNotifications.length },
    {
      id: "lich_kham",
      label: "Lịch khám",
      count: allNotifications.filter((n) => n.type === "lich_kham").length,
    },
    {
      id: "suc_khoe",
      label: "Sức khỏe",
      count: allNotifications.filter((n) => n.type === "suc_khoe").length,
    },
    {
      id: "cap_nhat",
      label: "Cập nhật",
      count: allNotifications.filter((n) => n.type === "cap_nhat").length,
    },
    {
      id: "nhac_nho",
      label: "Nhắc nhở",
      count: allNotifications.filter((n) => n.type === "nhac_nho").length,
    },
  ];

  const filteredNotifications =
    filter === "all"
      ? notifications // Hiển thị notifications đã được phân trang
      : allNotifications.filter((n) => n.type === filter); // Hiển thị tất cả thông báo của loại filter

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(false, true), loadUnreadCount()]); // Reset pagination on refresh
    setRefreshing(false);
  };

  // Handle scroll to load more - Xử lý scroll để tải thêm
  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20; // Khoảng cách để trigger load more

    // Kiểm tra xem user đã scroll gần đến cuối chưa
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isCloseToBottom && !loadingMore && hasMoreData && filter === "all") {
      // Chỉ load more khi filter là "all"
      loadMoreNotifications();
    }
  };

  // Handle filter change - Xử lý khi thay đổi filter
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);

    // Nếu chuyển về "all", reset pagination để hiển thị 10 thông báo đầu tiên
    if (newFilter === "all") {
      setCurrentPage(1);
      setHasMoreData(allNotifications.length > ITEMS_PER_PAGE);
      setNotifications(allNotifications.slice(0, ITEMS_PER_PAGE));
    }
    // Nếu là filter khác, không cần pagination (hiển thị tất cả thông báo của loại đó)
  };

  const markAsRead = async (id, notification) => {
    try {
      await markNotificationAsRead(id);

      // Nếu là thông báo lịch khám, hiển thị modal
      if (notification && notification.type === "lich_kham") {
        if (notification.appointmentId) {
          // Load appointment detail và hiển thị modal
          await loadAppointmentDetail(notification.appointmentId);
        } else if (tabNavigation) {
          // Nếu không có appointmentId, chuyển sang tab Gia đình
          tabNavigation.navigate("Family");
        }
      }

      // Nếu là thông báo nhắc nhở, hiển thị chi tiết nhắc nhở
      if (notification && notification.type === "nhac_nho") {
        if (notification.reminderId) {
          // Load reminder detail và hiển thị modal
          await loadReminderDetail(notification.reminderId);
        } else if (stackNavigation) {
          // Nếu không có reminderId, chuyển đến trang RemindersScreen
          stackNavigation.navigate("RemindersScreen");
        }
      }
    } catch (error) {
      console.error("Error in markAsRead:", error);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) {
      Alert.alert("Thông báo", "Tất cả thông báo đã được đánh dấu đã đọc");
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      "Xác nhận",
      `Bạn có muốn đánh dấu tất cả ${unreadCount} thông báo chưa đọc thành đã đọc?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đồng ý",
          onPress: () => markAllNotificationsAsRead(),
        },
      ]
    );
  };

  const deleteAllRead = async () => {
    const readCount = allNotifications.filter((n) => n.isRead).length;

    if (readCount === 0) {
      Alert.alert("Thông báo", "Không có thông báo đã đọc nào để xóa");
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa tất cả ${readCount} thông báo đã đọc? Hành động này không thể hoàn tác.`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => deleteAllReadNotifications(),
        },
      ]
    );
  };

  const renderNotificationItem = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        !notification.isRead && styles.unreadCard,
      ]}
      onPress={() => markAsRead(notification.id, notification)}
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
              onPress={() => handleFilterChange(filterType.id)}
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

      {/* Action Buttons Below Filter */}
      <View style={styles.actionButtonsContainer}>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={markAllAsRead}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[PRIMARY, SECONDARY]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="checkmark-done" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Đánh dấu đã đọc</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {allNotifications.filter((n) => n.isRead).length > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={deleteAllRead}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[DANGER, "#dc2626"]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Xóa đã đọc</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400} // Tối ưu performance
      >
        {filteredNotifications.length > 0 ? (
          <View style={styles.notificationsContainer}>
            {filteredNotifications.map(renderNotificationItem)}

            {/* Load More Indicator - Hiển thị khi đang tải thêm */}
            {loadingMore && filter === "all" && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.loadMoreText}>
                  Đang tải thêm thông báo...
                </Text>
              </View>
            )}

            {/* End of List Message - Thông báo khi hết dữ liệu */}
            {!hasMoreData &&
              allNotifications.length > ITEMS_PER_PAGE &&
              filter === "all" && (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>
                    Đã hiển thị tất cả {allNotifications.length} thông báo
                  </Text>
                </View>
              )}
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

      {/* Appointment Detail Modal */}
      <Modal
        visible={showAppointmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <LinearGradient
            colors={[PRIMARY, SECONDARY]}
            style={styles.modalHeader}
          >
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chi tiết lịch hẹn</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          {appointmentLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.modalLoadingText}>Đang tải thông tin...</Text>
            </View>
          ) : selectedAppointment ? (
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Hospital Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="location" size={16} color="#6b7280" /> Bệnh
                  viện
                </Text>
                <View style={styles.textInput}>
                  <Text style={styles.inputText}>
                    {selectedAppointment.hospitalName}
                  </Text>
                </View>
              </View>

              {/* Frequency */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="time" size={16} color="#6b7280" /> Tần suất
                  khám
                </Text>
                <View style={styles.textInput}>
                  <Text style={styles.inputText}>
                    {selectedAppointment.frequency}
                  </Text>
                </View>
              </View>

              {/* First Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="calendar" size={16} color="#6b7280" /> Ngày
                  khám đầu tiên
                </Text>
                <View style={styles.textInput}>
                  <Text style={styles.inputText}>
                    {selectedAppointment.firstDate}
                  </Text>
                </View>
              </View>

              {/* Note */}
              {selectedAppointment.note && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="document-text" size={16} color="#6b7280" />{" "}
                    Ghi chú
                  </Text>
                  <View style={[styles.textInput, styles.textArea]}>
                    <Text style={styles.inputText}>
                      {selectedAppointment.note}
                    </Text>
                  </View>
                </View>
              )}

              {/* Participants */}
              {selectedAppointment.participants &&
                selectedAppointment.participants.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="people" size={16} color="#6b7280" /> Thành
                      viên tham gia ({selectedAppointment.participants.length})
                    </Text>
                    <View style={styles.participantsList}>
                      {selectedAppointment.participants.map(
                        (participant, index) => (
                          <View
                            key={participant.userId || index}
                            style={styles.participantItem}
                          >
                            {participant.imageUrl ? (
                              <Image
                                source={{ uri: participant.imageUrl }}
                                style={styles.participantAvatar}
                                onError={() => {}}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.participantAvatar,
                                  styles.avatarPlaceholder,
                                ]}
                              >
                                <Text style={styles.avatarPlaceholderText}>
                                  {participant.fullName
                                    ?.charAt(0)
                                    ?.toUpperCase() || "?"}
                                </Text>
                              </View>
                            )}
                            <View style={styles.participantInfo}>
                              <Text style={styles.participantName}>
                                {participant.fullName}
                              </Text>
                              <Text style={styles.participantEmail}>
                                {participant.email}
                              </Text>
                            </View>
                          </View>
                        )
                      )}
                    </View>
                  </View>
                )}

              {/* Action Button */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { flex: 1 }]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* Reminder Detail Modal */}
      <Modal
        visible={showReminderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeReminderModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <LinearGradient
            colors={[PRIMARY, SECONDARY]}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={closeReminderModal}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chi tiết nhắc nhở</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          {reminderLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.modalLoadingText}>Đang tải thông tin...</Text>
            </View>
          ) : selectedReminder ? (
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="text" size={16} color="#6b7280" /> Tiêu đề
                </Text>
                <View style={styles.textInput}>
                  <Text style={styles.inputText}>{selectedReminder.title}</Text>
                </View>
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="pricetag" size={16} color="#6b7280" /> Danh
                  mục
                </Text>
                <View style={styles.textInput}>
                  <Text style={styles.inputText}>
                    {getCategoryLabel(selectedReminder.category)}
                  </Text>
                </View>
              </View>

              {/* Remind Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="calendar" size={16} color="#6b7280" /> Thời
                  gian nhắc nhở
                </Text>
                <View style={styles.textInput}>
                  <Text style={styles.inputText}>
                    {formatReminderDate(selectedReminder.remindAt)}
                  </Text>
                </View>
              </View>

              {/* Status */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="checkmark-circle" size={16} color="#6b7280" />{" "}
                  Trạng thái
                </Text>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: selectedReminder.sent
                          ? "#dcfce7"
                          : "#fef3c7",
                        borderColor: selectedReminder.sent
                          ? "#16a34a"
                          : "#f59e0b",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: selectedReminder.sent ? "#16a34a" : "#f59e0b",
                        },
                      ]}
                    >
                      {selectedReminder.sent ? "Đã gửi" : "Chưa gửi"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Note */}
              {selectedReminder.note && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="document-text" size={16} color="#6b7280" />{" "}
                    Ghi chú
                  </Text>
                  <View style={[styles.textInput, styles.textArea]}>
                    <Text style={styles.inputText}>
                      {selectedReminder.note}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Button */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { flex: 1 }]}
                  onPress={closeReminderModal}
                >
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          ) : null}
        </View>
      </Modal>
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
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },

  // Action Buttons Styles
  actionButtonsContainer: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: {
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
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
  // Load More styles - Styles cho tải thêm
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  endOfListContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  endOfListText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalLoadingText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editableInput: {
    borderColor: PRIMARY,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  inputText: {
    fontSize: 16,
    color: "#1f2937",
  },
  disabledInput: {
    backgroundColor: "#f9fafb",
    opacity: 0.8,
    borderColor: "#d1d5db",
  },
  disabledText: {
    color: "#6b7280",
  },
  textArea: {
    minHeight: 80,
  },
  participantsList: {
    gap: 12,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 12,
    color: "#6b7280",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  disabledBtn: {
    backgroundColor: "#9ca3af",
    opacity: 0.7,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  infoMessage: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    marginTop: 20,
    gap: 12,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 14,
    color: INFO,
    lineHeight: 20,
  },
  statusContainer: {
    alignItems: "flex-start",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default NotificationScreen;
