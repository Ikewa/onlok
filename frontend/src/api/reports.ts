import api from './axiosInstance';
import type { ReportPayload } from '../types';

interface ReportResponse {
  message: string;
  report_id: number;
  reference_number: string;
}

export const submitReport = async (payload: FormData): Promise<ReportResponse> => {
  const { data } = await api.post<ReportResponse>('/reports', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
