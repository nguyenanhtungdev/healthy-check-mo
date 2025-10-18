import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Image,
  Alert,
} from "react-native";
import RefreshableScrollView from "../components/RefreshableScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import config from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure Cloudinary - set UPLOAD_PRESET if you have an unsigned preset.
const CLOUDINARY_CLOUD_NAME = "dpujkjzzh"; // provided
const CLOUDINARY_UPLOAD_PRESET = "healthy-check-image"; // <-- set your unsigned upload preset string here
// Set to true only if you want the client to ask the backend to delete the old image BEFORE uploading a new one.
// Recommended: keep false and let the server delete the old image AFTER a successful upload to avoid data loss
const DELETE_OLD_BEFORE_UPLOAD = false;

const ProfileScreen = ({ navigation, onLogout, accountId }) => {
  // Default app logo (used as in-app default avatar when user hasn't set one)
  const DEFAULT_APP_LOGO =
    "https://res.cloudinary.com/dpujkjzzh/image/upload/v1760814010/logo-app_wopmor.png";
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [account, setAccount] = useState(null);
  const [localAccountId, setLocalAccountId] = useState(accountId || null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birth: null,
    address: "",
    height: "",
    weight: "",
    bloodType: "",
    gender: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  // navigation is provided by the navigator; use it to push help/terms/about/privacy
  // (ProfileScreen is used inside a Tab navigator which is nested in a root stack)

  const pickAndUploadImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "Quyền truy cập ảnh bị từ chối",
          "Vui lòng cho phép ứng dụng truy cập ảnh trong Cài đặt để đổi ảnh đại diện."
        );
        return;
      }

      const pickerOptions = { allowsEditing: true, quality: 0.8 };
      if (
        ImagePicker &&
        ImagePicker.MediaType &&
        ImagePicker.MediaType.Images
      ) {
        pickerOptions.mediaTypes = ImagePicker.MediaType.Images;
      } else if (
        ImagePicker &&
        ImagePicker.MediaTypeOptions &&
        ImagePicker.MediaTypeOptions.Images
      ) {
        pickerOptions.mediaTypes = ImagePicker.MediaTypeOptions.Images;
      }

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      const wasCancelled =
        result.canceled === true || result.cancelled === true;
      if (wasCancelled) return;
      const localUri =
        (result.assets && result.assets[0] && result.assets[0].uri) ||
        result.uri;
      if (!localUri) return;

      if (!CLOUDINARY_UPLOAD_PRESET) {
        Alert.alert(
          "Thiếu cấu hình Cloudinary",
          "Vui lòng set `CLOUDINARY_UPLOAD_PRESET` trong code để dùng upload trực tiếp, hoặc cung cấp server-side upload."
        );
        return;
      }
      const idToUse = accountId || localAccountId;

      if (!idToUse) {
        Alert.alert("Lỗi", "Không tìm thấy accountId. Vui lòng đăng nhập lại.");
        return;
      }

      const existingUrl = avatarUrl || (account && account.image) || null;
      const oldPublicId = existingUrl
        ? extractCloudinaryPublicIdFromUrl(existingUrl)
        : null;

      setUploading(true);
      let uploadedResp;
      try {
        uploadedResp = await uploadToCloudinaryAsync(localUri);
      } catch (e) {
        Alert.alert("Lỗi tải ảnh", e.message || String(e));
        setUploading(false);
        return;
      }

      const uploadedUrl =
        (uploadedResp && (uploadedResp.secure_url || uploadedResp.url)) || null;
      const newPublicId = uploadedResp && uploadedResp.public_id;

      try {
        const API_BASE = config.API_BASE;
        const backendUrl = `${API_BASE}/file-update/${idToUse}/update-avatar`;
        const payload = { imageUrl: uploadedUrl };
        if (oldPublicId) payload.oldPublicId = oldPublicId;
        if (newPublicId) payload.newPublicId = newPublicId;

        const r = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`Server error: ${r.status} ${text}`);
        }
        const json = await r.json();
        const finalUrl = json.image || uploadedUrl;
        setAvatarUrl(finalUrl);
        try {
          const accStr = await AsyncStorage.getItem("account");
          if (accStr) {
            const acc = JSON.parse(accStr);
            acc.image = finalUrl;
            await AsyncStorage.setItem("account", JSON.stringify(acc));
            setAccount(acc);
            setLocalAccountId(acc.accountId || idToUse);
          }
        } catch (e) {
          console.warn("Failed to update stored account avatar", e);
        }
        Alert.alert(json.message || "Cập nhật avatar thành công");
      } catch (e) {
        Alert.alert("Lỗi cập nhật avatar", e.message || String(e));
      } finally {
        setUploading(false);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", err.message || String(err));
      setUploading(false);
    }
  };
  // Load stored account (if any) and set avatar/localAccountId
  React.useEffect(() => {
    (async () => {
      try {
        const accStr = await AsyncStorage.getItem("account");
        if (accStr) {
          const acc = JSON.parse(accStr);
          setAccount(acc);
          setAvatarUrl(acc.image || null);
          setLocalAccountId(acc.accountId || accountId || null);
        } else if (accountId) {
          setLocalAccountId(accountId);
        }
      } catch (e) {
        console.warn("Failed to read account from storage", e);
      }
    })();
  }, [accountId]);

  const reloadProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
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
            console.warn(
              "Stored 'account' is not valid JSON, clearing corrupt storage",
              e
            );
            try {
              await AsyncStorage.removeItem("account");
            } catch (ee) {
              console.warn("Failed to remove corrupt account from storage", ee);
            }
          }
        }
      }
      if (!token) {
        console.warn(
          "No auth token found in AsyncStorage; skipping profile fetch."
        );
        setLoadingProfile(false);
        return;
      }

      const API_BASE = config.API_BASE;
      const backendUrl = `${API_BASE}/accounts/get-account`;
      let idToSend = localAccountId || accountId || null;
      if (!idToSend) {
        const accStr2 = await AsyncStorage.getItem("account");
        if (accStr2) {
          try {
            const acc2 = JSON.parse(accStr2);
            idToSend = acc2?.id || acc2?.accountId || idToSend;
          } catch (e) {}
        }
      }
      const body = JSON.stringify({ id: idToSend });

      const res = await fetch(backendUrl, {
        method: "POST",
        headers: Object.assign(
          { Authorization: `Bearer ${token}` },
          body ? { "Content-Type": "application/json" } : {}
        ),
        body,
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn("Failed to fetch profile:", res.status, text);
        setLoadingProfile(false);
        return;
      }
      let json;
      try {
        json = await res.json();
      } catch (parseErr) {
        const raw = await res.text().catch(() => null);
        console.warn("Failed to parse profile JSON response", parseErr, raw);
        try {
          await AsyncStorage.removeItem("account");
        } catch (ee) {
          console.warn("Failed to clear corrupt account after parse error", ee);
        }
        setLoadingProfile(false);
        return;
      }

      // if backend didn't return an image URL, fall back to previously stored account image
      let storedAcc = null;
      try {
        const accStrBackup = await AsyncStorage.getItem("account");
        if (accStrBackup) storedAcc = JSON.parse(accStrBackup);
      } catch (e) {
        /* ignore parse errors */
      }

      const finalimage =
        json.image ||
        json.avatarUrl ||
        (storedAcc && (storedAcc.image || storedAcc.avatarUrl)) ||
        DEFAULT_APP_LOGO;
      if (
        !json.image &&
        finalimage &&
        storedAcc &&
        (storedAcc.image || storedAcc.avatarUrl)
      ) {
        // if server didn't include image but we had one locally, preserve it in the object we'll store/use
        json.image = finalimage;
      }

      setAccount(json);
      setAvatarUrl(finalimage);
      setLocalAccountId(json.accountId || localAccountId);
      setForm({
        fullName: json.fullName || json.name || "",
        email: json.email || "",
        phone: json.phone || json.mobile || "",
        birth: json.birth || "",
        address: json.address || "",
        height: json.height ? String(json.height) : "",
        weight: json.weight ? String(json.weight) : "",
        bloodType: json.bloodType || json.blood || "",
        gender: json.gender,
      });
      try {
        await AsyncStorage.setItem("account", JSON.stringify(json));
      } catch (e) {}
      setLoadingProfile(false);
    } catch (e) {
      console.warn("Error loading profile", e);
      setLoadingProfile(false);
    }
  }, [accountId, localAccountId]);

  React.useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  const updateProfile = async () => {
    setIsSaving(true);
    // Build payload matching server contract
    const payload = {
      userId: localAccountId || account?.id || account?.accountId || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      birth: form.birth || null,
      height: form.height ? parseFloat(String(form.height)) : null,
      weight: form.weight ? parseFloat(String(form.weight)) : null,
      bloodType: form.bloodType || null,
      image:
        avatarUrl || (account && (account.image || account.avatarUrl)) || null,
      fullName: form.fullName || null,
      gender: form.gender || null,
    };

    // Optimistically update local state/storage
    const updatedLocal = Object.assign({}, account || {}, {
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      birth: payload.birth,
      height: payload.height,
      weight: payload.weight,
      bloodType: payload.bloodType,
      image: payload.image,
    });
    setAccount(updatedLocal);
    try {
      await AsyncStorage.setItem("account", JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn("Failed to persist updated account locally", e);
    }

    try {
      // Resolve token from common locations
      let token = await AsyncStorage.getItem("token");
      if (!token) {
        const accStr = await AsyncStorage.getItem("account");
        if (accStr) {
          try {
            const acc = JSON.parse(accStr);
            token = acc?.token || acc?.accessToken || token;
          } catch (e) {
            /* ignore */
          }
        }
      }
      if (!token) {
        Alert.alert(
          "Lưu cục bộ",
          "Thông tin đã được cập nhật cục bộ nhưng chưa gửi được lên server (thiếu token)."
        );
        setEditing(false);
        return;
      }

      const API_ROOT = config.API_BASE;
      const updateUrl = `${API_ROOT}/accounts/update-profile`;

      const res = await fetch(updateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        Alert.alert(
          "Lỗi khi cập nhật",
          `Server returned ${res.status}: ${text}`
        );
      } else {
        let j = null;
        try {
          j = await res.json();
        } catch (e) {
          // if server returned no json, just show success
        }
        Alert.alert((j && j.message) || "Cập nhật thông tin thành công");
        // If server returned the updated account, persist it; otherwise persist our optimistic local copy
        const toStore =
          j && (j.account || j.data || j)
            ? j.account || j.data || j
            : updatedLocal;
        try {
          await AsyncStorage.setItem("account", JSON.stringify(toStore));
          setAccount(toStore);
        } catch (e) {
          console.warn("Failed to persist server response for account", e);
        }
      }
    } catch (e) {
      console.warn("Failed to send updated profile to backend", e);
      Alert.alert(
        "Lưu cục bộ",
        "Thông tin đã được cập nhật cục bộ nhưng gửi lên server thất bại."
      );
    } finally {
      setIsSaving(false);
      setEditing(false);
    }
  };

  return (
    <RefreshableScrollView
      refreshing={loadingProfile}
      onRefresh={reloadProfile}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Info Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.avatarGradient}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={{ uri: DEFAULT_APP_LOGO }}
                style={[styles.avatarImage, { borderRadius: 12 }]}
                resizeMode="contain"
              />
            )}
          </LinearGradient>
          <TouchableOpacity
            style={styles.editAvatarButton}
            onPress={async () => await pickAndUploadImage()}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        {editing ? (
          <View style={styles.editCard}>
            <Text style={styles.editLabel}>Họ và tên</Text>
            <TextInput
              value={form.fullName}
              onChangeText={(t) => setForm((s) => ({ ...s, fullName: t }))}
              style={[styles.fieldInputStyled, { width: "100%" }]}
              placeholder="Họ và tên"
            />

            <Text style={styles.editLabel}>Email</Text>
            <TextInput
              value={form.email}
              onChangeText={(t) => setForm((s) => ({ ...s, email: t }))}
              style={[styles.fieldInputStyled, { width: "100%" }]}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.rowTwoColumn}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.editLabelSmall}>Số điện thoại</Text>
                <TextInput
                  value={form.phone}
                  onChangeText={(t) => setForm((s) => ({ ...s, phone: t }))}
                  style={styles.fieldInputStyled}
                  placeholder="Số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.editLabelSmall}>Ngày sinh</Text>
                <TextInput
                  value={form.birth}
                  onChangeText={(t) => setForm((s) => ({ ...s, birth: t }))}
                  style={styles.fieldInputStyled}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.editLabel}>Địa chỉ</Text>
            <TextInput
              value={form.address}
              onChangeText={(t) => setForm((s) => ({ ...s, address: t }))}
              style={[styles.fieldInputStyled, { width: "100%" }]}
              placeholder="Địa chỉ"
            />

            <Text style={styles.editLabel}>Giới tính</Text>
            <View style={styles.genderRow}>
              <TouchableOpacity
                style={styles.radioContainer}
                onPress={() => setForm((s) => ({ ...s, gender: true }))}
                accessibilityRole="radio"
                accessibilityState={{ selected: form.gender === true }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    form.gender === true && styles.radioOuterSelected,
                  ]}
                >
                  {form.gender === true && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.genderText,
                    form.gender === true && styles.genderTextSelected,
                    styles.radioLabel,
                  ]}
                >
                  Nam
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioContainer}
                onPress={() => setForm((s) => ({ ...s, gender: false }))}
                accessibilityRole="radio"
                accessibilityState={{ selected: form.gender === false }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    form.gender === false && styles.radioOuterSelected,
                  ]}
                >
                  {form.gender === false && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.genderText,
                    form.gender === false && styles.genderTextSelected,
                    styles.radioLabel,
                  ]}
                >
                  Nữ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioContainer}
                onPress={() => setForm((s) => ({ ...s, gender: null }))}
                accessibilityRole="radio"
                accessibilityState={{ selected: form.gender === null }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    form.gender === null && styles.radioOuterSelected,
                  ]}
                >
                  {form.gender === null && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.genderText,
                    form.gender === null && styles.genderTextSelected,
                    styles.radioLabel,
                  ]}
                >
                  Khác
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ width: "100%", marginTop: 10 }}>
              <View style={styles.rowTwoColumn}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.editLabelSmall}>Chiều cao (cm)</Text>
                  <TextInput
                    value={form.height}
                    onChangeText={(t) => setForm((s) => ({ ...s, height: t }))}
                    style={[styles.fieldInputStyled, { paddingVertical: 8 }]}
                    placeholder="Ví dụ: 173"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.editLabelSmall}>Cân nặng (kg)</Text>
                  <TextInput
                    value={form.weight}
                    onChangeText={(t) => setForm((s) => ({ ...s, weight: t }))}
                    style={[styles.fieldInputStyled, { paddingVertical: 8 }]}
                    placeholder="Ví dụ: 82"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={[styles.editLabel, { marginTop: 10 }]}>
                Nhóm máu
              </Text>
              <TextInput
                value={form.bloodType}
                onChangeText={(t) => setForm((s) => ({ ...s, bloodType: t }))}
                style={[
                  styles.fieldInputStyled,
                  { marginTop: 6, width: "100%" },
                ]}
                placeholder="A, B, O, AB"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                style={[styles.ghostButton, { marginRight: 12 }]}
                disabled={isSaving}
              >
                <Text style={styles.ghostButtonText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={updateProfile}
                disabled={isSaving}
                style={styles.primaryButton}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Lưu thông tin</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: "center" }}>
            <Text style={styles.profileName}>{form.fullName || "-"}</Text>
            <Text style={styles.profileEmail}>{form.email || "-"}</Text>
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* rest of sections (hide while editing to keep focus on the form) */}
      {!editing && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <EditableField
              icon="person-outline"
              title="Họ và tên"
              value={form.fullName}
              onChange={(v) => setForm((s) => ({ ...s, fullName: v }))}
            />
            <EditableField
              icon="call-outline"
              title="Số điện thoại"
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
            />
            <EditableField
              icon="calendar-outline"
              title="Ngày sinh"
              value={
                form.birth &&
                typeof form.birth === "string" &&
                form.birth.includes("-")
                  ? (() => {
                      const [y, m, d] = form.birth.split("-");
                      return `${d}/${m}/${y}`;
                    })()
                  : ""
              }
            />
            <EditableField
              icon="calendar-outline"
              title="Giới tính"
              value={
                form.gender === null ? "" : form.gender === true ? "Nam" : "Nữ"
              }
              onChange={(v) => setForm((s) => ({ ...s, gender: v }))}
            />
            <EditableField
              icon="location-outline"
              title="Địa chỉ"
              value={form.address}
              onChange={(v) => setForm((s) => ({ ...s, address: v }))}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin sức khỏe</Text>
            <MenuItem
              icon="fitness-outline"
              title="Chiều cao"
              subtitle={`${form.height || "-"} cm`}
              onPress={() => console.log("Edit height")}
            />
            <MenuItem
              icon="body-outline"
              title="Cân nặng"
              subtitle={`${form.weight || "-"} kg`}
              onPress={() => console.log("Edit weight")}
            />
            <MenuItem
              icon="water-outline"
              title="Nhóm máu"
              subtitle={`${form.bloodType || "-"}`}
              onPress={() => console.log("Edit blood type")}
            />
          </View>
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quyền riêng tư & Bảo mật</Text>
        <SettingItem
          icon="notifications-outline"
          title="Thông báo"
          subtitle="Nhận thông báo về sức khỏe"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <SettingItem
          icon="shield-checkmark-outline"
          title="Xác thực sinh trắc học"
          subtitle="Mở khóa bằng vân tay/Face ID"
          value={biometricAuth}
          onValueChange={setBiometricAuth}
        />
        <SettingItem
          icon="share-social-outline"
          title="Chia sẻ dữ liệu"
          subtitle="Cho phép chia sẻ dữ liệu với đối tác"
          value={dataSharing}
          onValueChange={setDataSharing}
        />
        <MenuItem
          icon="lock-closed-outline"
          title="Đổi mật khẩu"
          subtitle="Cập nhật mật khẩu của bạn"
          onPress={() => console.log("Change password")}
        />
        <MenuItem
          icon="finger-print-outline"
          title="Quyền truy cập ứng dụng"
          subtitle="Quản lý quyền camera, vị trí..."
          onPress={() => console.log("App permissions")}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        <MenuItem
          icon="help-circle-outline"
          title="Trợ giúp & Hỗ trợ"
          onPress={() => navigation && navigation.navigate("Help")}
        />
        <MenuItem
          icon="document-text-outline"
          title="Điều khoản & Chính sách"
          onPress={() => navigation && navigation.navigate("Terms")}
        />
        <MenuItem
          icon="information-circle-outline"
          title="Giới thiệu"
          subtitle="Phiên bản 1.0.0"
          onPress={() => navigation && navigation.navigate("About")}
        />
        <MenuItem
          icon="shield-checkmark-outline"
          title="Quyền riêng tư & Ứng dụng"
          onPress={() => navigation && navigation.navigate("Privacy")}
        />
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          try {
            await AsyncStorage.removeItem("account");
          } catch (e) {
            console.warn("Failed to clear account storage on logout", e);
          }
          onLogout && onLogout();
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Help/Terms/About/Privacy are handled via navigation.navigate from the Profile menu */}

      <View style={styles.bottomSpacer} />
    </RefreshableScrollView>
  );
};

