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

export interface UserManagement {
  id: number;
  vendor_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string | null;
  activity_score: number;
}

export interface DashboardMetrics {
  metrics: {
    totalUsers: number;
    pendingVerifications: number;
    approvedVendors: number;
    flaggedAccounts: number;
  };
  users: UserManagement[];
}

export interface AuditLog {
  id: number;
  action: string;
  severity: string;
  details: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const { data } = await api.get('/admin/dashboard');
  return data;
};

export const getAlerts = async (): Promise<AuditLog[]> => {
  const { data } = await api.get('/admin/alerts');
  return data;
};

export const getSettings = async (): Promise<Record<string, string>> => {
  const { data } = await api.get('/admin/settings');
  return data;
};

export const updateSettings = async (settings: Record<string, string>) => {
  const { data } = await api.put('/admin/settings', settings);
  return data;
};
