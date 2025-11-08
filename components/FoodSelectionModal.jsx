import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Color constants
const PRIMARY = "#6366f1";
const TEXT_PRIMARY = "#1e293b";
const TEXT_SECONDARY = "#64748b";
const TEXT_MUTED = "#94a3b8";
const BORDER_COLOR = "#e2e8f0";
const CARD_BG = "#ffffff";
const SUCCESS = "#4ade80";

console.log("📦 FoodSelectionModal component loaded");

const FoodSelectionModal = ({
  visible,
  onClose,
  availableFoods,
  selectedFoodForMeal,
  setSelectedFoodForMeal,
  portionAmount,
  setPortionAmount,
  onAddFood,
  onRefreshFoods,
}) => {
  console.log("🎭 FoodSelectionModal render - visible:", visible);
  console.log(
    "🍕 FoodSelectionModal availableFoods:",
    availableFoods?.length || 0
  );

  useEffect(() => {
    console.log(
      "🔄 FoodSelectionModal useEffect - visible changed to:",
      visible
    );
  }, [visible]);

  const handleAddFoodToMeal = () => {
    if (!selectedFoodForMeal || !portionAmount) {
      Alert.alert("Thông báo", "Vui lòng chọn món ăn và nhập khẩu phần");
      return;
    }

    const portion = parseFloat(portionAmount);
    if (isNaN(portion) || portion <= 0) {
      Alert.alert("Thông báo", "Vui lòng nhập khẩu phần hợp lệ (số dương)");
      return;
    }

    const foodItem = {
      id: selectedFoodForMeal.id,
      name: selectedFoodForMeal.name,
      calories: Math.round((selectedFoodForMeal.calories * portion) / 100),
      portion: `${portionAmount}g`,
    };

    // Show success message before reset
    Alert.alert("Thành công", `Đã thêm ${selectedFoodForMeal.name} vào bữa ăn`);

    // Call parent callback to add food
    onAddFood(foodItem);

    // Reset selections
    setSelectedFoodForMeal(null);
    setPortionAmount("");
    onClose();
  };

  const handleClose = () => {
    console.log("❌ FoodSelectionModal handleClose called");
    setSelectedFoodForMeal(null);
    setPortionAmount("");
    onClose();
  };

  console.log(
    "✅ FoodSelectionModal rendering Modal component with visible:",
    visible
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      presentationStyle="pageSheet"
      onRequestClose={() => {
        console.log("📱 Modal onRequestClose triggered");
        handleClose();
      }}
      onShow={() => {
        console.log("🎪 Modal onShow triggered - Modal is now visible!");
      }}
    >
      {console.log(
        "🏗️ Rendering Modal content with foods:",
        availableFoods.length
      )}
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Danh sách món ăn</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.headerRow}>
              <Text style={styles.label}>
                Chọn món ăn ({availableFoods.length} món có sẵn):
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={onRefreshFoods}
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
                  <Text style={styles.foodItemIngredients} numberOfLines={2}>
                    {food.ingredients}
                  </Text>
                </View>
                {selectedFoodForMeal?.id === food.id && (
                  <Ionicons name="checkmark-circle" size={24} color={PRIMARY} />
                )}
              </TouchableOpacity>
            ))}

            {selectedFoodForMeal && (
              <View style={styles.formGroup}>
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
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: TEXT_MUTED, flex: 1 },
                ]}
                onPress={handleClose}
              >
                <Ionicons name="close" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1 }]}
                onPress={handleAddFoodToMeal}
                disabled={!selectedFoodForMeal || !portionAmount}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Thêm món ăn</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
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
  formGroup: {
    marginBottom: 24,
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
    marginTop: 10,
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
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
});

export default FoodSelectionModal;
