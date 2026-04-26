import api from './axiosInstance';
import type { DashboardData, VendorSearchResult } from '../types';

export const getDashboard = async (): Promise<DashboardData> => {
  const { data } = await api.get<DashboardData>('/dashboard');
  return data;
};

interface SearchResponse {
  results: VendorSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

export const searchVendors = async (
  q: string,
  page = 1,
  limit = 10
): Promise<SearchResponse> => {
  try {
    // Backend returns a flat array, so we normalize it into the paginated shape
    const { data } = await api.get<VendorSearchResult[]>('/dashboard/search', {
      params: { q, page, limit },
    });

    const results = Array.isArray(data) ? data : [];
    return {
      results,
      total: results.length,
      page,
      totalPages: Math.max(1, Math.ceil(results.length / limit)),
    };
  } catch (err: any) {
    // Backend returns 404 when no vendors found — treat as empty, not an error
    if (err?.response?.status === 404) {
      return { results: [], total: 0, page, totalPages: 1 };
    }
    throw err;
  }
};
