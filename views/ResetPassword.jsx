import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import config from "../config";

const { width } = Dimensions.get("window");

const ResetPassword = ({ onReset, onCancel }) => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [codeDigits, setCodeDigits] = useState(new Array(6).fill(""));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);
  const [step, setStep] = useState(1); // 1: enter email -> send code, 2: enter code -> verify, 3: enter new password -> reset
  const [emailError, setEmailError] = useState("");

  const API_BASE = config.API_BASE;

  const sendForgot = async () => {
    if (!email) {
      setMessage("Please enter your email.");
      return;
    }
    setLoading(true);
    setMessage("");
    setEmailError("");
    try {
      // check username must exist to send reset
      const checkRes = await fetch(`${API_BASE}/auth/check-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email }),
      });
      const checkJson = await checkRes.json().catch(() => ({}));
      // API contract: 409 => username exists, 200 => not exists
      // proceed only when server returns 409 (exists)
      if (checkRes.status !== 409) {
        setEmailError(checkJson.message || "Email not found.");
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) setMessage(json.message || "Failed to send reset code.");
      else {
        setMessage(json.message || "Reset code sent. Check your email.");
        setStep(2);
        // focus first code box after a short delay
        setTimeout(() => inputsRef.current[0]?.focus(), 300);
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error while sending reset code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    // verifyCode removed — backend does not expose /auth/verify-code
    // The resetPassword endpoint will verify the code as part of resetting the password.
  };

  const resetPassword = async () => {
    const code = codeDigits.join("");
    if (!email || !newPassword || code.length !== 6) {
      setMessage("Please fill email, new password and 6-digit code.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, code }),
      });
      const json = await res.json();
      if (!res.ok) setMessage(json.message || "Reset failed.");
      else {
        setMessage(json.message || "Password reset successful.");
        onReset();
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error while resetting password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2", "#f093fb"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <View style={styles.formContainer}>
              <Text style={styles.title}>Reset password</Text>

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
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setEmailError("");
                      setMessage("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {!!emailError && (
                  <Text style={styles.emailError}>{emailError}</Text>
                )}
              </View>

              {step >= 2 && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>New password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#667eea"
                      style={styles.icon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Verification Code</Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View style={styles.codeContainer}>
                    {codeDigits.map((d, idx) => (
                      <TextInput
                        key={idx}
                        ref={(el) => (inputsRef.current[idx] = el)}
                        value={d}
                        onChangeText={(text) => {
                          const char = text ? text.slice(-1) : "";
                          const newDigits = [...codeDigits];
                          newDigits[idx] = char.replace(/[^0-9]/g, "");
                          setCodeDigits(newDigits);
                          if (char && idx < 5)
                            inputsRef.current[idx + 1]?.focus();
                        }}
                        onKeyPress={({ nativeEvent }) => {
                          if (
                            nativeEvent.key === "Backspace" &&
                            !codeDigits[idx] &&
                            idx > 0
                          )
                            inputsRef.current[idx - 1]?.focus();
                        }}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={styles.codeBox}
                        textAlign="center"
                      />
                    ))}
                  </View>
                </View>
                <View
                  style={{
                    marginTop: 10,
                    alignItems: "flex-end",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                  }}
                >
                  {step === 1 && (
                    <TouchableOpacity
                      style={styles.sendCodeButton}
                      onPress={sendForgot}
                      disabled={loading}
                    >
                      <Text style={styles.sendCodeButtonText}>
                        {loading ? "Sending..." : "Send Code"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {step === 2 && (
                    <TouchableOpacity
                      style={styles.sendCodeButton}
                      onPress={resetPassword}
                      disabled={loading}
                    >
                      <Text style={styles.sendCodeButtonText}>
                        {loading ? "Please wait..." : "Reset Password"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {message ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: "#333", textAlign: "center" }}>
                    {message}
                  </Text>
                </View>
              ) : null}

              {step === 3 && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={resetPassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#00d4ff", "#667eea"]}
                    style={styles.verifyInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      {loading ? "Please wait..." : "Reset Password"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View
                style={{
                  marginTop: 16,
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <TouchableOpacity onPress={onCancel}>
                  <Text style={styles.signUpLink}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  formContainer: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 30,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
    textAlign: "center",
  },
  inputWrapper: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 6 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: "#333" },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
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
  sendCodeButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
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
  sendCodeButtonText: { color: "#fff", fontWeight: "600" },
  verifyButton: { marginTop: 14, borderRadius: 12, overflow: "hidden" },
  verifyInner: { paddingVertical: 14, alignItems: "center" },
  signUpLink: { color: "#667eea", fontWeight: "700" },
  emailError: { color: "#d9534f", marginTop: 6, marginLeft: 6 },
});

export default ResetPassword;
