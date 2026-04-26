import api from './axiosInstance';
import type { LoginPayload, RegisterPayload, User } from '../types';

export const loginUser = async (payload: LoginPayload): Promise<User> => {
  const { data } = await api.post<User>('/users/login', payload);
  return data;
};

export const registerUser = async (payload: RegisterPayload): Promise<User> => {
  const { data } = await api.post<User>('/users/register', payload);
  return data;
};

export const getMe = async (): Promise<Omit<User, 'token'>> => {
  const { data } = await api.get<Omit<User, 'token'>>('/users/me');
  return data;
};
