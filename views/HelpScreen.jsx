import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HelpScreen({ navigation }) {
  const onEmail = () => Linking.openURL("mailto:support@example.com");
  const onCall = () => Linking.openURL("tel:+84123456789");
  const onClose = () => navigation && navigation.goBack();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Card liên hệ */}
        <View style={styles.contactCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="help-circle" size={32} color="#667eea" />
          </View>

          <Text style={styles.contactTitle}>Cần hỗ trợ?</Text>
          <Text style={styles.contactDesc}>
            Nếu bạn gặp vấn đề hoặc cần hỗ trợ kỹ thuật, đừng ngại liên hệ với
            chúng tôi
          </Text>

          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={onEmail}>
              <Ionicons name="mail-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onCall}>
              <Ionicons name="call-outline" size={20} color="#667eea" />
              <Text style={styles.secondaryButtonText}>Gọi điện</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>

          <View style={styles.faqItem}>
            <Ionicons name="help-circle-outline" size={20} color="#667eea" />
            <Text style={styles.faqText}>Cách cập nhật thông tin cá nhân</Text>
          </View>

          <View style={styles.faqItem}>
            <Ionicons name="help-circle-outline" size={20} color="#667eea" />
            <Text style={styles.faqText}>Cách cập nhật ảnh đại diện</Text>
          </View>

          <View style={styles.faqItem}>
            <Ionicons name="help-circle-outline" size={20} color="#667eea" />
            <Text style={styles.faqText}>Cách thay đổi mật khẩu</Text>
          </View>
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="time-outline" size={18} color="#667eea" />
          <Text style={styles.infoText}>
            Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc
          </Text>
        </View>
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
    padding: 20,
  },
  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  contactDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#667eea",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4ff",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: "#667eea",
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  faqItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  faqText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f4ff",
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#667eea",
    lineHeight: 20,
  },
});
