import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";
import RunningTracker from "../components/RunningTracker";
import sleepTracker from "../services/sleepTracker";
import offlineStorage from "../services/offlineStorage";
// Note: we'll use the community DateTimePicker if available in the app environment
let DateTimePicker = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch (e) {
  // dependency not installed; we'll fallback to +/- controls already present
  DateTimePicker = null;
}

// reminders moved to a dedicated screen (RemindersScreen)

// Updated color scheme for better aesthetics
const PRIMARY = "#6366f1";
const SECONDARY = "#8b5cf6";
const ACCENT = "#f093fb";
const SUCCESS = "#4ade80";
const WARNING = "#fbbf24";
const DANGER = "#f87171";
const LIGHT_BG = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#1e293b";
const TEXT_SECONDARY = "#64748b";
const TEXT_MUTED = "#94a3b8";
const BORDER_COLOR = "#e2e8f0";

const WellnessTrackerScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  });
  const [rangeEnd, setRangeEnd] = useState(() => new Date());
  const [showNativePickerFor, setShowNativePickerFor] = useState(null); // 'start'|'end'|null

  // Calendar modal selection state
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calStart, setCalStart] = useState(null);
  const [calEnd, setCalEnd] = useState(null);

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const addMonths = (d, n) => {
    const nd = new Date(d);
    nd.setMonth(nd.getMonth() + n);
    return nd;
  };

  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const getMonthGrid = (monthDate) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const grid = [];
    // find first Sunday before or equal to start
    const cur = new Date(start);
    cur.setDate(cur.getDate() - cur.getDay());
    while (cur <= end || grid.length % 7 !== 0) {
      grid.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return grid; // flat array, render by rows of 7
  };

  const isInRange = (d, s, e) => {
    if (!s || !e) return false;
    const dt = d.setHours(0, 0, 0, 0);
    const ss = new Date(s).setHours(0, 0, 0, 0);
    const ee = new Date(e).setHours(0, 0, 0, 0);
    return dt >= ss && dt <= ee;
  };

  // API States
  const [dailyMeals, setDailyMeals] = useState([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [foodSuggestions, setFoodSuggestions] = useState([]);
  const [availableFoods, setAvailableFoods] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [suggestionModalVisible, setSuggestionModalVisible] = useState(false);
  const [foodDetailModalVisible, setFoodDetailModalVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [selectedFoodForMeal, setSelectedFoodForMeal] = useState(null);
  const [portionAmount, setPortionAmount] = useState("");
  const [newTargets, setNewTargets] = useState({
    dailyTarget: 2000,
    weeklyTarget: 14000,
    monthlyTarget: 60000,
  });

  // Meal Creation States
  const [newMeal, setNewMeal] = useState({
    name: "",
    time: "07:30",
    items: [],
    customName: "",
  });
  const [selectedMealTime, setSelectedMealTime] = useState("breakfast");

  // Predefined meal names - chỉ các bữa chính
  const mealOptions = [
    { id: "breakfast", name: "Bữa sáng", time: "07:30", icon: "sunny-outline" },
    {
      id: "lunch",
      name: "Bữa trưa",
      time: "12:00",
      icon: "restaurant-outline",
    },
    { id: "dinner", name: "Bữa tối", time: "18:30", icon: "moon-outline" },
    { id: "custom", name: "Tùy chỉnh", time: "", icon: "create-outline" },
  ];

  // Exercise Goals State
  const [exerciseGoals, setExerciseGoals] = useState({
    running: { goal: 5, actual: 2, unit: "km", completed: false },
    sleep: { goal: 8, actual: 6.5, unit: "giờ", completed: false },
  });

  const [editingExercise, setEditingExercise] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Running Tracker Modal State
  const [runningModalVisible, setRunningModalVisible] = useState(false);

  // Calendar State
  const [history, setHistory] = useState({
    "2025-10-17": {
      meals: { breakfast: 361, lunch: 350, dinner: 0 },
      exercise: { running: 2, sleep: 6.5 },
    },
    "2025-10-16": {
      meals: { breakfast: 350, lunch: 400, dinner: 250 },
      exercise: { running: 5, sleep: 8 },
    },
  });

  // Utility Functions
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // API Helper Functions
  const getToken = async () => {
    try {
      console.log("🔍 Searching for authentication token...");

      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) {
          console.log(`✅ Found token in AsyncStorage key: ${key}`);
          return token;
        }
      }

      console.log("🔍 Checking account object for token...");
      const accStr = await AsyncStorage.getItem("account");
      if (accStr) {
        const acc = JSON.parse(accStr);
        console.log("📄 Account object found:", {
          hasToken: !!acc?.token,
          hasAccessToken: !!acc?.accessToken,
        });
        return acc?.token || acc?.accessToken;
      }

      console.log("❌ No token found in AsyncStorage");
      return null;
    } catch (error) {
      console.error("❌ Error getting token:", error);
      return null;
    }
  };

  // API Functions
  const loadMealsByDate = async (date) => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const dateStr = formatDate(date);
      const response = await fetch(`${config.API_BASE}/meals?date=${dateStr}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyMeals(data.meals || []);
        setTotalCalories(data.totalCalories || 0);
        setTargetCalories(data.targetCalories || 2000);
      }
    } catch (error) {
      console.error("Error loading meals:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu bữa ăn");
    } finally {
      setLoading(false);
    }
  };

  const createMeal = async (mealData) => {
    try {
      console.log("🍽️ Creating meal with data:", mealData);

      const token = await getToken();
      console.log("🔑 Token available:", token ? "YES" : "NO");

      if (!token) {
        Alert.alert(
          "Lỗi",
          "Không tìm thấy token xác thực. Vui lòng đăng nhập lại."
        );
        return false;
      }

      console.log("🌐 API URL:", `${config.API_BASE}/meals`);

      const response = await fetch(`${config.API_BASE}/meals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mealData),
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log("✅ Success response:", responseData);
        Alert.alert("Thành công", "Đã thêm bữa ăn mới");
        await loadMealsByDate(selectedDate);
        return true;
      } else {
        const errorData = await response.text();
        console.log("❌ Error response:", errorData);
        console.log("❌ Error status:", response.status);

        if (response.status === 401) {
          Alert.alert(
            "Lỗi",
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          );
        } else if (response.status === 400) {
          Alert.alert(
            "Lỗi",
            `Dữ liệu không hợp lệ. Chi tiết: ${errorData.substring(0, 200)}`
          );
        } else if (response.status === 404) {
          Alert.alert(
            "Lỗi",
            "Không tìm thấy API endpoint. Vui lòng kiểm tra kết nối."
          );
        } else if (response.status === 500) {
          Alert.alert(
            "Lỗi Server",
            `Lỗi máy chủ. Chi tiết: ${errorData.substring(0, 150)}`
          );
        } else {
          Alert.alert(
            "Lỗi",
            `Không thể tạo bữa ăn (Mã lỗi: ${
              response.status
            }). Chi tiết: ${errorData.substring(0, 100)}`
          );
        }
        return false;
      }
    } catch (error) {
      console.error("❌ Network error creating meal:", error);
      console.error("❌ Error details:", error.message);
      Alert.alert("Lỗi", `Lỗi kết nối: ${error.message}`);
      return false;
    }
  };

  const loadFoodSuggestions = async (date) => {
    try {
      const token = await getToken();
      if (!token) return;

      const dateStr = formatDate(date);
      const response = await fetch(
        `${config.API_BASE}/meals/suggestions?date=${dateStr}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFoodSuggestions(data.candidates || []);
      }
    } catch (error) {
      console.error("Error loading food suggestions:", error);
    }
  };

  const loadAvailableFoods = async () => {
    try {
      const token = await getToken();
      if (!token) {
        // Fallback data nếu không có token hoặc API không hoạt động
        const fallbackFoods = [
          {
            id: "99df7eee-bbf0-11f0-986b-9c2f9da04484",
            name: "Cơm trắng",
            calories: 206,
            ingredients: "Gạo trắng, nước",
            recipe: "Vo gạo, nấu chín trong nồi cơm điện.",
            imageUrl:
              "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
          },
          {
            id: "99df8455-bbf0-11f0-986b-9c2f9da04484",
            name: "Trứng rán",
            calories: 155,
            ingredients: "2 trứng gà, muối, dầu ăn",
            recipe: "Đánh trứng, cho dầu vào chảo, rán chín vàng.",
            imageUrl:
              "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
          },
          {
            id: "99df8574-bbf0-11f0-986b-9c2f9da04484",
            name: "Cơm gà",
            calories: 350,
            ingredients: "Cơm, thịt gà, nước mắm, tỏi, hành phi",
            recipe: "Nấu cơm, chiên gà, rưới nước mắm tỏi lên cơm.",
            imageUrl:
              "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
          },
        ];
        setAvailableFoods(fallbackFoods);
        return;
      }

      const response = await fetch(`${config.API_BASE}/foods`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableFoods(data || []);
      } else {
        // Nếu API lỗi, sử dụng dữ liệu fallback
        const fallbackFoods = [
          {
            id: "99df7eee-bbf0-11f0-986b-9c2f9da04484",
            name: "Cơm trắng",
            calories: 206,
            ingredients: "Gạo trắng, nước",
            recipe: "Vo gạo, nấu chín trong nồi cơm điện.",
            imageUrl:
              "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
          },
          {
            id: "99df8455-bbf0-11f0-986b-9c2f9da04484",
            name: "Trứng rán",
            calories: 155,
            ingredients: "2 trứng gà, muối, dầu ăn",
            recipe: "Đánh trứng, cho dầu vào chảo, rán chín vàng.",
            imageUrl:
              "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
          },
          {
            id: "99df8574-bbf0-11f0-986b-9c2f9da04484",
            name: "Cơm gà",
            calories: 350,
            ingredients: "Cơm, thịt gà, nước mắm, tỏi, hành phi",
            recipe: "Nấu cơm, chiên gà, rưới nước mắm tỏi lên cơm.",
            imageUrl:
              "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
          },
        ];
        setAvailableFoods(fallbackFoods);
      }
    } catch (error) {
      console.error("Error loading foods:", error);
      // Sử dụng dữ liệu fallback khi có lỗi
      const fallbackFoods = [
        {
          id: "99df7eee-bbf0-11f0-986b-9c2f9da04484",
          name: "Cơm trắng",
          calories: 206,
          ingredients: "Gạo trắng, nước",
          recipe: "Vo gạo, nấu chín trong nồi cơm điện.",
          imageUrl:
            "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
        },
        {
          id: "99df8455-bbf0-11f0-986b-9c2f9da04484",
          name: "Trứng rán",
          calories: 155,
          ingredients: "2 trứng gà, muối, dầu ăn",
          recipe: "Đánh trứng, cho dầu vào chảo, rán chín vàng.",
          imageUrl:
            "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
        },
        {
          id: "99df8574-bbf0-11f0-986b-9c2f9da04484",
          name: "Cơm gà",
          calories: 350,
          ingredients: "Cơm, thịt gà, nước mắm, tỏi, hành phi",
          recipe: "Nấu cơm, chiên gà, rưới nước mắm tỏi lên cơm.",
          imageUrl:
            "https://media.vov.vn/sites/default/files/styles/large/public/2023-07/com_trang_co_thuc_su_tot_cho_suc_khoe2.jpg",
        },
      ];
      setAvailableFoods(fallbackFoods);
    }
  };

  const setCalorieTargets = async (targets) => {
    try {
      const token = await getToken();
      if (!token) return false;

      const response = await fetch(`${config.API_BASE}/meals/targets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(targets),
      });

      if (response.ok) {
        Alert.alert("Thành công", "Đã cập nhật mục tiêu calo");
        await loadMealsByDate(selectedDate);
        return true;
      } else {
        Alert.alert("Lỗi", "Không thể cập nhật mục tiêu");
        return false;
      }
    } catch (error) {
      console.error("Error setting targets:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi cập nhật mục tiêu");
      return false;
    }
  };

  const loadWeeklySummary = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${config.API_BASE}/summary/week`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWeeklySummary(data);
      }
    } catch (error) {
      console.error("Error loading weekly summary:", error);
    }
  };

  const loadMonthlySummary = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${config.API_BASE}/summary/month`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMonthlySummary(data);
      }
    } catch (error) {
      console.error("Error loading monthly summary:", error);
    }
  };

  const getDatesArray = () => {
    // return dates between rangeStart and rangeEnd (inclusive)
    const dates = [];
    const current = new Date(rangeStart);
    current.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Prioritize today's date at the beginning of the list
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Find today's date in the array and move it to the front
    const todayIndex = dates.findIndex((date) => date.getTime() === todayTime);
    if (todayIndex > -1) {
      const todayDate = dates.splice(todayIndex, 1)[0];
      dates.unshift(todayDate);
    }

    return dates;
  };

  // Load data effects
  useEffect(() => {
    loadAvailableFoods();
    loadWeeklySummary();
    loadMonthlySummary();
    loadTodaySleep();
    loadTodayRunning();
  }, []);

  useEffect(() => {
    loadMealsByDate(selectedDate);
    loadFoodSuggestions(selectedDate);
  }, [selectedDate]);

  // Load today's sleep data
  const loadTodaySleep = async () => {
    const sleepHours = await sleepTracker.getTodaySleepHours();
    setExerciseGoals((prev) => ({
      ...prev,
      sleep: {
        ...prev.sleep,
        actual: sleepHours,
      },
    }));
  };

  // Load today's running data
  const loadTodayRunning = async () => {
    try {
      const accountStr = await AsyncStorage.getItem("account");
      if (accountStr) {
        const account = JSON.parse(accountStr);
        const accountId = account.accountId || account.id;
        const today = new Date().toISOString().split("T")[0];

        const result = await offlineStorage.getTotalExercise(
          accountId,
          "running",
          today
        );
        if (result.total > 0) {
          setExerciseGoals((prev) => ({
            ...prev,
            running: {
              ...prev.running,
              actual: result.total,
            },
          }));
        }
      }
    } catch (error) {
      console.error("❌ Failed to load running data:", error);
    }
  };

  // Handle meal creation
  const handleAddMeal = async () => {
    console.log("🚀 Starting meal creation process...");
    console.log("📝 New meal data:", newMeal);
    console.log("📅 Selected date:", selectedDate);

    // Validation
    if (!newMeal.name || !newMeal.name.trim()) {
      Alert.alert("Thông báo", "Vui lòng chọn loại bữa ăn");
      return;
    }

    if (
      newMeal.name === "Tùy chỉnh" &&
      (!newMeal.customName || !newMeal.customName.trim())
    ) {
      Alert.alert("Thông báo", "Vui lòng nhập tên bữa ăn tùy chỉnh");
      return;
    }

    if (!newMeal.time || !newMeal.time.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập thời gian");
      return;
    }

    if (newMeal.items.length === 0) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất một món ăn");
      return;
    }

    // Generate unique IDs for meal and items
    const mealId = `meal_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const itemsWithIds = newMeal.items.map((item, index) => ({
      ...item,
      id:
        item.id ||
        `item_${Date.now()}_${index}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
    }));

    const finalMealName =
      newMeal.name === "Tùy chỉnh"
        ? newMeal.customName.trim()
        : newMeal.name.trim();

    const mealData = {
      id: mealId,
      date: formatDate(selectedDate),
      name: finalMealName,
      time: newMeal.time.trim(),
      items: itemsWithIds,
    };

    console.log("📦 Final meal data to send:", mealData);

    const success = await createMeal(mealData);
    if (success) {
      console.log("✅ Meal created successfully, resetting form...");
      setNewMeal({ name: "", time: "07:30", items: [], customName: "" });
      setModalVisible(false);
    } else {
      console.log("❌ Failed to create meal");
    }
  };

  const handleAddFoodToMeal = (foodItem) => {
    // Ensure each food item has a unique ID
    const itemWithId = {
      ...foodItem,
      id:
        foodItem.id ||
        `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    console.log("🍽️ Adding food item with ID:", itemWithId);

    setNewMeal((prev) => ({
      ...prev,
      items: [...prev.items, itemWithId],
    }));
  };

  const handleAddMealOld = (mealType) => {
    if (!newMeal.name || !newMeal.calories) {
      Alert.alert("Thông báo", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    const newId = String(Date.now());
    const updatedMeals = { ...meals };
    updatedMeals[mealType] = updatedMeals[mealType] || [];
    updatedMeals[mealType].push({
      id: newId,
      name: newMeal.name,
      calories: parseInt(newMeal.calories, 10),
    });

    setMeals(updatedMeals);
    setNewMeal({ name: "", calories: "" });
    setModalVisible(false);
  };

  const handleDeleteMeal = (mealType, mealId) => {
    const updatedMeals = { ...meals };
    updatedMeals[mealType] = updatedMeals[mealType].filter(
      (m) => m.id !== mealId
    );
    setMeals(updatedMeals);
  };

  const handleUpdateExercise = (exerciseType, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const updated = { ...exerciseGoals };
    updated[exerciseType].actual = numValue;

    if (exerciseType === "running") {
      updated[exerciseType].completed = numValue >= updated[exerciseType].goal;
    } else if (exerciseType === "pushups") {
      updated[exerciseType].completed = numValue >= updated[exerciseType].goal;
    } else if (exerciseType === "sleep") {
      updated[exerciseType].completed = numValue >= updated[exerciseType].goal;
    }

    setExerciseGoals(updated);
  };

  const handleUpdateGoal = (exerciseType, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const updated = { ...exerciseGoals };
    updated[exerciseType].goal = numValue;
    setExerciseGoals(updated);
  };

  const getMealTypeLabel = (type) => {
    switch (type) {
      case "breakfast":
        return "Bữa sáng";
      case "lunch":
        return "Bữa trưa";
      case "dinner":
        return "Bữa tối";
      default:
        return type;
    }
  };

  const getMealIcon = (name) => {
    if (!name) return "🍴";
    const lowerName = name.toLowerCase();

    if (lowerName.includes("sáng") || lowerName.includes("breakfast")) {
      return "☕";
    } else if (lowerName.includes("trưa") || lowerName.includes("lunch")) {
      return "🍽️";
    } else if (
      lowerName.includes("tối") ||
      lowerName.includes("dinner") ||
      lowerName.includes("chiều")
    ) {
      return "�";
    } else {
      return "🍴";
    }
  };

  // Render meals from API data
  const renderMealsFromAPI = () => {
    if (loading) {
      return (
        <View style={styles.mealSection}>
          <Text style={styles.emptyMeal}>Đang tải dữ liệu...</Text>
        </View>
      );
    }

    if (dailyMeals.length === 0) {
      return (
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <View style={styles.mealTitleGroup}>
              <Ionicons
                name="restaurant-outline"
                size={28}
                color={TEXT_SECONDARY}
              />
              <View style={styles.mealTextGroup}>
                <Text style={styles.mealTitle}>Chưa có bữa ăn</Text>
                <Text style={styles.mealCalories}>0 calo</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedMealTime("breakfast");
                setModalVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={28} color={PRIMARY} />
            </TouchableOpacity>
          </View>
          <Text style={styles.emptyMeal}>Chưa có bữa ăn nào hôm nay</Text>
        </View>
      );
    }

    return dailyMeals.map((meal) => (
      <View key={meal.id} style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleGroup}>
            <Ionicons name="restaurant-outline" size={28} color={PRIMARY} />
            <View style={styles.mealTextGroup}>
              <Text style={styles.mealTitle}>{meal.name}</Text>
              <Text style={styles.mealCalories}>{meal.totalCalories} calo</Text>
              <Text style={styles.mealTime}>{meal.time}</Text>
            </View>
          </View>
        </View>

        {meal.items && meal.items.length > 0 ? (
          meal.items.map((item, index) => (
            <View key={index} style={styles.mealItem}>
              <View style={styles.mealThumb}>
                <Text style={styles.mealThumbText}>
                  {item.name && item.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.mealItemInfo}>
                <Text style={styles.mealItemName}>{item.name}</Text>
                <View style={styles.mealMeta}>
                  <Text style={styles.mealItemCals}>{item.calories} calo</Text>
                  <Text style={styles.mealTime}>{item.portion}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyMeal}>Chưa có món ăn nào</Text>
        )}
      </View>
    ));
  };

  const renderExerciseCard = (type, data) => {
    const percentage = Math.min((data.actual / data.goal) * 100, 100);
    let exerciseLabel = "";
    let exerciseIconName = "";
    let exerciseIconColor = "";

    switch (type) {
      case "running":
        exerciseLabel = "Chạy bộ";
        exerciseIconName = "walk-outline";
        exerciseIconColor = "#f59e0b";
        break;
      case "sleep":
        exerciseLabel = "Ngủ";
        exerciseIconName = "bed-outline";
        exerciseIconColor = "#8b5cf6";
        break;
    }

    return (
      <View key={type} style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseTitleGroup}>
            <View style={styles.exerciseIconContainer}>
              <Ionicons
                name={exerciseIconName}
                size={28}
                color={exerciseIconColor}
              />
            </View>
            <View>
              <Text style={styles.exerciseLabel}>{exerciseLabel}</Text>
              <Text style={styles.exerciseProgress}>
                {data.actual} / {data.goal} {data.unit}
              </Text>
            </View>
          </View>
          <View style={styles.exerciseHeaderActions}>
            {type === "running" && (
              <TouchableOpacity
                style={styles.startRunButton}
                onPress={() => setRunningModalVisible(true)}
              >
                <Ionicons name="play-circle" size={24} color={PRIMARY} />
                <Text style={styles.startRunText}>Bắt đầu</Text>
              </TouchableOpacity>
            )}
            {data.completed && (
              <Ionicons name="checkmark-circle" size={28} color={SUCCESS} />
            )}
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor:
                  data.completed || percentage >= 75
                    ? SUCCESS
                    : percentage >= 50
                    ? WARNING
                    : DANGER,
              },
            ]}
          />
        </View>

        <View style={styles.exerciseInputGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mục tiêu:</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.exerciseInput}
                value={String(data.goal)}
                onChangeText={(value) => handleUpdateGoal(type, value)}
                keyboardType="decimal-pad"
              />
              <Text style={styles.unitText}>{data.unit}</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Thực tế:</Text>
            <View style={styles.valueDisplayBox}>
              <Text style={styles.valueDisplayText}>{data.actual}</Text>
              <Text style={styles.unitText}>{data.unit}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const datesArray = getDatesArray();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[PRIMARY, SECONDARY]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Lối sống lành mạnh</Text>
            <Text style={styles.headerSubtitle}>
              Theo dõi bữa ăn & vận động
            </Text>
          </View>
          <TouchableOpacity
            style={styles.rangeButton}
            onPress={() => setRangeModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.rangeButtonText}>Lọc ngày</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch theo dõi</Text>
          <FlatList
            data={datesArray}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            initialScrollIndex={0}
            getItemLayout={(data, index) => ({
              length: 76, // width of dateBox (64) + marginRight (12)
              offset: 76 * index,
              index,
            })}
            renderItem={({ item }) => {
              const dateStr = formatDate(item);
              const isSelected = formatDate(selectedDate) === dateStr;
              const day = item.getDate();
              const month = item.getMonth() + 1; // getMonth() returns 0-11
              const dayName = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][
                item.getDay()
              ];

              return (
                <TouchableOpacity
                  onPress={() => setSelectedDate(item)}
                  style={[styles.dateBox, isSelected && styles.dateBoxActive]}
                >
                  <Text
                    style={[
                      styles.monthText,
                      isSelected && styles.monthTextActive,
                    ]}
                  >
                    T{month}
                  </Text>
                  <Text
                    style={[styles.dayName, isSelected && styles.dayNameActive]}
                  >
                    {dayName}
                  </Text>
                  <Text
                    style={[styles.dayDate, isSelected && styles.dayDateActive]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            }}
            style={styles.calendar}
          />
        </View>

        {/* Total Calories */}
        <View style={styles.caloriesSummary}>
          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesLabel}>Tổng calo hôm nay</Text>
            <Text style={styles.caloriesValue}>{totalCalories}</Text>
            <Text style={styles.caloriesUnit}>calo</Text>

            <View style={styles.caloriesBar}>
              <View
                style={[
                  styles.caloriesFill,
                  {
                    width: `${Math.min(
                      (totalCalories / targetCalories) * 100,
                      100
                    )}%`,
                    backgroundColor:
                      totalCalories > targetCalories ? DANGER : SUCCESS,
                  },
                ]}
              />
            </View>
            <View style={styles.caloriesTargetRow}>
              <Text style={styles.caloriesTarget}>
                Mục tiêu: {targetCalories} calo
              </Text>
              <Text style={styles.caloriesRemaining}>
                Còn lại: {Math.max(targetCalories - totalCalories, 0)} calo
              </Text>
            </View>
          </View>
        </View>

        {/* Management & Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quản lý & Cài đặt</Text>

          {/* Reminders Card */}
          <View style={styles.managementCard}>
            <View style={styles.managementInfo}>
              <Ionicons
                name="notifications-outline"
                size={28}
                color={SECONDARY}
              />
              <View style={styles.managementTextGroup}>
                <Text style={styles.managementTitle}>Nhắc nhở</Text>
                <Text style={styles.managementSubtitle}>
                  Quản lý nhắc nhở (tạo, sửa, xóa)
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.managementButton,
                { backgroundColor: `${SECONDARY}12` },
              ]}
              onPress={() => navigation.navigate("Reminders")}
            >
              <Ionicons name="arrow-forward" size={18} color={SECONDARY} />
              <Text style={[styles.managementButtonText, { color: SECONDARY }]}>
                Mở
              </Text>
            </TouchableOpacity>
          </View>

          {/* Target Management Card */}
          <View style={styles.managementCard}>
            <View style={styles.managementInfo}>
              <Ionicons name="fitness-outline" size={28} color={PRIMARY} />
              <View style={styles.managementTextGroup}>
                <Text style={styles.managementTitle}>Mục tiêu calo</Text>
                <Text style={styles.managementSubtitle}>
                  Hiện tại: {targetCalories} calo/ngày
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.managementButton,
                { backgroundColor: `${PRIMARY}12` },
              ]}
              onPress={() => setTargetModalVisible(true)}
            >
              <Ionicons name="settings-outline" size={18} color={PRIMARY} />
              <Text style={[styles.managementButtonText, { color: PRIMARY }]}>
                Cài đặt
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Meals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bữa ăn</Text>
            <TouchableOpacity
              style={styles.addMealButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add-circle" size={24} color={PRIMARY} />
              <Text style={styles.addMealText}>Thêm bữa ăn</Text>
            </TouchableOpacity>
          </View>
          {renderMealsFromAPI()}

          {/* Food Suggestions */}
          {foodSuggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionTitle}>Gợi ý món ăn</Text>
              <TouchableOpacity
                style={styles.viewSuggestionsBtn}
                onPress={() => setSuggestionModalVisible(true)}
              >
                <Text style={styles.viewSuggestionsText}>
                  Xem {foodSuggestions.length} gợi ý
                </Text>
                <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Exercise Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mục tiêu hàng ngày</Text>
          {renderExerciseCard("running", exerciseGoals.running)}
          {renderExerciseCard("sleep", exerciseGoals.sleep)}
        </View>
      </ScrollView>

      {/* Running Tracker Modal */}
      <Modal
        visible={runningModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setRunningModalVisible(false)}
      >
        <RunningTracker
          onClose={() => setRunningModalVisible(false)}
          onSave={async (runData) => {
            // Update exercise goals with running data
            const updated = { ...exerciseGoals };
            const newDistance = parseFloat(
              (updated.running.actual + runData.distance / 1000).toFixed(2)
            );
            updated.running.actual = newDistance;
            updated.running.completed =
              updated.running.actual >= updated.running.goal;
            setExerciseGoals(updated);

            // Lưu vào SQLite
            try {
              const accountStr = await AsyncStorage.getItem("account");
              if (accountStr) {
                const account = JSON.parse(accountStr);
                const accountId = account.accountId || account.id;
                const today = new Date().toISOString().split("T")[0];

                await offlineStorage.saveExerciseLog(
                  accountId,
                  "running",
                  today,
                  runData.distance / 1000, // km
                  "km",
                  {
                    duration: runData.duration,
                    pace: runData.pace,
                    calories: runData.calories,
                  }
                );
                console.log("✅ Running data saved to SQLite");
              }
            } catch (error) {
              console.error("❌ Failed to save running data:", error);
            }

            setRunningModalVisible(false);
          }}
        />
      </Modal>

      {/* Range Modal */}
      <Modal
        visible={rangeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRangeModalVisible(false)}
      >
        <View style={styles.modalContainerCentered}>
          <View style={styles.rangeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn khoảng thời gian</Text>
              <TouchableOpacity onPress={() => setRangeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.rangeBodyRow}>
              <View style={styles.rangeLeft}>
                <TouchableOpacity
                  style={styles.presetRow}
                  onPress={() => {
                    const d = new Date();
                    setRangeEnd(d);
                    const s = new Date();
                    s.setDate(d.getDate() - 0);
                    setRangeStart(s);
                  }}
                >
                  <Text style={styles.presetTextActive}>Hôm nay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetRow}
                  onPress={() => {
                    const d = new Date();
                    const s = new Date();
                    s.setDate(d.getDate() - 1);
                    setRangeStart(s);
                    setRangeEnd(d);
                  }}
                >
                  <Text style={styles.presetText}>Hôm qua</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetRow}
                  onPress={() => {
                    const d = new Date();
                    const s = new Date();
                    s.setDate(d.getDate() - 6);
                    setRangeStart(s);
                    setRangeEnd(d);
                  }}
                >
                  <Text style={styles.presetText}>Tuần này</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetRow}
                  onPress={() => {
                    const d = new Date();
                    const s = new Date();
                    s.setDate(d.getDate() - 29);
                    setRangeStart(s);
                    setRangeEnd(d);
                  }}
                >
                  <Text style={styles.presetText}>Tháng này</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetRow}
                  onPress={() => {
                    const d = new Date();
                    const s = new Date(d.getFullYear(), 0, 1);
                    setRangeStart(s);
                    setRangeEnd(d);
                  }}
                >
                  <Text style={styles.presetText}>Năm này</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rangeRight}>
                <View style={styles.calendarHeaderRow}>
                  <TouchableOpacity
                    onPress={() =>
                      setCalendarMonth(addMonths(calendarMonth, -1))
                    }
                  >
                    <Ionicons name="chevron-back" size={20} color="#444" />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>
                    {calendarMonth.getFullYear()} Năm Tháng{" "}
                    {calendarMonth.getMonth() + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setCalendarMonth(addMonths(calendarMonth, 1))
                    }
                  >
                    <Ionicons name="chevron-forward" size={20} color="#444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.weekRow}>
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d) => (
                    <Text key={d} style={styles.weekDay}>
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={{ maxHeight: 320 }}>
                  {(() => {
                    const grid = getMonthGrid(calendarMonth);
                    const rows = [];
                    for (let i = 0; i < grid.length; i += 7) {
                      const row = grid.slice(i, i + 7);
                      rows.push(row);
                    }
                    return rows.map((row, idx) => (
                      <View key={idx} style={styles.weekRow}>
                        {row.map((d) => {
                          const disabled =
                            d.getMonth() !== calendarMonth.getMonth();
                          const selectedStart =
                            calStart && isSameDay(d, calStart);
                          const selectedEnd = calEnd && isSameDay(d, calEnd);
                          const inRange = isInRange(
                            d,
                            calStart || rangeStart,
                            calEnd || rangeEnd
                          );
                          return (
                            <TouchableOpacity
                              key={d.toISOString()}
                              style={[
                                styles.dayBox,
                                disabled && styles.dayBoxDisabled,
                                inRange && styles.dayBoxInRange,
                              ]}
                              onPress={() => {
                                if (!calStart || (calStart && calEnd)) {
                                  setCalStart(d);
                                  setCalEnd(null);
                                } else {
                                  if (d < calStart) {
                                    setCalEnd(calStart);
                                    setCalStart(d);
                                  } else {
                                    setCalEnd(d);
                                  }
                                }
                              }}
                            >
                              <Text
                                style={[
                                  styles.dayText,
                                  selectedStart && styles.dayTextSelected,
                                  selectedEnd && styles.dayTextSelected,
                                ]}
                              >
                                {d.getDate()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 12,
                  }}
                >
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: "#ccc" }]}
                    onPress={() => {
                      setCalStart(null);
                      setCalEnd(null);
                      setRangeStart(
                        new Date(new Date().setDate(new Date().getDate() - 6))
                      );
                      setRangeEnd(new Date());
                    }}
                  >
                    <Text style={styles.submitBtnText}>Mặc định</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() => {
                      if (calStart && calEnd) {
                        setRangeStart(calStart);
                        setRangeEnd(calEnd);
                      } else if (calStart && !calEnd) {
                        setRangeStart(calStart);
                        setRangeEnd(calStart);
                      }
                      setRangeModalVisible(false);
                    }}
                  >
                    <Text style={styles.submitBtnText}>Áp dụng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reminders are handled on the separate Reminders screen */}

      {/* Modal Thêm Bữa Ăn Mới */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo bữa ăn mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Chọn loại bữa ăn *</Text>
                <View style={styles.mealOptionsContainer}>
                  {mealOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.mealOption,
                        newMeal.name === option.name && styles.mealOptionActive,
                      ]}
                      onPress={() => {
                        if (option.id === "custom") {
                          setNewMeal({
                            ...newMeal,
                            name: "Tùy chỉnh",
                            customName: "",
                          });
                        } else {
                          setNewMeal({
                            ...newMeal,
                            name: option.name,
                            time: option.time || newMeal.time,
                            customName: "",
                          });
                        }
                      }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={
                          newMeal.name === option.name
                            ? PRIMARY
                            : TEXT_SECONDARY
                        }
                        style={styles.mealOptionIconSpacing}
                      />
                      <Text
                        style={[
                          styles.mealOptionText,
                          newMeal.name === option.name &&
                            styles.mealOptionTextActive,
                        ]}
                      >
                        {option.name}
                      </Text>
                      {option.time && (
                        <Text style={styles.mealOptionTime}>{option.time}</Text>
                      )}
                      {newMeal.name === option.name && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={PRIMARY}
                          style={styles.mealOptionCheck}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {newMeal.name === "Tùy chỉnh" && (
                  <TextInput
                    style={[styles.input, { marginTop: 12 }]}
                    placeholder="Nhập tên bữa ăn tùy chỉnh..."
                    value={newMeal.customName}
                    onChangeText={(text) =>
                      setNewMeal({ ...newMeal, customName: text })
                    }
                    placeholderTextColor="#ccc"
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Thời gian *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM (VD: 07:30)"
                  value={newMeal.time}
                  onChangeText={(text) =>
                    setNewMeal({ ...newMeal, time: text })
                  }
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Món ăn đã chọn:</Text>
                {newMeal.items.length > 0 ? (
                  newMeal.items.map((item, index) => (
                    <View key={index} style={styles.selectedFoodItem}>
                      <Text style={styles.selectedFoodName}>{item.name}</Text>
                      <Text style={styles.selectedFoodPortion}>
                        {item.portion}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const updatedItems = newMeal.items.filter(
                            (_, i) => i !== index
                          );
                          setNewMeal({ ...newMeal, items: updatedItems });
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#ff6b6b"
                        />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Chưa chọn món ăn nào</Text>
                )}
              </View>

              {/* Danh sách món ăn */}
              <View style={styles.formGroup}>
                <View style={styles.sectionHeaderInline}>
                  <Text style={styles.label}>
                    Chọn món ăn ({availableFoods.length} món có sẵn):
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={loadAvailableFoods}
                  >
                    <Ionicons name="refresh" size={16} color={PRIMARY} />
                    <Text style={styles.refreshButtonText}>Tải lại</Text>
                  </TouchableOpacity>
                </View>

                {availableFoods.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={[
                      styles.foodSelectionItem,
                      selectedFoodForMeal?.id === food.id &&
                        styles.foodSelectionItemActive,
                    ]}
                    onPress={() => setSelectedFoodForMeal(food)}
                  >
                    <View style={styles.foodItemInfo}>
                      <Text style={styles.foodItemName}>{food.name}</Text>
                      <Text style={styles.foodItemCalories}>
                        {food.calories} calo/100g
                      </Text>
                      <Text
                        style={styles.foodItemIngredients}
                        numberOfLines={2}
                      >
                        {food.ingredients}
                      </Text>
                    </View>
                    {selectedFoodForMeal?.id === food.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={PRIMARY}
                      />
                    )}
                  </TouchableOpacity>
                ))}

                {selectedFoodForMeal && (
                  <View style={styles.portionSection}>
                    <Text style={styles.label}>Khẩu phần (gram) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VD: 100, 150, 200..."
                      value={portionAmount}
                      onChangeText={setPortionAmount}
                      keyboardType="numeric"
                      placeholderTextColor="#ccc"
                    />
                    {portionAmount && selectedFoodForMeal && (
                      <Text style={styles.caloriePreview}>
                        🔥 Tổng calo:{" "}
                        {Math.round(
                          (selectedFoodForMeal.calories *
                            parseFloat(portionAmount || 0)) /
                            100
                        )}{" "}
                        calo
                      </Text>
                    )}

                    <TouchableOpacity
                      style={styles.addFoodToMealBtn}
                      onPress={() => {
                        if (!selectedFoodForMeal || !portionAmount) {
                          Alert.alert(
                            "Thông báo",
                            "Vui lòng chọn món ăn và nhập khẩu phần"
                          );
                          return;
                        }

                        const portion = parseFloat(portionAmount);
                        if (isNaN(portion) || portion <= 0) {
                          Alert.alert(
                            "Thông báo",
                            "Vui lòng nhập khẩu phần hợp lệ (số dương)"
                          );
                          return;
                        }

                        const foodItem = {
                          id: `${
                            selectedFoodForMeal.id
                          }_${Date.now()}_${Math.random()
                            .toString(36)
                            .substr(2, 9)}`,
                          foodId: selectedFoodForMeal.id, // Original food ID for reference
                          name: selectedFoodForMeal.name,
                          calories: Math.round(
                            (selectedFoodForMeal.calories * portion) / 100
                          ),
                          portion: portion,
                        };

                        handleAddFoodToMeal(foodItem);

                        // Reset selections
                        setSelectedFoodForMeal(null);
                        setPortionAmount("");
                        Alert.alert(
                          "Thành công",
                          `Đã thêm ${foodItem.name} vào bữa ăn`
                        );
                      }}
                      disabled={!selectedFoodForMeal || !portionAmount}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.addFoodToMealText}>Thêm món ăn</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddMeal}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Tạo bữa ăn</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Food Suggestions Modal */}
      <Modal
        visible={suggestionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSuggestionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gợi ý món ăn</Text>
              <TouchableOpacity
                onPress={() => setSuggestionModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {foodSuggestions.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={styles.foodSuggestionItem}
                  onPress={() => {
                    setSelectedFood(food);
                    setFoodDetailModalVisible(true);
                  }}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodCalories}>
                      {food.calories} calo
                    </Text>
                    <Text style={styles.foodIngredients} numberOfLines={2}>
                      {food.ingredients}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Food Detail Modal */}
      <Modal
        visible={foodDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFoodDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedFood && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedFood.name}</Text>
                  <TouchableOpacity
                    onPress={() => setFoodDetailModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      Calo: {selectedFood.calories}
                    </Text>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nguyên liệu:</Text>
                    <Text style={styles.recipeText}>
                      {selectedFood.ingredients}
                    </Text>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Cách làm:</Text>
                    <Text style={styles.recipeText}>{selectedFood.recipe}</Text>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Target Setting Modal */}
      <Modal
        visible={targetModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTargetModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đặt mục tiêu calo</Text>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mục tiêu hàng ngày</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2000"
                  value={String(newTargets.dailyTarget)}
                  onChangeText={(text) =>
                    setNewTargets({
                      ...newTargets,
                      dailyTarget: parseInt(text) || 0,
                    })
                  }
                  keyboardType="number-pad"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mục tiêu hàng tuần</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14000"
                  value={String(newTargets.weeklyTarget)}
                  onChangeText={(text) =>
                    setNewTargets({
                      ...newTargets,
                      weeklyTarget: parseInt(text) || 0,
                    })
                  }
                  keyboardType="number-pad"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mục tiêu hàng tháng</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60000"
                  value={String(newTargets.monthlyTarget)}
                  onChangeText={(text) =>
                    setNewTargets({
                      ...newTargets,
                      monthlyTarget: parseInt(text) || 0,
                    })
                  }
                  keyboardType="number-pad"
                  placeholderTextColor="#ccc"
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={async () => {
                  const success = await setCalorieTargets(newTargets);
                  if (success) {
                    setTargetModalVisible(false);
                  }
                }}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Cập nhật mục tiêu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 80,
    justifyContent: "center",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "500",
  },

  rangeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rangeButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingVertical: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  calendar: {
    marginBottom: 12,
  },
  dateBox: {
    width: 64,
    height: 94,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dateBoxActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },
  dayNameActive: {
    color: "#fff",
  },
  dayDate: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  dayDateActive: {
    color: "#fff",
  },
  monthText: {
    fontSize: 10,
    fontWeight: "600",
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  monthTextActive: {
    color: "rgba(255,255,255,0.8)",
  },
  caloriesSummary: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  caloriesCard: {
    backgroundColor: CARD_BG,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  caloriesLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  caloriesValue: {
    fontSize: 56,
    fontWeight: "900",
    color: PRIMARY,
    letterSpacing: -1,
  },
  caloriesUnit: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginTop: 4,
  },
  caloriesBar: {
    width: "100%",
    height: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    marginVertical: 16,
    overflow: "hidden",
  },
  caloriesFill: {
    height: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 6,
  },
  caloriesTarget: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  mealSection: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  mealTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mealTextGroup: {
    marginLeft: 14,
    flex: 1,
  },

  mealTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 0.3,
  },
  mealCalories: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
    fontWeight: "600",
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  mealThumb: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${PRIMARY}12`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
    borderWidth: 2,
    borderColor: `${PRIMARY}20`,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealThumbText: {
    fontSize: 20,
    fontWeight: "800",
    color: PRIMARY,
  },
  mealItemInfo: {
    flex: 1,
    flexDirection: "column",
  },
  mealItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 12,
  },
  mealItemCals: {
    fontSize: 13,
    color: SUCCESS,
    fontWeight: "600",
  },
  mealTime: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  mealActions: {
    marginLeft: 8,
    alignItems: "flex-end",
  },
  iconBtn: {
    padding: 6,
  },
  emptyMeal: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontStyle: "italic",
    paddingVertical: 16,
    textAlign: "center",
  },
  exerciseCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  exerciseHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  startRunButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${PRIMARY}10`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  startRunText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY,
  },
  exerciseTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  exerciseLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  exerciseProgress: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
    fontWeight: "600",
  },
  progressBarContainer: {
    width: "100%",
    height: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    borderRadius: 6,
  },
  exerciseInputGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_SECONDARY,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  inputBoxDisabled: {
    backgroundColor: "#e2e8f0",
    opacity: 0.7,
  },
  exerciseInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  unitText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: "600",
  },
  valueDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    gap: 8,
  },
  valueDisplayText: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    letterSpacing: 0.3,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: TEXT_PRIMARY,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    fontWeight: "500",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  calorieInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingRight: 12,
  },
  calorieUnit: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  modalContainerCentered: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  rangeModalContent: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
  },
  rangeBody: {
    padding: 20,
  },
  rangeBodyRow: {
    flexDirection: "row",
  },
  rangeLeft: {
    width: 80,
    borderRightWidth: 1,
    borderRightColor: "#eee",
    paddingRight: 12,
    paddingLeft: 8,
  },
  rangeRight: {
    flex: 1,
    padding: 12,
  },
  presetRow: {
    paddingVertical: 12,
  },
  presetText: {
    color: "#444",
    fontSize: 12,
  },
  presetTextActive: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "700",
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  calendarTitle: {
    fontWeight: "700",
    color: "#333",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  weekDay: {
    width: 36,
    textAlign: "center",
    color: "#888",
  },
  dayBox: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  dayBoxDisabled: {
    opacity: 0.3,
  },
  dayBoxInRange: {
    backgroundColor: "#e6f4ff",
    borderRadius: 6,
  },
  dayText: {
    color: "#333",
  },
  dayTextSelected: {
    color: PRIMARY,
    fontWeight: "700",
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  rangeDate: {
    fontSize: 16,
    fontWeight: "700",
  },
  rangeLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  reminderDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  // New API-related styles
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${PRIMARY}12`,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: `${PRIMARY}30`,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addMealText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: "700",
    marginLeft: 6,
  },
  suggestionsSection: {
    backgroundColor: `${ACCENT}08`,
    borderRadius: 20,
    padding: 22,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: `${ACCENT}25`,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  viewSuggestionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  viewSuggestionsText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
    marginRight: 4,
  },

  targetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${PRIMARY}12`,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: `${PRIMARY}30`,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  targetButtonText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "700",
    marginLeft: 6,
  },
  caloriesTargetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  caloriesRemaining: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: "600",
  },
  foodSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  foodCalories: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
    marginBottom: 4,
  },
  foodIngredients: {
    fontSize: 11,
    color: "#666",
    lineHeight: 16,
  },
  recipeText: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
    marginTop: 4,
  },
  selectedFoodItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f4ff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedFoodName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  selectedFoodPortion: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  selectFoodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectFoodText: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  // Management & Settings styles
  managementCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  managementInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  managementTextGroup: {
    marginLeft: 14,
    flex: 1,
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  managementSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 3,
    fontWeight: "500",
  },
  managementButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  managementButtonText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },

  // New styles for inline food selection
  sectionHeaderInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: `${PRIMARY}12`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButtonText: {
    fontSize: 12,
    color: PRIMARY,
    marginLeft: 4,
    fontWeight: "600",
  },
  foodSelectionItem: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  foodSelectionItemActive: {
    backgroundColor: `${PRIMARY}08`,
    borderColor: PRIMARY,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  foodItemCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    marginBottom: 4,
  },
  foodItemIngredients: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 16,
  },
  portionSection: {
    backgroundColor: `${SUCCESS}08`,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: `${SUCCESS}20`,
  },
  caloriePreview: {
    fontSize: 13,
    color: SUCCESS,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    backgroundColor: `${SUCCESS}10`,
    padding: 8,
    borderRadius: 8,
  },
  addFoodToMealBtn: {
    flexDirection: "row",
    backgroundColor: SUCCESS,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: SUCCESS,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addFoodToMealText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 6,
  },

  // Meal Options Styles
  mealOptionsContainer: {
    gap: 12,
  },
  mealOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mealOptionActive: {
    backgroundColor: `${PRIMARY}08`,
    borderColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.15,
  },
  mealOptionIconSpacing: {
    marginRight: 12,
  },
  mealOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  mealOptionTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },
  mealOptionTime: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: "500",
    marginRight: 8,
  },
  mealOptionCheck: {
    marginLeft: 8,
  },
});

export default WellnessTrackerScreen;
