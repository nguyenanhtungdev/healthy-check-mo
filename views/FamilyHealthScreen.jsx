import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#667eea";

const FamilyHealthScreen = () => {
  const [familyMembers, setFamilyMembers] = useState([
    {
      id: "1",
      name: "Nguyễn Văn A",
      relation: "Chính mình",
      age: 28,
      avatar: "👨",
      lastCheck: "Hôm nay",
      healthStatus: "Bình thường",
    },
    {
      id: "2",
      name: "Nguyễn Thị B",
      relation: "Vợ/Chồng",
      age: 26,
      avatar: "👩",
      lastCheck: "2 ngày trước",
      healthStatus: "Bình thường",
    },
    {
      id: "3",
      name: "Nguyễn Văn C",
      relation: "Con",
      age: 5,
      avatar: "👦",
      lastCheck: "1 tuần trước",
      healthStatus: "Bình thường",
    },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMember, setNewMember] = useState({
    name: "",
    relation: "",
    age: "",
  });

  const relations = [
    "Chính mình",
    "Vợ/Chồng",
    "Con",
    "Cha",
    "Mẹ",
    "Anh/Chị",
    "Em",
    "Khác",
  ];

  const handleAddMember = () => {
    if (!newMember.name || !newMember.relation || !newMember.age) {
      Alert.alert("Thông báo", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    const newId = String(familyMembers.length + 1);
    const avatars = ["👨", "👩", "👦", "👧"];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    setFamilyMembers([
      ...familyMembers,
      {
        id: newId,
        name: newMember.name,
        relation: newMember.relation,
        age: parseInt(newMember.age),
        avatar: randomAvatar,
        lastCheck: "Chưa kiểm tra",
        healthStatus: "Chưa có dữ liệu",
      },
    ]);

    setNewMember({ name: "", relation: "", age: "" });
    setModalVisible(false);
    Alert.alert("Thành công", "Thêm thành viên gia đình thành công");
  };

  const handleDeleteMember = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa thành viên này?", [
      { text: "Hủy", onPress: () => {} },
      {
        text: "Xóa",
        onPress: () => {
          setFamilyMembers(familyMembers.filter((m) => m.id !== id));
        },
      },
    ]);
  };

  const renderMemberCard = ({ item }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => setSelectedMember(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.avatar}>{item.avatar}</Text>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberRelation}>{item.relation}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteMember(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tuổi:</Text>
          <Text style={styles.infoValue}>{item.age} tuổi</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kiểm tra:</Text>
          <Text style={styles.infoValue}>{item.lastCheck}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.healthStatus === "Bình thường"
              ? styles.statusNormal
              : styles.statusWarning,
          ]}
        >
          <Text style={styles.statusText}>{item.healthStatus}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.viewBtn}>
        <Text style={styles.viewBtnText}>Xem chi tiết</Text>
        <Ionicons name="arrow-forward" size={16} color={PRIMARY} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sức khỏe gia đình</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{familyMembers.length}</Text>
            <Text style={styles.statLabel}>Thành viên</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {
                familyMembers.filter((m) => m.healthStatus === "Bình thường")
                  .length
              }
            </Text>
            <Text style={styles.statLabel}>Bình thường</Text>
          </View>
        </View>

        <FlatList
          data={familyMembers}
          renderItem={renderMemberCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          style={styles.list}
        />
      </ScrollView>

      {/* Modal Thêm Thành Viên */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm thành viên gia đình</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên thành viên *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên"
                  value={newMember.name}
                  onChangeText={(text) =>
                    setNewMember({ ...newMember, name: text })
                  }
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Quan hệ *</Text>
                <View style={styles.relationGrid}>
                  {relations.map((relation) => (
                    <TouchableOpacity
                      key={relation}
                      style={[
                        styles.relationBtn,
                        newMember.relation === relation &&
                          styles.relationBtnActive,
                      ]}
                      onPress={() => setNewMember({ ...newMember, relation })}
                    >
                      <Text
                        style={[
                          styles.relationText,
                          newMember.relation === relation &&
                            styles.relationTextActive,
                        ]}
                      >
                        {relation}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tuổi *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tuổi"
                  value={newMember.age}
                  onChangeText={(text) =>
                    setNewMember({ ...newMember, age: text })
                  }
                  keyboardType="number-pad"
                  placeholderTextColor="#ccc"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddMember}
              >
                <Text style={styles.submitBtnText}>Thêm thành viên</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Chi Tiết Thành Viên */}
      <Modal
        visible={selectedMember !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết thành viên</Text>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailAvatar}>
                    {selectedMember.avatar}
                  </Text>
                  <View>
                    <Text style={styles.detailName}>{selectedMember.name}</Text>
                    <Text style={styles.detailRelation}>
                      {selectedMember.relation}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tuổi:</Text>
                    <Text style={styles.detailValue}>{selectedMember.age}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quan hệ:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMember.relation}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Tình trạng sức khỏe</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trạng thái:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        selectedMember.healthStatus === "Bình thường"
                          ? { color: "#10b981" }
                          : { color: "#f59e0b" },
                      ]}
                    >
                      {selectedMember.healthStatus}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kiểm tra lần cuối:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMember.lastCheck}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.checkBtn}>
                  <Ionicons name="heart" size={20} color="#fff" />
                  <Text style={styles.checkBtnText}>
                    Kiểm tra sức khỏe ngay
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedMember(null)}
              >
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  list: {
    marginBottom: 20,
  },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  avatar: {
    fontSize: 40,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  memberRelation: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusNormal: {
    backgroundColor: "#d1fae5",
  },
  statusWarning: {
    backgroundColor: "#fef3c7",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    marginRight: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
  },
  relationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  relationBtn: {
    width: "50%",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  relationBtnInner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  relationBtnActive: {
    backgroundColor: PRIMARY,
  },
  relationText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  relationTextActive: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    marginRight: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  detailAvatar: {
    fontSize: 50,
    marginRight: 16,
  },
  detailName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  detailRelation: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  detailSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  detailLabel: {
    fontSize: 13,
    color: "#666",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  checkBtn: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  checkBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default FamilyHealthScreen;
