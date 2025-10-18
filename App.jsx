import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
const RootStack = createNativeStackNavigator();
import Login from "./views/Login";
import AppNavigator from "./views/AppNavigator";
import HelpScreen from "./views/HelpScreen";
import TermsScreen from "./views/TermsScreen";
import AboutScreen from "./views/AboutScreen";
import PrivacyScreen from "./views/PrivacyScreen";
import RemindersScreen from "./views/RemindersScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Minimal JWT decode for payload without verifying signature.
function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64url -> base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "==".slice((2 - ((b64.length * 3) % 4)) % 4);
    // Try browser atob first (Expo environment may provide it), otherwise try Buffer if available
    let decoded = null;
    try {
      if (typeof atob === "function") {
        // atob returns binary string; convert to percent-encoded then decode
        const bin = atob(padded);
        decoded = decodeURIComponent(
          bin
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
      } else if (typeof Buffer !== "undefined") {
        decoded = Buffer.from(padded, "base64").toString("utf8");
      } else {
        // Unable to decode in this environment
        return null;
      }
    } catch (e) {
      return null;
    }
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setIsAuthenticated(false);
          setCheckingAuth(false);
          return;
        }
        const payload = decodeJwtPayload(token);
        if (!payload) {
          // malformed token
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("account");
          setIsAuthenticated(false);
          setCheckingAuth(false);
          return;
        }
        // exp is usually in seconds since epoch
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp > nowSec) {
          setIsAuthenticated(true);
        } else {
          // expired
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("account");
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.warn("Auth check failed", e);
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fffe" />
        {checkingAuth ? null : !isAuthenticated ? ( // while checking token, render nothing (or could show splash)
          <Login onLoginSuccess={() => setIsAuthenticated(true)} />
        ) : (
          <NavigationContainer>
            {/* Use a root native stack so we can push modal/details screens from anywhere */}
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="MainTabs">
                {(props) => (
                  <AppNavigator
                    {...props}
                    onLogout={() => setIsAuthenticated(false)}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen name="Help" component={HelpScreen} />
              <RootStack.Screen name="Terms" component={TermsScreen} />
              <RootStack.Screen name="About" component={AboutScreen} />
              <RootStack.Screen name="Privacy" component={PrivacyScreen} />
              <RootStack.Screen name="Reminders" component={RemindersScreen} />
            </RootStack.Navigator>
          </NavigationContainer>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: { flex: 1, backgroundColor: "#fff", marginBottom: 14 },
});
