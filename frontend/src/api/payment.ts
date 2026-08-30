import api from './axiosInstance';

export const initializePayment = async (payload: {
  email: string;
  amount?: number;
  plan?: string;
  billingCycle?: 'monthly' | 'annually' | string;
  referrerId?: number;
}): Promise<any> => {
  const { data } = await api.post('/payments/initialize', payload);
  return data;
};

export const verifyPayment = async (reference: string): Promise<any> => {
  const { data } = await api.get(`/payments/verify/${reference}`);
  return data;
};

export const syncPaymentStatus = async (): Promise<{ status: boolean; verified: boolean; message: string; user?: any }> => {
  const { data } = await api.get('/payments/sync-status');
  return data;
};
