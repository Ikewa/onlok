import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Button, MenuItem, Select, FormControl, InputLabel, Tabs, Tab } from '@mui/material';
import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PriceCheckOutlinedIcon from '@mui/icons-material/PriceCheckOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

export default function AdminReferrals() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tabIndex, setTabIndex] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [refRes, withRes] = await Promise.all([
        axiosInstance.get('/admin/referrals'),
        axiosInstance.get('/admin/withdrawals')
      ]);
      setData(refRes.data);
      setWithdrawals(withRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateWithdrawal = async (id: number, status: string) => {
    try {
      await axiosInstance.put(`/admin/withdrawals/${id}/status`, { status });
      toast.success('Withdrawal status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update withdrawal');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Referral & Payout Management
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
            Monitor global referral commissions and process withdrawals.
          </Typography>
        </Box>
      </Box>

      {/* Analytics Overview */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard title="Total Referrals" value={data?.stats?.totalReferrals ?? 0} icon={<GroupOutlinedIcon sx={{ color: '#3B82F6' }} />} />
        <StatCard title="Total Generated" value={formatCurrency(data?.stats?.totalCommissionsGenerated ?? 0)} icon={<PriceCheckOutlinedIcon sx={{ color: '#8B5CF6' }} />} />
        <StatCard title="Pending Payouts" value={formatCurrency(data?.stats?.totalPendingCommissions ?? 0)} icon={<SavingsOutlinedIcon sx={{ color: '#F59E0B' }} />} />
        <StatCard title="Available to Withdraw" value={formatCurrency(data?.stats?.totalAvailableCommissions ?? 0)} icon={<AccountBalanceWalletOutlinedIcon sx={{ color: '#10B981' }} />} />
        <StatCard title="Total Paid Out" value={formatCurrency(data?.stats?.totalCommissionsPaid ?? 0)} icon={<PriceCheckOutlinedIcon sx={{ color: '#22C55E' }} />} />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabIndex} onChange={(_, newVal) => setTabIndex(newVal)}>
          <Tab label="Referral Records" sx={{ fontWeight: 600, textTransform: 'none' }} />
          <Tab label="Withdrawal Requests" sx={{ fontWeight: 600, textTransform: 'none' }} />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Referrer Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Referred Vendor</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Plan</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Commission</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : data?.referrals?.length > 0 ? (
                data.referrals.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.referrer_first_name} {row.referrer_last_name}</TableCell>
                    <TableCell>{row.referred_business_name || `${row.referred_first_name} ${row.referred_last_name}`}</TableCell>
                    <TableCell>{row.subscription_plan}</TableCell>
                    <TableCell>{formatCurrency(row.commission_earned)}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><StatusChip status={row.status} /></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748B' }}>No referral records found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabIndex === 1 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Payment Details</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : withdrawals.length > 0 ? (
                withdrawals.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.first_name} {row.last_name}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(row.amount)}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>{row.payment_method}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><StatusChip status={row.status} /></TableCell>
                    <TableCell>
                      {row.status === 'processing' ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" color="success" onClick={() => handleUpdateWithdrawal(row.id, 'paid')} sx={{ textTransform: 'none' }}>
                            Mark Paid
                          </Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleUpdateWithdrawal(row.id, 'failed')} sx={{ textTransform: 'none' }}>
                            Fail
                          </Button>
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>Resolved</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: '#64748B' }}>No withdrawal requests found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

    </Box>
  );
}

const StatCard = ({ title, value, icon }: any) => (
  <Box sx={{ flex: '1 1 180px', bgcolor: '#F8FAFC', borderRadius: 3, p: 2.5, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
      <Typography sx={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>{title}</Typography>
      {icon}
    </Box>
    <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: '#0F172A', lineHeight: 1 }}>{value}</Typography>
  </Box>
);

const StatusChip = ({ status }: { status: string }) => {
  let color: "warning" | "success" | "info" | "error" | "default" = "default";
  
  switch(status.toLowerCase()) {
    case 'pending':
    case 'processing':
      color = 'warning';
      break;
    case 'available':
    case 'paid':
      color = 'success';
      break;
    case 'withdrawn':
      color = 'info';
      break;
    case 'failed':
    case 'cancelled':
    case 'reversed':
      color = 'error';
      break;
  }

  return <Chip label={status} color={color} size="small" sx={{ fontWeight: 600, textTransform: 'capitalize' }} />;
};
