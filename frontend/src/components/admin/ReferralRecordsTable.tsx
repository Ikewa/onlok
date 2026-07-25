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
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StatusBadge from './StatusBadge';

interface ReferralRecordsTableProps {
  loading: boolean;
  records: any[];
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
  formatCurrency: (val: number) => string;
}

export const ReferralRecordsTable: React.FC<ReferralRecordsTableProps> = ({
  loading,
  records,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  pagination,
  onPageChange,
  formatCurrency,
}) => {
  const dataList = records || [];
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
      {/* Header bar */}
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
          <PeopleOutlinedIcon sx={{ color: '#5B5FEC', fontSize: 22 }} />
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              color: '#111827',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            All Referral Records
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search Referrals"
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
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Table Section */}
      <TableContainer>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: '#F9FAFB' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Referrer
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Referred Vendor
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Plan
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Commission
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Date
              </TableCell>
              <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', py: 1.5 }}>
                Status
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
                const referrerName = `${row.referrer_first_name || ''} ${row.referrer_last_name || ''}`.trim() || 'Referrer User';
                const referrerComp = row.referrer_business_name || 'Vendor Company';

                const referredName = row.referred_first_name
                  ? `${row.referred_first_name} ${row.referred_last_name}`
                  : 'Referred Vendor';
                const referredComp = row.referred_business_name || 'Vendor Company';

                const dateStr = row.created_at
                  ? new Date(row.created_at).toLocaleDateString('en-US')
                  : 'N/A';

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
                        {referrerName}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: '0.78rem' }}>
                        {referrerComp}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                        {referredName}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: '0.78rem' }}>
                        {referredComp}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                      {row.subscription_plan || 'N/A'}
                    </TableCell>

                    <TableCell sx={{ color: '#111827', fontSize: '0.88rem', fontWeight: 500 }}>
                      {formatCurrency(parseFloat(row.amount_paid) || 0)}
                    </TableCell>

                    <TableCell sx={{ color: '#16A34A', fontSize: '0.88rem', fontWeight: 600 }}>
                      {formatCurrency(parseFloat(row.commission_earned) || 0)}
                    </TableCell>

                    <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                      {dateStr}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#6B7280' }}>
                  No referral records found in database.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer bar */}
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

export default ReferralRecordsTable;
