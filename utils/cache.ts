import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const createTokenCache = () => {
  return {
    async getToken(key: string) {
      try {
        const item = await SecureStore.getItemAsync(key);
        if (!item) {
          return null;
        }
        return item;
      } catch (err) {
        console.error('SecureStore get item error: ', err);
        return null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (err) {
        console.error('SecureStore set item error: ', err);
      }
    },
    async clearToken(key: string) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        console.error('SecureStore delete item error: ', err);
      }
    },
  };
};

export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;
