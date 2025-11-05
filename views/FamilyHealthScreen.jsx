import React, { useState, useEffect, useCallback } from "react";
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
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RefreshableScrollView from "../components/RefreshableScrollView";
import config from "../config";
import { LinearGradient } from "expo-linear-gradient";

const PRIMARY = "#6366f1";
const SECONDARY = "#8b5cf6";
const ACCENT = "#06b6d4";
const SUCCESS = "#10b981";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";
const BACKGROUND = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#1f2937";
const TEXT_SECONDARY = "#6b7280";
const TEXT_MUTED = "#9ca3af";

const FamilyHealthScreen = () => {
  // Default app logo (used as in-app default avatar when user hasn't set one)
  const DEFAULT_APP_LOGO =
    "https://res.cloudinary.com/dpujkjzzh/image/upload/v1762276814/default-logo-profile_zqmx4o.jpg";

  const [familyMembers, setFamilyMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedRelation, setSelectedRelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [addingMember, setAddingMember] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);
  const [defaultLogoProfile, setDefaultLogoProfile] = useState(null);
  const [isOwner, setIsOwner] = useState(false); // Thêm state để track quyền chủ hộ
  const [newMember, setNewMember] = useState({
    phone: "",
    relation: "",
  });

  const relations = [
    "Vợ",
    "Chồng",
    "Con trai",
    "Con gái",
    "Cha",
    "Mẹ",
    "Anh",
    "Chị",
    "Em trai",
    "Em gái",
    "Khác",
  ];

  // Check if current user is household owner
  const checkOwnerPermission = async () => {
    try {
      // Use same token logic as loadFamilyMembers
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      let token = null;
      for (const k of tokenKeys) {
        const t = await AsyncStorage.getItem(k);
        if (t) {
          token = t;
          break;
        }
      }

      if (!token) {
        const accStr = await AsyncStorage.getItem("account");
        if (accStr) {
          try {
            const acc = JSON.parse(accStr);
            token = acc?.token || acc?.accessToken || token;
          } catch (e) {
            console.warn("Failed to parse account for token", e);
          }
        }
      }

      if (!token) {
        console.warn("No auth token found for owner permission check");
        return false;
      }

      const response = await fetch(
        `${config.API_BASE}/family-members/is-owner`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.isOwner; // Extract isOwner from response object
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Fetch default app logo
  useEffect(() => {
    const fetchAppLogo = async () => {
      try {
        const API_BASE = config.API_BASE;
        const response = await fetch(
          `${API_BASE}/app-settings/default_app_logo`
        );
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const logoUrl = data?.default_app_logo?.value;
        setDefaultLogoProfile(logoUrl);
      } catch (error) {
        console.error("Lỗi khi lấy app logo:", error);
        // Fallback to hardcoded default if API fails
        setDefaultLogoProfile(DEFAULT_APP_LOGO);
      }
    };

    fetchAppLogo();
  }, []);

  // Load family members from API
  const loadFamilyMembers = useCallback(async () => {
    try {
      setLoading(true);

      // Check owner permission first
      const ownerStatus = await checkOwnerPermission();
      setIsOwner(ownerStatus);

      const API_BASE = config.API_BASE;

      // Get token from AsyncStorage
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      let token = null;
      for (const k of tokenKeys) {
        const t = await AsyncStorage.getItem(k);
        if (t) {
          token = t;
          break;
        }
      }

      if (!token) {
        const accStr = await AsyncStorage.getItem("account");
        if (accStr) {
          try {
            const acc = JSON.parse(accStr);
            token = acc?.token || acc?.accessToken || token;
          } catch (e) {
            console.warn("Failed to parse account for token", e);
          }
        }
      }

      if (!token) {
        console.warn("No auth token found for family members fetch");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/family-members/list`, {
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

      // Transform API data to match UI structure
      const transformedMembers = data.map((item) => ({
        id: item.id, // relation ID
        memberId: item.member.id, // member ID for deletion
        name: item.member.fullName || "Chưa có tên",
        relation: item.relation,
        age: calculateAge(item.member.birth),
        avatar: item.member.gender ? "👨" : "👩",
        avatarUrl:
          item.member.urlImage || defaultLogoProfile || DEFAULT_APP_LOGO,
        lastCheck: "Chưa có dữ liệu",
        healthStatus: "Bình thường",
        email: item.member.email,
        phone: item.member.phone,
        birth: item.member.birth,
        gender: item.member.gender,
        healthInfo: item.member.healthInfo,
      }));

      setFamilyMembers(transformedMembers);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách thành viên gia đình");
      setFamilyMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate age from birth date
  const calculateAge = (birthDate) => {
    if (!birthDate) return "N/A";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Filter family members based on search keyword and relation
  const filterMembers = useCallback(() => {
    let filtered = familyMembers;

    // Filter by search keyword (name, phone, email)
    if (searchKeyword.trim()) {
      filtered = filtered.filter(
        (member) =>
          member.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          member.phone?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          member.email?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          member.relation.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    // Filter by relation
    if (selectedRelation) {
      filtered = filtered.filter(
        (member) => member.relation === selectedRelation
      );
    }

    setFilteredMembers(filtered);
  }, [familyMembers, searchKeyword, selectedRelation]);

  // Update filtered members when family members or filters change
  useEffect(() => {
    filterMembers();
  }, [filterMembers]);

  // Clear all filters
  const clearFilters = () => {
    setSearchKeyword("");
    setSelectedRelation("");
  };

  // Load data on component mount
  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  // Add family member by phone API
  const addMemberByPhone = async () => {
    if (!newMember.phone || !newMember.relation) {
      Alert.alert("Thông báo", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(newMember.phone)) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ (10-11 chữ số)");
      return;
    }

    try {
      setAddingMember(true);
      const API_BASE = config.API_BASE;

      // Get token from AsyncStorage
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      let token = null;
      for (const k of tokenKeys) {
        const t = await AsyncStorage.getItem(k);
        if (t) {
          token = t;
          break;
        }
      }

      if (!token) {
        const accStr = await AsyncStorage.getItem("account");
        if (accStr) {
          try {
            const acc = JSON.parse(accStr);
            token = acc?.token || acc?.accessToken || token;
          } catch (e) {
            console.warn("Failed to parse account for token", e);
          }
        }
      }

      if (!token) {
        Alert.alert(
          "Lỗi",
          "Không tìm thấy token xác thực. Vui lòng đăng nhập lại."
        );
        setAddingMember(false);
        return;
      }

      const response = await fetch(`${API_BASE}/family-members/add-by-phone`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: newMember.phone,
          relation: newMember.relation,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Không thể thêm thành viên gia đình";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Use default error message if JSON parsing fails
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Reset form and close modal
      setNewMember({ phone: "", relation: "" });
      setModalVisible(false);

      // Reload family members list to show the new member
      await loadFamilyMembers();

      Alert.alert(
        "Thành công",
        result.message || "Thêm thành viên gia đình thành công"
      );
    } catch (error) {
      Alert.alert("Lỗi", error.message || "Không thể thêm thành viên gia đình");
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddMember = async () => {
    await addMemberByPhone();
  };

  // Delete family member by ID API
  const deleteMemberById = async (memberId) => {
    try {
      setDeletingMember(memberId);
      const API_BASE = config.API_BASE;

      // Get token from AsyncStorage
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      let token = null;
      for (const k of tokenKeys) {
        const t = await AsyncStorage.getItem(k);
        if (t) {
          token = t;
          break;
        }
      }

      if (!token) {
        const accStr = await AsyncStorage.getItem("account");
        if (accStr) {
          try {
            const acc = JSON.parse(accStr);
            token = acc?.token || acc?.accessToken || token;
          } catch (e) {
            console.warn("Failed to parse account for token", e);
          }
        }
      }

      if (!token) {
        Alert.alert(
          "Lỗi",
          "Không tìm thấy token xác thực. Vui lòng đăng nhập lại."
        );
        setDeletingMember(null);
        return;
      }

      const response = await fetch(`${API_BASE}/family-members/${memberId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Không thể xóa thành viên gia đình";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Use default error message if JSON parsing fails
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Reload family members list to reflect the deletion
      await loadFamilyMembers();

      Alert.alert(
        "Thành công",
        result.message || "Xóa thành viên gia đình thành công"
      );
    } catch (error) {
      Alert.alert("Lỗi", error.message || "Không thể xóa thành viên gia đình");
    } finally {
      setDeletingMember(null);
    }
  };

  const handleDeleteMember = (memberId) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa thành viên này?", [
      { text: "Hủy", onPress: () => {} },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await deleteMemberById(memberId);
        },
      },
    ]);
  };

  const renderMemberCard = ({ item }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => setSelectedMember(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={["#ffffff", "#f8fafc"]}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image
                source={{ uri: item.avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatar}>{item.avatar}</Text>
            )}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberRelation}>{item.relation}</Text>
          </View>
          {isOwner && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteMember(item.memberId)}
              disabled={deletingMember === item.memberId}
              activeOpacity={0.7}
            >
              {deletingMember === item.memberId ? (
                <ActivityIndicator size="small" color={DANGER} />
              ) : (
                <Ionicons name="trash-outline" size={18} color={DANGER} />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={TEXT_SECONDARY}
              />
              <Text style={styles.infoLabel}>Tuổi:</Text>
            </View>
            <Text style={styles.infoValue}>{item.age} tuổi</Text>
          </View>
          {item.phone && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons
                  name="call-outline"
                  size={14}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.infoLabel}>Điện thoại:</Text>
              </View>
              <Text style={styles.infoValue}>{item.phone}</Text>
            </View>
          )}
          {item.healthInfo && (
            <>
              {item.healthInfo.height && (
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="resize-outline"
                      size={14}
                      color={TEXT_SECONDARY}
                    />
                    <Text style={styles.infoLabel}>Chiều cao:</Text>
                  </View>
                  <Text style={styles.infoValue}>
                    {item.healthInfo.height} cm
                  </Text>
                </View>
              )}
              {item.healthInfo.weight && (
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="barbell-outline"
                      size={14}
                      color={TEXT_SECONDARY}
                    />
                    <Text style={styles.infoLabel}>Cân nặng:</Text>
                  </View>
                  <Text style={styles.infoValue}>
                    {item.healthInfo.weight} kg
                  </Text>
                </View>
              )}
              {item.healthInfo.bloodType &&
                item.healthInfo.bloodType !== "Unknown" && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Ionicons
                        name="water-outline"
                        size={14}
                        color={TEXT_SECONDARY}
                      />
                      <Text style={styles.infoLabel}>Nhóm máu:</Text>
                    </View>
                    <Text style={styles.infoValue}>
                      {item.healthInfo.bloodType}
                    </Text>
                  </View>
                )}
            </>
          )}
          <View
            style={[
              styles.statusBadge,
              item.healthStatus === "Bình thường"
                ? styles.statusNormal
                : styles.statusWarning,
            ]}
          >
            <Ionicons
              name={
                item.healthStatus === "Bình thường"
                  ? "checkmark-circle"
                  : "warning"
              }
              size={12}
              color={item.healthStatus === "Bình thường" ? SUCCESS : WARNING}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    item.healthStatus === "Bình thường" ? SUCCESS : WARNING,
                },
              ]}
            >
              {item.healthStatus}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[PRIMARY, SECONDARY]} style={styles.header}>
        <Text style={styles.headerTitle}>Sức khỏe gia đình</Text>
        {isOwner && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <RefreshableScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadFamilyMembers}
      >
        {/* Search and Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={TEXT_MUTED}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo tên, số điện thoại..."
              placeholderTextColor={TEXT_MUTED}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchKeyword ? (
              <TouchableOpacity
                onPress={() => setSearchKeyword("")}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filterRow}>
            <View style={styles.relationFilter}>
              <Text style={styles.filterLabel}>Quan hệ:</Text>
              <View style={styles.relationButtons}>
                <TouchableOpacity
                  style={[
                    styles.relationBtn,
                    !selectedRelation && styles.relationBtnActive,
                  ]}
                  onPress={() => setSelectedRelation("")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.relationBtnText,
                      !selectedRelation && styles.relationBtnTextActive,
                    ]}
                  >
                    Tất cả
                  </Text>
                </TouchableOpacity>
                {relations.slice(0, 4).map((relation) => (
                  <TouchableOpacity
                    key={relation}
                    style={[
                      styles.relationBtn,
                      selectedRelation === relation && styles.relationBtnActive,
                    ]}
                    onPress={() =>
                      setSelectedRelation(
                        selectedRelation === relation ? "" : relation
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.relationBtnText,
                        selectedRelation === relation &&
                          styles.relationBtnTextActive,
                      ]}
                    >
                      {relation}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(searchKeyword || selectedRelation) && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={PRIMARY} />
                <Text style={styles.clearBtnText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.resultCount}>
            <Text style={styles.resultText}>
              {filteredMembers.length} / {familyMembers.length} thành viên
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <LinearGradient colors={[PRIMARY, SECONDARY]} style={styles.statCard}>
            <Ionicons
              name="people"
              size={20}
              color="#fff"
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>{filteredMembers.length}</Text>
            <Text style={styles.statLabel}>Hiển thị</Text>
          </LinearGradient>
          <LinearGradient colors={[SUCCESS, "#059669"]} style={styles.statCard}>
            <Ionicons
              name="heart"
              size={20}
              color="#fff"
              style={styles.statIcon}
            />
            <Text style={styles.statNumber}>
              {
                filteredMembers.filter((m) => m.healthStatus === "Bình thường")
                  .length
              }
            </Text>
            <Text style={styles.statLabel}>Bình thường</Text>
          </LinearGradient>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Đang tải danh sách...</Text>
          </View>
        ) : filteredMembers.length > 0 ? (
          <FlatList
            data={filteredMembers}
            renderItem={renderMemberCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.list}
          />
        ) : familyMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={["#f3f4f6", "#e5e7eb"]}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="people-outline" size={48} color={TEXT_MUTED} />
            </LinearGradient>
            <Text style={styles.emptyText}>
              Chưa có thành viên gia đình nào
            </Text>
            <Text style={styles.emptySubText}>
              {isOwner
                ? "Nhấn nút + để thêm thành viên mới"
                : "Chỉ chủ hộ mới có thể thêm thành viên"}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={["#f3f4f6", "#e5e7eb"]}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="search-outline" size={48} color={TEXT_MUTED} />
            </LinearGradient>
            <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
            <Text style={styles.emptySubText}>
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
            </Text>
          </View>
        )}
      </RefreshableScrollView>

      {/* Modal Thêm Thành Viên */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[PRIMARY, SECONDARY]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                Thêm thành viên qua số điện thoại
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  <Ionicons name="call-outline" size={16} color={PRIMARY} /> Số
                  điện thoại *
                </Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập số điện thoại (ví dụ: 0984987554)"
                    value={newMember.phone}
                    onChangeText={(text) =>
                      setNewMember({ ...newMember, phone: text })
                    }
                    keyboardType="phone-pad"
                    placeholderTextColor={TEXT_MUTED}
                    maxLength={11}
                  />
                </View>
                <Text style={styles.helpText}>
                  Số điện thoại của người đã có tài khoản trong hệ thống
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  <Ionicons name="people-outline" size={16} color={PRIMARY} />{" "}
                  Quan hệ với bạn *
                </Text>
                <View style={styles.relationGrid}>
                  {relations.map((relation) => (
                    <TouchableOpacity
                      key={relation}
                      style={[
                        styles.relationBtnModal,
                        newMember.relation === relation &&
                          styles.relationBtnModalActive,
                      ]}
                      onPress={() => setNewMember({ ...newMember, relation })}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.relationTextModal,
                          newMember.relation === relation &&
                            styles.relationTextModalActive,
                        ]}
                      >
                        {relation}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={addingMember}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <LinearGradient
                colors={[PRIMARY, SECONDARY]}
                style={[
                  styles.submitBtn,
                  addingMember && styles.submitBtnDisabled,
                ]}
              >
                <TouchableOpacity
                  style={styles.submitBtnInner}
                  onPress={handleAddMember}
                  disabled={addingMember}
                  activeOpacity={0.8}
                >
                  {addingMember ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>Thêm thành viên</Text>
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>
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
            <LinearGradient
              colors={[PRIMARY, SECONDARY]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Chi tiết thành viên</Text>
              <TouchableOpacity
                onPress={() => setSelectedMember(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {selectedMember && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailAvatarContainer}>
                    {selectedMember.avatarUrl ? (
                      <Image
                        source={{ uri: selectedMember.avatarUrl }}
                        style={styles.detailAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={["#e5e7eb", "#f3f4f6"]}
                        style={styles.detailAvatarGradient}
                      >
                        <Text style={styles.detailAvatar}>
                          {selectedMember.avatar}
                        </Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.detailHeaderInfo}>
                    <Text style={styles.detailName}>{selectedMember.name}</Text>
                    <View style={styles.detailRelationContainer}>
                      <Ionicons name="people" size={14} color={PRIMARY} />
                      <Text style={styles.detailRelation}>
                        {selectedMember.relation}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={PRIMARY}
                    />
                    <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                  </View>
                  <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelContainer}>
                        <Ionicons
                          name="calendar"
                          size={14}
                          color={TEXT_SECONDARY}
                        />
                        <Text style={styles.detailLabel}>Tuổi:</Text>
                      </View>
                      <Text style={styles.detailValue}>
                        {selectedMember.age} tuổi
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelContainer}>
                        <Ionicons
                          name="people"
                          size={14}
                          color={TEXT_SECONDARY}
                        />
                        <Text style={styles.detailLabel}>Quan hệ:</Text>
                      </View>
                      <Text style={styles.detailValue}>
                        {selectedMember.relation}
                      </Text>
                    </View>
                    {selectedMember.email && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLabelContainer}>
                          <Ionicons
                            name="mail"
                            size={14}
                            color={TEXT_SECONDARY}
                          />
                          <Text style={styles.detailLabel}>Email:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {selectedMember.email}
                        </Text>
                      </View>
                    )}
                    {selectedMember.phone && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLabelContainer}>
                          <Ionicons
                            name="call"
                            size={14}
                            color={TEXT_SECONDARY}
                          />
                          <Text style={styles.detailLabel}>Điện thoại:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {selectedMember.phone}
                        </Text>
                      </View>
                    )}
                    {selectedMember.birth && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLabelContainer}>
                          <Ionicons
                            name="gift"
                            size={14}
                            color={TEXT_SECONDARY}
                          />
                          <Text style={styles.detailLabel}>Ngày sinh:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {new Date(selectedMember.birth).toLocaleDateString(
                            "vi-VN"
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {selectedMember.healthInfo && (
                  <View style={styles.detailSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="fitness" size={20} color={SUCCESS} />
                      <Text style={styles.sectionTitle}>
                        Thông tin sức khỏe
                      </Text>
                    </View>
                    <View style={styles.detailCard}>
                      {selectedMember.healthInfo.height && (
                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelContainer}>
                            <Ionicons
                              name="resize"
                              size={14}
                              color={TEXT_SECONDARY}
                            />
                            <Text style={styles.detailLabel}>Chiều cao:</Text>
                          </View>
                          <Text style={styles.detailValue}>
                            {selectedMember.healthInfo.height} cm
                          </Text>
                        </View>
                      )}
                      {selectedMember.healthInfo.weight && (
                        <View style={styles.detailRow}>
                          <View style={styles.detailLabelContainer}>
                            <Ionicons
                              name="barbell"
                              size={14}
                              color={TEXT_SECONDARY}
                            />
                            <Text style={styles.detailLabel}>Cân nặng:</Text>
                          </View>
                          <Text style={styles.detailValue}>
                            {selectedMember.healthInfo.weight} kg
                          </Text>
                        </View>
                      )}
                      {selectedMember.healthInfo.bloodType &&
                        selectedMember.healthInfo.bloodType !== "Unknown" && (
                          <View style={styles.detailRow}>
                            <View style={styles.detailLabelContainer}>
                              <Ionicons
                                name="water"
                                size={14}
                                color={TEXT_SECONDARY}
                              />
                              <Text style={styles.detailLabel}>Nhóm máu:</Text>
                            </View>
                            <Text style={styles.detailValue}>
                              {selectedMember.healthInfo.bloodType}
                            </Text>
                          </View>
                        )}
                    </View>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="heart" size={20} color={DANGER} />
                    <Text style={styles.sectionTitle}>Tình trạng sức khỏe</Text>
                  </View>
                  <View style={styles.detailCard}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelContainer}>
                        <Ionicons
                          name={
                            selectedMember.healthStatus === "Bình thường"
                              ? "checkmark-circle"
                              : "warning"
                          }
                          size={14}
                          color={
                            selectedMember.healthStatus === "Bình thường"
                              ? SUCCESS
                              : WARNING
                          }
                        />
                        <Text style={styles.detailLabel}>Trạng thái:</Text>
                      </View>
                      <Text
                        style={[
                          styles.detailValue,
                          selectedMember.healthStatus === "Bình thường"
                            ? { color: SUCCESS }
                            : { color: WARNING },
                        ]}
                      >
                        {selectedMember.healthStatus}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailLabelContainer}>
                        <Ionicons
                          name="time"
                          size={14}
                          color={TEXT_SECONDARY}
                        />
                        <Text style={styles.detailLabel}>
                          Kiểm tra lần cuối:
                        </Text>
                      </View>
                      <Text style={styles.detailValue}>
                        {selectedMember.lastCheck}
                      </Text>
                    </View>
                  </View>
                </View>

                <LinearGradient
                  colors={[DANGER, "#dc2626"]}
                  style={styles.checkBtn}
                >
                  <TouchableOpacity
                    style={styles.checkBtnInner}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="heart" size={20} color="#fff" />
                    <Text style={styles.checkBtnText}>
                      Kiểm tra sức khỏe ngay
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  list: {
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginTop: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  memberCard: {
    marginBottom: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  cardGradient: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatar: {
    fontSize: 28,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  memberRelation: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: "500",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  deleteBtn: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  cardBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(248, 250, 252, 0.6)",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
    marginLeft: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  statusNormal: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  statusWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  viewBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: PRIMARY,
    marginRight: 8,
  },

  // Filter styles
  filterSection: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: "500",
  },
  filterRow: {
    marginBottom: 12,
  },
  relationFilter: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  relationButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  relationBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  relationBtnActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  relationBtnText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: "600",
  },
  relationBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 13,
    color: PRIMARY,
    marginLeft: 6,
    fontWeight: "600",
  },
  resultCount: {
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  resultText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontStyle: "italic",
    fontWeight: "500",
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: "500",
  },
  helpText: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 8,
    fontStyle: "italic",
    lineHeight: 18,
  },
  relationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  relationBtnModal: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minWidth: "30%",
    alignItems: "center",
  },
  relationBtnModalActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  relationTextModal: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "600",
  },
  relationTextModalActive: {
    color: "#fff",
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_SECONDARY,
  },
  submitBtn: {
    flex: 1,
    borderRadius: 12,
  },
  submitBtnInner: {
    flexDirection: "row",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 6,
  },

  // Detail modal styles
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  detailAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    overflow: "hidden",
  },
  detailAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  detailAvatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  detailAvatar: {
    fontSize: 40,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  detailRelationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailRelation: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "600",
    marginLeft: 6,
  },
  detailSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginLeft: 8,
  },
  detailCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  detailLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  checkBtn: {
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkBtnInner: {
    flexDirection: "row",
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  checkBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 8,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: TEXT_SECONDARY,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

export default FamilyHealthScreen;
