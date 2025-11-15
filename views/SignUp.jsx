import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import config from "../config";

export default function SignUp({ navigation, onRegistered, onCancel }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: enter email+pass -> send code; 2: enter code -> verify/register
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [codeDigits, setCodeDigits] = useState(new Array(6).fill(""));
  const inputsRef = useRef([]);

  const API_BASE = config.API_BASE;

  // Hàm validate mật khẩu
  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8) {
      errors.push("Ít nhất 8 ký tự");
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push("Có chữ thường");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("Có chữ IN HOA");
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push("Có số");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      errors.push("Có ký tự đặc biệt");
    }
    return errors;
  };

  // Tính độ mạnh mật khẩu (0-5)
  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;
    return strength;
  };

  const getPasswordStrengthLabel = (strength) => {
    if (strength === 0) return { text: "", color: "#e5e7eb" };
    if (strength <= 2) return { text: "Yếu", color: "#ef4444" };
    if (strength === 3) return { text: "Trung bình", color: "#f59e0b" };
    if (strength === 4) return { text: "Mạnh", color: "#10b981" };
    return { text: "Rất mạnh", color: "#059669" };
  };

  // Kiểm tra password khi thay đổi
  const handlePasswordChange = (text) => {
    setPassword(text);
    if (text) {
      const errors = validatePassword(text);
      if (errors.length > 0) {
        setPasswordError(`Mật khẩu cần: ${errors.join(", ")}`);
      } else {
        setPasswordError("");
      }
    } else {
      setPasswordError("");
    }

    // Kiểm tra confirm password nếu đã nhập
    if (confirmPassword && text !== confirmPassword) {
      setConfirmPasswordError("Mật khẩu không khớp");
    } else {
      setConfirmPasswordError("");
    }
  };

  // Kiểm tra confirm password
  const handleConfirmPasswordChange = (text) => {
    setConfirmPassword(text);
    if (text && text !== password) {
      setConfirmPasswordError("Mật khẩu không khớp");
    } else {
      setConfirmPasswordError("");
    }
  };

  const sendCode = async () => {
    if (!email) return setMessage("Vui lòng nhập email.");
    if (!password) return setMessage("Vui lòng nhập mật khẩu.");
    if (!confirmPassword) return setMessage("Vui lòng nhập lại mật khẩu.");

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setPasswordError(`Mật khẩu cần: ${passwordErrors.join(", ")}`);
      return;
    }

    // Check confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError("Mật khẩu không khớp");
      return;
    }

    setLoading(true);
    setMessage("");
    setEmailError("");
    try {
      // Check username first
      const checkRes = await fetch(`${API_BASE}/auth/check-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email }),
      });
      const checkJson = await checkRes.json().catch(() => ({}));
      if (checkRes.status === 409) {
        // username exists -> cannot register
        const errMsg = checkJson.message || "Email already exists.";
        setEmailError(`*${errMsg}`);
        setLoading(false);
        return;
      }

      // proceed to send code
      const resp = await fetch(`${API_BASE}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) setMessage(json.message || "Failed to send code.");
      else {
        setMessage(json.message || "Code sent.");
        setStep(2);
        setTimeout(() => inputsRef.current[0]?.focus(), 300);
      }
    } catch (e) {
      console.error("sendCode error", e);
      setMessage("Network error while sending code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndRegister = async () => {
    const code = codeDigits.join("");
    if (!email || !password)
      return setMessage("Please provide email and password.");
    if (code.length !== 6) return setMessage("Please enter the 6-digit code.");
    setLoading(true);
    setMessage("");
    try {
      // Call verify-register which takes email, password, code
      const resp = await fetch(`${API_BASE}/auth/verify-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) setMessage(json.message || "Registration failed.");
      else {
        setMessage(json.message || "Registration successful.");
        onRegistered && onRegistered();
        // optionally navigate back to login
        if (navigation && navigation.goBack) navigation.goBack();
      }
    } catch (e) {
      console.error("verifyAndRegister error", e);
      setMessage("Network error while registering.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.inner}>
            <View style={styles.card}>
              <Text style={styles.title}>Tạo tài khoản</Text>

              {step === 1 && (
                <>
                  <View>
                    <View style={[styles.row, styles.inputContainer]}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color="#667eea"
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        placeholder="Enter email"
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          setEmailError("");
                        }}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                        autoComplete="off"
                        textContentType="none"
                      />
                    </View>
                    {!!emailError && (
                      <Text style={styles.emailError}>{emailError}</Text>
                    )}
                  </View>

                  <View>
                    <View
                      style={[
                        styles.row,
                        { marginTop: 12 },
                        styles.inputContainer,
                        passwordError ? styles.inputError : null,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#667eea"
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChangeText={handlePasswordChange}
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        autoComplete="off"
                        textContentType="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color="#999"
                        />
                      </TouchableOpacity>
                    </View>
                    {!!passwordError && (
                      <Text style={styles.errorText}>{passwordError}</Text>
                    )}
                    {password && (
                      <View style={styles.strengthContainer}>
                        <View style={styles.strengthBar}>
                          {[1, 2, 3, 4, 5].map((level) => (
                            <View
                              key={level}
                              style={[
                                styles.strengthSegment,
                                {
                                  backgroundColor:
                                    level <= getPasswordStrength(password)
                                      ? getPasswordStrengthLabel(
                                          getPasswordStrength(password)
                                        ).color
                                      : "#e5e7eb",
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text
                          style={[
                            styles.strengthLabel,
                            {
                              color: getPasswordStrengthLabel(
                                getPasswordStrength(password)
                              ).color,
                            },
                          ]}
                        >
                          {
                            getPasswordStrengthLabel(
                              getPasswordStrength(password)
                            ).text
                          }
                        </Text>
                      </View>
                    )}
                    {password && (
                      <View style={styles.requirementsContainer}>
                        <View style={styles.requirementRow}>
                          <Ionicons
                            name={
                              password.length >= 8
                                ? "checkmark-circle"
                                : "close-circle"
                            }
                            size={14}
                            color={password.length >= 8 ? "#10b981" : "#9ca3af"}
                          />
                          <Text
                            style={[
                              styles.requirementText,
                              password.length >= 8 && styles.requirementMet,
                            ]}
                          >
                            Ít nhất 8 ký tự
                          </Text>
                        </View>
                        <View style={styles.requirementRow}>
                          <Ionicons
                            name={
                              /[a-z]/.test(password)
                                ? "checkmark-circle"
                                : "close-circle"
                            }
                            size={14}
                            color={
                              /[a-z]/.test(password) ? "#10b981" : "#9ca3af"
                            }
                          />
                          <Text
                            style={[
                              styles.requirementText,
                              /[a-z]/.test(password) && styles.requirementMet,
                            ]}
                          >
                            Chữ thường (a-z)
                          </Text>
                        </View>
                        <View style={styles.requirementRow}>
                          <Ionicons
                            name={
                              /[A-Z]/.test(password)
                                ? "checkmark-circle"
                                : "close-circle"
                            }
                            size={14}
                            color={
                              /[A-Z]/.test(password) ? "#10b981" : "#9ca3af"
                            }
                          />
                          <Text
                            style={[
                              styles.requirementText,
                              /[A-Z]/.test(password) && styles.requirementMet,
                            ]}
                          >
                            Chữ IN HOA (A-Z)
                          </Text>
                        </View>
                        <View style={styles.requirementRow}>
                          <Ionicons
                            name={
                              /[0-9]/.test(password)
                                ? "checkmark-circle"
                                : "close-circle"
                            }
                            size={14}
                            color={
                              /[0-9]/.test(password) ? "#10b981" : "#9ca3af"
                            }
                          />
                          <Text
                            style={[
                              styles.requirementText,
                              /[0-9]/.test(password) && styles.requirementMet,
                            ]}
                          >
                            Số (0-9)
                          </Text>
                        </View>
                        <View style={styles.requirementRow}>
                          <Ionicons
                            name={
                              /[!@#$%^&*(),.?":{}|<>]/.test(password)
                                ? "checkmark-circle"
                                : "close-circle"
                            }
                            size={14}
                            color={
                              /[!@#$%^&*(),.?":{}|<>]/.test(password)
                                ? "#10b981"
                                : "#9ca3af"
                            }
                          />
                          <Text
                            style={[
                              styles.requirementText,
                              /[!@#$%^&*(),.?":{}|<>]/.test(password) &&
                                styles.requirementMet,
                            ]}
                          >
                            Ký tự đặc biệt (!@#$...)
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View>
                    <View
                      style={[
                        styles.row,
                        { marginTop: 12 },
                        styles.inputContainer,
                        confirmPasswordError ? styles.inputError : null,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#667eea"
                        style={{ marginRight: 8 }}
                      />
                      <TextInput
                        placeholder="Nhập lại mật khẩu"
                        value={confirmPassword}
                        onChangeText={handleConfirmPasswordChange}
                        secureTextEntry={!showConfirmPassword}
                        style={styles.input}
                        autoComplete="off"
                        textContentType="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-outline"
                              : "eye-off-outline"
                          }
                          size={20}
                          color="#999"
                        />
                      </TouchableOpacity>
                    </View>
                    {!!confirmPasswordError && (
                      <Text style={styles.errorText}>
                        {confirmPasswordError}
                      </Text>
                    )}
                    {!confirmPasswordError &&
                      confirmPassword &&
                      password === confirmPassword && (
                        <View style={styles.successRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10b981"
                          />
                          <Text style={styles.successText}>Mật khẩu khớp</Text>
                        </View>
                      )}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, { marginTop: 18 }]}
                    onPress={sendCode}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Đang gửi..." : "Gửi mã xác nhận"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={{ marginBottom: 10, textAlign: "center" }}>
                    Enter the 6-digit code sent to your email
                  </Text>
                  <View style={styles.codeRow}>
                    {codeDigits.map((d, i) => (
                      <TextInput
                        key={i}
                        ref={(el) => (inputsRef.current[i] = el)}
                        value={d}
                        onChangeText={(text) => {
                          const char = text
                            ? text.slice(-1).replace(/[^0-9]/g, "")
                            : "";
                          const next = [...codeDigits];
                          next[i] = char;
                          setCodeDigits(next);
                          if (char && i < 5) inputsRef.current[i + 1]?.focus();
                        }}
                        onKeyPress={({ nativeEvent }) => {
                          if (
                            nativeEvent.key === "Backspace" &&
                            !codeDigits[i] &&
                            i > 0
                          )
                            inputsRef.current[i - 1]?.focus();
                        }}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={styles.codeBox}
                        textAlign="center"
                      />
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 16,
                    }}
                  >
                    <TouchableOpacity
                      style={[styles.button, { flex: 1 }]}
                      onPress={() => setStep(1)}
                    >
                      <Text style={styles.buttonText}>Edit email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { flex: 1, marginLeft: 12 }]}
                      onPress={verifyAndRegister}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? "Registering..." : "Verify & Register"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {!!message && (
                <Text
                  style={{ marginTop: 12, color: "#333", textAlign: "center" }}
                >
                  {message}
                </Text>
              )}

              <View
                style={{
                  marginTop: 18,
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#666" }}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => {
                    onCancel && onCancel();
                    if (navigation && navigation.goBack) navigation.goBack();
                  }}
                >
                  <Text style={{ color: "#667eea", fontWeight: "700" }}>
                    Sign in
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 18,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f6f7fb",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  input: { flex: 1, fontSize: 16 },
  button: {
    backgroundColor: "#667eea",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  codeRow: { flexDirection: "row", justifyContent: "space-between" },
  codeBox: {
    width: 44,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    marginHorizontal: 6,
    fontSize: 18,
    color: "#333",
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
  emailError: { color: "#d9534f", marginTop: 6, marginLeft: 6 },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 6,
  },
  inputError: {
    borderColor: "#ef4444",
    borderWidth: 1.5,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginLeft: 6,
  },
  successText: {
    color: "#10b981",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },
  strengthContainer: {
    marginTop: 8,
    marginHorizontal: 6,
  },
  strengthBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  requirementsContainer: {
    marginTop: 8,
    marginLeft: 6,
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  requirementText: {
    fontSize: 11,
    color: "#6b7280",
    marginLeft: 6,
  },
  requirementMet: {
    color: "#10b981",
    fontWeight: "600",
  },
});
