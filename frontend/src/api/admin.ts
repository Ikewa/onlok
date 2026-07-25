import api from './axiosInstance';
import type { ReportCategory } from '../types';

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
  cac_url?: string;
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
  userTrends?: {
    month: string;
    newUsers: number;
    verifiedUsers: number;
  }[];
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

// ── Report types ─────────────────────────────────────────────────────────────

export type ReportStatus   = 'pending' | 'reviewed' | 'dismissed';
export type ReportPriority = 'low' | 'medium' | 'high';

export interface ReportNote {
  id: number;
  note: string;
  created_at: string;
  admin_first_name: string;
  admin_last_name: string;
}

export interface TimelineEvent {
  id: number;
  event_type: string;
  description: string;
  created_at: string;
}

export interface Report {
  id: number;
  reference_number: string;
  reported_vendor_id: string;
  contact_email: string | null;
  phone_number: string | null;
  is_whatsapp: boolean;
  category: ReportCategory;
  context: string;
  evidence_files: string[] | null;
  status: ReportStatus;
  priority: ReportPriority;
  assigned_to: string | null;
  created_at: string;
  reporter_vendor_id: string | null;
  first_name: string | null;
  last_name: string | null;
  // Detail-only fields (present when fetched by ID)
  notes?: ReportNote[];
  timeline?: TimelineEvent[];
}

export interface ReportListResponse {
  results: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportStats {
  total: number;
  pending: number;
  reviewed: number;
  dismissed: number;
  highPriority: number;
  pendingHighPriority: number;
}

export interface ReportFilters {
  status?: ReportStatus | '';
  category?: ReportCategory | '';
  priority?: ReportPriority | '';
  page?: number;
  limit?: number;
}

// ── Map mock user → AdminVerification shape ─────────────────────────────────
const mapMockUser = (u: any): AdminVerification => ({
  verification_id: u.id,
  status: u.status === 'suspended' ? 'flagged'
        : u.status === 'verified'  ? 'approved'
        : u.status,
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

// ── Filter + paginate a flat list client-side ────────────────────────────────
const applyFilterAndPage = (
  items: AdminVerification[],
  page: number,
  limit: number,
  status: string,
  search: string
) => {
  let filtered = [...items];

  if (status && status !== 'all') {
    filtered = filtered.filter(v => v.status === status);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(v =>
      `${v.first_name} ${v.last_name}`.toLowerCase().includes(q) ||
      (v.vendor_id || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const results = filtered.slice(offset, offset + limit);
  return { results, total, page, limit };
};

export const getVerificationQueue = async (
  page: number = 1,
  limit: number = 20,
  status: string = 'all',
  search: string = ''
) => {
  // Fetch real data and mock data in parallel; either can fail gracefully
  const [realResult, mockResult] = await Promise.allSettled([
    api.get('/admin/verifications', { params: { page: 1, limit: 1000, status: 'all', search: '' } }),
    api.get('/admin/mock-users'),
  ]);

  // Collect real verifications
  const realItems: AdminVerification[] =
    realResult.status === 'fulfilled'
      ? (realResult.value.data?.results ?? [])
      : [];

  // Collect and map mock users
  const mockRaw: any[] =
    mockResult.status === 'fulfilled' ? (mockResult.value.data ?? []) : [];
  const mockItems: AdminVerification[] = mockRaw.map(mapMockUser);

  // Merge: real entries take precedence — exclude mock entries whose id clashes with a real user_id
  const realIds = new Set(realItems.map(r => r.user_id));
  const uniqueMock = mockItems.filter(m => !realIds.has(m.user_id));

  // Combined list — real first, then mock
  const combined = [...realItems, ...uniqueMock];

  return applyFilterAndPage(combined, page, limit, status, search);
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

export const getWebsiteHits = async (period: 'week' | 'month' | 'quarterly' | 'all' = 'all'): Promise<{totalHits: number}> => {
  const { data } = await api.get('/admin/website-hits', { params: { period } });
  return data;
};

// ── Reports API ───────────────────────────────────────────────────────────────

export const getAdminReports = async (filters: ReportFilters = {}): Promise<ReportListResponse> => {
  const { data } = await api.get('/reports', { params: filters });
  return data;
};

export const getAdminReportById = async (id: number): Promise<Report> => {
  const { data } = await api.get(`/reports/${id}`);
  return data;
};

export const getAdminReportStats = async (): Promise<ReportStats> => {
  const { data } = await api.get('/reports/stats');
  return data;
};

export const updateAdminReport = async (
  id: number,
  payload: { status?: ReportStatus; priority?: ReportPriority; assigned_to?: string | null }
): Promise<{ message: string }> => {
  const { data } = await api.patch(`/reports/${id}`, payload);
  return data;
};

export const addAdminReportNote = async (
  reportId: number,
  note: string
): Promise<ReportNote> => {
  const { data } = await api.post(`/reports/${reportId}/notes`, { note });
  return data;
};
