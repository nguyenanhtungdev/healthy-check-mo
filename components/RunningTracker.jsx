import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

const RunningTracker = ({ onClose, onSave }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0); // in meters
  const [duration, setDuration] = useState(0); // in seconds
  const [pace, setPace] = useState(0); // min/km
  const [calories, setCalories] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h

  const locationSubscription = useRef(null);
  const lastLocation = useRef(null);
  const timerInterval = useRef(null);
  const startTime = useRef(null);
  const pausedTime = useRef(0);

  // Request permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền truy cập",
          "Cần quyền truy cập vị trí để theo dõi chạy bộ"
        );
      }
    })();

    return () => {
      stopTracking();
    };
  }, []);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Calculate calories (rough estimate: 1 calorie per kg per km)
  const calculateCalories = (distanceKm) => {
    const userWeight = 70; // kg (could be from user profile)
    return Math.round(distanceKm * userWeight);
  };

  // Start tracking
  const startTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Lỗi", "Cần quyền truy cập vị trí để bắt đầu");
        return;
      }

      setIsTracking(true);
      setIsPaused(false);
      startTime.current = Date.now() - pausedTime.current * 1000;

      // Start timer
      timerInterval.current = setInterval(() => {
        if (!isPaused) {
          const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
          setDuration(elapsed);
        }
      }, 1000);

      // Start location tracking
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5, // Update every 5 meters
          timeInterval: 1000, // Update every 1 second
        },
        (location) => {
          if (lastLocation.current && !isPaused) {
            const { latitude, longitude } = location.coords;
            const { latitude: lastLat, longitude: lastLon } =
              lastLocation.current;

            const dist = calculateDistance(
              lastLat,
              lastLon,
              latitude,
              longitude
            );

            // Only add distance if movement is significant (> 2 meters) to reduce GPS noise
            if (dist > 2 && dist < 100) {
              setDistance((prev) => {
                const newDistance = prev + dist;
                const distanceKm = newDistance / 1000;

                // Update calories
                setCalories(calculateCalories(distanceKm));

                // Update pace (min/km)
                if (duration > 0) {
                  const paceValue = duration / 60 / distanceKm;
                  setPace(isFinite(paceValue) ? paceValue : 0);
                }

                return newDistance;
              });
            }

            // Update current speed
            if (location.coords.speed !== null && location.coords.speed > 0) {
              setCurrentSpeed(location.coords.speed * 3.6); // m/s to km/h
            }
          }

          lastLocation.current = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
        }
      );
    } catch (error) {
      console.error("Error starting tracking:", error);
      Alert.alert("Lỗi", "Không thể bắt đầu theo dõi");
    }
  };

  // Pause tracking
  const pauseTracking = () => {
    setIsPaused(true);
    pausedTime.current = duration;
  };

  // Resume tracking
  const resumeTracking = () => {
    setIsPaused(false);
    startTime.current = Date.now() - pausedTime.current * 1000;
  };

  // Stop tracking
  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setIsTracking(false);
    setIsPaused(false);
    lastLocation.current = null;
  };

  // Finish and save
  const finishRun = () => {
    stopTracking();

    if (distance < 100) {
      Alert.alert(
        "Thông báo",
        "Quãng đường quá ngắn (< 100m). Bạn có muốn lưu không?",
        [
          { text: "Hủy", style: "cancel", onPress: () => reset() },
          { text: "Lưu", onPress: () => saveRun() },
        ]
      );
    } else {
      saveRun();
    }
  };

  // Save run data
  const saveRun = () => {
    const runData = {
      distance: (distance / 1000).toFixed(2), // km
      duration: duration,
      pace: pace.toFixed(2),
      calories: calories,
      date: new Date().toISOString(),
    };

    onSave && onSave(runData);
    reset();
    onClose && onClose();
  };

  // Reset all data
  const reset = () => {
    stopTracking();
    setDistance(0);
    setDuration(0);
    setPace(0);
    setCalories(0);
    setCurrentSpeed(0);
    pausedTime.current = 0;
  };

  // Format time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
        2,
        "0"
      )}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏃 Chạy bộ</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Main Stats */}
      <View style={styles.statsContainer}>
        {/* Distance - Primary metric */}
        <View style={styles.primaryStat}>
          <Text style={styles.primaryValue}>
            {(distance / 1000).toFixed(2)}
          </Text>
          <Text style={styles.primaryUnit}>km</Text>
          <Text style={styles.meterValue}>({distance.toFixed(0)} m)</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={24} color="#667eea" />
          <Text style={styles.timerText}>{formatTime(duration)}</Text>
        </View>

        {/* Secondary stats */}
        <View style={styles.secondaryStats}>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={20} color="#667eea" />
            <Text style={styles.statValue}>
              {pace > 0 ? pace.toFixed(1) : "--"}
            </Text>
            <Text style={styles.statLabel}>min/km</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color="#10b981" />
            <Text style={styles.statValue}>{currentSpeed.toFixed(1)}</Text>
            <Text style={styles.statLabel}>km/h</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={20} color="#f59e0b" />
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>calo</Text>
          </View>
        </View>
      </View>

      {/* Status */}
      {isTracking && (
        <View style={styles.statusContainer}>
          <View
            style={[styles.statusDot, isPaused && styles.statusDotPaused]}
          />
          <Text style={styles.statusText}>
            {isPaused ? "⏸️ Tạm dừng" : "🏃 Đang chạy..."}
          </Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Ionicons name="play" size={32} color="#fff" />
            <Text style={styles.startButtonText}>Bắt đầu</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={isPaused ? resumeTracking : pauseTracking}
            >
              <Ionicons
                name={isPaused ? "play" : "pause"}
                size={24}
                color="#fff"
              />
              <Text style={styles.controlButtonText}>
                {isPaused ? "Tiếp tục" : "Tạm dừng"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stopButton} onPress={finishRun}>
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>Kết thúc</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tips */}
      {!isTracking && (
        <View style={styles.tips}>
          <Ionicons name="information-circle-outline" size={16} color="#999" />
          <Text style={styles.tipsText}>
            Giữ điện thoại trong khi chạy để theo dõi chính xác
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  statsContainer: {
    padding: 20,
  },
  primaryStat: {
    alignItems: "center",
    marginBottom: 20,
  },
  primaryValue: {
    fontSize: 72,
    fontWeight: "700",
    color: "#667eea",
  },
  primaryUnit: {
    fontSize: 24,
    fontWeight: "600",
    color: "#9ca3af",
    marginTop: -10,
  },
  meterValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
    marginTop: 4,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "center",
  },
  timerText: {
    fontSize: 32,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  secondaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
    marginRight: 8,
  },
  statusDotPaused: {
    backgroundColor: "#f59e0b",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  controls: {
    paddingHorizontal: 20,
  },
  startButton: {
    backgroundColor: "#667eea",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  pauseButton: {
    backgroundColor: "#f59e0b",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
  },
  stopButton: {
    backgroundColor: "#ef4444",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  tips: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  tipsText: {
    fontSize: 14,
    color: "#999",
    marginLeft: 6,
  },
});

export default RunningTracker;
