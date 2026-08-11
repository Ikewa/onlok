import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Modal,
  TextField,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Alert,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import ShareIcon from '@mui/icons-material/Share';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import PriceCheckOutlinedIcon from '@mui/icons-material/PriceCheckOutlined';
import MoneyOffCsredOutlinedIcon from '@mui/icons-material/MoneyOffCsredOutlined';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export default function ReferralsPage() {
  const { user } = useAuth();
  
  if (user && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Bank & Account Details
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('');
  const [selectedBankName, setSelectedBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [resolvedAccountName, setResolvedAccountName] = useState<string>('');
  const [verifyingAccount, setVerifyingAccount] = useState<boolean>(false);
  const [accountError, setAccountError] = useState<string>('');

  const fetchReferrals = () => {
    setLoading(true);
    axiosInstance.get('/users/referrals')
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
        toast.error('Failed to load referral data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  // Fetch banks when withdrawal modal is opened
  useEffect(() => {
    if (withdrawModalOpen && banks.length === 0) {
      axiosInstance.get('/withdrawals/banks')
        .then(res => {
          if (res.data?.data && Array.isArray(res.data.data)) {
            setBanks(res.data.data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch banks:', err);
        });
    }
  }, [withdrawModalOpen, banks.length]);

  // Pre-fill saved bank details when withdrawal modal opens
  useEffect(() => {
    if (withdrawModalOpen && data?.bankDetails) {
      if (data.bankDetails.bank_code && !selectedBankCode) {
        setSelectedBankCode(data.bankDetails.bank_code);
      }
      if (data.bankDetails.bank_name && !selectedBankName) {
        setSelectedBankName(data.bankDetails.bank_name);
      }
      if (data.bankDetails.account_number && !accountNumber) {
        setAccountNumber(data.bankDetails.account_number);
      }
      if (data.bankDetails.account_name && !resolvedAccountName) {
        setResolvedAccountName(data.bankDetails.account_name);
      }
    }
  }, [withdrawModalOpen, data?.bankDetails]);

  // Automatically resolve bank account name when 10-digit account number and bank code are set
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBankCode) {
      setVerifyingAccount(true);
      setAccountError('');
      setResolvedAccountName('');

      axiosInstance.post('/withdrawals/verify-account', {
        account_number: accountNumber,
        bank_code: selectedBankCode,
      })
        .then(res => {
          if (res.data?.data?.account_name) {
            setResolvedAccountName(res.data.data.account_name);
            setAccountError('');
          }
        })
        .catch(err => {
          console.error(err);
          const msg = err.response?.data?.message || 'Could not verify account. Please check account number.';
          setAccountError(msg);
          setResolvedAccountName('');
        })
        .finally(() => setVerifyingAccount(false));
    } else {
      setResolvedAccountName('');
      setAccountError('');
    }
  }, [accountNumber, selectedBankCode]);

  const referralLink = `https://onlok.net/register?ref=${user?.vendor_id ?? user?.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Onlok',
          text: 'Use my referral link to sign up for Onlok!',
          url: referralLink,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      copyToClipboard();
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) < 5000) {
      toast.error('Minimum withdrawal amount is ₦5,000');
      return;
    }
    if (Number(withdrawAmount) > (data?.stats?.currentWalletBalance || 0)) {
      toast.error('Insufficient available balance');
      return;
    }

    if (!selectedBankCode || !accountNumber) {
      toast.error('Please select a bank and enter a valid account number');
      return;
    }

    try {
      setWithdrawing(true);
      await axiosInstance.post('/withdrawals/request', {
        amount: Number(withdrawAmount),
        bank_code: selectedBankCode,
        bank_name: selectedBankName,
        account_number: accountNumber,
        account_name: resolvedAccountName,
        payment_method: 'Bank Transfer'
      });
      toast.success('Withdrawal request submitted successfully');
      setWithdrawModalOpen(false);
      setWithdrawAmount('');
      fetchReferrals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1200, width: '100%', flexGrow: 1, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.8rem' }, color: '#0F172A', mb: 0.5 }}>
          Referrals & Rewards
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.95rem' }}>
          Share your link, track your earnings, and request withdrawals.
        </Typography>
      </Box>

      {/* Referral Banner */}
      <Box sx={{ bgcolor: '#F0F5FF', borderRadius: 3, p: { xs: 2.5, md: 4 }, mb: 4 }}>
        <Typography sx={{ fontSize: '0.9rem', color: '#475569', mb: 1.5, fontWeight: 500 }}>
          Earn a 12% commission on the first successful subscription payment for every vendor you refer.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ bgcolor: '#93A3DF', borderRadius: 2, px: 3, py: 1.8, display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography sx={{ color: '#1E293B', fontSize: '0.95rem', fontWeight: 500, opacity: 0.9 }}>
              Your Referral Link: {referralLink}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              onClick={copyToClipboard} 
              variant="outlined" 
              startIcon={<ContentCopyIcon sx={{ fontSize: 18 }} />}
              sx={{ borderColor: '#3B82F6', color: '#3B82F6', borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, py: 1, bgcolor: '#fff', '&:hover': { bgcolor: '#F8FAFC' } }}
            >
              Copy Link
            </Button>
            <Button 
              variant="contained" 
              onClick={handleShare}
              startIcon={<ShareIcon />}
              sx={{ bgcolor: '#1A1FE8', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, py: 1, boxShadow: 'none', '&:hover': { bgcolor: '#0F14B0' } }}
            >
              Share Referral Link
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Stat Grid */}
      <Box sx={{ display: 'flex', gap: 2, mb: 5, flexWrap: 'wrap' }}>
        <StatCard title="Total Referrals" value={data?.stats?.totalReferrals ?? 0} icon={<GroupOutlinedIcon sx={{ color: '#3B82F6' }} />} />
        <StatCard title="Successful Referrals" value={data?.stats?.successfulReferrals ?? 0} icon={<CheckCircleOutlineIcon sx={{ color: '#22C55E' }} />} />
        <StatCard title="Pending Earnings" value={formatCurrency(data?.stats?.pendingEarnings ?? 0)} icon={<SavingsOutlinedIcon sx={{ color: '#F59E0B' }} />} />
        <StatCard title="Available Earnings" value={formatCurrency(data?.stats?.currentWalletBalance ?? 0)} icon={<AccountBalanceWalletOutlinedIcon sx={{ color: '#10B981' }} />} />
        <StatCard title="Lifetime Earnings" value={formatCurrency(data?.stats?.lifetimeEarnings ?? 0)} icon={<PriceCheckOutlinedIcon sx={{ color: '#8B5CF6' }} />} />
        <StatCard title="Total Withdrawn" value={formatCurrency(data?.stats?.totalWithdrawn ?? 0)} icon={<MoneyOffCsredOutlinedIcon sx={{ color: '#EF4444' }} />} />
      </Box>

      {/* Referral History & Withdrawal Section */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
        
        {/* Referral History Table */}
        <Box sx={{ flex: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#0F172A', mb: 2 }}>
            Referral History
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Business Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Plan</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Commission</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.referrals?.length > 0 ? data.referrals.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.business_name}</TableCell>
                    <TableCell>{row.subscription_plan}</TableCell>
                    <TableCell>{formatCurrency(row.commission_earned)}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <StatusChip status={row.status} />
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#64748B' }}>
                      {loading ? <CircularProgress size={24} /> : 'No referrals found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Withdrawal Section */}
        <Box sx={{ flex: 1 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 3, mb: 4, bgcolor: '#F8FAFC' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#0F172A', mb: 2 }}>
              Withdrawal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>Available Balance</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '2rem', color: '#10B981' }}>
                  {formatCurrency(data?.stats?.currentWalletBalance ?? 0)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', pt: 2 }}>
                <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>Pending Withdrawals</Typography>
                <Typography sx={{ fontWeight: 600, color: '#F59E0B' }}>
                  {formatCurrency(data?.stats?.pendingWithdrawals ?? 0)}
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                fullWidth 
                disabled={!data?.stats?.currentWalletBalance || data.stats.currentWalletBalance < 5000}
                onClick={() => setWithdrawModalOpen(true)}
                sx={{ mt: 2, py: 1.5, fontWeight: 700, borderRadius: 2, textTransform: 'none', bgcolor: '#1A1FE8' }}
              >
                Withdraw Funds
              </Button>
            </Box>
          </Paper>

          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 2 }}>
            Withdrawal History
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569' }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.withdrawals?.length > 0 ? data.withdrawals.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell><StatusChip status={row.status} size="small" /></TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 2, color: '#64748B' }}>
                      No withdrawals
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      {/* Withdrawal Modal */}
      <Modal open={withdrawModalOpen} onClose={() => !withdrawing && setWithdrawModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 440 }, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 24, p: 4 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 2 }}>Request Withdrawal</Typography>
          <Divider sx={{ mb: 3 }} />
          <form onSubmit={handleWithdrawSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField 
                label="Amount (₦)" 
                variant="outlined" 
                type="number" 
                fullWidth 
                required 
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                helperText={`Minimum: ₦5,000 | Available: ${formatCurrency(data?.stats?.currentWalletBalance ?? 0)}`}
                InputProps={{ inputProps: { min: 5000, max: data?.stats?.currentWalletBalance ?? 0 } }}
              />

              <FormControl fullWidth required>
                <InputLabel id="bank-select-label">Select Destination Bank</InputLabel>
                <Select
                  labelId="bank-select-label"
                  label="Select Destination Bank"
                  value={selectedBankCode}
                  onChange={(e) => {
                    const bCode = e.target.value;
                    setSelectedBankCode(bCode);
                    const bObj = banks.find((b) => b.code === bCode);
                    if (bObj) {
                      setSelectedBankName(bObj.name);
                    }
                  }}
                >
                  {banks.map((b: any) => (
                    <MenuItem key={b.code} value={b.code}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField 
                label="10-Digit Account Number" 
                variant="outlined" 
                fullWidth 
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                InputProps={{ inputProps: { maxLength: 10 } }}
              />

              {verifyingAccount && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: '#1A1FE8' }} />
                  <Typography sx={{ fontSize: '0.85rem', color: '#64748B' }}>
                    Verifying account details with Paystack...
                  </Typography>
                </Box>
              )}

              {resolvedAccountName && (
                <Alert severity="success" icon={<VerifiedIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{resolvedAccountName}</Typography>
                  <Typography sx={{ fontSize: '0.78rem' }}>Account Name Verified</Typography>
                </Alert>
              )}

              {accountError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {accountError}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 1 }}>
                <Button variant="outlined" onClick={() => setWithdrawModalOpen(false)} disabled={withdrawing}>Cancel</Button>
                <Button variant="contained" type="submit" disabled={withdrawing || (accountNumber.length === 10 && !resolvedAccountName && verifyingAccount)} sx={{ bgcolor: '#1A1FE8' }}>
                  {withdrawing ? 'Processing...' : 'Submit Request'}
                </Button>
              </Box>
            </Box>
          </form>
        </Box>
      </Modal>

    </Box>
  );
}

const StatCard = ({ title, value, icon }: any) => (
  <Box sx={{ flex: '1 1 150px', bgcolor: '#F8FAFC', borderRadius: 3, p: 2, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <Box sx={{ mb: 1 }}>{icon}</Box>
    <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#0F172A', lineHeight: 1, mb: 0.5 }}>{value}</Typography>
    <Typography sx={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 600 }}>{title}</Typography>
  </Box>
);

const StatusChip = ({ status, size = "medium" }: { status: string, size?: "small" | "medium" }) => {
  let color: "warning" | "success" | "info" | "error" | "default" = "default";
  
  switch((status || '').toLowerCase()) {
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
      color = 'error';
      break;
  }

  return (
    <Chip 
      label={status} 
      color={color} 
      size={size} 
      sx={{ fontWeight: 600, textTransform: 'capitalize' }} 
    />
  );
};
