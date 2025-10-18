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

export default function TermsScreen({ navigation }) {
  const onBack = () => navigation && navigation.goBack();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introSection}>
          <View style={styles.iconWrapper}>
            <Ionicons name="document-text" size={28} color="#667eea" />
          </View>
          <Text style={styles.introText}>
            Vui lòng đọc kỹ các điều khoản sử dụng và chính sách bảo mật trước
            khi sử dụng ứng dụng
          </Text>
        </View>

        {/* Điều khoản 1 */}
        <View style={styles.termSection}>
          <View style={styles.termHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>1</Text>
            </View>
            <Text style={styles.termTitle}>Sử dụng dịch vụ</Text>
          </View>
          <Text style={styles.termContent}>
            Người dùng cam kết sử dụng dịch vụ theo đúng quy định của pháp luật
            và điều khoản này. Mọi hành vi vi phạm sẽ bị xử lý theo quy định.
          </Text>
        </View>

        {/* Điều khoản 2 */}
        <View style={styles.termSection}>
          <View style={styles.termHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>2</Text>
            </View>
            <Text style={styles.termTitle}>Quyền riêng tư</Text>
          </View>
          <Text style={styles.termContent}>
            Chúng tôi cam kết bảo vệ dữ liệu cá nhân của bạn. Thông tin của bạn
            sẽ được mã hóa và bảo mật theo tiêu chuẩn quốc tế.
          </Text>
        </View>

        {/* Điều khoản 3 */}
        <View style={styles.termSection}>
          <View style={styles.termHeader}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>3</Text>
            </View>
            <Text style={styles.termTitle}>Trách nhiệm người dùng</Text>
          </View>
          <Text style={styles.termContent}>
            Người dùng chịu trách nhiệm về tính chính xác của thông tin cung cấp
            và việc sử dụng ứng dụng của mình.
          </Text>
        </View>

        {/* Footer note */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={20} color="#999" />
          <Text style={styles.footerText}>
            Điều khoản có hiệu lực từ ngày 01/01/2024
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
  introSection: {
    backgroundColor: "#f0f4ff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#667eea",
    textAlign: "center",
  },
  termSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  termHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#667eea",
  },
  termTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  termContent: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 13,
    color: "#999",
  },
});
