import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://event-djs-1.preview.emergentagent.com';

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    user_type: 'dj' | 'organizer';
    phone?: string;
  }) => api.post('/auth/register', data),
  
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  getMe: () => api.get('/auth/me'),
  
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// DJ API
export const djApi = {
  createProfile: (data: any) => api.post('/dj/profile', data),
  getMyProfile: () => api.get('/dj/profile/me'),
  updateProfile: (data: any) => api.put('/dj/profile', data),
  searchProfiles: (params: any) => api.get('/dj/profiles', { params }),
  getProfile: (djId: string) => api.get(`/dj/profiles/${djId}`),
  setAvailability: (slots: any[]) => api.post('/dj/availability', slots),
  getAvailability: (djId: string, month?: string) =>
    api.get(`/dj/availability/${djId}`, { params: { month } }),
  deleteAvailability: (slotId: string) => api.delete(`/dj/availability/${slotId}`),
};

// Event API
export const eventApi = {
  create: (data: any) => api.post('/events', data),
  getAll: (params?: any) => api.get('/events', { params }),
  getMy: () => api.get('/events/my'),
  getOne: (eventId: string) => api.get(`/events/${eventId}`),
  update: (eventId: string, data: any) => api.put(`/events/${eventId}`, data),
  delete: (eventId: string) => api.delete(`/events/${eventId}`),
};

// Booking API
export const bookingApi = {
  create: (data: any) => api.post('/bookings', data),
  getMy: () => api.get('/bookings/my'),
  getOne: (bookingId: string) => api.get(`/bookings/${bookingId}`),
  updateStatus: (bookingId: string, status: string, message?: string) =>
    api.put(`/bookings/${bookingId}/status`, { status, message }),
  completePrestation: (bookingId: string) =>
    api.put(`/bookings/${bookingId}/complete`),
};

// Payment API
export const paymentApi = {
  process: (data: { booking_id: string; payment_method: string; amount: number }) =>
    api.post('/payments', data),
};

// DJ Wallet API
export const djWalletApi = {
  getWallet: () => api.get('/dj/wallet'),
  getEarnings: (status?: string) => api.get('/dj/earnings', { params: { status } }),
  requestWithdrawal: (amount: number, bankName: string, iban: string) =>
    api.post('/dj/withdrawal', null, { params: { amount, bank_name: bankName, iban } }),
  getWithdrawals: () => api.get('/dj/withdrawals'),
};

// Message API
export const messageApi = {
  send: (data: { receiver_id: string; content: string; booking_id?: string }) =>
    api.post('/messages', data),
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (partnerId: string) => api.get(`/messages/${partnerId}`),
};

// Review API
export const reviewApi = {
  create: (data: { dj_id: string; booking_id: string; rating: number; comment: string }) =>
    api.post('/reviews', data),
  getByDJ: (djId: string, limit?: number, skip?: number) =>
    api.get(`/reviews/${djId}`, { params: { limit, skip } }),
};

// Match API
export const matchApi = {
  getDJsForEvent: (eventId: string) => api.get(`/match/djs-for-event/${eventId}`),
};

// Config API
export const configApi = {
  getMusicStyles: () => api.get('/config/music-styles'),
  getEventTypes: () => api.get('/config/event-types'),
};

export default api;
