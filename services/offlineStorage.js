import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

/**
 * Offline Storage Service
 * Kết hợp SQLite (dữ liệu phức tạp) và AsyncStorage (settings đơn giản)
 */

class OfflineStorageService {
  constructor() {
    this.db = null;
    this.isOnline = true;
    this.initNetworkListener();
  }

  /**
   * Khởi tạo database
   */
  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync("healthycheck.db");
      await this.createTables();
      console.log("✅ Offline database initialized");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize database:", error);
      return false;
    }
  }

  /**
   * Tạo các bảng cần thiết
   */
  async createTables() {
    if (!this.db) return;

    try {
      // Bảng profile
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          accountId TEXT UNIQUE NOT NULL,
          fullName TEXT,
          email TEXT,
          phone TEXT,
          birth TEXT,
          address TEXT,
          height REAL,
          weight REAL,
          bloodType TEXT,
          gender INTEGER,
          image TEXT,
          lastSyncedAt INTEGER,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Bảng cache cho appointments/reminders/etc
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS cache_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          expiresAt INTEGER,
          createdAt INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Bảng sync queue (các thay đổi chưa đồng bộ)
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          action TEXT NOT NULL,
          payload TEXT,
          retryCount INTEGER DEFAULT 0,
          createdAt INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // Bảng exercise_logs (chạy bộ, ngủ)
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS exercise_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          accountId TEXT NOT NULL,
          type TEXT NOT NULL,
          date TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          metadata TEXT,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')),
          UNIQUE(accountId, type, date)
        );
      `);

      console.log("✅ Database tables created");
    } catch (error) {
      console.error("❌ Failed to create tables:", error);
    }
  }

  /**
   * Lắng nghe trạng thái mạng
   */
  initNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;

      console.log(`📶 Network: ${this.isOnline ? "Online" : "Offline"}`);

      // Khi có mạng trở lại, tự động sync
      if (wasOffline && this.isOnline) {
        this.syncPendingChanges();
      }
    });
  }

  /**
   * Lưu profile (offline-first)
   */
  async saveProfile(profileData) {
    if (!this.db) await this.init();

    try {
      const now = Math.floor(Date.now() / 1000);

      const result = await this.db.runAsync(
        `INSERT OR REPLACE INTO profiles 
         (accountId, fullName, email, phone, birth, address, height, weight, bloodType, gender, image, lastSyncedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profileData.accountId || profileData.id,
          profileData.fullName || null,
          profileData.email || null,
          profileData.phone || null,
          profileData.birth || null,
          profileData.address || null,
          profileData.height || null,
          profileData.weight || null,
          profileData.bloodType || null,
          profileData.gender !== undefined
            ? profileData.gender
              ? 1
              : 0
            : null,
          profileData.image || null,
          this.isOnline ? now : null,
          now,
        ]
      );

      console.log("✅ Profile saved to offline DB:", result.lastInsertRowId);

      // Backup vào AsyncStorage để tương thích code cũ
      await AsyncStorage.setItem("account", JSON.stringify(profileData));

      // Nếu offline, thêm vào queue để sync sau
      if (!this.isOnline) {
        await this.addToSyncQueue("profile", "update", profileData);
      }

      return result;
    } catch (error) {
      console.error("❌ Failed to save profile:", error);
      throw error;
    }
  }

  /**
   * Lấy profile (offline-first)
   */
  async getProfile(accountId) {
    if (!this.db) await this.init();

    try {
      const result = await this.db.getFirstAsync(
        "SELECT * FROM profiles WHERE accountId = ? ORDER BY updatedAt DESC LIMIT 1",
        [accountId]
      );

      if (result) {
        console.log("✅ Profile loaded from offline DB");
        return {
          ...result,
          accountId: result.accountId,
          gender: result.gender !== null ? Boolean(result.gender) : null,
        };
      }

      // Fallback sang AsyncStorage
      const cached = await AsyncStorage.getItem("account");
      if (cached) {
        console.log("📦 Profile loaded from AsyncStorage (fallback)");
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      console.error("❌ Failed to load profile:", error);
      return null;
    }
  }

  /**
   * Cache bất kỳ dữ liệu nào với TTL
   */
  async cacheData(key, data, ttlSeconds = 3600) {
    if (!this.db) await this.init();

    try {
      const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

      await this.db.runAsync(
        `INSERT OR REPLACE INTO cache_data (key, value, expiresAt) VALUES (?, ?, ?)`,
        [key, JSON.stringify(data), expiresAt]
      );

      console.log(`✅ Cached: ${key} (expires in ${ttlSeconds}s)`);
    } catch (error) {
      console.error("❌ Failed to cache data:", error);
    }
  }

  /**
   * Lấy dữ liệu từ cache
   */
  async getCachedData(key) {
    if (!this.db) await this.init();

    try {
      const now = Math.floor(Date.now() / 1000);
      const result = await this.db.getFirstAsync(
        "SELECT value FROM cache_data WHERE key = ? AND expiresAt > ?",
        [key, now]
      );

      if (result) {
        console.log(`✅ Cache hit: ${key}`);
        return JSON.parse(result.value);
      }

      console.log(`❌ Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error("❌ Failed to get cached data:", error);
      return null;
    }
  }

  /**
   * Thêm vào hàng đợi đồng bộ
   */
  async addToSyncQueue(type, action, payload) {
    if (!this.db) await this.init();

    try {
      await this.db.runAsync(
        `INSERT INTO sync_queue (type, action, payload) VALUES (?, ?, ?)`,
        [type, action, JSON.stringify(payload)]
      );
      console.log(`📤 Added to sync queue: ${type}/${action}`);
    } catch (error) {
      console.error("❌ Failed to add to sync queue:", error);
    }
  }

  /**
   * Đồng bộ các thay đổi chưa sync
   */
  async syncPendingChanges() {
    if (!this.db || !this.isOnline) return;

    try {
      const pending = await this.db.getAllAsync(
        "SELECT * FROM sync_queue ORDER BY createdAt ASC"
      );

      console.log(`🔄 Syncing ${pending.length} pending changes...`);

      for (const item of pending) {
        try {
          // Gọi API tương ứng dựa vào type/action
          const success = await this.syncItem(item);

          if (success) {
            // Xóa khỏi queue
            await this.db.runAsync("DELETE FROM sync_queue WHERE id = ?", [
              item.id,
            ]);
            console.log(`✅ Synced: ${item.type}/${item.action}`);
          } else {
            // Tăng retry count
            await this.db.runAsync(
              "UPDATE sync_queue SET retryCount = retryCount + 1 WHERE id = ?",
              [item.id]
            );
          }
        } catch (error) {
          console.error(`❌ Failed to sync item ${item.id}:`, error);
        }
      }

      console.log("✅ Sync completed");
    } catch (error) {
      console.error("❌ Failed to sync pending changes:", error);
    }
  }

  /**
   * Sync một item cụ thể
   */
  async syncItem(item) {
    // Override method này trong component hoặc truyền callback
    console.log("Sync item:", item.type, item.action);
    return true;
  }

  /**
   * Xóa cache đã hết hạn
   */
  async clearExpiredCache() {
    if (!this.db) await this.init();

    try {
      const now = Math.floor(Date.now() / 1000);
      const result = await this.db.runAsync(
        "DELETE FROM cache_data WHERE expiresAt < ?",
        [now]
      );
      console.log(`🗑️ Cleared ${result.changes} expired cache entries`);
    } catch (error) {
      console.error("❌ Failed to clear expired cache:", error);
    }
  }

  /**
   * Kiểm tra trạng thái mạng
   */
  checkOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Lưu exercise log (chạy bộ, ngủ)
   */
  async saveExerciseLog(accountId, type, date, value, unit, metadata = null) {
    if (!this.db) await this.init();

    try {
      const result = await this.db.runAsync(
        `INSERT OR REPLACE INTO exercise_logs 
         (accountId, type, date, value, unit, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          type, // 'running' hoặc 'sleep'
          date, // YYYY-MM-DD
          value,
          unit,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );

      console.log(
        `✅ Exercise log saved: ${type} - ${value}${unit} on ${date}`
      );
      return result;
    } catch (error) {
      console.error("❌ Failed to save exercise log:", error);
      throw error;
    }
  }

  /**
   * Lấy exercise logs theo ngày
   */
  async getExerciseLogs(accountId, date) {
    if (!this.db) await this.init();

    try {
      const results = await this.db.getAllAsync(
        `SELECT * FROM exercise_logs 
         WHERE accountId = ? AND date = ?
         ORDER BY createdAt DESC`,
        [accountId, date]
      );

      return results.map((row) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));
    } catch (error) {
      console.error("❌ Failed to get exercise logs:", error);
      return [];
    }
  }

  /**
   * Lấy tổng exercise theo type và ngày
   */
  async getTotalExercise(accountId, type, date) {
    if (!this.db) await this.init();

    try {
      const result = await this.db.getFirstAsync(
        `SELECT SUM(value) as total, unit 
         FROM exercise_logs 
         WHERE accountId = ? AND type = ? AND date = ?
         GROUP BY unit`,
        [accountId, type, date]
      );

      return result
        ? { total: result.total || 0, unit: result.unit }
        : { total: 0, unit: "" };
    } catch (error) {
      console.error("❌ Failed to get total exercise:", error);
      return { total: 0, unit: "" };
    }
  }

  /**
   * Lấy exercise logs trong khoảng thời gian
   */
  async getExerciseLogsRange(accountId, type, startDate, endDate) {
    if (!this.db) await this.init();

    try {
      const results = await this.db.getAllAsync(
        `SELECT date, SUM(value) as total, unit
         FROM exercise_logs 
         WHERE accountId = ? AND type = ? AND date BETWEEN ? AND ?
         GROUP BY date, unit
         ORDER BY date DESC`,
        [accountId, type, startDate, endDate]
      );

      return results.map((row) => ({
        date: row.date,
        value: row.total || 0,
        unit: row.unit,
      }));
    } catch (error) {
      console.error("❌ Failed to get exercise logs range:", error);
      return [];
    }
  }

  /**
   * Xóa exercise logs cũ (giữ lại 90 ngày)
   */
  async cleanOldExerciseLogs(days = 90) {
    if (!this.db) await this.init();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      const result = await this.db.runAsync(
        "DELETE FROM exercise_logs WHERE date < ?",
        [cutoffStr]
      );

      console.log(`🗑️ Cleaned ${result.changes} old exercise logs`);
      return result.changes;
    } catch (error) {
      console.error("❌ Failed to clean old exercise logs:", error);
      return 0;
    }
  }
}

// Export singleton instance
export default new OfflineStorageService();
