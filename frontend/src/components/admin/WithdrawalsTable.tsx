import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Button,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface WithdrawalsTableProps {
  loading: boolean;
  withdrawals: any[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (newPage: number) => void;
  onUpdateStatus: (id: number, newStatus: string) => void;
  formatCurrency: (val: number) => string;
}

export const WithdrawalsTable: React.FC<WithdrawalsTableProps> = ({
  loading,
  withdrawals,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  pagination,
  onPageChange,
  onUpdateStatus,
  formatCurrency,
}) => {
  const dataList = withdrawals || [];
  const totalCount = pagination.total || dataList.length;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        bgcolor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justify: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CreditCardOutlinedIcon sx={{ color: '#10B981', fontSize: 22 }} />
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            All Withdrawal Request
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search Withdrawals"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 220 },
              bgcolor: '#F3F4F6',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { border: 'none' },
                fontSize: '0.85rem',
                color: '#111827',
              },
            }}
          />

          <Select
            size="small"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            sx={{
              width: { xs: '100%', sm: 140 },
              bgcolor: '#F3F4F6',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#4B5563',
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Table Section */}
      <TableContainer>
        <Table sx={{ minWidth: 750 }}>
          <TableHead sx={{ bgcolor: '#F9FAFB' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Vendor
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Payment Method
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Account Details
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Request Date
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} sx={{ color: '#5B5FEC' }} />
                </TableCell>
              </TableRow>
            ) : dataList.length > 0 ? (
              dataList.map((row: any) => {
                const vendorName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Vendor User';
                const vendorComp = row.business_name || 'Vendor Company';

                const detailsLines = (row.account_details || row.account_number || '').split('\n');
                const accNum = detailsLines[0] || 'N/A';
                const bankName = detailsLines[1] || '';

                const dateStr = row.created_at
                  ? new Date(row.created_at).toLocaleDateString('en-US')
                  : 'N/A';

                const isProcessing = row.status?.toLowerCase() === 'processing' || row.status?.toLowerCase() === 'process';

                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': { bgcolor: '#F9FAFB' },
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                        {vendorName}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: '0.78rem' }}>
                        {vendorComp}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                      {row.payment_method || 'Bank Transfer'}
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                        {accNum}
                      </Typography>
                      {bankName && (
                        <Typography sx={{ color: '#6B7280', fontSize: '0.78rem' }}>
                          {bankName}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ color: '#111827', fontSize: '0.88rem', fontWeight: 500 }}>
                      {formatCurrency(parseFloat(row.amount) || 0)}
                    </TableCell>

                    <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                      {dateStr}
                    </TableCell>

                    <TableCell>
                      {row.status?.toLowerCase() === 'paid' ? (
                        <Typography sx={{ color: '#16A34A', fontWeight: 600, fontSize: '0.85rem' }}>
                          Paid
                        </Typography>
                      ) : row.status?.toLowerCase() === 'failed' ? (
                        <Typography sx={{ color: '#DC2626', fontWeight: 600, fontSize: '0.85rem' }}>
                          Failed
                        </Typography>
                      ) : (
                        <Typography sx={{ color: '#2563EB', fontWeight: 600, fontSize: '0.85rem' }}>
                          Process
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {isProcessing ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />}
                            onClick={() => onUpdateStatus(row.id, 'paid')}
                            sx={{
                              borderRadius: '8px',
                              textTransform: 'none',
                              color: '#374151',
                              borderColor: '#D1D5DB',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              py: 0.5,
                              px: 1.5,
                              '&:hover': {
                                bgcolor: '#F0FDF4',
                                borderColor: '#16A34A',
                                color: '#16A34A',
                              },
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<HighlightOffOutlinedIcon sx={{ fontSize: 16 }} />}
                            onClick={() => onUpdateStatus(row.id, 'failed')}
                            sx={{
                              borderRadius: '8px',
                              textTransform: 'none',
                              color: '#374151',
                              borderColor: '#D1D5DB',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              py: 0.5,
                              px: 1.5,
                              '&:hover': {
                                bgcolor: '#FEF2F2',
                                borderColor: '#DC2626',
                                color: '#DC2626',
                              },
                            }}
                          >
                            Reject
                          </Button>
                        </Box>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#6B7280' }}>
                  No withdrawal requests found in database.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer Bar */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          bgcolor: '#F9FAFB',
          borderTop: '1px solid #E5E7EB',
        }}
      >
        <Typography sx={{ color: '#6B7280', fontSize: '0.85rem' }}>
          Showing {dataList.length} of {totalCount} transactions
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            sx={{
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              p: 0.5,
              bgcolor: '#FFFFFF',
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            sx={{
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              p: 0.5,
              bgcolor: '#FFFFFF',
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default WithdrawalsTable;
