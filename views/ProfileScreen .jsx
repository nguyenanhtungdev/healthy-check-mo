import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Image,
  Alert,
} from "react-native";
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

const ProfileScreen = ({ onLogout, accountId }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [account, setAccount] = useState(null);
  const [localAccountId, setLocalAccountId] = useState(accountId || null);

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

      // Support both old and new result shapes
      // Newer expo-image-picker returns { canceled, assets: [{ uri, ... }] }
      // Older versions return { cancelled, uri }
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

      // determine which accountId to use: prop or stored local
      const idToUse = accountId || localAccountId;
      if (!idToUse) {
        Alert.alert("Lỗi", "Không tìm thấy accountId. Vui lòng đăng nhập lại.");
        setUploading(false);
        return;
      }

      const API_BASE = config.API_BASE;

      // Determine existing (old) public_id from current avatar URL so server can delete it if desired
      const existingUrl = avatarUrl || (account && account.imageUrl) || null;
      const oldPublicId = existingUrl
        ? extractCloudinaryPublicIdFromUrl(existingUrl)
        : null;

      // Optionally ask backend to delete the old image BEFORE uploading a new one
      if (DELETE_OLD_BEFORE_UPLOAD && oldPublicId) {
        try {
          console.log(
            "Requesting backend to delete old public_id before upload:",
            oldPublicId
          );
          const delRes = await fetch(
            `${API_BASE}/file-update/${idToUse}/delete-avatar`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId: oldPublicId }),
            }
          );
          if (!delRes.ok) {
            const t = await delRes.text();
            console.warn(
              "Delete-old-avatar request returned",
              delRes.status,
              t
            );
          } else {
            console.log("Backend acknowledged deletion of old image");
          }
        } catch (e) {
          console.warn("Failed to call backend delete-avatar before upload", e);
        }
      }

      setUploading(true);
      let uploadedResp;
      try {
        // uploadToCloudinaryAsync now returns the full JSON response from Cloudinary
        uploadedResp = await uploadToCloudinaryAsync(localUri);
      } catch (e) {
        Alert.alert("Lỗi tải ảnh", e.message || String(e));
        setUploading(false);
        return;
      }

      const uploadedUrl =
        (uploadedResp && (uploadedResp.secure_url || uploadedResp.url)) || null;
      const newPublicId = uploadedResp && uploadedResp.public_id;

      // Determine old public_id was handled earlier (we compute it before upload)

      // Notify backend
      try {
        const API_BASE = config.API_BASE;
        const backendUrl = `${API_BASE}/file-update/${idToUse}/update-avatar`;
        const payload = { imageUrl: uploadedUrl };
        if (oldPublicId) payload.oldPublicId = oldPublicId;
        if (newPublicId) payload.newPublicId = newPublicId;

        console.log("Sending backend update payload:", payload);

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
        const finalUrl = json.imageUrl || uploadedUrl;
        console.log("Backend response after avatar update:", json);
        setAvatarUrl(finalUrl);
        // update stored account if exists
        try {
          const accStr = await AsyncStorage.getItem("account");
          if (accStr) {
            const acc = JSON.parse(accStr);
            acc.imageUrl = finalUrl;
            await AsyncStorage.setItem("account", JSON.stringify(acc));
            setAccount(acc);
            setLocalAccountId(acc.accountId || idToUse);
          }
        } catch (e) {
          console.warn("Failed to update stored account avatar", e);
        }
        Alert.alert(json.message || "Cập nhật avatar thành công");
      } catch (e) {
        console.error("Backend update error", e);
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
          setAvatarUrl(acc.imageUrl || null);
          setLocalAccountId(acc.accountId || accountId || null);
        } else if (accountId) {
          setLocalAccountId(accountId);
        }
      } catch (e) {
        console.warn("Failed to read account from storage", e);
      }
    })();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
              <Ionicons name="person" size={48} color="#fff" />
            )}
          </LinearGradient>
          <TouchableOpacity
            style={styles.editAvatarButton}
            onPress={async () => {
              // handle press
              // defined below as function pickAndUploadImage
              await pickAndUploadImage();
            }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>Nguyễn Văn A</Text>
        <Text style={styles.profileEmail}>nguyenvana@email.com</Text>
      </View>

      {/* Personal Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

        <MenuItem
          icon="person-outline"
          title="Họ và tên"
          subtitle="Nguyễn Văn A"
          onPress={() => console.log("Edit name")}
        />

        <MenuItem
          icon="call-outline"
          title="Số điện thoại"
          subtitle="0123 456 789"
          onPress={() => console.log("Edit phone")}
        />

        <MenuItem
          icon="calendar-outline"
          title="Ngày sinh"
          subtitle="01/01/1990"
          onPress={() => console.log("Edit birthday")}
        />

        <MenuItem
          icon="location-outline"
          title="Địa chỉ"
          subtitle="Quận 1, TP.HCM"
          onPress={() => console.log("Edit address")}
        />
      </View>

      {/* Health Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin sức khỏe</Text>

        <MenuItem
          icon="fitness-outline"
          title="Chiều cao"
          subtitle="170 cm"
          onPress={() => console.log("Edit height")}
        />

        <MenuItem
          icon="body-outline"
          title="Cân nặng"
          subtitle="65 kg"
          onPress={() => console.log("Edit weight")}
        />

        <MenuItem
          icon="water-outline"
          title="Nhóm máu"
          subtitle="O+"
          onPress={() => console.log("Edit blood type")}
        />
      </View>

      {/* Privacy Settings Section */}
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

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản</Text>

        <MenuItem
          icon="help-circle-outline"
          title="Trợ giúp & Hỗ trợ"
          onPress={() => console.log("Help")}
        />

        <MenuItem
          icon="document-text-outline"
          title="Điều khoản & Chính sách"
          onPress={() => console.log("Terms")}
        />

        <MenuItem
          icon="information-circle-outline"
          title="Giới thiệu"
          subtitle="Phiên bản 1.0.0"
          onPress={() => console.log("About")}
        />
      </View>

      {/* Logout Button */}
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

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
    // find the segment after 'upload' (may have 'v12345')
    const uploadIndex = u.findIndex((seg) => seg === "upload");
    if (uploadIndex === -1) return null;
    const partsAfter = u.slice(uploadIndex + 1);
    // remove version segment if present (starts with 'v' + digits)
    if (partsAfter.length && /^v\d+/.test(partsAfter[0])) partsAfter.shift();
    const last = partsAfter.join("/");
    // strip extension
    const publicIdWithExt = last.split("/").pop();
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
    return publicId || null;
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
});

export default ProfileScreen;
