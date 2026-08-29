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
}

export interface UploadResult {
  url: string;
  filename: string;
  originalname?: string;
  size: number;
}

export interface ChunkInitResponse {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
  message: string;
}

export const getMyVerification = async (): Promise<VerificationRecord> => {
  const { data } = await api.get<VerificationRecord>('/verifications/me');
  return data;
};

/**
 * Upload a single document (e.g. ID card or CAC certificate)
 */
export const uploadSingleDocument = async (
  file: File,
  fieldname: string = 'file',
  onProgress?: (progress: number) => void
): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('fieldname', fieldname);

  const { data } = await api.post<UploadResult>('/verifications/upload/single', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return data;
};

/**
 * Initialize chunk upload session on backend
 */
export const initChunkUpload = async (
  fileName: string,
  totalSize: number,
  mimeType: string,
  fileCategory: string = 'video'
): Promise<ChunkInitResponse> => {
  const { data } = await api.post<ChunkInitResponse>('/verifications/upload/chunk-init', {
    fileName,
    totalSize,
    mimeType,
    fileCategory,
  });
  return data;
};

/**
 * Send an individual 2MB chunk to the backend
 */
export const uploadChunkApi = async (
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunkBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<{ uploadId: string; chunkIndex: number; received: boolean }> => {
  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkIndex', chunkIndex.toString());
  formData.append('totalChunks', totalChunks.toString());
  formData.append('chunk', chunkBlob, `chunk_${chunkIndex}`);

  const { data } = await api.post('/verifications/upload/chunk', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return data;
};

/**
 * Finalize and stitch all uploaded chunks
 */
export const completeChunkUpload = async (
  uploadId: string,
  fileName: string,
  totalChunks: number
): Promise<UploadResult> => {
  const { data } = await api.post<UploadResult>('/verifications/upload/chunk-complete', {
    uploadId,
    fileName,
    totalChunks,
  });
  return data;
};

/**
 * Submit verified document URLs or legacy multipart
 */
export const submitVerification = async (
  payload:
    | { gov_id_url?: string; cac_url?: string; video_url?: string }
    | FormData
    | File,
  cacFile?: File | null,
  businessVideoFile?: File | null,
  onProgress?: (progress: number) => void
): Promise<VerificationResponse> => {
  // Check if decoupled URL payload is passed
  if (payload && typeof payload === 'object' && 'gov_id_url' in payload) {
    const { data } = await api.post<VerificationResponse>('/verifications', payload);
    return data;
  }

  // Legacy fallback support for multi-part FormData or individual Files
  let formData: FormData;
  if (payload instanceof FormData) {
    formData = payload;
  } else {
    formData = new FormData();
    if (payload instanceof File) formData.append('gov_id', payload);
    if (cacFile) formData.append('cac_document', cacFile);
    if (businessVideoFile) formData.append('business_video', businessVideoFile);
  }

  const { data } = await api.post<VerificationResponse>('/verifications', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return data;
};

/**
 * Resubmit verification documents
 */
export const resubmitVerificationDocuments = async (
  payload:
    | { gov_id_url?: string; cac_url?: string; video_url?: string }
    | { govId?: File | null; cac?: File | null; video?: File | null },
  onProgress?: (progress: number) => void
): Promise<VerificationResponse> => {
  if (payload && ('gov_id_url' in payload || 'cac_url' in payload || 'video_url' in payload)) {
    const { data } = await api.put<VerificationResponse>('/verifications/resubmit', payload);
    return data;
  }

  const files = payload as { govId?: File | null; cac?: File | null; video?: File | null };
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
    },
  });
  return data;
};
