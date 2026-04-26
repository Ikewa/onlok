import api from './axiosInstance';

interface VerificationResponse {
  message: string;
  verification_id: number;
}

export const submitVerification = async (
  govIdFile: File,
  businessVideoFile: File
): Promise<VerificationResponse> => {
  const formData = new FormData();
  formData.append('gov_id', govIdFile);
  formData.append('business_video', businessVideoFile);

  const { data } = await api.post<VerificationResponse>('/verifications', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};
