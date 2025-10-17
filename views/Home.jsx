import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const Home = ({ onLogout }) => {
  const [active, setActive] = useState("Home");

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{getHeaderTitle(active)}</Text>
            <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.body}>This is the {active} screen.</Text>
          </View>

          <View style={styles.tabBarWrapper}>
            <View style={styles.tabBar}>
              <TabButton
                label="Home"
                active={active === "Home"}
                onPress={() => setActive("Home")}
                icon="home"
              />
              <TabButton
                label="Contact"
                active={active === "Contact"}
                onPress={() => setActive("Contact")}
                icon="people"
              />
              <TabButton
                label="Profile"
                active={active === "Profile"}
                onPress={() => setActive("Profile")}
                icon="person"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const PRIMARY = "tomato";

const getHeaderTitle = (key) => {
  if (key === "Home") return "Trang chủ";
  if (key === "Contact") return "Liên hệ";
  if (key === "Profile") return "Tài khoản";
  return key;
};

const TabButton = ({ label, onPress, active, icon }) => {
  const iconColor = active ? PRIMARY : "#888";
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress}>
      <View style={styles.iconWrapNoBg}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  logoutButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 16, color: "#333" },
  tabBarWrapper: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  tab: { alignItems: "center" },
  iconWrapNoBg: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  tabText: { marginTop: 0, color: "#666", fontSize: 12 },
  tabTextActive: { color: "#111", fontWeight: "700" },
});

export default Home;
