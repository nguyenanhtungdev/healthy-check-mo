import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import offlineStorage from "./offlineStorage";

class SleepTracker {
  constructor() {
    this.appStateSubscription = null;
    this.lastActiveTime = null;
    this.sleepStartTime = null;
    this.isSleeping = false;
  }

  // Check if current time is in sleep hours (9 PM - 6 AM)
  isNightTime() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 21 || hour < 6; // 9 PM to 6 AM
  }

  // Calculate sleep duration in hours
  calculateSleepDuration(startTime, endTime) {
    const duration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
    return Math.round(duration * 10) / 10; // Round to 1 decimal
  }

  // Start tracking sleep
  async startSleepSession() {
    this.sleepStartTime = new Date();
    this.isSleeping = true;

    await AsyncStorage.setItem(
      "sleepStartTime",
      this.sleepStartTime.toISOString()
    );
    await AsyncStorage.setItem("isSleeping", "true");

    console.log(
      "😴 Sleep session started at:",
      this.sleepStartTime.toLocaleString()
    );
  }

  // End tracking sleep and save data
  async endSleepSession() {
    if (!this.sleepStartTime || !this.isSleeping) {
      return null;
    }

    const endTime = new Date();
    const duration = this.calculateSleepDuration(this.sleepStartTime, endTime);

    // Only save if sleep duration is reasonable (> 0.5 hours)
    if (duration < 0.5) {
      console.log("⚠️ Sleep duration too short, not saving");
      this.resetSleepTracking();
      return null;
    }

    const sleepData = {
      startTime: this.sleepStartTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: duration,
      date: this.sleepStartTime.toISOString().split("T")[0], // YYYY-MM-DD
    };

    // Save to AsyncStorage
    try {
      const existingSleep = await AsyncStorage.getItem("sleepHistory");
      const sleepHistory = existingSleep ? JSON.parse(existingSleep) : [];
      sleepHistory.push(sleepData);

      // Keep only last 30 days
      const last30Days = sleepHistory.filter((sleep) => {
        const sleepDate = new Date(sleep.date);
        const daysDiff =
          (Date.now() - sleepDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      });

      await AsyncStorage.setItem("sleepHistory", JSON.stringify(last30Days));

      // Update today's sleep total and save to SQLite
      const today = new Date().toISOString().split("T")[0];
      const todaySleep = last30Days
        .filter((sleep) => sleep.date === today)
        .reduce((sum, sleep) => sum + sleep.duration, 0);

      await AsyncStorage.setItem("todaySleepHours", todaySleep.toString());

      // Lưu vào SQLite
      try {
        const accountStr = await AsyncStorage.getItem("account");
        if (accountStr) {
          const account = JSON.parse(accountStr);
          const accountId = account.accountId || account.id;

          await offlineStorage.saveExerciseLog(
            accountId,
            "sleep",
            sleepData.date,
            duration,
            "giờ",
            {
              startTime: sleepData.startTime,
              endTime: sleepData.endTime,
            }
          );
          console.log("✅ Sleep saved to SQLite");
        }
      } catch (sqlError) {
        console.error("❌ Failed to save sleep to SQLite:", sqlError);
      }

      console.log("✅ Sleep saved:", duration, "hours");
      this.resetSleepTracking();

      return sleepData;
    } catch (error) {
      console.error("Error saving sleep data:", error);
      this.resetSleepTracking();
      return null;
    }
  }

  // Reset sleep tracking state
  async resetSleepTracking() {
    this.sleepStartTime = null;
    this.isSleeping = false;
    await AsyncStorage.removeItem("sleepStartTime");
    await AsyncStorage.removeItem("isSleeping");
  }

  // Get today's total sleep hours
  async getTodaySleepHours() {
    try {
      // Try SQLite first
      const accountStr = await AsyncStorage.getItem("account");
      if (accountStr) {
        const account = JSON.parse(accountStr);
        const accountId = account.accountId || account.id;
        const today = new Date().toISOString().split("T")[0];

        const result = await offlineStorage.getTotalExercise(
          accountId,
          "sleep",
          today
        );
        if (result.total > 0) {
          return result.total;
        }
      }

      // Fallback to AsyncStorage
      const hours = await AsyncStorage.getItem("todaySleepHours");
      return hours ? parseFloat(hours) : 0;
    } catch (error) {
      console.error("Error getting today sleep hours:", error);
      return 0;
    }
  }

  // Get sleep history
  async getSleepHistory(days = 7) {
    try {
      const history = await AsyncStorage.getItem("sleepHistory");
      if (!history) return [];

      const sleepData = JSON.parse(history);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return sleepData.filter((sleep) => {
        return new Date(sleep.date) >= cutoffDate;
      });
    } catch (error) {
      console.error("Error getting sleep history:", error);
      return [];
    }
  }

  // Initialize and start monitoring
  async initialize() {
    // Restore state if app was closed during sleep
    try {
      const savedStartTime = await AsyncStorage.getItem("sleepStartTime");
      const wasSleeping = await AsyncStorage.getItem("isSleeping");

      if (savedStartTime && wasSleeping === "true") {
        this.sleepStartTime = new Date(savedStartTime);
        this.isSleeping = true;
        console.log(
          "📱 Restored sleep session from:",
          this.sleepStartTime.toLocaleString()
        );
      }
    } catch (error) {
      console.error("Error restoring sleep state:", error);
    }

    // Monitor app state changes
    this.appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        const now = new Date();

        if (nextAppState === "background" || nextAppState === "inactive") {
          // App went to background
          this.lastActiveTime = now;
          console.log("📱 App went to background at:", now.toLocaleString());

          // If it's night time and not already sleeping, prepare to track
          if (this.isNightTime() && !this.isSleeping) {
            await AsyncStorage.setItem("lastBackgroundTime", now.toISOString());
          }
        } else if (nextAppState === "active") {
          // App came to foreground
          console.log("📱 App came to foreground at:", now.toLocaleString());

          // Check if we should end sleep session
          if (this.isSleeping) {
            await this.endSleepSession();
          } else {
            // Check if app was in background long enough during night time
            const lastBgTime = await AsyncStorage.getItem("lastBackgroundTime");
            if (lastBgTime) {
              const bgTime = new Date(lastBgTime);
              const inactiveMinutes = (now - bgTime) / (1000 * 60);

              // If inactive > 5 minutes during night time, consider it as sleep
              if (inactiveMinutes > 5 && this.isNightTime()) {
                this.sleepStartTime = bgTime;
                await this.endSleepSession();
              }
            }

            await AsyncStorage.removeItem("lastBackgroundTime");
          }
        }
      }
    );

    console.log("😴 Sleep tracker initialized");
  }

  // Stop monitoring
  cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    console.log("😴 Sleep tracker cleaned up");
  }

  // Manual start sleep (for testing or manual tracking)
  async manualStartSleep() {
    await this.startSleepSession();
  }

  // Manual end sleep (for testing or manual tracking)
  async manualEndSleep() {
    return await this.endSleepSession();
  }
}

// Singleton instance
const sleepTracker = new SleepTracker();

export default sleepTracker;
