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
  const [step, setStep] = useState(1); // 1: enter email+pass -> send code; 2: enter code -> verify/register
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [codeDigits, setCodeDigits] = useState(new Array(6).fill(""));
  const inputsRef = useRef([]);

  const API_BASE = config.API_BASE;

  const sendCode = async () => {
    if (!email) return setMessage("Please enter your email.");
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
              <Text style={styles.title}>Create account</Text>

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
                      />
                    </View>
                    {!!emailError && (
                      <Text style={styles.emailError}>{emailError}</Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.row,
                      { marginTop: 12 },
                      styles.inputContainer,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#667eea"
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      placeholder="Enter password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, { marginTop: 18 }]}
                    onPress={sendCode}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Sending..." : "Send verification code"}
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
    fontSize: 20,
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
});
