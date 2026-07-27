import api from './axiosInstance';

export const verifyNIN = async (nin: string): Promise<any> => {
  const { data } = await api.post('/identities/nin', { nin });
  return data;
};

export const verifyCAC = async (rcNumber: string, companyName: string): Promise<any> => {
  const { data } = await api.post('/identities/cac', { rcNumber, companyName });
  return data;
};
