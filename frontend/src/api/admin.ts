import api from './axiosInstance';

export interface AdminVerification {
  verification_id: number;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  vendor_id: string;
  business_name: string;
  type: string;
  gov_id_url?: string;
  video_url?: string;
}

export const getVerificationQueue = async (
  page: number = 1,
  limit: number = 20,
  status: string = 'all',
  search: string = ''
) => {
  const { data } = await api.get('/admin/verifications', {
    params: { page, limit, status, search }
  });
  return data;
};

export const getVerificationDetails = async (id: number): Promise<AdminVerification> => {
  const { data } = await api.get(`/admin/verifications/${id}`);
  return data;
};

export const updateVerificationStatus = async (id: number, status: string, notes?: string) => {
  const { data } = await api.put(`/admin/verifications/${id}/status`, { status, notes });
  return data;
};
