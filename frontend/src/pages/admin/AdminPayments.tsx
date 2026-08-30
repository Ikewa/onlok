import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, InputAdornment, MenuItem,
  Select, FormControl, InputLabel, Button, CircularProgress, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar, TablePagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getPaymentsAdmin, syncPaymentAdmin, syncAllPaymentsAdmin, type AdminPaymentRecord } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminPayments() {
  const [records, setRecords] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [globalSyncing, setGlobalSyncing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    activeCount: 0,
    attentionCount: 0,
    inactiveCount: 0
  });

  // Selected Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<AdminPaymentRecord | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await getPaymentsAdmin({
        page: page + 1,
        limit: rowsPerPage,
        q: searchQuery,
        status: statusFilter,
        tier: tierFilter
      });

      setRecords(res.results || []);
      setTotalCount(res.total || 0);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin payments:', err);
      toast.error(err.response?.data?.message || 'Could not load payment records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, rowsPerPage, statusFilter, tierFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchPayments();
  };

  const handleSyncPayment = async (subId: number) => {
    setSyncingId(subId);
    try {
      const res = await syncPaymentAdmin(subId);
      if (res.status) {
        toast.success(res.message || 'Payment status synced successfully');
        fetchPayments();
      } else {
        toast.error(res.message || 'Sync completed with no changes');
      }
    } catch (err: any) {
      console.error('Sync payment error:', err);
      toast.error(err.response?.data?.message || 'Failed to sync with Paystack');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllPayments = async () => {
    setGlobalSyncing(true);
    const toastId = toast.loading('Syncing all payments from Paystack API...');
    try {
      const res = await syncAllPaymentsAdmin();
      toast.success(res.message || 'Paystack sync completed successfully!', { id: toastId });
      fetchPayments();
    } catch (err: any) {
      console.error('Global sync error:', err);
      toast.error(err.response?.data?.message || 'Failed to sync with Paystack', { id: toastId });
    } finally {
      setGlobalSyncing(false);
    }
  };

  const copyToClipboard = (text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const renderStatusChip = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'active':
        return (
          <Chip
            label="Active"
            size="small"
            sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 600, fontSize: '0.78rem', px: 1, borderRadius: '9999px' }}
          />
        );
      case 'attention':
        return (
          <Chip
            label="Attention"
            size="small"
            sx={{ bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 600, fontSize: '0.78rem', px: 1, borderRadius: '9999px' }}
          />
        );
      case 'cancelled':
      case 'expired':
        return (
          <Chip
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            size="small"
            sx={{ bgcolor: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontSize: '0.78rem', px: 1, borderRadius: '9999px' }}
          />
        );
      default:
        return (
          <Chip
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            size="small"
            sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 600, fontSize: '0.78rem', px: 1, borderRadius: '9999px' }}
          />
        );
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
            Payments & Transactions
          </Typography>
          <Typography variant="body1" color="#6B7280" sx={{ fontSize: '0.88rem' }}>
            Monitor vendor subscription payments, Paystack transaction codes, and billing status.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            onClick={() => fetchPayments()}
            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
            sx={{
              borderColor: '#E5E7EB',
              color: '#374151',
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              px: 2,
              py: 0.8,
              bgcolor: '#FFFFFF',
              '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' }
            }}
          >
            Refresh Data
          </Button>
          <Button
            variant="contained"
            disabled={globalSyncing}
            onClick={handleSyncAllPayments}
            startIcon={globalSyncing ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <RefreshIcon sx={{ fontSize: 18 }} />}
            sx={{
              bgcolor: '#5B5FEC',
              color: '#FFFFFF',
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              px: 2.5,
              py: 0.8,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#4F52D4', boxShadow: 'none' }
            }}
          >
            {globalSyncing ? 'Syncing Paystack...' : 'Sync All with Paystack'}
          </Button>
        </Stack>
      </Box>

      {/* Metrics Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="#6B7280" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
              Total Volume
            </Typography>
            <Avatar sx={{ bgcolor: '#EEF2FF', color: '#5B5FEC', width: 38, height: 38, borderRadius: '10px' }}>
              <AccountBalanceWalletOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={700} color="#111827" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
            ₦{metrics.totalVolume.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
            Total payments logged
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="#6B7280" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
              Active Subscriptions
            </Typography>
            <Avatar sx={{ bgcolor: '#DCFCE7', color: '#16A34A', width: 38, height: 38, borderRadius: '10px' }}>
              <CheckCircleOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={700} color="#111827" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
            {metrics.activeCount}
          </Typography>
          <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
            Verified active vendors
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="#6B7280" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
              Attention Needed
            </Typography>
            <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 38, height: 38, borderRadius: '10px' }}>
              <WarningAmberOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={700} color="#D97706" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
            {metrics.attentionCount}
          </Typography>
          <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
            Pending sync or renewals
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" fontWeight={600} color="#6B7280" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
              Inactive / Cancelled
            </Typography>
            <Avatar sx={{ bgcolor: '#F3F4F6', color: '#6B7280', width: 38, height: 38, borderRadius: '10px' }}>
              <CancelOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={700} color="#111827" sx={{ fontSize: '1.5rem', mb: 0.5 }}>
            {metrics.inactiveCount}
          </Typography>
          <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
            Expired accounts
          </Typography>
        </Paper>
      </Box>

      {/* Filter & Search Bar */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search by name, ONLOK ID, email, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#9CA3AF' }} />
                </InputAdornment>
              ),
              sx: { borderRadius: '8px', bgcolor: '#F3F4F6', '& fieldset': { border: 'none' }, fontSize: '0.88rem' }
            }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              sx={{ borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="attention">Attention</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: '0.85rem' }}>Badge Tier</InputLabel>
            <Select
              value={tierFilter}
              label="Badge Tier"
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(0);
              }}
              sx={{ borderRadius: '8px', fontSize: '0.85rem' }}
            >
              <MenuItem value="all">All Tiers</MenuItem>
              <MenuItem value="bronze">Bronze</MenuItem>
              <MenuItem value="silver">Silver</MenuItem>
              <MenuItem value="gold">Gold</MenuItem>
            </Select>
          </FormControl>

          <Button
            type="submit"
            disableElevation
            sx={{
              bgcolor: '#5B5FEC',
              color: '#FFFFFF',
              borderRadius: '8px',
              px: 3,
              py: 0.9,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              '&:hover': { bgcolor: '#4F52D4' }
            }}
          >
            Filter
          </Button>
        </Box>
      </Paper>

      {/* Transactions Data Table */}
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden', bgcolor: '#FFFFFF' }}>
        <TableContainer>
          <Table sx={{ minWidth: 850 }}>
            <TableHead sx={{ bgcolor: '#F9FAFB' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Vendor</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Plan & Tier</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Amount & Cycle</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Paystack Code / Ref</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Date / Renewal</TableCell>
                <TableCell align="center" sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#5B5FEC' }} />
                    <Typography variant="body2" color="#6B7280" mt={1}>Loading transactions...</Typography>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" fontWeight={600} color="#111827">No transactions found</Typography>
                    <Typography variant="body2" color="#6B7280">Try clearing filters or search term</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((rec, idx) => {
                  const initials = `${rec.first_name?.[0] || ''}${rec.last_name?.[0] || ''}`.toUpperCase() || 'V';
                  const safeTier = (rec.tier || 'bronze').toLowerCase();
                  
                  return (
                    <TableRow 
                      key={`${rec.subscription_id}-${rec.user_id}-${idx}`} 
                      hover 
                      sx={{ '&:hover': { bgcolor: '#F9FAFB' }, borderBottom: '1px solid #F3F4F6' }}
                    >
                      {/* Vendor Info */}
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={rec.profile_picture_url || undefined}
                            sx={{ width: 38, height: 38, bgcolor: '#374151', color: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem' }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>
                              {rec.first_name} {rec.last_name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                              <Typography variant="caption" fontFamily="monospace" color="#4B5563" sx={{ fontSize: '0.78rem' }}>
                                {rec.vendor_id || `ID-${rec.user_id}`}
                              </Typography>
                              <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>• {rec.email}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Plan & Tier */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.85rem' }}>
                          {rec.plan_name || 'Verified Vendor'}
                        </Typography>
                        <Chip
                          label={safeTier.toUpperCase()}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            mt: 0.3,
                            bgcolor: safeTier === 'gold' ? '#FEF3C7' : safeTier === 'silver' ? '#F3F4F6' : '#FFEDD5',
                            color: safeTier === 'gold' ? '#B45309' : safeTier === 'silver' ? '#374151' : '#C2410C'
                          }}
                        />
                      </TableCell>

                      {/* Amount & Cycle */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="#111827" sx={{ fontSize: '0.88rem' }}>
                          {rec.amount ? `₦${Number(rec.amount).toLocaleString()}` : '—'}
                        </Typography>
                        <Typography variant="caption" color="#6B7280" sx={{ textTransform: 'capitalize', fontSize: '0.78rem' }}>
                          {rec.amount ? `${rec.billing_cycle || 'annual'} billing` : 'Unpaid'}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {renderStatusChip(rec.status)}
                      </TableCell>

                      {/* Paystack Code / Reference */}
                      <TableCell>
                        <Box>
                          <Typography variant="caption" fontFamily="monospace" color="#4B5563" sx={{ display: 'block', fontSize: '0.82rem' }}>
                            {rec.paystack_subscription_code || rec.payment_reference || '—'}
                          </Typography>
                          {rec.paystack_plan_code && (
                            <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.75rem' }}>
                              Plan: {rec.paystack_plan_code}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Date / Renewal */}
                      <TableCell>
                        <Typography variant="body2" fontSize="0.85rem" color="#4B5563">
                          {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                        {rec.next_payment_date && (
                          <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
                            Next: {new Date(rec.next_payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Sync status with Paystack">
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={syncingId === (rec.subscription_id || rec.user_id)}
                              onClick={() => handleSyncPayment(rec.subscription_id || rec.user_id)}
                              startIcon={syncingId === rec.subscription_id ? <CircularProgress size={14} sx={{ color: '#5B5FEC' }} /> : <RefreshIcon fontSize="small" />}
                              sx={{
                                textTransform: 'none',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                py: 0.4,
                                px: 1.2,
                                borderColor: '#E5E7EB',
                                color: '#374151',
                                fontWeight: 600,
                                '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' }
                              }}
                            >
                              Sync
                            </Button>
                          </Tooltip>

                          <Tooltip title="View Transaction Details">
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={syncingId === rec.subscription_id}
                              onClick={() => setSelectedRecord(rec)}
                              sx={{
                                textTransform: 'none',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                py: 0.4,
                                px: 1.2,
                                borderColor: '#E5E7EB',
                                color: '#374151',
                                fontWeight: 600,
                                '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' }
                              }}
                            >
                              Details
                            </Button>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: '1px solid #E5E7EB' }}
        />
      </Paper>

      {/* Transaction Details Dialog */}
      <Dialog
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px', p: 1, border: '1px solid #E5E7EB' } }}
      >
        {selectedRecord && (
          <>
            <DialogTitle sx={{ fontWeight: 700, color: '#111827', pb: 1, fontSize: '1.15rem' }}>
              Transaction Details — #{selectedRecord.subscription_id}
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: '#E5E7EB' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Vendor Name</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827">{selectedRecord.first_name} {selectedRecord.last_name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">ONLOK ID</Typography>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="#111827">{selectedRecord.vendor_id || `ID-${selectedRecord.user_id}`}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Vendor Email</Typography>
                  <Typography variant="body2" fontWeight={600} color="#4B5563">{selectedRecord.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Plan & Tier</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827">{selectedRecord.plan_name} ({(selectedRecord.tier || 'bronze').toUpperCase()})</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Amount Paid</Typography>
                  <Typography variant="body2" fontWeight={700} color="#111827">₦{Number(selectedRecord.amount).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Billing Cycle</Typography>
                  <Typography variant="body2" fontWeight={600} color="#4B5563" sx={{ textTransform: 'capitalize' }}>{selectedRecord.billing_cycle}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Status</Typography>
                  {renderStatusChip(selectedRecord.status)}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Paystack Sub Code</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontFamily="monospace" color="#111827" fontWeight={600}>{selectedRecord.paystack_subscription_code || 'N/A'}</Typography>
                    {selectedRecord.paystack_subscription_code && (
                      <IconButton size="small" onClick={() => copyToClipboard(selectedRecord.paystack_subscription_code)}>
                        <ContentCopyIcon sx={{ fontSize: 14, color: '#6B7280' }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Paystack Plan Code</Typography>
                  <Typography variant="caption" fontFamily="monospace" color="#111827">{selectedRecord.paystack_plan_code || 'N/A'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#6B7280">Payment Reference</Typography>
                  <Typography variant="caption" fontFamily="monospace" color="#111827">{selectedRecord.payment_reference || 'N/A'}</Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                onClick={() => setSelectedRecord(null)}
                variant="outlined"
                sx={{
                  borderColor: '#E5E7EB',
                  color: '#374151',
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontWeight: 600
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  handleSyncPayment(selectedRecord.subscription_id || selectedRecord.user_id);
                  setSelectedRecord(null);
                }}
                disableElevation
                startIcon={<RefreshIcon />}
                sx={{
                  bgcolor: '#5B5FEC',
                  color: '#FFFFFF',
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#4F52D4' }
                }}
              >
                Sync with Paystack
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
