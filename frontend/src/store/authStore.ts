import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, djApi } from '../services/api';
import { User, DJProfile } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    user_type: 'dj' | 'organizer';
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      const { access_token, user } = response.data;
      
      await AsyncStorage.setItem('auth_token', access_token);
      set({ user, token: access_token, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  register: async (data) => {
    try {
      const response = await authApi.register(data);
      const { access_token, user } = response.data;
      
      await AsyncStorage.setItem('auth_token', access_token);
      set({ user, token: access_token, isAuthenticated: true });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await authApi.getMe();
      set({ 
        user: response.data, 
        token, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      await AsyncStorage.removeItem('auth_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await authApi.updateProfile(data);
      set({ user: response.data });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Update failed');
    }
  },

  refreshUser: async () => {
    try {
      const response = await authApi.getMe();
      set({ user: response.data });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },
}));
