import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { NavigationContainer } from "@react-navigation/native";
import Login from "./views/Login";
import AppNavigator from "./views/AppNavigator";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fffe" />
        {!isAuthenticated ? (
          <Login onLoginSuccess={() => setIsAuthenticated(true)} />
        ) : (
          <NavigationContainer>
            <AppNavigator onLogout={() => setIsAuthenticated(false)} />
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
