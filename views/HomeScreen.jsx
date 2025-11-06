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
} from "react-native";
import RefreshableScrollView from "../components/RefreshableScrollView";
import MenstrualWheel from "../components/MenstrualWheel";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    { id: 2, title: "Thuốc của tôi", icon: "medkit", color: "#ec4899" },
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
    if (action.screen) navigation.navigate(action.screen);
  };

  const [account, setAccount] = useState(null);
  const [menstrual, setMenstrual] = useState({
    lastPeriodStart: "",
    cycleLength: "",
    periodLength: "",
  });
  const [showMenstrualModal, setShowMenstrualModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  }, []);

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
            <Text style={styles.userName}>
              {account?.fullName || "Người dùng"}
            </Text>
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
});

export default HomeScreen;
