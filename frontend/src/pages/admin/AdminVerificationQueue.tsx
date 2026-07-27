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

const STATUS_FILTERS = ['All', 'Pending', 'Tier_Assigned', 'Payment_Received', 'Approved', 'Rejected', 'Flagged'];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:          { bg: '#FEF3C7', color: '#D97706' },
  tier_assigned:    { bg: '#E0F2FE', color: '#0369A1' },
  payment_received: { bg: '#DCFCE7', color: '#166534' },
  approved:         { bg: '#DCFCE7', color: '#16A34A' },
  rejected:         { bg: '#FEE2E2', color: '#DC2626' },
  flagged:          { bg: '#FFEDD5', color: '#D97706' },
  suspended:        { bg: '#FFEDD5', color: '#D97706' },
};

const DEFAULT_STATUS_STYLE = { bg: '#F3F4F6', color: '#6B7280' };

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
    const timeout = setTimeout(() => {
      fetchQueue();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchQueue]);

  const handleRowClick = (id: number) => {
    navigate(`/admin/verifications/${id}`);
  };

  return (
    <Box sx={{ maxWidth: 1200, fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
          Verification Queue
        </Typography>
        <Typography variant="body1" color="#6B7280" sx={{ fontSize: '0.88rem' }}>
          Review and process user verification requests
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', mb: 3 }}>
        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search by name, ONLOK ID, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9CA3AF' }} />
              </InputAdornment>
            ),
            sx: { borderRadius: '8px', bgcolor: '#F3F4F6', '& fieldset': { border: 'none' }, fontSize: '0.88rem' }
          }}
        />

        {/* Filter Pills */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <Button
              key={f}
              onClick={() => { setStatus(f); setPage(0); }}
              disableElevation
              sx={{
                bgcolor: status === f ? '#5B5FEC' : '#F3F4F6',
                color: status === f ? '#FFFFFF' : '#4B5563',
                borderRadius: '8px',
                px: 2.5,
                py: 0.75,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                '&:hover': {
                  bgcolor: status === f ? '#4F52D4' : '#E5E7EB'
                }
              }}
            >
              {f}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', overflow: 'hidden' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#F9FAFB' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>ONLOK ID</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Submission Date</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && verifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <CircularProgress sx={{ color: '#5B5FEC' }} />
                  </TableCell>
                </TableRow>
              ) : verifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#6B7280' }}>
                    No verification requests found.
                  </TableCell>
                </TableRow>
              ) : (
                verifications.map((v) => {
                  const initials = `${v.first_name?.[0] || ''}${v.last_name?.[0] || ''}`.toUpperCase();
                  const normalizedStatus = (v.status || '').trim().toLowerCase();
                  const statStyle = STATUS_STYLES[normalizedStatus] || DEFAULT_STATUS_STYLE;
                  
                  return (
                    <TableRow 
                      key={v.verification_id} 
                      hover
                      onClick={() => handleRowClick(v.verification_id)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#F9FAFB' }, borderBottom: '1px solid #F3F4F6' }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 38, height: 38, bgcolor: '#374151', color: '#FFFFFF', fontWeight: 600, fontSize: '0.85rem' }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>
                              {v.first_name} {v.last_name}
                            </Typography>
                            <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
                              {v.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" color="#4B5563" sx={{ fontSize: '0.85rem' }}>
                          {v.vendor_id}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                        {new Date(v.submitted_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                        {v.type}
                      </TableCell>

                      <TableCell>
                        <Chip 
                          label={normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)} 
                          size="small"
                          sx={{ 
                            bgcolor: statStyle.bg, 
                            color: statStyle.color,
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            px: 1,
                            borderRadius: '9999px',
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
