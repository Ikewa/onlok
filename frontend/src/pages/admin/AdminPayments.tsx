import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, InputAdornment, MenuItem,
  Select, FormControl, InputLabel, Button, CircularProgress, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Avatar, Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { getPaymentsAdmin, syncPaymentAdmin, type AdminPaymentRecord } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminPayments() {
  const [records, setRecords] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
        page,
        limit: 15,
        q: searchQuery,
        status: statusFilter,
        tier: tierFilter
      });

      setRecords(res.results || []);
      setTotalCount(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / 15) || 1);
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
  }, [page, statusFilter, tierFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
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

  const copyToClipboard = (text?: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const renderStatusChip = (status: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'active':
        return <Chip label="ACTIVE" size="small" sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 700, borderRadius: 1.5 }} />;
      case 'attention':
        return <Chip label="ATTENTION" size="small" sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 700, borderRadius: 1.5 }} />;
      case 'cancelled':
      case 'expired':
        return <Chip label={s.toUpperCase()} size="small" sx={{ bgcolor: '#F3F4F6', color: '#4B5563', fontWeight: 700, borderRadius: 1.5 }} />;
      default:
        return <Chip label={s.toUpperCase()} size="small" sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, borderRadius: 1.5 }} />;
    }
  };

  return (
    <Box sx={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0F172A">
            Payments & Transactions
          </Typography>
          <Typography variant="body2" color="#64748B">
            Monitor vendor subscription payments, Paystack transaction codes, and billing status.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => fetchPayments()}
          startIcon={<RefreshIcon />}
          sx={{ borderColor: '#CBD5E1', color: '#0F172A', textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Metrics Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2.5, mb: 4 }}>
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="#64748B" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Volume
            </Typography>
            <Avatar sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', width: 36, height: 36 }}>
              <AccountBalanceWalletOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={800} color="#0F172A">
            ₦{metrics.totalVolume.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="#94A3B8">
            Total subscription payments logged
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="#64748B" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Subscriptions
            </Typography>
            <Avatar sx={{ bgcolor: '#F0FDF4', color: '#16A34A', width: 36, height: 36 }}>
              <CheckCircleOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={800} color="#0F172A">
            {metrics.activeCount}
          </Typography>
          <Typography variant="caption" color="#94A3B8">
            Currently active & verified vendors
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="#64748B" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Attention Needed
            </Typography>
            <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 36, height: 36 }}>
              <WarningAmberOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={800} color="#D97706">
            {metrics.attentionCount}
          </Typography>
          <Typography variant="caption" color="#94A3B8">
            Failed renewals or pending paystack syncs
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="#64748B" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Inactive / Cancelled
            </Typography>
            <Avatar sx={{ bgcolor: '#F3F4F6', color: '#6B7280', width: 36, height: 36 }}>
              <CancelOutlinedIcon fontSize="small" />
            </Avatar>
          </Box>
          <Typography variant="h5" fontWeight={800} color="#0F172A">
            {metrics.inactiveCount}
          </Typography>
          <Typography variant="caption" color="#94A3B8">
            Expired or cancelled billing accounts
          </Typography>
        </Paper>
      </Box>

      {/* Filter & Search Bar */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search Vendor ID, Name, Email, or Reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94A3B8' }} />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="attention">Attention</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Badge Tier</InputLabel>
            <Select
              value={tierFilter}
              label="Badge Tier"
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">All Tiers</MenuItem>
              <MenuItem value="bronze">Bronze</MenuItem>
              <MenuItem value="silver">Silver</MenuItem>
              <MenuItem value="gold">Gold</MenuItem>
            </Select>
          </FormControl>

          <Button type="submit" variant="contained" sx={{ bgcolor: '#4F46E5', textTransform: 'none', borderRadius: 2, px: 3, fontWeight: 700 }}>
            Filter
          </Button>
        </Box>
      </Paper>

      {/* Transactions Data Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', bgcolor: '#FFFFFF' }}>
        <TableContainer>
          <Table sx={{ minWidth: 850 }}>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>VENDOR</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>PLAN & TIER</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>AMOUNT & CYCLE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>PAYSTACK CODE / REF</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>DATE / RENEWAL</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#4F46E5' }} />
                    <Typography variant="body2" color="#64748B" mt={1}>Loading transactions...</Typography>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" fontWeight={600} color="#0F172A">No transactions found</Typography>
                    <Typography variant="body2" color="#64748B">Try clearing filters or search term</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((rec, idx) => (
                  <TableRow key={`${rec.subscription_id}-${rec.user_id}-${idx}`} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    {/* Vendor Info */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          src={rec.profile_picture_url || undefined}
                          sx={{ width: 38, height: 38, bgcolor: '#4F46E5', fontWeight: 700, fontSize: '0.85rem' }}
                        >
                          {rec.first_name?.[0] || 'V'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} color="#0F172A">
                            {rec.first_name} {rec.last_name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={rec.vendor_id || `ID-${rec.user_id}`}
                              size="small"
                              sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#EEF2FF', color: '#4338CA' }}
                            />
                            <Typography variant="caption" color="#64748B">{rec.email}</Typography>
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Plan & Tier */}
                    <TableCell>
                        <Typography variant="body2" fontWeight={700} color="#0F172A">
                          {rec.plan_name || 'Verified Vendor'}
                        </Typography>
                        <Chip
                          label={(rec.tier || 'bronze').toUpperCase()}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            borderRadius: 1,
                            mt: 0.3,
                            bgcolor: (rec.tier || '').toLowerCase() === 'gold' ? '#FEF3C7'
                                   : (rec.tier || '').toLowerCase() === 'silver' ? '#F1F5F9'
                                   : '#FFEDD5',
                            color: (rec.tier || '').toLowerCase() === 'gold' ? '#B45309'
                                 : (rec.tier || '').toLowerCase() === 'silver' ? '#475569'
                                 : '#9A3412'
                          }}
                        />
                      </TableCell>

                      {/* Amount & Cycle */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color="#0F172A">
                          ₦{Number(rec.amount || 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="#64748B" sx={{ textTransform: 'capitalize' }}>
                          {rec.billing_cycle || 'Annual'} billing
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {renderStatusChip(rec.status)}
                      </TableCell>

                      {/* Paystack Code / Reference */}
                      <TableCell>
                        <Box>
                          <Typography variant="caption" fontFamily="monospace" color="#334155" sx={{ display: 'block' }}>
                            {rec.paystack_subscription_code || rec.payment_reference || '—'}
                          </Typography>
                          {rec.paystack_plan_code && (
                            <Typography variant="caption" color="#94A3B8" sx={{ fontSize: '0.72rem' }}>
                              Plan: {rec.paystack_plan_code}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Date / Renewal */}
                      <TableCell>
                        <Typography variant="body2" fontSize="0.82rem" color="#334155">
                          {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                        {rec.next_payment_date && (
                          <Typography variant="caption" color="#64748B">
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
                              disabled={syncingId === rec.subscription_id}
                              onClick={() => handleSyncPayment(rec.subscription_id)}
                              startIcon={syncingId === rec.subscription_id ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
                              sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.78rem', py: 0.4, borderColor: '#CBD5E1', color: '#334155' }}
                            >
                              Sync
                            </Button>
                          </Tooltip>

                          <Tooltip title="View Transaction Details">
                            <IconButton size="small" onClick={() => setSelectedRecord(rec)} sx={{ color: '#64748B' }}>
                              <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0' }}>
            <Typography variant="body2" color="#64748B">
              Showing {records.length} of {totalCount} records
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </Paper>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedRecord} onClose={() => setSelectedRecord(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        {selectedRecord && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
              Transaction Details — #{selectedRecord.subscription_id}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Vendor Name</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedRecord.first_name} {selectedRecord.last_name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Vendor ID</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedRecord.vendor_id}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Vendor Email</Typography>
                  <Typography variant="body2" fontWeight={600} color="#334155">{selectedRecord.email}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Plan & Tier</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedRecord.plan_name} ({selectedRecord.tier})</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Amount Paid</Typography>
                  <Typography variant="body2" fontWeight={800} color="#0F172A">₦{Number(selectedRecord.amount).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Billing Cycle</Typography>
                  <Typography variant="body2" fontWeight={600} color="#334155" sx={{ textTransform: 'capitalize' }}>{selectedRecord.billing_cycle}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Status</Typography>
                  {renderStatusChip(selectedRecord.status)}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Paystack Sub Code</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" fontFamily="monospace" color="#0F172A">{selectedRecord.paystack_subscription_code || 'N/A'}</Typography>
                    {selectedRecord.paystack_subscription_code && (
                      <IconButton size="small" onClick={() => copyToClipboard(selectedRecord.paystack_subscription_code)}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Paystack Plan Code</Typography>
                  <Typography variant="caption" fontFamily="monospace" color="#0F172A">{selectedRecord.paystack_plan_code || 'N/A'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="#64748B">Payment Reference</Typography>
                  <Typography variant="caption" fontFamily="monospace" color="#0F172A">{selectedRecord.payment_reference || 'N/A'}</Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setSelectedRecord(null)} variant="outlined" sx={{ textTransform: 'none', borderRadius: 2 }}>
                Close
              </Button>
              <Button
                onClick={() => {
                  handleSyncPayment(selectedRecord.subscription_id);
                  setSelectedRecord(null);
                }}
                variant="contained"
                startIcon={<RefreshIcon />}
                sx={{ bgcolor: '#4F46E5', textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
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
