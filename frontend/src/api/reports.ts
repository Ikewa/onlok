import api from './axiosInstance';
import type { ReportPayload } from '../types';

interface ReportResponse {
  message: string;
  report_id: number;
}

export const submitReport = async (payload: ReportPayload): Promise<ReportResponse> => {
  const { data } = await api.post<ReportResponse>('/reports', payload);
  return data;
};