async function dataUriToBlob(uri) {
  // fetch the file and convert to blob
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

async function uploadToCloudinaryAsync(localUri) {
  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Missing CLOUDINARY_UPLOAD_PRESET. Please set an unsigned upload preset in the code or provide server-side upload."
    );
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  // Append file. For React Native, file should be { uri, name, type }
  const fileName = localUri.split("/").pop();
  const match = /\.(\w+)$/.exec(fileName);
  const type = match ? `image/${match[1]}` : `image`;

  formData.append("file", {
    uri: localUri,
    name: fileName,
    type,
  });
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "healthy-check-image/avatar");

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  // return full json so callers can access public_id, version, etc.
  console.log(
    "Cloudinary uploadedUrl:",
    json.secure_url,
    "version:",
    json.version,
    "public_id:",
    json.public_id
  );
  return json;
}

// Cloudinary URLs are typically in the form:
// https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<folder>/<public_id>.<ext>
function extractCloudinaryPublicIdFromUrl(url) {
  try {
    if (!url) return null;
    const u = url.split("/");
    const uploadIndex = u.findIndex((seg) => seg === "upload");
    if (uploadIndex === -1) return null;

    // Lấy phần sau "upload"
    let partsAfter = u.slice(uploadIndex + 1);

    // Bỏ phần version vXXXX nếu có
    if (partsAfter.length && /^v\d+/.test(partsAfter[0])) {
      partsAfter.shift();
    }

    // Ghép lại đầy đủ folder + public_id, bỏ đuôi .jpg/.png
    let joined = partsAfter.join("/");
    joined = joined.replace(/\.[^/.]+$/, ""); // bỏ phần mở rộng .jpg/.png
    return joined; // healthy-check-image/avatar/hpm72zjkv74368ayj8hm
  } catch (e) {
    console.warn("Failed to extract public_id from Cloudinary url", e, url);
    return null;
  }
}

