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

// ── Map mock user → AdminVerification shape ─────────────────────────────────
const mapMockUser = (u: any): AdminVerification => ({
  verification_id: u.id,
  status: u.status === 'suspended' ? 'flagged'
        : u.status === 'verified'  ? 'approved'
        : u.status,                          // pending / rejected / flagged
  submitted_at: u.created_at,
  reviewed_at: null,
  user_id: u.id,
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  vendor_id: u.vendor_id,
  business_name: u.business_name,
  type: 'Business',
});

// ── Fetch mock users and apply filter / search / pagination client-side ──────
const getMockQueue = async (
  page: number,
  limit: number,
  status: string,
  search: string
) => {
  const { data: raw } = await api.get('/admin/mock-users');
  let items: AdminVerification[] = (raw as any[]).map(mapMockUser);

  // Status filter
  if (status && status !== 'all') {
    items = items.filter(v => v.status === status);
  }

  // Search filter (name, vendor_id, email)
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(v =>
      `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) ||
      (v.vendor_id || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q)
    );
  }

  const total = items.length;
  const offset = (page - 1) * limit;
  const results = items.slice(offset, offset + limit);
  return { results, total, page, limit };
};

export const getVerificationQueue = async (
  page: number = 1,
  limit: number = 20,
  status: string = 'all',
  search: string = ''
) => {
  try {
    const { data } = await api.get('/admin/verifications', {
      params: { page, limit, status, search }
    });
    // If real API returns empty, fall back to mock
    if (data?.results?.length > 0) return data;
    return await getMockQueue(page, limit, status, search);
  } catch {
    // Real API failed — use mock data
    return getMockQueue(page, limit, status, search);
  }
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
