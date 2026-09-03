import AsyncStorage from '@react-native-async-storage/async-storage';

export type EmergencyCard = {
  bloodType: string;
  allergies: string;
  medications: string;
  note: string;
};

export const EMPTY_EMERGENCY_CARD: EmergencyCard = {
  bloodType: '',
  allergies: '',
  medications: '',
  note: '',
};

const keyFor = (userId: string) => `@solotrav/safety/${userId}/card`;

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export const safetyStorage = {
  getCard(userId: string): Promise<EmergencyCard> {
    return read(keyFor(userId), EMPTY_EMERGENCY_CARD);
  },

  saveCard(userId: string, value: EmergencyCard): Promise<void> {
    return AsyncStorage.setItem(keyFor(userId), JSON.stringify(value));
  },
};
