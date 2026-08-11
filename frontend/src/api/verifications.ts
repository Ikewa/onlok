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
  govIdFile?: File | null,
  cacFile?: File | null,
  businessVideoFile?: File | null,
  onProgress?: (progress: number) => void
): Promise<VerificationResponse> => {
  const formData = new FormData();
  if (govIdFile) formData.append('gov_id', govIdFile);
  if (cacFile) formData.append('cac_document', cacFile);
  if (businessVideoFile) formData.append('business_video', businessVideoFile);

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

export const resubmitVerificationDocuments = async (
  files: { govId?: File | null; cac?: File | null; video?: File | null },
  onProgress?: (progress: number) => void
): Promise<VerificationResponse> => {
  const formData = new FormData();
  if (files.govId) formData.append('gov_id', files.govId);
  if (files.cac) formData.append('cac_document', files.cac);
  if (files.video) formData.append('business_video', files.video);

  const { data } = await api.put<VerificationResponse>('/verifications/resubmit', formData, {
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
