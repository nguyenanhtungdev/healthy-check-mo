import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import config from "../config";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PRIMARY = "#6366f1";
const SECONDARY = "#8b5cf6";
const SUCCESS = "#10b981";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";
const INFO = "#3b82f6";
const BACKGROUND = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#1f2937";
const TEXT_SECONDARY = "#6b7280";
const TEXT_MUTED = "#9ca3af";

const AppointmentDetailScreen = ({ route, navigation }) => {
  const { appointmentId, fromNotification = false } = route.params;
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    hospitalName: "",
    frequency: "",
    firstDate: "",
    note: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
  const getCurrentUser = async () => {
    try {
      const accStr = await AsyncStorage.getItem("account");
      if (accStr) {
        const acc = JSON.parse(accStr);
        setCurrentUser(acc);
        return acc;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  // Load appointment details
  const loadAppointmentDetail = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
        setAppointment(data);

        // Initialize edit form with current data
        setEditForm({
          hospitalName: data.hospitalName || "",
          frequency: data.frequency || "",
          firstDate: data.firstDate || "",
          note: data.note || "",
        });

        // Initialize selected date for date picker
        if (data.firstDate) {
          setSelectedDate(new Date(data.firstDate));
        }

        // Note: fromNotification case is handled in render method
      } else {
        Alert.alert("Lỗi", "Không thể tải thông tin lịch hẹn");
      }
    } catch (error) {
      console.error("Error loading appointment detail:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointmentDetail(false);
    setRefreshing(false);
  };

  useEffect(() => {
    const initializeScreen = async () => {
      await getCurrentUser();
      if (appointmentId) {
        await loadAppointmentDetail();
      }
    };
    initializeScreen();
  }, [appointmentId]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status info
  const getStatusInfo = (firstDate) => {
    const now = new Date();
    const appointmentDate = new Date(firstDate);

    if (appointmentDate < now) {
      return {
        status: "Đã qua",
        color: TEXT_MUTED,
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        icon: "checkmark-done-circle",
      };
    } else if (appointmentDate.toDateString() === now.toDateString()) {
      return {
        status: "Hôm nay",
        color: WARNING,
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        icon: "time",
      };
    } else {
      return {
        status: "Sắp tới",
        color: SUCCESS,
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        icon: "calendar",
      };
    }
  };

  // Get frequency icon
  const getFrequencyIcon = (frequency) => {
    switch (frequency) {
      case "Hàng tuần":
        return "calendar-outline";
      case "Hàng tháng":
        return "calendar";
      case "Hàng quý":
        return "calendar-sharp";
      case "Hàng năm":
        return "calendar-number";
      default:
        return "calendar";
    }
  };

  // Check if current user is creator
  const isCreator = () => {
    if (!currentUser || !appointment) {
      console.log(
        "Missing data - currentUser:",
        !!currentUser,
        "appointment:",
        !!appointment
      );
      return false;
    }

    // Debug log để kiểm tra
    console.log("=== DEBUG CREATOR CHECK ===");
    console.log("Current user:", {
      id: currentUser.id,
      userId: currentUser.userId,
      fullName: currentUser.fullName,
      name: currentUser.name,
      email: currentUser.email,
    });
    console.log("Appointment:", {
      createdBy: appointment.createdBy,
      createdById: appointment.createdById,
      creatorId: appointment.creatorId,
    });

    // So sánh với ID (vì API trả về createdBy là ID, không phải tên)
    const condition1 =
      currentUser.userId &&
      appointment.createdBy &&
      currentUser.userId === appointment.createdBy;
    const condition2 =
      currentUser.id &&
      appointment.createdBy &&
      currentUser.id === appointment.createdBy;

    // Fallback: So sánh tên (cho trường hợp API detail trả về tên)
    const condition3 =
      currentUser.fullName &&
      appointment.createdBy &&
      typeof appointment.createdBy === "string" &&
      !appointment.createdBy.includes("-") && // Không phải UUID
      currentUser.fullName === appointment.createdBy;
    const condition4 =
      currentUser.name &&
      appointment.createdBy &&
      typeof appointment.createdBy === "string" &&
      !appointment.createdBy.includes("-") && // Không phải UUID
      currentUser.name === appointment.createdBy;

    console.log("Condition checks:");
    console.log(
      "  userId === createdBy (ID):",
      condition1,
      `"${currentUser.userId}" === "${appointment.createdBy}"`
    );
    console.log(
      "  id === createdBy (ID):",
      condition2,
      `"${currentUser.id}" === "${appointment.createdBy}"`
    );
    console.log(
      "  fullName === createdBy (name):",
      condition3,
      `"${currentUser.fullName}" === "${appointment.createdBy}"`
    );
    console.log(
      "  name === createdBy (name):",
      condition4,
      `"${currentUser.name}" === "${appointment.createdBy}"`
    );

    const isCreatorResult =
      condition1 || condition2 || condition3 || condition4;

    console.log("Is creator result:", isCreatorResult);
    console.log("=== END DEBUG ===");

    return isCreatorResult;
  };

  // Handle edit appointment
  const handleEditAppointment = async () => {
    try {
      setEditLoading(true);
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không thể xác thực người dùng");
        return;
      }

      // Ensure date is in correct format for API
      const formData = {
        ...editForm,
        firstDate: editForm.firstDate || new Date().toISOString().split("T")[0],
      };

      const response = await fetch(
        `${config.API_BASE}/appointments/${appointmentId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const updatedData = await response.json();
        setAppointment(updatedData);
        setShowEditModal(false);
        Alert.alert("Thành công", "Đã cập nhật lịch hẹn", [
          {
            text: "OK",
            onPress: () => {
              if (fromNotification) {
                navigation.goBack();
              }
            },
          },
        ]);
        // Refresh data
        await loadAppointmentDetail(false);
      } else {
        const errorData = await response.json();
        Alert.alert("Lỗi", errorData.message || "Không thể cập nhật lịch hẹn");
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi cập nhật");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowEditModal(false);
    if (fromNotification) {
      // If opened from notification, go back to notifications
      navigation.goBack();
    }
  };

  // Format date for input
  const formatDateForInput = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
  };

  // Handle date picker change
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === "ios"); // Keep open on iOS, close on Android
    setSelectedDate(currentDate);

    // Format date as YYYY-MM-DD for the form
    const formattedDate = currentDate.toISOString().split("T")[0];
    setEditForm((prev) => ({ ...prev, firstDate: formattedDate }));
  };

  // Show date picker
  const showDatepicker = () => {
    // Parse current date from form or use today
    const currentFormDate = editForm.firstDate
      ? new Date(editForm.firstDate)
      : new Date();
    setSelectedDate(currentFormDate);
    setShowDatePicker(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[PRIMARY, SECONDARY]} style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết lịch hẹn</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[PRIMARY, SECONDARY]} style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết lịch hẹn</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="calendar-outline" size={64} color={TEXT_MUTED} />
          </View>
          <Text style={styles.errorTitle}>Không tìm thấy lịch hẹn</Text>
          <Text style={styles.errorSubtitle}>
            Lịch hẹn có thể đã bị xóa hoặc bạn không có quyền truy cập
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadAppointmentDetail()}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo(appointment.firstDate);

  // Clean up: removed fromNotification modal logic as it's now handled in NotificationScreen

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[PRIMARY, SECONDARY]} style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết lịch hẹn</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={24}
            color="#fff"
            style={refreshing ? styles.rotating : null}
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.backgroundColor },
            ]}
          >
            <Ionicons
              name={
                statusInfo.status === "Hôm nay"
                  ? "time"
                  : statusInfo.status === "Sắp tới"
                  ? "calendar"
                  : "checkmark-done"
              }
              size={16}
              color={statusInfo.color}
            />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.status}
            </Text>
          </View>
        </View>

        {/* Main Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar" size={24} color={PRIMARY} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.cardTitle}>Lịch khám sức khỏe</Text>
              <Text style={styles.frequency}>{appointment.frequency}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="location" size={18} color={TEXT_SECONDARY} />
              <Text style={styles.labelText}>Bệnh viện</Text>
            </View>
            <Text style={styles.detailValue}>{appointment.hospitalName}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={TEXT_SECONDARY}
              />
              <Text style={styles.labelText}>Ngày khám</Text>
            </View>
            <Text style={styles.detailValue}>
              {formatDate(appointment.firstDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="time-outline" size={18} color={TEXT_SECONDARY} />
              <Text style={styles.labelText}>Tần suất</Text>
            </View>
            <Text style={styles.detailValue}>{appointment.frequency}</Text>
          </View>

          {appointment.note && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.labelText}>Ghi chú</Text>
              </View>
              <Text style={styles.detailValue}>{appointment.note}</Text>
            </View>
          )}
        </View>

        {/* Participants List */}
        {appointment.participants && appointment.participants.length > 0 && (
          <View style={styles.membersCard}>
            <View style={styles.membersHeader}>
              <Ionicons name="people" size={20} color={PRIMARY} />
              <Text style={styles.membersTitle}>
                Thành viên tham gia ({appointment.participants.length})
              </Text>
            </View>

            <View style={styles.membersList}>
              {appointment.participants.map((participant, index) => (
                <View
                  key={participant.userId || index}
                  style={styles.memberItem}
                >
                  {participant.imageUrl ? (
                    <Image
                      source={{ uri: participant.imageUrl }}
                      style={styles.memberAvatar}
                      onError={() => {}}
                    />
                  ) : (
                    <View
                      style={[styles.memberAvatar, styles.avatarPlaceholder]}
                    >
                      <Text style={styles.memberAvatarText}>
                        {participant.fullName?.charAt(0)?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {participant.fullName}
                    </Text>
                    <Text style={styles.memberRelation}>
                      {participant.email}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Created Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Được tạo bởi {appointment.createdBy} vào{" "}
            {formatDate(appointment.createdAt || appointment.firstDate)}
          </Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <LinearGradient
            colors={[PRIMARY, SECONDARY]}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={handleCloseModal}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isCreator() ? "Chỉnh sửa lịch hẹn" : "Chi tiết lịch hẹn"}
            </Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hospital Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="location" size={16} color={TEXT_SECONDARY} />{" "}
                Bệnh viện
              </Text>
              <TextInput
                style={[styles.textInput, !isCreator() && styles.disabledInput]}
                value={editForm.hospitalName}
                onChangeText={(text) =>
                  isCreator() &&
                  setEditForm((prev) => ({ ...prev, hospitalName: text }))
                }
                placeholder="Nhập tên bệnh viện"
                editable={isCreator()}
                selectTextOnFocus={isCreator()}
                multiline
              />
            </View>

            {/* Frequency */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="time" size={16} color={TEXT_SECONDARY} /> Tần
                suất khám
              </Text>
              <View style={styles.frequencyContainer}>
                {["Hàng tuần", "Hàng tháng", "Hàng quý", "Hàng năm"].map(
                  (freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyOption,
                        editForm.frequency === freq &&
                          styles.frequencyOptionActive,
                        !isCreator() && styles.disabledOption,
                      ]}
                      onPress={() =>
                        isCreator() &&
                        setEditForm((prev) => ({ ...prev, frequency: freq }))
                      }
                      disabled={!isCreator()}
                    >
                      <Text
                        style={[
                          styles.frequencyOptionText,
                          editForm.frequency === freq &&
                            styles.frequencyOptionTextActive,
                        ]}
                      >
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* First Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="calendar" size={16} color={TEXT_SECONDARY} />{" "}
                Ngày khám đầu tiên
              </Text>
              <TouchableOpacity
                style={[
                  styles.textInput,
                  styles.datePickerInput,
                  !isCreator() && styles.disabledInput,
                ]}
                onPress={isCreator() ? showDatepicker : null}
                disabled={!isCreator()}
              >
                <Text
                  style={[
                    styles.datePickerText,
                    !editForm.firstDate && styles.placeholderText,
                    !isCreator() && styles.disabledText,
                  ]}
                >
                  {editForm.firstDate
                    ? formatDate(editForm.firstDate)
                    : "Chọn ngày khám"}
                </Text>
                {isCreator() && (
                  <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
                )}
              </TouchableOpacity>

              {showDatePicker && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={selectedDate}
                    mode="date"
                    is24Hour={true}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    minimumDate={new Date()} // Không cho chọn ngày trong quá khứ
                    style={styles.datePickerStyle}
                  />
                </View>
              )}
            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons
                  name="document-text"
                  size={16}
                  color={TEXT_SECONDARY}
                />{" "}
                Ghi chú
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  !isCreator() && styles.disabledInput,
                ]}
                value={editForm.note}
                onChangeText={(text) =>
                  isCreator() &&
                  setEditForm((prev) => ({ ...prev, note: text }))
                }
                placeholder="Nhập ghi chú (không bắt buộc)"
                multiline
                numberOfLines={4}
                editable={isCreator()}
                selectTextOnFocus={isCreator()}
              />
            </View>

            {/* Participants */}
            {appointment?.participants &&
              appointment.participants.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="people" size={16} color={TEXT_SECONDARY} />{" "}
                    Thành viên tham gia ({appointment.participants.length})
                  </Text>
                  <View style={styles.participantsList}>
                    {appointment.participants.map((participant, index) => (
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
                              {participant.fullName?.charAt(0)?.toUpperCase() ||
                                "?"}
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
                    ))}
                  </View>
                </View>
              )}

            {/* Action Buttons - Only show if user is creator */}
            {isCreator() && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, editLoading && styles.disabledBtn]}
                  onPress={handleEditAppointment}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Non-creator info */}
            {!isCreator() && (
              <View style={styles.infoMessage}>
                <Ionicons name="information-circle" size={20} color={INFO} />
                <Text style={styles.infoMessageText}>
                  Bạn chỉ có thể xem thông tin lịch hẹn này. Chỉ người tạo mới
                  có thể chỉnh sửa.
                </Text>
              </View>
            )}

            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_SECONDARY,
    marginTop: 16,
    marginBottom: 24,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: PRIMARY,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  statusContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  infoCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  labelText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    flex: 1,
    textAlign: "right",
  },
  membersCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginLeft: 8,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  memberRelation: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  footerInfo: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontStyle: "italic",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
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
    color: TEXT_PRIMARY,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledInput: {
    backgroundColor: "#f9fafb",
    color: TEXT_SECONDARY,
    opacity: 0.6,
    borderColor: "#d1d5db",
  },
  datePickerInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  placeholderText: {
    color: TEXT_SECONDARY,
  },
  disabledText: {
    color: TEXT_SECONDARY,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  frequencyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  frequencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  frequencyOptionActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  disabledOption: {
    opacity: 0.5,
    backgroundColor: "#f3f4f6",
  },
  frequencyOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_SECONDARY,
  },
  frequencyOptionTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  participantsList: {
    gap: 12,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: CARD_BG,
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
    color: TEXT_SECONDARY,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 12,
    color: TEXT_SECONDARY,
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
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_SECONDARY,
  },
  saveBtn: {
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
    opacity: 0.6,
  },
  saveBtnText: {
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  rotating: {
    transform: [{ rotate: "180deg" }],
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_SECONDARY,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
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
});

export default AppointmentDetailScreen;
