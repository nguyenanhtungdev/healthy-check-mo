import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function AboutScreen({ navigation }) {
  const onBack = () => navigation && navigation.goBack();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon app */}
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <Ionicons name="heart" size={48} color="#667eea" />
          </View>
        </View>

        {/* Tên app */}
        <Text style={styles.appName}>Healthy Check</Text>
        <Text style={styles.version}>Phiên bản 1.0.0</Text>

        {/* Mô tả */}
        <View style={styles.section}>
          <Text style={styles.description}>
            Ứng dụng theo dõi sức khỏe gia đình, giúp bạn quản lý và chăm sóc
            sức khỏe của những người thân yêu một cách dễ dàng và hiệu quả.
          </Text>
        </View>

        {/* Thông tin */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color="#667eea" />
            <Text style={styles.infoText}>
              Phát triển bởi nhóm Healthy Check
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="bulb-outline" size={20} color="#667eea" />
            <Text style={styles.infoText}>
              Cung cấp công cụ theo dõi sức khỏe đơn giản cho mọi gia đình
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>© 2024 Healthy Check Team</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: "#999",
    marginBottom: 24,
  },
  section: {
    width: "100%",
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#555",
    textAlign: "center",
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: "#444",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },
  footer: {
    marginTop: 32,
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
  },
});
