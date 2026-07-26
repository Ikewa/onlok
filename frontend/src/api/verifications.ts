import api from './axiosInstance';
import type { VerificationStatus } from '../types';

interface VerificationResponse {
  message: string;
  verification_id: number;
}

export interface VerificationRecord extends VerificationStatus {
  gov_id_url: string;
  cac_url?: string;
  video_url: string;
}

export const getMyVerification = async (): Promise<VerificationRecord> => {
  const { data } = await api.get<VerificationRecord>('/verifications/me');
  return data;
};

export const submitVerification = async (
  govIdFile: File,
  cacFile: File,
  businessVideoFile: File,
  onProgress?: (progress: number) => void
): Promise<VerificationResponse> => {
  const formData = new FormData();
  formData.append('gov_id', govIdFile);
  if (cacFile) formData.append('cac_document', cacFile);
  formData.append('business_video', businessVideoFile);

  const { data } = await api.post<VerificationResponse>('/verifications', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });
  return data;
};
