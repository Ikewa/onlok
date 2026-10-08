import api from './axiosInstance';
import type { VerificationStatus } from '../types';

export interface VerificationResponse {
  message: string;
  verification_id: number;
}

export interface VerificationRecord extends VerificationStatus {
  gov_id_url: string;
  cac_url?: string;
  video_url: string;
  testimonial_url?: string;
  gov_id_mime?: string | null;
  cac_mime?: string | null;
  video_mime?: string | null;
  testimonial_mime?: string | null;
}

export interface UploadResult {
  url: string;
  filename: string;
  uploadId?: string;
  originalname?: string;
  size: number;
}

export interface RegistrationApplication {
  application_id: string;
  status: string;
}

export const createRegistrationApplication = async (): Promise<RegistrationApplication> => {
  const { data } = await api.post<RegistrationApplication>('/verifications/application');
  return data;
};

export const getMyVerification = async (): Promise<VerificationRecord> => {
  const { data } = await api.get<VerificationRecord>('/verifications/me');
  return data;
};

export interface SubmitVerificationPayload {
  application_id: string;
  gov_id_upload_id?: string;
  cac_upload_id?: string;
  video_upload_id?: string;
  testimonial_upload_id?: string;
}

/**
 * Submits uploaded documents for review.
 * A fresh idempotency key is generated per attempt so a retry after a network
 * failure replaces the record instead of being short-circuited by a stale key.
 */
export const submitVerification = async (payload: SubmitVerificationPayload): Promise<VerificationResponse> => {
  const idempotencyKey =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { data } = await api.post<VerificationResponse>('/verifications', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
};

export interface ResubmitVerificationPayload {
  gov_id_upload_id?: string;
  cac_upload_id?: string;
  video_upload_id?: string;
}

/**
 * Replaces one or more documents on the existing verification record.
 */
export const resubmitVerificationDocuments = async (
  payload: ResubmitVerificationPayload
): Promise<VerificationResponse> => {
  const { data } = await api.put<VerificationResponse>('/verifications/resubmit', payload);
  return data;
};