/* pickAndUploadImage moved inside component so it can access state (setUploading, setAvatarUrl, accountId) */

const MenuItem = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color="#667eea" />
      </View>
      <View style={styles.menuItemText}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

const EditableField = ({ icon, title, value, onChange, editing }) => (
  <View style={styles.menuItem}>
    <View style={styles.menuItemLeft}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color="#667eea" />
      </View>
      <View style={styles.menuItemText}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {editing ? (
          <TextInput
            value={value}
            onChangeText={onChange}
            style={styles.fieldInput}
            placeholder={`Nhập ${title}`}
          />
        ) : (
          <Text style={styles.menuItemSubtitle}>{value || "-"}</Text>
        )}
      </View>
    </View>
    {editing ? null : (
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    )}
  </View>
);

const SettingItem = ({ icon, title, subtitle, value, onValueChange }) => (
  <View style={styles.menuItem}>
    <View style={styles.menuItemLeft}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color="#667eea" />
      </View>
      <View style={styles.menuItemText}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#ddd", true: "#d0b9ff" }}
      thumbColor={value ? "#667eea" : "#f4f3f4"}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fffe",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fffe",
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  editAvatarButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#667eea",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: "#999",
  },
  fieldInput: {
    fontSize: 14,
    color: "#333",
    paddingVertical: 6,
  },
  fieldInputStyled: {
    backgroundColor: "#fbfbff",
    borderWidth: 1,
    borderColor: "#e6e9f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 14,
    color: "#111",
  },
  editCard: {
    width: "100%",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignSelf: "stretch",
  },
  editLabel: {
    fontSize: 13,
    color: "#444",
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "600",
  },
  editLabelSmall: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
    fontWeight: "700",
  },
  rowTwoColumn: { flexDirection: "row", width: "100%", marginTop: 6 },
  genderRow: {
    flexDirection: "row",
    marginTop: 6,
    justifyContent: "space-between",
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6e9f2",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  genderSelected: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  genderText: {
    color: "#333",
    fontWeight: "600",
  },
  genderTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 6,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#cfd8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  radioOuterSelected: {
    borderColor: "#4f46e5",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4f46e5",
  },
  radioLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  ghostButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6e9f2",
  },
  ghostButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  editButton: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#dfe6fb",
  },
  editButtonText: {
    color: "#4f46e5",
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1.5,
    borderColor: "#fee",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ef4444",
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  // modalOverlay removed — use stack navigation instead
});

export default ProfileScreen;
