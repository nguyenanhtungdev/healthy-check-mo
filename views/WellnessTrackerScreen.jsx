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
import { Platform } from "react-native";
// Note: we'll use the community DateTimePicker if available in the app environment
let DateTimePicker = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch (e) {
  // dependency not installed; we'll fallback to +/- controls already present
  DateTimePicker = null;
}

// reminders moved to a dedicated screen (RemindersScreen)

const PRIMARY = "#667eea";

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

  // Meals State
  const [meals, setMeals] = useState({
    breakfast: [
      { id: "1", name: "Cơm trắng", calories: 206 },
      { id: "2", name: "Trứng rán", calories: 155 },
    ],
    lunch: [{ id: "3", name: "Cơm gà", calories: 350 }],
    dinner: [],
  });

  const [newMeal, setNewMeal] = useState({ name: "", calories: "" });

  // Exercise Goals State
  const [exerciseGoals, setExerciseGoals] = useState({
    running: { goal: 5, actual: 2, unit: "km", completed: false },
    pushups: { goal: 30, actual: 15, unit: "lần", completed: false },
    sleep: { goal: 8, actual: 6.5, unit: "giờ", completed: false },
  });

  const [editingExercise, setEditingExercise] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Calendar State
  const [history, setHistory] = useState({
    "2025-10-17": {
      meals: { breakfast: 361, lunch: 350, dinner: 0 },
      exercise: { running: 2, pushups: 15, sleep: 6.5 },
    },
    "2025-10-16": {
      meals: { breakfast: 350, lunch: 400, dinner: 250 },
      exercise: { running: 5, pushups: 30, sleep: 8 },
    },
  });

  const totalCalories = Object.values(meals)
    .flat()
    .reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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
    return dates;
  };

  // Reminders are managed in a separate Reminders screen (registered on the root stack)

  const handleAddMeal = (mealType) => {
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

  const getMealIcon = (type) => {
    switch (type) {
      case "breakfast":
        return "☕";
      case "lunch":
        return "🍽️";
      case "dinner":
        return "🍽️";
      default:
        return "🍴";
    }
  };

  const renderMealSection = (mealType) => {
    const mealData = meals[mealType];
    const totalMealCals = mealData.reduce((sum, m) => sum + m.calories, 0);

    return (
      <View key={mealType} style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleGroup}>
            <Text style={styles.mealIcon}>{getMealIcon(mealType)}</Text>
            <View>
              <Text style={styles.mealTitle}>{getMealTypeLabel(mealType)}</Text>
              <Text style={styles.mealCalories}>{totalMealCals} calo</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              setModalType(mealType);
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle" size={28} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {mealData.length > 0 ? (
          mealData.map((meal) => (
            <View key={meal.id} style={styles.mealItem}>
              <View style={styles.mealThumb}>
                <Text style={styles.mealThumbText}>
                  {meal.name && meal.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.mealItemInfo}>
                <Text style={styles.mealItemName}>{meal.name}</Text>
                <View style={styles.mealMeta}>
                  <Text style={styles.mealItemCals}>{meal.calories} calo</Text>
                  <Text style={styles.mealTime}>07:30</Text>
                </View>
              </View>

              <View style={styles.mealActions}>
                <TouchableOpacity
                  onPress={() => handleDeleteMeal(mealType, meal.id)}
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyMeal}>Chưa có bữa ăn nào</Text>
        )}
      </View>
    );
  };

  const renderExerciseCard = (type, data) => {
    const percentage = Math.min((data.actual / data.goal) * 100, 100);
    let exerciseLabel = "";
    let exerciseIcon = "";

    switch (type) {
      case "running":
        exerciseLabel = "Chạy bộ";
        exerciseIcon = "🏃";
        break;
      case "pushups":
        exerciseLabel = "Hít đất";
        exerciseIcon = "💪";
        break;
      case "sleep":
        exerciseLabel = "Ngủ";
        exerciseIcon = "😴";
        break;
    }

    return (
      <View key={type} style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseTitleGroup}>
            <Text style={styles.exerciseIcon}>{exerciseIcon}</Text>
            <View>
              <Text style={styles.exerciseLabel}>{exerciseLabel}</Text>
              <Text style={styles.exerciseProgress}>
                {data.actual} / {data.goal} {data.unit}
              </Text>
            </View>
          </View>
          {data.completed && (
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          )}
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${percentage}%`,
                backgroundColor:
                  data.completed || percentage >= 75
                    ? "#10b981"
                    : percentage >= 50
                    ? "#f59e0b"
                    : "#ef4444",
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
            <View style={styles.inputBox}>
              <TextInput
                style={styles.exerciseInput}
                value={String(data.actual)}
                onChangeText={(value) => handleUpdateExercise(type, value)}
                keyboardType="decimal-pad"
              />
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
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Lối sống lành mạnh</Text>
          <Text style={styles.headerSubtitle}>Theo dõi bữa ăn & vận động</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.rangeButton}
            onPress={() => setRangeModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.rangeButtonText}>Lọc ngày</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Reminders Entry Point (navigates to full Reminders page) */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.sectionTitle}>Nhắc nhở</Text>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { paddingHorizontal: 12, paddingVertical: 8, width: "auto" },
              ]}
              onPress={() => navigation.navigate("Reminders")}
            >
              <Ionicons name="notifications-outline" size={18} color="#fff" />
              <Text
                style={[styles.submitBtnText, { width: "auto", marginLeft: 8 }]}
              >
                Mở nhắc nhở
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#666", marginTop: 8 }}>
            Nhấn để quản lý nhắc nhở (tạo, sửa, xóa)
          </Text>
        </View>
        {/* Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch theo dõi</Text>
          <FlatList
            data={datesArray}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => {
              const dateStr = formatDate(item);
              const isSelected = formatDate(selectedDate) === dateStr;
              const day = item.getDate();
              const dayName = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][
                item.getDay()
              ];

              return (
                <TouchableOpacity
                  onPress={() => setSelectedDate(item)}
                  style={[styles.dateBox, isSelected && styles.dateBoxActive]}
                >
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
                  { width: `${Math.min((totalCalories / 2000) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.caloriesTarget}>Mục tiêu: 2000 calo</Text>
          </View>
        </View>

        {/* Meals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bữa ăn</Text>
          {renderMealSection("breakfast")}
          {renderMealSection("lunch")}
          {renderMealSection("dinner")}
        </View>

        {/* Exercise Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mục tiêu hàng ngày</Text>
          {renderExerciseCard("running", exerciseGoals.running)}
          {renderExerciseCard("pushups", exerciseGoals.pushups)}
          {renderExerciseCard("sleep", exerciseGoals.sleep)}
        </View>
      </ScrollView>

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

      {/* Modal Thêm Bữa Ăn */}
      <Modal
        visible={modalVisible && modalType !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Thêm món ăn - {getMealTypeLabel(modalType)}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên món ăn *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Cơm gà, Canh chua..."
                  value={newMeal.name}
                  onChangeText={(text) =>
                    setNewMeal({ ...newMeal, name: text })
                  }
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Lượng calo *</Text>
                <View style={styles.calorieInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 250"
                    value={newMeal.calories}
                    onChangeText={(text) =>
                      setNewMeal({ ...newMeal, calories: text })
                    }
                    keyboardType="number-pad"
                    placeholderTextColor="#ccc"
                  />
                  <Text style={styles.calorieUnit}>calo</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => handleAddMeal(modalType)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Thêm bữa ăn</Text>
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
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  headerActions: {
    position: "absolute",
    right: 16,
    top: 18,
  },
  rangeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rangeButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  calendar: {
    marginBottom: 8,
  },
  dateBox: {
    width: 60,
    height: 70,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  dateBoxActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  dayNameActive: {
    color: "#fff",
  },
  dayDate: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  dayDateActive: {
    color: "#fff",
  },
  caloriesSummary: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  caloriesCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  caloriesLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  caloriesValue: {
    fontSize: 48,
    fontWeight: "700",
    color: PRIMARY,
  },
  caloriesUnit: {
    fontSize: 12,
    color: "#666",
  },
  caloriesBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    marginVertical: 12,
    overflow: "hidden",
  },
  caloriesFill: {
    height: "100%",
    backgroundColor: PRIMARY,
  },
  caloriesTarget: {
    fontSize: 12,
    color: "#999",
  },
  mealSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  mealCalories: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  mealThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#f0f4ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mealThumbText: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY,
  },
  mealItemInfo: {
    flex: 1,
    flexDirection: "column",
  },
  mealItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  mealItemCals: {
    fontSize: 12,
    color: "#666",
  },
  mealTime: {
    fontSize: 12,
    color: "#999",
  },
  mealActions: {
    marginLeft: 8,
    alignItems: "flex-end",
  },
  iconBtn: {
    padding: 6,
  },
  emptyMeal: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  exerciseIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  exerciseLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  exerciseProgress: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
  },
  exerciseInputGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingRight: 8,
  },
  exerciseInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#000",
  },
  unitText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
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
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
    textAlign: "center",
    width: 100,
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
});

export default WellnessTrackerScreen;
