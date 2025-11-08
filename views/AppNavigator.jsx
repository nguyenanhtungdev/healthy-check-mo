import React from "react";
import { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Text, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";

import HomeScreen from "./HomeScreen";
import ContactScreen from "./NotificationScreen";
import ProfileScreen from "./ProfileScreen ";
import FamilyHealthScreen from "./FamilyHealthScreen";
import WellnessTrackerScreen from "./WellnessTrackerScreen";
import AppointmentDetailScreen from "./AppointmentDetailScreen";
import RemindersScreen from "./RemindersScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const PRIMARY = "#667eea";

const TabNavigator = ({ onLogout, navigation: parentNavigation }) => {
  const [accountId, setAccountId] = useState(null);
  const [account, setAccount] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Get token for API calls
  const getToken = async () => {
    try {
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) return token;
      }

      const accStr = await AsyncStorage.getItem("account");
      if (accStr) {
        const acc = JSON.parse(accStr);
        return acc?.token || acc?.accessToken;
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  // Load unread notification count
  const loadUnreadCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(
        `${config.API_BASE}/notifications/count-unread?_t=${Date.now()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const count = data.count || 0;
        setUnreadNotificationCount(count);
      } else {
        console.warn(
          "AppNavigator: Failed to load unread count:",
          response.status
        );
      }
    } catch (error) {
      console.error("AppNavigator: Error loading unread count:", error);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem("account").then((accStr) => {
      if (accStr) {
        const acc = JSON.parse(accStr);
        setAccountId(acc.id || acc.accountId);
        setAccount(acc);
      }
    });

    // Load unread count on mount
    loadUnreadCount();

    // Refresh unread count every 15 seconds (reduced from 30)
    const interval = setInterval(loadUnreadCount, 15000);

    // Listen for app state changes (foreground/background)
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active") {
        console.log("App became active, refreshing notifications...");
        loadUnreadCount();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, []);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: "#666",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Family") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Notification") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "WellnessTracker") {
            iconName = focused ? "leaf" : "leaf-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return (
            <View
              style={[styles.iconWrapper, focused && styles.iconWrapperActive]}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? "#fff" : "#666"}
              />
              {/* Notification Badge */}
              {route.name === "Notification" && unreadNotificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" options={{ tabBarLabel: "Trang chủ" }}>
        {(props) => <HomeScreen {...props} account={account} />}
      </Tab.Screen>
      <Tab.Screen
        name="Family"
        component={FamilyHealthScreen}
        options={{ tabBarLabel: "Gia đình" }}
      />
      <Tab.Screen
        name="WellnessTracker"
        component={WellnessTrackerScreen}
        options={{ tabBarLabel: "Sức khỏe" }}
      />
      <Tab.Screen name="Notification" options={{ tabBarLabel: "Thông báo" }}>
        {(props) => (
          <ContactScreen
            {...props}
            onUnreadCountChange={setUnreadNotificationCount}
            stackNavigation={parentNavigation}
            tabNavigation={props.navigation}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile" options={{ tabBarLabel: "Hồ sơ" }}>
        {(props) => (
          <ProfileScreen
            {...props}
            onLogout={onLogout}
            accountId={accountId}
            setAccount={setAccount}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 6,
    height: 65,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 12,
    borderTopWidth: 0,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    position: "relative",
  },
  iconWrapperActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});

const AppNavigator = ({ onLogout }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TabNavigator">
        {(props) => (
          <TabNavigator
            {...props}
            onLogout={onLogout}
            navigation={props.navigation}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RemindersScreen"
        component={RemindersScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
