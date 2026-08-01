import React, { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import ReferralHeader from '../../components/admin/ReferralHeader';
import ReferralOverview from '../../components/admin/ReferralOverview';
import ReferralRecordsTable from '../../components/admin/ReferralRecordsTable';
import WithdrawalsTable from '../../components/admin/WithdrawalsTable';

export default function AdminReferrals() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab index derived from URL search parameter '?tab='
  const getInitialTab = () => {
    const tab = searchParams.get('tab');
    if (tab === 'records') return 1;
    if (tab === 'withdrawals') return 2;
    return 0;
  };

  const [tabIndex, setTabIndex] = useState<number>(getInitialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Overview & Referral Records Data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [recordsSearch, setRecordsSearch] = useState<string>('');
  const [recordsStatusFilter, setRecordsStatusFilter] = useState<string>('all');
  const [recordsPagination, setRecordsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Withdrawals Data & Selection State
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsSearch, setWithdrawalsSearch] = useState<string>('');
  const [withdrawalsStatusFilter, setWithdrawalsStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Update tab index and URL query parameter
  const handleTabChange = (newIndex: number) => {
    setTabIndex(newIndex);
    const tabNames = ['overview', 'records', 'withdrawals'];
    setSearchParams({ tab: tabNames[newIndex] }, { replace: true });
  };

  // Fetch overview & referral records
  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/referrals', {
        params: {
          search: recordsSearch,
          status: recordsStatusFilter,
          page: recordsPagination.page,
          limit: recordsPagination.limit,
        },
      });
      setOverviewData(res.data);
      if (res.data.pagination) {
        setRecordsPagination((prev) => ({
          ...prev,
          total: res.data.pagination.total,
          totalPages: res.data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, [recordsSearch, recordsStatusFilter, recordsPagination.page, recordsPagination.limit]);

  // Fetch withdrawal requests
  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/admin/withdrawals', {
        params: {
          search: withdrawalsSearch,
          status: withdrawalsStatusFilter,
          page: withdrawalsPagination.page,
          limit: withdrawalsPagination.limit,
        },
      });
      const items = res.data.results || (Array.isArray(res.data) ? res.data : []);
      setWithdrawals(items);
      if (res.data.pagination) {
        setWithdrawalsPagination((prev) => ({
          ...prev,
          total: res.data.pagination.total,
          totalPages: res.data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  }, [withdrawalsSearch, withdrawalsStatusFilter, withdrawalsPagination.page, withdrawalsPagination.limit]);

  useEffect(() => {
    if (tabIndex === 0 || tabIndex === 1) {
      fetchReferrals();
    }
    if (tabIndex === 2) {
      fetchWithdrawals();
    }
  }, [tabIndex, fetchReferrals, fetchWithdrawals]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectable = withdrawals
        .filter((r) => !['paid', 'processing'].includes(r.status?.toLowerCase()))
        .map((r) => r.id);
      setSelectedIds(selectable);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Single approval / rejection
  const handleSingleApprove = async (id: number) => {
    setActionLoading(true);
    const toastId = toast.loading('Initiating Paystack transfer...');
    try {
      const res = await axiosInstance.put(`/admin/withdrawals/${id}/approve`);
      toast.success(res.data?.message || 'Transfer initiated successfully', { id: toastId });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      fetchWithdrawals();
      fetchReferrals();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to approve withdrawal';
      toast.error(msg, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleReject = async (id: number) => {
    setActionLoading(true);
    try {
      await axiosInstance.put(`/admin/withdrawals/${id}/reject`, { reason: 'Rejected by admin' });
      toast.success('Withdrawal request rejected');
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      fetchWithdrawals();
      fetchReferrals();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk approval / rejection
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    const toastId = toast.loading(`Initiating Paystack bulk transfer for ${selectedIds.length} items...`);
    try {
      const res = await axiosInstance.post('/admin/withdrawals/approve-bulk', { ids: selectedIds });
      toast.success(res.data?.message || 'Bulk transfers processed', { id: toastId });
      setSelectedIds([]);
      fetchWithdrawals();
      fetchReferrals();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Bulk approval failed';
      toast.error(msg, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await axiosInstance.post('/admin/withdrawals/reject-bulk', {
        ids: selectedIds,
        reason: 'Bulk rejected by admin',
      });
      toast.success(res.data?.message || 'Bulk rejection completed');
      setSelectedIds([]);
      fetchWithdrawals();
      fetchReferrals();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Bulk rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (id: number, status: string) => {
    try {
      await axiosInstance.put(`/admin/withdrawals/${id}/status`, { status });
      toast.success(`Withdrawal request marked as ${status}`);
      fetchWithdrawals();
      fetchReferrals();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update withdrawal status');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header and Sub-Navigation Tabs */}
      <ReferralHeader activeTab={tabIndex} onTabChange={handleTabChange} />

      {/* Tab 0: Overview */}
      {tabIndex === 0 && (
        <ReferralOverview data={overviewData} formatCurrency={formatCurrency} />
      )}

      {/* Tab 1: Referral Records */}
      {tabIndex === 1 && (
        <ReferralRecordsTable
          loading={loading}
          records={overviewData?.referrals || []}
          search={recordsSearch}
          onSearchChange={(val) => {
            setRecordsSearch(val);
            setRecordsPagination((p) => ({ ...p, page: 1 }));
          }}
          statusFilter={recordsStatusFilter}
          onStatusFilterChange={(val) => {
            setRecordsStatusFilter(val);
            setRecordsPagination((p) => ({ ...p, page: 1 }));
          }}
          pagination={recordsPagination}
          onPageChange={(newPage) => setRecordsPagination((p) => ({ ...p, page: newPage }))}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Tab 2: Withdrawal Requests */}
      {tabIndex === 2 && (
        <WithdrawalsTable
          loading={loading}
          actionLoading={actionLoading}
          withdrawals={withdrawals}
          search={withdrawalsSearch}
          onSearchChange={(val) => {
            setWithdrawalsSearch(val);
            setWithdrawalsPagination((p) => ({ ...p, page: 1 }));
          }}
          statusFilter={withdrawalsStatusFilter}
          onStatusFilterChange={(val) => {
            setWithdrawalsStatusFilter(val);
            setWithdrawalsPagination((p) => ({ ...p, page: 1 }));
          }}
          pagination={withdrawalsPagination}
          onPageChange={(newPage) => setWithdrawalsPagination((p) => ({ ...p, page: newPage }))}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onSingleApprove={handleSingleApprove}
          onSingleReject={handleSingleReject}
          onUpdateStatus={handleUpdateWithdrawalStatus}
          formatCurrency={formatCurrency}
        />
      )}
    </Box>
  );
}
