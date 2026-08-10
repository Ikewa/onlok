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
  badge_type?: string | null;
  profile_picture_url?: string | null;
  token: string;
}

export interface AuthUser extends Omit<User, 'token'> {
  token: string;
}

export interface VerificationStatus {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'tier_assigned' | 'payment_received';
  admin_notes?: string;
  assigned_tier?: string | null;
  payment_status?: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Badge {
  id: number;
  badge_type: 'gold' | 'silver' | 'bronze' | 'basic' | 'verified_vendor' | 'premium' | string;
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
  phone_number?: string | null;
  twitter_handle?: string | null;
  instagram_handle?: string | null;
  facebook_handle?: string | null;
  tiktok_handle?: string | null;
  profile_picture_url?: string | null;
  admin_notes?: string | null;
  reports_count?: number;
}

export type ReportCategory =
  | 'fraud'
  | 'impersonation'
  | 'harassment'
  | 'inaccurate_information'
  | 'others';

export type ReportPayload = FormData;

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
