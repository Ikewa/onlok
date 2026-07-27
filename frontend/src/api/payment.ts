import api from './axiosInstance';

export const initializePayment = async (payload: { email: string, amount: number, plan?: string, referrerId?: number }): Promise<any> => {
  const { data } = await api.post('/payments/initialize', payload);
  return data;
};

export const verifyPayment = async (reference: string): Promise<any> => {
  const { data } = await api.get(`/payments/verify/${reference}`);
  return data;
};
