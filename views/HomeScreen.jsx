import React, { useEffect, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Button,
} from "react-native";
import RefreshableScrollView from "../components/RefreshableScrollView";
import MenstrualWheel from "../components/MenstrualWheel";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from '../config';

const HomeScreen = ({ navigation, route }) => {
  const [healthMetrics, setHealthMetrics] = useState([
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
  ]);

  const quickActions = [
    {
      id: 1,
      title: "Ghi nhận sức khỏe",
      icon: "heart-outline",
      color: "#ef4444",
      screen: "HealthRecord",
    },
    {
      id: 2,
      title: "Đặt lịch khám",
      icon: "calendar",
      color: "#667eea",
      screen: "Contact",
    },
    { id: 3, title: "Thuốc của tôi", icon: "medkit", color: "#ec4899" },
    {
      id: 4,
      title: "Lịch sử khám",
      icon: "document-text",
      color: "#f59e0b",
      screen: "Profile",
    },
  ];

  const handleActionPress = (action) => {
    if (action.screen) navigation.navigate(action.screen);
  };

  const [account, setAccount] = useState(null);
  const [userId, setUserId] = useState(null);
  const [menstrual, setMenstrual] = useState({
    lastPeriodStart: "",
    cycleLength: "",
    periodLength: "",
  });
  const [showMenstrualModal, setShowMenstrualModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hàm cập nhật health metrics từ dữ liệu mới
  const updateHealthMetrics = (newData) => {
    setHealthMetrics(prevMetrics => {
      const updatedMetrics = [...prevMetrics];
      
      // Cập nhật nhịp tim
      if (newData.heartRate) {
        const heartRateIndex = updatedMetrics.findIndex(m => m.id === 1);
        if (heartRateIndex !== -1) {
          updatedMetrics[heartRateIndex] = {
            ...updatedMetrics[heartRateIndex],
            value: newData.heartRate,
            status: getHeartRateStatus(parseInt(newData.heartRate))
          };
        }
      }
      
      // Cập nhật huyết áp
      if (newData.bloodPressureSystolic && newData.bloodPressureDiastolic) {
        const bpIndex = updatedMetrics.findIndex(m => m.id === 2);
        if (bpIndex !== -1) {
          updatedMetrics[bpIndex] = {
            ...updatedMetrics[bpIndex],
            value: `${newData.bloodPressureSystolic}/${newData.bloodPressureDiastolic}`,
            status: getBloodPressureStatus(parseInt(newData.bloodPressureSystolic), parseInt(newData.bloodPressureDiastolic))
          };
        }
      }
      
      // Cập nhật cân nặng
      if (newData.weight) {
        const weightIndex = updatedMetrics.findIndex(m => m.id === 3);
        if (weightIndex !== -1) {
          updatedMetrics[weightIndex] = {
            ...updatedMetrics[weightIndex],
            value: parseFloat(newData.weight).toFixed(1),
            status: "normal" // Có thể thêm logic đánh giá BMI
          };
        }
      }
      
      // Cập nhật lượng nước
      if (newData.waterIntake) {
        const waterIndex = updatedMetrics.findIndex(m => m.id === 4);
        if (waterIndex !== -1) {
          updatedMetrics[waterIndex] = {
            ...updatedMetrics[waterIndex],
            value: parseFloat(newData.waterIntake).toFixed(1),
            status: getWaterIntakeStatus(parseFloat(newData.waterIntake))
          };
        }
      }
      
      return updatedMetrics;
    });
  };

  // Hàm đánh giá trạng thái nhịp tim
  const getHeartRateStatus = (heartRate) => {
    if (heartRate >= 60 && heartRate <= 100) return "normal";
    return "warning";
  };

  // Hàm đánh giá trạng thái huyết áp
  const getBloodPressureStatus = (systolic, diastolic) => {
    if (systolic <= 120 && diastolic <= 80) return "normal";
    return "warning";
  };

  // Hàm đánh giá trạng thái lượng nước
  const getWaterIntakeStatus = (waterIntake) => {
    if (waterIntake >= 2.0) return "normal";
    return "low";
  };

  const reloadProfile = async () => {
    setRefreshing(true);
    try {
      const accStr = await AsyncStorage.getItem("account");
      if (accStr) {
        const acc = JSON.parse(accStr);
        setAccount(acc);
        setUserId(acc.id || acc.accountId);
        
        // Tải dữ liệu sức khỏe từ server
        await loadTodayHealthData(acc.id || acc.accountId);
        
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

  // Hàm tải dữ liệu sức khỏe hôm nay từ server
  const loadTodayHealthData = async (currentUserId) => {
    if (!currentUserId) return;
    
    try {
      const response = await fetch(`${config.API_BASE}/api/health-records/today/${currentUserId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        updateHealthMetrics(data.data);
      }
    } catch (error) {
      console.error('Error loading today health data:', error);
    }
  };

  useEffect(() => {
    reloadProfile();
  }, []);

  // Lắng nghe params từ navigation để cập nhật health data
  useEffect(() => {
    if (route.params?.refreshHealthData && route.params?.newHealthData) {
      updateHealthMetrics(route.params.newHealthData);
      // Reset params để tránh cập nhật lại khi re-render
      navigation.setParams({ 
        refreshHealthData: false, 
        newHealthData: null 
      });
    }
  }, [route.params]);

  // Tải lại dữ liệu khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        loadTodayHealthData(userId);
      }
    }, [userId])
  );

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>Nguyễn Anh Tùng</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#fff" />
            <View style={styles.badge} />
          </TouchableOpacity>
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
            <View style={styles.metricCard}>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <MenstrualWheel
                  lastPeriodStart={menstrual.lastPeriodStart}
                  cycleLength={menstrual.cycleLength || 28}
                  periodLength={menstrual.periodLength || 5}
                  size={160}
                />
              </View>
              <Text style={{ fontWeight: "700", marginBottom: 6 }}>
                Kỳ gần nhất
              </Text>
              <Text style={{ color: "#444", marginBottom: 8 }}>
                {menstrual.lastPeriodStart || "Chưa đặt"}
              </Text>
              <Text style={{ fontWeight: "700", marginBottom: 6 }}>
                Chu kỳ trung bình
              </Text>
              <Text style={{ color: "#444", marginBottom: 8 }}>
                {menstrual.cycleLength
                  ? `${menstrual.cycleLength} ngày`
                  : "Chưa đặt"}
              </Text>
              <Text style={{ fontWeight: "700", marginBottom: 6 }}>
                Thời gian hành kinh
              </Text>
              <Text style={{ color: "#444", marginBottom: 12 }}>
                {menstrual.periodLength
                  ? `${menstrual.periodLength} ngày`
                  : "Chưa đặt"}
              </Text>
              {(() => {
                const next = predictNextPeriod(
                  menstrual.lastPeriodStart,
                  menstrual.cycleLength
                );
                if (next)
                  return (
                    <Text style={{ color: "#0f172a", marginBottom: 8 }}>
                      Dự kiến kỳ tiếp theo: {next.toISOString().slice(0, 10)}
                    </Text>
                  );
                return null;
              })()}
              <View
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <TouchableOpacity
                  onPress={() => setShowMenstrualModal(true)}
                  style={[styles.primaryButton, { paddingHorizontal: 14 }]}
                >
                  <Text style={styles.primaryButtonText}>Sửa</Text>
                </TouchableOpacity>
              </View>
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
              <Text style={styles.tipTitle}>
                {(() => {
                  const waterMetric = healthMetrics.find(m => m.id === 4);
                  const currentWater = parseFloat(waterMetric?.value || 0);
                  if (currentWater < 2.0) {
                    const needed = (2.0 - currentWater).toFixed(1);
                    return "Uống đủ nước";
                  } else if (healthMetrics.find(m => m.id === 1)?.status === "warning") {
                    return "Theo dõi nhịp tim";
                  } else if (healthMetrics.find(m => m.id === 2)?.status === "warning") {
                    return "Theo dõi huyết áp";
                  }
                  return "Duy trì sức khỏe tốt";
                })()}
              </Text>
              <Text style={styles.tipDescription}>
                {(() => {
                  const waterMetric = healthMetrics.find(m => m.id === 4);
                  const currentWater = parseFloat(waterMetric?.value || 0);
                  if (currentWater < 2.0) {
                    const needed = (2.0 - currentWater).toFixed(1);
                    return `Bạn nên uống thêm ${needed}L nước để đạt mục tiêu 2L/ngày. Giữ cơ thể luôn được cung cấp đủ nước!`;
                  } else if (healthMetrics.find(m => m.id === 1)?.status === "warning") {
                    return "Nhịp tim của bạn nằm ngoài khoảng bình thường. Hãy nghỉ ngơi và theo dõi thêm.";
                  } else if (healthMetrics.find(m => m.id === 2)?.status === "warning") {
                    return "Huyết áp của bạn cần được theo dõi. Hãy thư giãn và tránh căng thẳng.";
                  }
                  return "Các chỉ số sức khỏe của bạn đều tốt! Hãy tiếp tục duy trì lối sống khỏe mạnh.";
                })()}
              </Text>
            </View>
          </View>
        </View>

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
    paddingTop: 16,
    paddingBottom: 24,
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
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
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
});

export default HomeScreen;
