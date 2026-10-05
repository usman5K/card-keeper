import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'fuelledger.deviceId';

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    return existing;
  }
  const next = Crypto.randomUUID();
  await AsyncStorage.setItem(KEY, next);
  return next;
}
