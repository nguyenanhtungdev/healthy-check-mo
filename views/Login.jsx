import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import HomeScreen from "./HomeScreen";
import SignUp from "./SignUp";
import ResetPassword from "./ResetPassword";
import config from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const Login = ({ navigation, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeDigits, setCodeDigits] = useState(new Array(6).fill(""));
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);
  // auth state is handled by App.jsx; signal success via onLoginSuccess()
  const [showSignUp, setShowSignUp] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [showLoggingSpinner, setShowLoggingSpinner] = useState(false);

  // runtime API base from config.js (can be set via app.json extra or env)
  const API_BASE = config.API_BASE;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignIn = () => {
    // Deprecated: use handleLogin which calls the API
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Vui lòng nhập email và mật khẩu.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      // Read response as text first (server may return empty body)
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (e) {
        // not JSON
        json = null;
      }

      if (!res.ok) {
        // Customize error messages based on status code
        let msg = "Đăng nhập thất bại.";
        if (res.status === 401) {
          msg = "Email hoặc mật khẩu không đúng. Vui lòng thử lại.";
        } else if (res.status === 400) {
          msg = "Thông tin đăng nhập không hợp lệ.";
        } else if (res.status === 429) {
          msg = "Quá nhiều lần thử. Vui lòng thử lại sau.";
        } else if (res.status >= 500) {
          msg = "Lỗi server. Vui lòng thử lại sau.";
        } else {
          // Use server message if available, otherwise use default
          msg = (json && json.message) || text || "Đăng nhập thất bại.";
        }
        setMessage(msg);
        setSuccess(false);
      } else {
        // Không set message và success để không hiển thị modal
        // setMessage(msg);
        // setSuccess(true);

        // store account info and token in local storage for later use
        try {
          if (json) {
            // Persist the whole account object for convenience
            await AsyncStorage.setItem("account", JSON.stringify(json));

            // Detect common token fields returned by various backends
            const tokenCandidate =
              json?.token ||
              json?.accessToken ||
              json?.access_token ||
              (json.data &&
                (json.data.token ||
                  json.data.accessToken ||
                  json.data.access_token)) ||
              null;

            if (tokenCandidate) {
              try {
                await AsyncStorage.setItem("token", tokenCandidate);
              } catch (e) {
                console.warn("Failed to save token to storage", e);
              }
            }
          }
        } catch (e) {
          console.warn("Failed to save account/token to storage", e);
        }

        // show ActivityIndicator overlay briefly, then notify parent
        setShowLoggingSpinner(true);
        setTimeout(() => {
          setShowLoggingSpinner(false);
          // notify parent that login succeeded; pass account if available
          try {
            const accountObj = json || null;
            onLoginSuccess && onLoginSuccess(accountObj);
          } catch (_) {
            onLoginSuccess && onLoginSuccess();
          }
        }, 900);
      }
    } catch (err) {
      console.error(err);
      setMessage("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // verifyRegister removed from Login (use SignUp screen instead)

  // If the app wants to show SignUp/Reset as separate screens inside this component
  // we still use local flags; when registration succeeds we call onLoginSuccess()
  if (showSignUp) {
    return (
      <SignUp
        onRegistered={() => {
          setShowSignUp(false);
          onLoginSuccess && onLoginSuccess();
        }}
        onCancel={() => setShowSignUp(false)}
      />
    );
  }

  if (showReset) {
    return (
      <ResetPassword
        onReset={() => {
          setShowReset(false);
          setMessage("Password reset successful. Please sign in.");
        }}
        onCancel={() => setShowReset(false)}
      />
    );
  }

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Form Container */}
            <View style={styles.formContainer}>
              <Text style={[styles.title, { textAlign: "center" }]}>Login</Text>
              <View style={styles.subtitleRow}>
                <Ionicons
                  name="sparkles-outline"
                  size={20}
                  color="#f59e0b"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.subtitle}>Welcome back</Text>
              </View>
              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#667eea"
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email"
                    placeholderTextColor="#a0a0a0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#667eea"
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor="#a0a0a0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#667eea"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => setShowReset(true)}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity onPress={handleLogin} activeOpacity={0.8}>
                <LinearGradient
                  colors={["#00d4ff", "#667eea"]}
                  style={styles.signInButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Verify/Register moved to SignUp screen */}

              {/* Message Modal */}
              {message ? (
                <Modal
                  visible={!!message}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setMessage("")}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                      <View style={styles.modalHeader}>
                        <Ionicons
                          name={success ? "checkmark-circle" : "alert-circle"}
                          size={24}
                          color={success ? "#10b981" : "#ef4444"}
                        />
                        <Text style={styles.modalTitle}>
                          {success ? "Thành công" : "Thông báo"}
                        </Text>
                      </View>
                      <Text style={styles.modalMessage}>{message}</Text>
                      <TouchableOpacity
                        style={[
                          styles.modalButton,
                          success && styles.modalButtonSuccess,
                        ]}
                        onPress={() => setMessage("")}
                      >
                        <Text style={styles.modalButtonText}>Đóng</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              ) : null}

              {/* success banner intentionally removed; overlay spinner is used */}

              {/* removed social login UI per request */}

              {/* Sign Up */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => setShowSignUp(true)}>
                  <Text style={styles.signUpLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
          {/* spinner overlay moved outside ScrollView to cover full screen */}
        </ScrollView>
      </KeyboardAvoidingView>
      {showLoggingSpinner && (
        <View style={styles.spinnerOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.spinnerText}>Đang đăng nhập...</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 10,
  },
  wave: {
    fontSize: 36,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    color: "#999",
    fontSize: 12,
    marginHorizontal: 10,
    fontWeight: "600",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    color: "#666",
    fontSize: 14,
  },
  signUpLink: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "bold",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: Math.min(width - 160, 280),
  },
  codeBox: {
    width: 44,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginHorizontal: 6,
    fontSize: 18,
    color: "#333",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
    textAlign: "center",
  },
  sendCodeButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendCodeButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  subtitle: {
    color: "#06b6d4", // teal/cyan
    fontSize: 18,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    textShadowColor: "rgba(6,182,212,0.18)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  successBanner: {
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  spinnerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  spinnerText: {
    color: "#fff",
    marginTop: 12,
    fontWeight: "700",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: 24,
    padding: 28,
    minWidth: 300,
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#667eea",
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginLeft: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 28,
  },
  modalButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 140,
    shadowColor: "#667eea",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalButtonSuccess: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default Login;
