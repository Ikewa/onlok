// Shared TypeScript interfaces for the Onlok frontend

export interface User {
  id: number;
  vendor_id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone_number?: string;
  role: 'vendor' | 'admin';
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
  token: string;
}

export interface AuthUser extends Omit<User, 'token'> {
  token: string;
}

export interface VerificationStatus {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Badge {
  id: number;
  badge_type: 'basic' | 'verified_vendor' | 'premium';
  issued_at: string;
}

export interface VendorProfile {
  profile_link: string;
  qr_code_url: string | null;
  views: number;
}

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  date: string;
}

export interface DashboardData {
  user: Omit<User, 'token'>;
  verification: VerificationStatus | null;
  badges: Badge[];
  profile: VendorProfile | null;
  notifications: Notification[];
}

export interface VendorSearchResult {
  id: number;
  vendor_id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  status: string;
  created_at: string;
  badges: string[];
  last_verified?: string | null;
}

export type ReportCategory =
  | 'fraud'
  | 'impersonation'
  | 'harassment'
  | 'inaccurate_information';

export interface ReportPayload {
  reported_vendor_id: string;
  category: ReportCategory;
  context: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  password: string;
  phone_number: string;
  country_code?: string;
}

export interface LoginPayload {
  vendor_id: string;
  password: string;
}

export interface ApiError {
  message: string;
}
