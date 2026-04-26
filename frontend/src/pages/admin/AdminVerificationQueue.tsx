import { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, TextField, Button, Avatar, Chip, 
  CircularProgress, InputAdornment, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, TablePagination 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { getVerificationQueue, type AdminVerification } from '../../api/admin';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Flagged'];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#FEF3C7', color: '#D97706' },
  approved: { bg: '#DCFCE7', color: '#15803D' },
  rejected: { bg: '#FEE2E2', color: '#B91C1C' },
  flagged: { bg: '#FFEDD5', color: '#C2410C' },
};

export default function AdminVerificationQueue() {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Pagination
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      // API expects 1-based page
      const res = await getVerificationQueue(page + 1, rowsPerPage, status.toLowerCase(), search);
      setVerifications(res.results);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, status, search]);

  useEffect(() => {
    // Debounce search slightly or just fetch when state changes
    const timeout = setTimeout(() => {
      fetchQueue();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchQueue]);

  const handleRowClick = (id: number) => {
    navigate(`/admin/verifications/${id}`);
  };

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Typography variant="h4" fontWeight={900} color="#0F172A" mb={1}>
        Verification Queue
      </Typography>
      <Typography variant="body1" color="#64748B" mb={4}>
        Review and process user verification requests
      </Typography>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search by name, ONLOK ID, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94A3B8' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: '12px', bgcolor: '#fff', '& fieldset': { borderColor: '#E2E8F0' } }
          }}
        />

        {/* Filter Pills */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <Button
              key={f}
              variant={status === f ? 'contained' : 'contained'}
              onClick={() => { setStatus(f); setPage(0); }}
              disableElevation
              sx={{
                bgcolor: status === f ? '#1A1FE8' : '#F1F5F9',
                color: status === f ? '#fff' : '#475569',
                borderRadius: '8px',
                px: 3,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: status === f ? '#0F14B0' : '#E2E8F0'
                }
              }}
            >
              {f}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0' }}>ONLOK ID</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0' }}>Submission Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', borderBottom: '1px solid #E2E8F0' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && verifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <CircularProgress sx={{ color: '#1A1FE8' }} />
                  </TableCell>
                </TableRow>
              ) : verifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#64748B' }}>
                    No verification requests found.
                  </TableCell>
                </TableRow>
              ) : (
                verifications.map((v) => {
                  const initials = `${v.first_name?.[0] || ''}${v.last_name?.[0] || ''}`.toUpperCase();
                  const statStyle = STATUS_STYLES[v.status] || STATUS_STYLES.pending;
                  
                  return (
                    <TableRow 
                      key={v.verification_id} 
                      hover
                      onClick={() => handleRowClick(v.verification_id)}
                      sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      {/* Name Column */}
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: '#CBD5E1', color: '#475569', fontWeight: 700 }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700} color="#0F172A">
                              {v.first_name} {v.last_name}
                            </Typography>
                            <Typography variant="caption" color="#64748B">
                              {v.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      {/* ONLOK ID */}
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Typography variant="body2" fontFamily="monospace" color="#475569">
                          {v.vendor_id}
                        </Typography>
                      </TableCell>

                      {/* Submission Date */}
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9', color: '#475569', fontSize: '0.875rem' }}>
                        {new Date(v.submitted_at).toLocaleDateString()}
                      </TableCell>

                      {/* Type */}
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9', color: '#475569', fontSize: '0.875rem' }}>
                        {v.type}
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Chip 
                          label={v.status.charAt(0).toUpperCase() + v.status.slice(1)} 
                          size="small"
                          sx={{ 
                            bgcolor: statStyle.bg, 
                            color: statStyle.color, 
                            fontWeight: 700,
                            borderRadius: '16px' 
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
}
