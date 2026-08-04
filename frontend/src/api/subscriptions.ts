import api from './axiosInstance';

export interface UserSubscriptionInfo {
  user_id: number;
  badge_type: string;
  account_status: string;
  subscription_expires_at: string | null;
  subscription: {
    id: number;
    user_id: number;
    tier: string;
    plan_name: string;
    billing_cycle: string;
    amount: number;
    status: 'active' | 'non-renewing' | 'attention' | 'completed' | 'cancelled';
    paystack_subscription_code?: string;
    paystack_plan_code?: string;
    next_payment_date?: string;
    created_at?: string;
  } | null;
}

export const getMySubscription = async (): Promise<UserSubscriptionInfo> => {
  const { data } = await api.get('/subscriptions/me');
  return data;
};

export const getManageSubscriptionLink = async (): Promise<{ link: string }> => {
  const { data } = await api.get('/subscriptions/manage-link');
  return data;
};

export const cancelSubscription = async (): Promise<{ message: string }> => {
  const { data } = await api.post('/subscriptions/cancel');
  return data;
};
