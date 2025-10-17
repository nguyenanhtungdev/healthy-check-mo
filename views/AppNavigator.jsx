import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";

import HomeScreen from "./HomeScreen";
import ContactScreen from "./ContactScreen";
import ProfileScreen from "./ProfileScreen ";
import FamilyHealthScreen from "./FamilyHealthScreen";
import WellnessTrackerScreen from "./WellnessTrackerScreen";

const Tab = createBottomTabNavigator();
const PRIMARY = "#667eea";

const AppNavigator = ({ onLogout }) => {
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
          } else if (route.name === "Contact") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
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
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Trang chủ" }}
      />
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
      <Tab.Screen
        name="Contact"
        component={ContactScreen}
        options={{ tabBarLabel: "Liên hệ" }}
      />
      <Tab.Screen name="Profile" options={{ tabBarLabel: "Hồ sơ" }}>
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
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
  },
  iconWrapperActive: {
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default AppNavigator;
