import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

const HealthRecordScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [todayRecord, setTodayRecord] = useState({
    weight: '',
    height: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    steps: '',
    waterIntake: '',
    sleepHours: '',
    notes: '',
  });

  useEffect(() => {
    loadUserData();
    loadTodayRecord();
  }, []);

  const loadUserData = async () => {
    try {
      const accountStr = await AsyncStorage.getItem('account');
      if (accountStr) {
        const account = JSON.parse(accountStr);
        setUserId(account.id || account.accountId);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTodayRecord = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${config.API_BASE}/api/health-records/today/${userId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setTodayRecord({
          weight: data.data.weight?.toString() || '',
          height: data.data.height?.toString() || '',
          bloodPressureSystolic: data.data.bloodPressureSystolic?.toString() || '',
          bloodPressureDiastolic: data.data.bloodPressureDiastolic?.toString() || '',
          heartRate: data.data.heartRate?.toString() || '',
          steps: data.data.steps?.toString() || '',
          waterIntake: data.data.waterIntake?.toString() || '',
          sleepHours: data.data.sleepHours?.toString() || '',
          notes: data.data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading today record:', error);
    }
  };

  const validateData = () => {
    // Kiểm tra xem có ít nhất một trường dữ liệu được nhập hay không
    const hasData = Object.values(todayRecord).some(value => value && value.toString().trim() !== '');
    
    if (!hasData) {
      Alert.alert(
        'Cảnh báo', 
        'Vui lòng nhập ít nhất một thông tin sức khỏe trước khi lưu.',
        [{ text: 'OK', style: 'default' }]
      );
      return false;
    }
    
    // Kiểm tra tính hợp lệ của dữ liệu số
    const numericFields = {
      weight: { min: 10, max: 300, name: 'cân nặng' },
      height: { min: 50, max: 250, name: 'chiều cao' },
      bloodPressureSystolic: { min: 50, max: 250, name: 'huyết áp tâm thu' },
      bloodPressureDiastolic: { min: 30, max: 150, name: 'huyết áp tâm trương' },
      heartRate: { min: 30, max: 200, name: 'nhịp tim' },
      steps: { min: 0, max: 100000, name: 'số bước chân' },
      waterIntake: { min: 0, max: 10, name: 'lượng nước uống' },
      sleepHours: { min: 0, max: 24, name: 'giờ ngủ' },
    };

    for (const [field, config] of Object.entries(numericFields)) {
      const value = todayRecord[field];
      if (value && value.toString().trim() !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < config.min || numValue > config.max) {
          Alert.alert(
            'Dữ liệu không hợp lệ', 
            `${config.name} phải là số từ ${config.min} đến ${config.max}.`,
            [{ text: 'OK', style: 'default' }]
          );
          return false;
        }
      }
    }
    
    return true;
  };

  const showSaveConfirmation = () => {
    // Đếm số trường đã nhập
    const filledFields = Object.entries(todayRecord).filter(([key, value]) => 
      value && value.toString().trim() !== ''
    );
    
    const fieldNames = {
      weight: 'cân nặng',
      height: 'chiều cao',
      bloodPressureSystolic: 'huyết áp tâm thu',
      bloodPressureDiastolic: 'huyết áp tâm trương',
      heartRate: 'nhịp tim',
      steps: 'số bước chân',
      waterIntake: 'lượng nước uống',
      sleepHours: 'giờ ngủ',
      notes: 'ghi chú'
    };

    const filledFieldsText = filledFields
      .map(([key, value]) => `• ${fieldNames[key]}: ${value}${key !== 'notes' ? (key === 'weight' ? 'kg' : key === 'height' ? 'cm' : key.includes('bloodPressure') ? 'mmHg' : key === 'heartRate' ? 'bpm' : key === 'steps' ? ' bước' : key === 'waterIntake' ? 'L' : key === 'sleepHours' ? 'h' : '') : ''}`)
      .join('\n');

    Alert.alert(
      'Xác nhận lưu dữ liệu',
      `Bạn có muốn lưu ${filledFields.length} thông tin sức khỏe sau?\n\n${filledFieldsText}`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Lưu',
          style: 'default',
          onPress: saveRecord
        }
      ]
    );
  };

  const handleSave = () => {
    if (!userId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    // Kiểm tra dữ liệu trước khi lưu
    if (!validateData()) {
      return;
    }

    // Hiển thị xác nhận
    showSaveConfirmation();
  };

  const saveRecord = async () => {
    setLoading(true);
    try {
      const recordData = {
        userId: userId,
        recordDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        weight: todayRecord.weight ? parseFloat(todayRecord.weight) : null,
        height: todayRecord.height ? parseFloat(todayRecord.height) : null,
        bloodPressureSystolic: todayRecord.bloodPressureSystolic ? parseInt(todayRecord.bloodPressureSystolic) : null,
        bloodPressureDiastolic: todayRecord.bloodPressureDiastolic ? parseInt(todayRecord.bloodPressureDiastolic) : null,
        heartRate: todayRecord.heartRate ? parseInt(todayRecord.heartRate) : null,
        steps: todayRecord.steps ? parseInt(todayRecord.steps) : null,
        waterIntake: todayRecord.waterIntake ? parseFloat(todayRecord.waterIntake) : null,
        sleepHours: todayRecord.sleepHours ? parseFloat(todayRecord.sleepHours) : null,
        notes: todayRecord.notes || null,
      };

      const response = await fetch(`${config.API_BASE}/api/health-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordData),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Thành công', 
          data.message,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate về Home với dữ liệu mới để cập nhật
                if (navigation) {
                  navigation.navigate('Home', {
                    refreshHealthData: true,
                    newHealthData: {
                      weight: todayRecord.weight,
                      height: todayRecord.height,
                      bloodPressureSystolic: todayRecord.bloodPressureSystolic,
                      bloodPressureDiastolic: todayRecord.bloodPressureDiastolic,
                      heartRate: todayRecord.heartRate,
                      steps: todayRecord.steps,
                      waterIntake: todayRecord.waterIntake,
                      sleepHours: todayRecord.sleepHours,
                      timestamp: new Date().toISOString()
                    }
                  });
                }
              },
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('Lỗi', data.message);
      }
    } catch (error) {
      console.error('Error saving record:', error);
      Alert.alert(
        'Lỗi kết nối', 
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setTodayRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const HealthInput = ({ label, value, onChangeText, placeholder, unit, icon, keyboardType = 'default' }) => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={20} color="#667eea" />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Theo dõi sức khỏe hôm nay</Text>
        <Text style={styles.headerSubtitle}>
          {new Date().toLocaleDateString('vi-VN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
        <Text style={styles.hintText}>
          💡 Nhập ít nhất một thông tin để theo dõi sức khỏe
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <HealthInput
            label="Cân nặng"
            value={todayRecord.weight}
            onChangeText={(value) => updateField('weight', value)}
            placeholder="Nhập cân nặng"
            unit="kg"
            icon="scale-outline"
            keyboardType="numeric"
          />

          <HealthInput
            label="Chiều cao"
            value={todayRecord.height}
            onChangeText={(value) => updateField('height', value)}
            placeholder="Nhập chiều cao"
            unit="cm"
            icon="resize-outline"
            keyboardType="numeric"
          />

          <View style={styles.bpContainer}>
            <View style={styles.labelRow}>
              <Ionicons name="heart-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Huyết áp</Text>
            </View>
            <View style={styles.bpInputRow}>
              <View style={styles.bpInput}>
                <TextInput
                  style={styles.input}
                  value={todayRecord.bloodPressureSystolic}
                  onChangeText={(value) => updateField('bloodPressureSystolic', value)}
                  placeholder="Tâm thu"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.bpSeparator}>/</Text>
              <View style={styles.bpInput}>
                <TextInput
                  style={styles.input}
                  value={todayRecord.bloodPressureDiastolic}
                  onChangeText={(value) => updateField('bloodPressureDiastolic', value)}
                  placeholder="Tâm trương"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.unit}>mmHg</Text>
            </View>
          </View>

          <HealthInput
            label="Nhịp tim"
            value={todayRecord.heartRate}
            onChangeText={(value) => updateField('heartRate', value)}
            placeholder="Nhập nhịp tim"
            unit="bpm"
            icon="pulse-outline"
            keyboardType="numeric"
          />

          <HealthInput
            label="Số bước chân"
            value={todayRecord.steps}
            onChangeText={(value) => updateField('steps', value)}
            placeholder="Nhập số bước"
            unit="bước"
            icon="walk-outline"
            keyboardType="numeric"
          />

          <HealthInput
            label="Lượng nước uống"
            value={todayRecord.waterIntake}
            onChangeText={(value) => updateField('waterIntake', value)}
            placeholder="Nhập lượng nước"
            unit="lít"
            icon="water-outline"
            keyboardType="numeric"
          />

          <HealthInput
            label="Giờ ngủ"
            value={todayRecord.sleepHours}
            onChangeText={(value) => updateField('sleepHours', value)}
            placeholder="Nhập số giờ ngủ"
            unit="giờ"
            icon="moon-outline"
            keyboardType="numeric"
          />

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="document-text-outline" size={20} color="#667eea" />
              <Text style={styles.label}>Ghi chú</Text>
            </View>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={todayRecord.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Ghi chú về sức khỏe hôm nay..."
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Lưu thông tin</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  hintText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    minHeight: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  unit: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 10,
  },
  bpContainer: {
    marginBottom: 20,
  },
  bpInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bpInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginHorizontal: 5,
  },
  bpSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginHorizontal: 10,
  },
  notesInput: {
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    padding: 15,
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 15,
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default HealthRecordScreen;