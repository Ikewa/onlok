import api from './axiosInstance';
import type { LoginPayload, RegisterPayload, User } from '../types';

export const loginUser = async (payload: LoginPayload): Promise<User> => {
  const { data } = await api.post<User>('/users/login', payload);
  return data;
};

export const registerUser = async (payload: RegisterPayload & { referred_by?: string }): Promise<User> => {
  const { data } = await api.post<User>('/users/register', payload);
  return data;
};

export const getMe = async (): Promise<Omit<User, 'token'>> => {
  const { data } = await api.get<Omit<User, 'token'>>('/users/me');
  return data;
};

export const uploadProfilePicture = async (file: File): Promise<{ profile_picture_url: string }> => {
  const formData = new FormData();
  formData.append('profile_picture', file);
  const { data } = await api.post<{ profile_picture_url: string }>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
