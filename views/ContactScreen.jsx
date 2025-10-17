import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const PRIMARY = "#667eea";
const SECONDARY = "#ede9fe";

const ContactScreen = () => {
  const [selectedType, setSelectedType] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const contactTypes = [
    {
      id: "emergency",
      title: "Cấp cứu",
      icon: "alert-circle",
      color: "#ef4444",
      description: "Liên hệ ngay khi cần khẩn cấp",
    },
    {
      id: "appointment",
      title: "Đặt lịch khám",
      icon: "calendar",
      color: "#667eea",
      description: "Đặt lịch hẹn với bác sĩ",
    },
    {
      id: "consult",
      title: "Tư vấn",
      icon: "chatbubble-ellipses",
      color: "#10b981",
      description: "Tư vấn sức khỏe trực tuyến",
    },
    {
      id: "support",
      title: "Hỗ trợ",
      icon: "help-circle",
      color: "#f59e0b",
      description: "Hỗ trợ kỹ thuật và câu hỏi",
    },
  ];

  const handleSubmit = () => {
    if (!selectedType) {
      Alert.alert("Thông báo", "Vui lòng chọn loại liên hệ");
      return;
    }
    if (!name || !phone) {
      Alert.alert("Thông báo", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    Alert.alert(
      "Thành công",
      "Yêu cầu của bạn đã được gửi. Chúng tôi sẽ liên hệ lại sớm nhất!",
      [
        {
          text: "OK",
          onPress: () => {
            setSelectedType(null);
            setName("");
            setPhone("");
            setMessage("");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn loại liên hệ</Text>
          <View style={styles.typeGrid}>
            {contactTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardActive,
                ]}
                onPress={() => setSelectedType(type.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.typeIcon,
                    { backgroundColor: type.color + "20" },
                  ]}
                >
                  <Ionicons name={type.icon} size={28} color={type.color} />
                </View>
                <Text style={styles.typeTitle}>{type.title}</Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
                {selectedType === type.id && (
                  <View style={styles.checkmark}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={PRIMARY}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin của bạn</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ tên của bạn"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#999" />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nội dung (tùy chọn)</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Mô tả chi tiết yêu cầu của bạn..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitText}>Gửi yêu cầu</Text>
                <Ionicons name="send" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liên hệ trực tiếp</Text>

          <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
            <View
              style={[styles.contactIcon, { backgroundColor: "#ef444420" }]}
            >
              <Ionicons name="call" size={24} color="#ef4444" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Hotline 24/7</Text>
              <Text style={styles.contactValue}>1900 xxxx</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
            <View
              style={[styles.contactIcon, { backgroundColor: "#10b98120" }]}
            >
              <Ionicons name="mail" size={24} color="#10b981" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@healthycheck.vn</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} activeOpacity={0.7}>
            <View
              style={[styles.contactIcon, { backgroundColor: "#667eea20" }]}
            >
              <Ionicons name="location" size={24} color="#667eea" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Địa chỉ</Text>
              <Text style={styles.contactValue}>
                123 Nguyễn Huệ, Q.1, TP.HCM
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#fff",
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  typeCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  typeCardActive: {
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.15,
  },
  typeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
    textAlign: "center",
  },
  typeDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    marginLeft: 12,
    padding: 0,
  },
  textAreaWrapper: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  textArea: {
    height: 100,
    marginLeft: 0,
    width: "100%",
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});

export default ContactScreen;
