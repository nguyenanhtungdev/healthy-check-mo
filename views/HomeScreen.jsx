import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Button,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import RefreshableScrollView from "../components/RefreshableScrollView";
import MenstrualWheel from "../components/MenstrualWheel";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import config from "../config";

const PRIMARY = "#6366f1";
const SECONDARY = "#8b5cf6";
const HomeScreen = ({ navigation }) => {
  const healthMetrics = [
    {
      id: 1,
      title: "Nhịp tim",
      value: "72",
      unit: "bpm",
      icon: "heart",
      color: "#ef4444",
      status: "normal",
    },
    {
      id: 2,
      title: "Huyết áp",
      value: "120/80",
      unit: "mmHg",
      icon: "water",
      color: "#3b82f6",
      status: "normal",
    },
    {
      id: 3,
      title: "Cân nặng",
      value: "65.5",
      unit: "kg",
      icon: "fitness",
      color: "#10b981",
      status: "normal",
    },
    {
      id: 4,
      title: "Lượng nước",
      value: "1.8",
      unit: "L",
      icon: "water-outline",
      color: "#06b6d4",
      status: "low",
    },
  ];

  const quickActions = [
    {
      id: 1,
      title: "Đặt lịch khám",
      icon: "calendar",
      color: "#667eea",
      screen: "Contact",
    },
    {
      id: 2,
      title: "Nhắc nhở",
      icon: "notifications",
      color: "#6366f1",
      screen: "RemindersScreen",
    },
    {
      id: 3,
      title: "Lịch sử khám",
      icon: "document-text",
      color: "#f59e0b",
      screen: "Profile",
    },
    {
      id: 4,
      title: "Tư vấn",
      icon: "chatbubble-ellipses",
      color: "#8b5cf6",
      screen: "Contact",
    },
  ];

  const handleActionPress = (action) => {
    if (action.id === 1) {
      // Đặt lịch khám - show modal
      setShowAppointmentModal(true);
    } else if (action.id === 2) {
      // Nhắc nhở - chuyển màn hình
      navigation.navigate("RemindersScreen");
    } else if (action.screen) {
      navigation.navigate(action.screen);
    }
  };

  const [account, setAccount] = useState(null);
  const [menstrual, setMenstrual] = useState({
    lastPeriodStart: "",
    cycleLength: "",
    periodLength: "",
  });
  const [showMenstrualModal, setShowMenstrualModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Appointment modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    hospitalName: "",
    frequency: "Hàng tháng",
    firstDate: "",
    note: "",
    selectedMembers: [], // Array of member IDs
  });
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [familyMembers, setFamilyMembers] = useState([]);
  const [menstrualTip, setMenstrualTip] = useState("");

  // Mảng các lời khuyên chăm sóc chu kỳ kinh nguyệt
  const menstrualCareTips = [
    {
      icon: "water",
      text: "Uống đủ nước giúp giảm đầy hơi và cải thiện tuần hoàn máu trong kỳ kinh nguyệt",
      color: "#06b6d4",
    },
    {
      icon: "fitness",
      text: "Tập yoga nhẹ nhàng giúp giảm đau bụng kinh và cải thiện tâm trạng",
      color: "#10b981",
    },
    {
      icon: "moon",
      text: "Ngủ đủ 7-8 tiếng mỗi ngày giúp cân bằng hormone và giảm mệt mỏi",
      color: "#8b5cf6",
    },
    {
      icon: "nutrition",
      text: "Bổ sung thực phẩm giàu sắt như rau xanh, thịt đỏ để phòng ngừa thiếu máu",
      color: "#f59e0b",
    },
    {
      icon: "heart",
      text: "Giữ ấm vùng bụng dưới bằng túi chườm nóng để giảm đau kinh",
      color: "#ef4444",
    },
    {
      icon: "cafe",
      text: "Hạn chế caffeine và đồ ăn mặn trong kỳ kinh để giảm đau và đầy hơi",
      color: "#92400e",
    },
    {
      icon: "happy",
      text: "Dành thời gian thư giãn và làm những việc bạn yêu thích để cải thiện tâm trạng",
      color: "#ec4899",
    },
    {
      icon: "medkit",
      text: "Ghi chép lại các triệu chứng để theo dõi sức khỏe và tư vấn bác sĩ khi cần",
      color: "#6366f1",
    },
    {
      icon: "leaf",
      text: "Thử trà gừng hoặc trà bạc hà để giảm buồn nôn và chuột rút",
      color: "#10b981",
    },
    {
      icon: "bicycle",
      text: "Đi bộ nhẹ nhàng 20-30 phút mỗi ngày giúp giảm đau và tăng cường năng lượng",
      color: "#06b6d4",
    },
  ];

  const reloadProfile = async () => {
    setRefreshing(true);
    try {
      const accStr = await AsyncStorage.getItem("account");
      if (accStr) {
        const acc = JSON.parse(accStr);
        setAccount(acc);
        const last =
          acc.lastPeriodStart || acc.menstrual?.lastPeriodStart || null;
        const cycle = acc.cycleLength || acc.menstrual?.cycleLength || null;
        const period = acc.periodLength || acc.menstrual?.periodLength || null;
        if (last || cycle || period) {
          setMenstrual({
            lastPeriodStart: last || "",
            cycleLength: cycle ? String(cycle) : "",
            periodLength: period ? String(period) : "",
          });
          setRefreshing(false);
          return;
        }
      }
      const mStr = await AsyncStorage.getItem("menstrual");
      if (mStr) {
        const m = JSON.parse(mStr);
        setMenstrual({
          lastPeriodStart: m.lastPeriodStart || "",
          cycleLength: m.cycleLength ? String(m.cycleLength) : "",
          periodLength: m.periodLength ? String(m.periodLength) : "",
        });
      }
    } catch (e) {
      console.warn("Failed to load account/menstrual", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    reloadProfile();
    loadFamilyMembers();
    // Chọn ngẫu nhiên một lời khuyén chăm sóc chu kỳ
    const randomTip =
      menstrualCareTips[Math.floor(Math.random() * menstrualCareTips.length)];
    setMenstrualTip(randomTip);
  }, []);

  // Load family members
  const loadFamilyMembers = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.warn("No token found for loading family members");
        return;
      }

      const response = await fetch(`${config.API_BASE}/family-members/list`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // Transform API data
      const transformedMembers = data.map((item) => ({
        id: item.id,
        memberId: item.member.id,
        name: item.member.fullName || "Chưa có tên",
        relation: item.relation,
        avatarUrl: item.member.urlImage,
        email: item.member.email,
        phone: item.member.phone,
      }));

      setFamilyMembers(transformedMembers);
    } catch (error) {
      console.error("Error loading family members:", error);
      setFamilyMembers([]);
    }
  };

  const saveMenstrual = async (m) => {
    try {
      await AsyncStorage.setItem("menstrual", JSON.stringify(m));
      try {
        const accStr = await AsyncStorage.getItem("account");
        if (accStr) {
          const acc = JSON.parse(accStr);
          const merged = Object.assign({}, acc, {
            lastPeriodStart: m.lastPeriodStart || acc.lastPeriodStart,
            cycleLength: m.cycleLength
              ? parseInt(String(m.cycleLength))
              : acc.cycleLength,
            periodLength: m.periodLength
              ? parseInt(String(m.periodLength))
              : acc.periodLength,
          });
          await AsyncStorage.setItem("account", JSON.stringify(merged));
          setAccount(merged);
        }
      } catch (ee) {
        console.warn("Failed to merge menstrual into account", ee);
      }
      setMenstrual({
        lastPeriodStart: m.lastPeriodStart || "",
        cycleLength: m.cycleLength ? String(m.cycleLength) : "",
        periodLength: m.periodLength ? String(m.periodLength) : "",
      });
      setShowMenstrualModal(false);
      Alert.alert("Lưu thành công", "Thông tin chu kỳ đã được lưu cục bộ.");
    } catch (e) {
      console.warn(e);
      Alert.alert("Lỗi", "Không thể lưu dữ liệu chu kỳ. Vui lòng thử lại.");
    }
  };

  const predictNextPeriod = (lastStartStr, cycleLenStr) => {
    if (!lastStartStr || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(lastStartStr))
      return null;
    const cycle = parseInt(String(cycleLenStr));
    if (!cycle || isNaN(cycle)) return null;
    const parts = lastStartStr.split("-").map((p) => parseInt(p, 10));
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + cycle);
    return d;
  };

  // Get token for API calls
  const getToken = async () => {
    try {
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) {
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  // Handle create appointment
  const handleCreateAppointment = async () => {
    if (!appointmentForm.hospitalName.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập tên bệnh viện");
      return;
    }
    if (!appointmentForm.firstDate) {
      Alert.alert("Thông báo", "Vui lòng chọn ngày khám");
      return;
    }
    if (appointmentForm.selectedMembers.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setAppointmentLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Không tìm thấy token xác thực");
        setAppointmentLoading(false);
        return;
      }

      const requestBody = {
        hospital: appointmentForm.hospitalName.trim(),
        frequency: appointmentForm.frequency,
        note: appointmentForm.note.trim(),
        firstDate: appointmentForm.firstDate,
        memberIds: appointmentForm.selectedMembers,
      };

      const response = await fetch(
        `${config.API_BASE}/appointments/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Thành công", "Đã tạo lịch khám định kỳ thành công!", [
          {
            text: "OK",
            onPress: () => {
              setShowAppointmentModal(false);
              resetAppointmentForm();
            },
          },
        ]);
      } else {
        Alert.alert(
          "Lỗi",
          data.message || "Không thể tạo lịch khám. Vui lòng thử lại."
        );
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tạo lịch khám. Vui lòng thử lại.");
    } finally {
      setAppointmentLoading(false);
    }
  };

  // Reset appointment form
  const resetAppointmentForm = () => {
    setAppointmentForm({
      hospitalName: "",
      frequency: "Hàng tháng",
      firstDate: "",
      note: "",
      selectedMembers: [],
    });
    setShowDatePicker(false);
    setSelectedDate(new Date());
  };

  // Handle close appointment modal
  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    resetAppointmentForm();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Chọn ngày";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle date picker change
  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || appointmentForm.firstDate;
    setShowDatePicker(Platform.OS === "ios"); // Keep open on iOS
    setSelectedDate(currentDate);
    const formattedDate = currentDate.toISOString().split("T")[0];
    setAppointmentForm((prev) => ({ ...prev, firstDate: formattedDate }));
  };

  // Show date picker
  const showDatepicker = () => {
    if (appointmentForm.firstDate) {
      setSelectedDate(new Date(appointmentForm.firstDate));
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[PRIMARY, SECONDARY]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>
              {account?.fullName || "Người dùng"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <RefreshableScrollView
        refreshing={refreshing}
        onRefresh={reloadProfile}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chỉ số sức khỏe hôm nay</Text>
          <View style={styles.metricsGrid}>
            {healthMetrics.map((metric) => (
              <View key={metric.id} style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: metric.color + "20" },
                  ]}
                >
                  <Ionicons name={metric.icon} size={24} color={metric.color} />
                </View>
                <Text style={styles.metricTitle}>{metric.title}</Text>
                <View style={styles.metricValueContainer}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricUnit}>{metric.unit}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    metric.status === "normal"
                      ? styles.statusNormal
                      : styles.statusWarning,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      metric.status === "normal"
                        ? styles.statusTextNormal
                        : styles.statusTextWarning,
                    ]}
                  >
                    {metric.status === "normal" ? "Bình thường" : "Thấp"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {account && account.gender === false && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quản lý chu kỳ kinh nguyệt</Text>
            <View style={styles.menstrualCard}>
              <LinearGradient
                colors={["#fdf2f8", "#fce7f3", "#fce7f3"]}
                style={styles.menstrualGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.menstrualHeader}>
                  <View style={styles.menstrualIconContainer}>
                    <Ionicons name="flower" size={24} color="#ec4899" />
                  </View>
                  <View style={styles.menstrualHeaderText}>
                    <Text style={styles.menstrualTitle}>Chu kỳ của bạn</Text>
                    <Text style={styles.menstrualSubtitle}>
                      Theo dõi và dự đoán chu kỳ
                    </Text>
                  </View>
                </View>

                <View style={styles.menstrualWheelContainer}>
                  <MenstrualWheel
                    lastPeriodStart={menstrual.lastPeriodStart}
                    cycleLength={menstrual.cycleLength || 28}
                    periodLength={menstrual.periodLength || 5}
                    size={140}
                  />
                </View>

                <View style={styles.menstrualInfoGrid}>
                  <View style={styles.menstrualInfoItem}>
                    <View style={styles.menstrualInfoIcon}>
                      <Ionicons name="calendar" size={16} color="#ec4899" />
                    </View>
                    <Text style={styles.menstrualInfoLabel}>Kỳ gần nhất</Text>
                    <Text style={styles.menstrualInfoValue}>
                      {menstrual.lastPeriodStart || "Chưa đặt"}
                    </Text>
                  </View>

                  <View style={styles.menstrualInfoItem}>
                    <View style={styles.menstrualInfoIcon}>
                      <Ionicons name="refresh" size={16} color="#ec4899" />
                    </View>
                    <Text style={styles.menstrualInfoLabel}>Chu kỳ</Text>
                    <Text style={styles.menstrualInfoValue}>
                      {menstrual.cycleLength
                        ? `${menstrual.cycleLength} ngày`
                        : "Chưa đặt"}
                    </Text>
                  </View>

                  <View style={styles.menstrualInfoItem}>
                    <View style={styles.menstrualInfoIcon}>
                      <Ionicons name="time" size={16} color="#ec4899" />
                    </View>
                    <Text style={styles.menstrualInfoLabel}>Thời gian</Text>
                    <Text style={styles.menstrualInfoValue}>
                      {menstrual.periodLength
                        ? `${menstrual.periodLength} ngày`
                        : "Chưa đặt"}
                    </Text>
                  </View>
                </View>

                {(() => {
                  const next = predictNextPeriod(
                    menstrual.lastPeriodStart,
                    menstrual.cycleLength
                  );
                  if (next)
                    return (
                      <View style={styles.nextPeriodCard}>
                        <View style={styles.nextPeriodIcon}>
                          <Ionicons
                            name="trending-up"
                            size={20}
                            color="#ec4899"
                          />
                        </View>
                        <View style={styles.nextPeriodText}>
                          <Text style={styles.nextPeriodLabel}>
                            Dự kiến kỳ tiếp theo
                          </Text>
                          <Text style={styles.nextPeriodDate}>
                            {next.toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                      </View>
                    );
                  return null;
                })()}

                {/* Lời khuyên chăm sóc */}
                {menstrualTip && (
                  <View style={styles.menstrualTipCard}>
                    <View style={styles.menstrualTipHeader}>
                      <View style={styles.menstrualTipHeaderLeft}>
                        <View
                          style={[
                            styles.menstrualTipIcon,
                            { backgroundColor: menstrualTip.color + "20" },
                          ]}
                        >
                          <Ionicons
                            name={menstrualTip.icon}
                            size={18}
                            color={menstrualTip.color}
                          />
                        </View>
                        <Text style={styles.menstrualTipTitle}>
                          💡 Lời khuyên hôm nay
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          const randomTip =
                            menstrualCareTips[
                              Math.floor(Math.random() * menstrualCareTips.length)
                            ];
                          setMenstrualTip(randomTip);
                        }}
                        style={styles.menstrualTipRefreshBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="refresh" size={18} color="#ec4899" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.menstrualTipText}>
                      {menstrualTip.text}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => setShowMenstrualModal(true)}
                  style={styles.menstrualEditButton}
                >
                  <Ionicons name="create" size={18} color="#fff" />
                  <Text style={styles.menstrualEditText}>Chỉnh sửa</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => handleActionPress(action)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: action.color + "20" },
                  ]}
                >
                  <Ionicons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lời khuyên hôm nay</Text>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="bulb" size={32} color="#f59e0b" />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Uống đủ nước</Text>
              <Text style={styles.tipDescription}>
                Bạn nên uống thêm 200ml nước để đạt mục tiêu 2L/ngày. Giữ cơ thể
                luôn được cung cấp đủ nước!
              </Text>
            </View>
          </View>
        </View>

        {/* Modal Đặt lịch khám */}
        <Modal
          visible={showAppointmentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseAppointmentModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={[PRIMARY, SECONDARY]}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>Đặt lịch khám định kỳ</Text>
                <TouchableOpacity
                  onPress={handleCloseAppointmentModal}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* Frequency Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tần suất khám</Text>
                  <View style={styles.frequencyButtons}>
                    <TouchableOpacity
                      style={[
                        styles.frequencyBtn,
                        appointmentForm.frequency === "Hàng tháng" &&
                          styles.frequencyBtnActive,
                      ]}
                      onPress={() =>
                        setAppointmentForm({
                          ...appointmentForm,
                          frequency: "Hàng tháng",
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.frequencyBtnText,
                          appointmentForm.frequency === "Hàng tháng" &&
                            styles.frequencyBtnTextActive,
                        ]}
                      >
                        Hàng tháng
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.frequencyBtn,
                        appointmentForm.frequency === "Hàng quý" &&
                          styles.frequencyBtnActive,
                      ]}
                      onPress={() =>
                        setAppointmentForm({
                          ...appointmentForm,
                          frequency: "Hàng quý",
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.frequencyBtnText,
                          appointmentForm.frequency === "Hàng quý" &&
                            styles.frequencyBtnTextActive,
                        ]}
                      >
                        Hàng quý
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.frequencyBtn,
                        appointmentForm.frequency === "Hàng năm" &&
                          styles.frequencyBtnActive,
                      ]}
                      onPress={() =>
                        setAppointmentForm({
                          ...appointmentForm,
                          frequency: "Hàng năm",
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.frequencyBtnText,
                          appointmentForm.frequency === "Hàng năm" &&
                            styles.frequencyBtnTextActive,
                        ]}
                      >
                        Hàng năm
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hospital Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bệnh viện / Phòng khám</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nhập tên bệnh viện hoặc phòng khám"
                      placeholderTextColor="#9ca3af"
                      value={appointmentForm.hospitalName}
                      onChangeText={(text) =>
                        setAppointmentForm({
                          ...appointmentForm,
                          hospitalName: text,
                        })
                      }
                    />
                  </View>
                </View>

                {/* Member Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Chọn thành viên tham gia</Text>
                  <View style={styles.memberSelection}>
                    {familyMembers.length === 0 ? (
                      <View style={styles.noMembersContainer}>
                        <Ionicons name="people-outline" size={24} color="#9ca3af" />
                        <Text style={styles.noMembersText}>
                          Chưa có thành viên nào
                        </Text>
                      </View>
                    ) : (
                      familyMembers.map((member, index) => (
                        <TouchableOpacity
                          key={member.memberId || index}
                          style={[
                            styles.memberSelectItem,
                            appointmentForm.selectedMembers.includes(
                              member.memberId
                            ) && styles.memberSelectItemActive,
                          ]}
                          onPress={() => {
                            const selectedIds = appointmentForm.selectedMembers;
                            const isSelected = selectedIds.includes(
                              member.memberId
                            );
                            const newSelection = isSelected
                              ? selectedIds.filter((id) => id !== member.memberId)
                              : [...selectedIds, member.memberId];
                            setAppointmentForm({
                              ...appointmentForm,
                              selectedMembers: newSelection,
                            });
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.memberSelectInfo}>
                            {member.avatarUrl ? (
                              <Image
                                source={{ uri: member.avatarUrl }}
                                style={styles.memberSelectAvatar}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.memberSelectAvatarPlaceholder}>
                                <Text style={styles.memberSelectAvatarText}>
                                  {member.name?.charAt(0)?.toUpperCase() || "?"}
                                </Text>
                              </View>
                            )}
                            <View>
                              <Text style={styles.memberSelectName}>
                                {member.name}
                              </Text>
                              {member.relation && (
                                <Text style={styles.memberSelectRelation}>
                                  {member.relation}
                                </Text>
                              )}
                            </View>
                          </View>
                          {appointmentForm.selectedMembers.includes(
                            member.memberId
                          ) && (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={PRIMARY}
                            />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>

                {/* Next Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ngày khám đầu tiên</Text>
                  <TouchableOpacity
                    style={styles.inputContainer}
                    onPress={showDatepicker}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <Text style={[styles.textInput, styles.dateDisplayText]}>
                      {formatDate(appointmentForm.firstDate)}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={selectedDate}
                      mode="date"
                      is24Hour={true}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>

                {/* Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Ghi chú (không bắt buộc)</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#9ca3af"
                      style={[styles.inputIcon, styles.textAreaIcon]}
                    />
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      placeholder="Ghi chú thêm về lịch khám..."
                      placeholderTextColor="#9ca3af"
                      value={appointmentForm.note}
                      onChangeText={(text) =>
                        setAppointmentForm({ ...appointmentForm, note: text })
                      }
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.appointmentActions}>
                  <TouchableOpacity
                    style={styles.cancelAppointmentBtn}
                    onPress={handleCloseAppointmentModal}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelAppointmentBtnText}>Hủy</Text>
                  </TouchableOpacity>
                  <LinearGradient
                    colors={[PRIMARY, SECONDARY]}
                    style={styles.saveAppointmentBtn}
                  >
                    <TouchableOpacity
                      style={styles.saveAppointmentBtnInner}
                      onPress={handleCreateAppointment}
                      disabled={appointmentLoading}
                      activeOpacity={0.8}
                    >
                      {appointmentLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveAppointmentBtnText}>
                          Lưu lịch khám
                        </Text>
                      )}
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showMenstrualModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMenstrualModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 20,
                maxWidth: 400,
                alignSelf: "center",
                width: "100%",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}
              >
                Chỉnh sửa chu kỳ
              </Text>
              <Text style={{ color: "#444", marginBottom: 6 }}>
                Ngày bắt đầu kỳ kinh gần nhất (YYYY-MM-DD)
              </Text>
              <TextInput
                value={menstrual.lastPeriodStart}
                onChangeText={(t) =>
                  setMenstrual((s) => ({ ...s, lastPeriodStart: t }))
                }
                placeholder="YYYY-MM-DD"
                style={[styles.fieldInputStyled, { marginBottom: 8 }]}
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus={true}
                returnKeyType="next"
                blurOnSubmit={false}
              />
              <Text style={{ color: "#444", marginBottom: 6 }}>
                Độ dài chu kỳ (ngày)
              </Text>
              <TextInput
                value={menstrual.cycleLength}
                onChangeText={(t) =>
                  setMenstrual((s) => ({ ...s, cycleLength: t }))
                }
                placeholder="28"
                keyboardType="numeric"
                style={[styles.fieldInputStyled, { marginBottom: 8 }]}
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus={true}
                returnKeyType="next"
                blurOnSubmit={false}
                maxLength={2}
              />
              <Text style={{ color: "#444", marginBottom: 6 }}>
                Thời gian hành kinh (ngày)
              </Text>
              <TextInput
                value={menstrual.periodLength}
                onChangeText={(t) =>
                  setMenstrual((s) => ({ ...s, periodLength: t }))
                }
                placeholder="5"
                keyboardType="numeric"
                style={[styles.fieldInputStyled, { marginBottom: 12 }]}
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus={true}
                returnKeyType="done"
                maxLength={2}
              />
              <View
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <TouchableOpacity
                  style={[styles.ghostButton, { marginRight: 8 }]}
                  onPress={() => setShowMenstrualModal(false)}
                >
                  <Text style={styles.ghostButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => saveMenstrual(menstrual)}
                >
                  <Text style={styles.primaryButtonText}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </RefreshableScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fffe" },
  gradientHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: 15, color: "#fff", opacity: 0.9 },
  userName: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  metricTitle: { fontSize: 13, color: "#666", marginBottom: 8 },
  metricValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  metricValue: { fontSize: 24, fontWeight: "800", color: "#111" },
  metricUnit: { fontSize: 14, color: "#999", marginLeft: 4 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusNormal: { backgroundColor: "#10b98120" },
  statusWarning: { backgroundColor: "#f59e0b20" },
  statusText: { fontSize: 11, fontWeight: "600" },
  statusTextNormal: { color: "#10b981" },
  statusTextWarning: { color: "#f59e0b" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  tipIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f59e0b20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
  tipDescription: { fontSize: 14, color: "#666", lineHeight: 20 },
  fieldInputStyled: {
    backgroundColor: "#fbfbff",
    borderWidth: 1,
    borderColor: "#e6e9f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 14,
    color: "#111",
    minHeight: 44, // Ensure minimum touch target
    textAlign: "left",
    outlineStyle: "none", // Remove web outline
  },
  primaryButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },

  ghostButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6e9f2",
  },
  ghostButtonText: { color: "#666", fontWeight: "600" },

  // Menstrual cycle styles
  menstrualCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#ec4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menstrualGradient: {
    padding: 20,
  },
  menstrualHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  menstrualIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menstrualHeaderText: {
    flex: 1,
  },
  menstrualTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#831843",
    marginBottom: 2,
  },
  menstrualSubtitle: {
    fontSize: 13,
    color: "#be185d",
    opacity: 0.8,
  },
  menstrualWheelContainer: {
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 16,
    padding: 20,
    overflow: "hidden",
  },
  menstrualInfoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 8,
  },
  menstrualInfoItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  menstrualInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  menstrualInfoLabel: {
    fontSize: 11,
    color: "#be185d",
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  menstrualInfoValue: {
    fontSize: 12,
    color: "#831843",
    fontWeight: "700",
    textAlign: "center",
  },
  nextPeriodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ec4899",
  },
  nextPeriodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  nextPeriodText: {
    flex: 1,
  },
  nextPeriodLabel: {
    fontSize: 13,
    color: "#be185d",
    fontWeight: "600",
    marginBottom: 2,
  },
  nextPeriodDate: {
    fontSize: 16,
    color: "#831843",
    fontWeight: "800",
  },
  menstrualEditButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ec4899",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menstrualEditText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
  menstrualTipCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ec4899",
    shadowColor: "#ec4899",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menstrualTipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  menstrualTipHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menstrualTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  menstrualTipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#831843",
  },
  menstrualTipRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  menstrualTipText: {
    fontSize: 13,
    color: "#be185d",
    lineHeight: 20,
    fontWeight: "500",
  },

  // Appointment Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  frequencyButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  frequencyBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  frequencyBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  frequencyBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  frequencyBtnTextActive: {
    color: PRIMARY,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
    paddingVertical: 12,
  },
  dateDisplayText: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
    paddingVertical: 12,
    fontWeight: "500",
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  textAreaIcon: {
    marginTop: 4,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 4,
  },
  memberSelection: {
    gap: 8,
    marginTop: 8,
  },
  memberSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  memberSelectItemActive: {
    borderColor: PRIMARY,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  memberSelectInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberSelectAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberSelectAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  memberSelectAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  memberSelectName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  memberSelectRelation: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  noMembersContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  noMembersText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
  },
  appointmentActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingBottom: 20,
  },
  cancelAppointmentBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelAppointmentBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  saveAppointmentBtn: {
    flex: 2,
    borderRadius: 12,
  },
  saveAppointmentBtnInner: {
    paddingVertical: 16,
    alignItems: "center",
  },
  saveAppointmentBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

export default HomeScreen;
