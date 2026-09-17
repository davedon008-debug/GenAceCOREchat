import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStorage = new Map();

const storage = {
  getItem: async (key) => {
    try {
      if (AsyncStorage) {
        const val = await AsyncStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch (e) {
      // In-memory fallback if native module is null in Expo Go
    }
    return memoryStorage.get(key) || null;
  },

  setItem: async (key, value) => {
    try {
      if (AsyncStorage) {
        await AsyncStorage.setItem(key, String(value));
      }
    } catch (e) {
      // In-memory fallback
    }
    memoryStorage.set(key, String(value));
  },

  removeItem: async (key) => {
    try {
      if (AsyncStorage) {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      // In-memory fallback
    }
    memoryStorage.delete(key);
  }
};

export default storage;
