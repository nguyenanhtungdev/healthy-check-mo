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

export default function PrivacyScreen({ navigation }) {
  const onBack = () => navigation && navigation.goBack();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Section */}
        <View style={styles.introSection}>
          <View style={styles.iconWrapper}>
            <Ionicons name="shield-checkmark" size={32} color="#667eea" />
          </View>
          <Text style={styles.introTitle}>Cam kết bảo mật</Text>
          <Text style={styles.introText}>
            Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn. Dữ liệu sẽ chỉ
            được sử dụng để cải thiện dịch vụ và không bán cho bên thứ ba.
          </Text>
        </View>

        {/* Privacy Items */}
        <View style={styles.privacyItem}>
          <View style={styles.itemIcon}>
            <Ionicons name="document-text-outline" size={24} color="#667eea" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Thu thập dữ liệu</Text>
            <Text style={styles.itemDesc}>
              Chúng tôi chỉ thu thập những dữ liệu cần thiết để cung cấp dịch vụ
              tốt nhất cho bạn.
            </Text>
          </View>
        </View>

        <View style={styles.privacyItem}>
          <View style={styles.itemIcon}>
            <Ionicons name="lock-closed-outline" size={24} color="#667eea" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Lưu trữ an toàn</Text>
            <Text style={styles.itemDesc}>
              Dữ liệu được lưu trữ an toàn và mã hóa theo tiêu chuẩn bảo mật cao
              nhất.
            </Text>
          </View>
        </View>

        <View style={styles.privacyItem}>
          <View style={styles.itemIcon}>
            <Ionicons name="eye-off-outline" size={24} color="#667eea" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Không chia sẻ</Text>
            <Text style={styles.itemDesc}>
              Thông tin của bạn sẽ không được chia sẻ hoặc bán cho bất kỳ bên
              thứ ba nào.
            </Text>
          </View>
        </View>

        <View style={styles.privacyItem}>
          <View style={styles.itemIcon}>
            <Ionicons name="person-outline" size={24} color="#667eea" />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>Quyền kiểm soát</Text>
            <Text style={styles.itemDesc}>
              Bạn có toàn quyền truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân của
              mình bất cứ lúc nào.
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={22} color="#667eea" />
          <Text style={styles.infoText}>
            Để biết thêm chi tiết về cách chúng tôi xử lý dữ liệu của bạn, vui
            lòng xem Chính sách bảo mật đầy đủ.
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
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#666",
    textAlign: "center",
  },
  privacyItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: "#666",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#667eea",
  },
});
