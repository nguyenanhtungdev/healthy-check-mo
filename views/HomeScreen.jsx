import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const PRIMARY = "#667eea";
const SECONDARY = "#ede9fe";

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
      title: "Thuốc của tôi",
      icon: "medkit",
      color: "#ec4899",
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
    if (action.screen) {
      navigation.navigate(action.screen);
    }
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

      <ScrollView
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fffe",
  },
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
  greeting: {
    fontSize: 15,
    color: "#fff",
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginTop: 4,
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
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
  metricTitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  metricValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
  },
  metricUnit: {
    fontSize: 14,
    color: "#999",
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusNormal: {
    backgroundColor: "#10b98120",
  },
  statusWarning: {
    backgroundColor: "#f59e0b20",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextNormal: {
    color: "#10b981",
  },
  statusTextWarning: {
    color: "#f59e0b",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
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
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  tipDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});

export default HomeScreen;
