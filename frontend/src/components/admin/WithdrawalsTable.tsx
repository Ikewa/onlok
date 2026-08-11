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
  Checkbox,
  Chip,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import SyncIcon from '@mui/icons-material/Sync';

interface WithdrawalsTableProps {
  loading: boolean;
  actionLoading?: boolean;
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
  selectedIds: number[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number, checked: boolean) => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onSingleApprove: (id: number) => void;
  onSingleReject: (id: number) => void;
  onSyncStatus?: (id: number) => void;
  onUpdateStatus: (id: number, newStatus: string) => void;
  formatCurrency: (val: number) => string;
}

export const WithdrawalsTable: React.FC<WithdrawalsTableProps> = ({
  loading,
  actionLoading = false,
  withdrawals,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  pagination,
  onPageChange,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onBulkApprove,
  onBulkReject,
  onSingleApprove,
  onSingleReject,
  onSyncStatus,
  onUpdateStatus,
  formatCurrency,
}) => {
  const dataList = withdrawals || [];
  const totalCount = pagination.total || dataList.length;

  const selectableRows = dataList.filter(
    (r) => !['paid', 'processing'].includes(r.status?.toLowerCase())
  );
  const allSelectableChecked =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selectedIds.includes(r.id));
  const isSomeChecked =
    selectedIds.length > 0 && !allSelectableChecked;

  const renderStatusChip = (status: string, failureReason?: string) => {
    const s = (status || 'pending').toLowerCase();
    let color: 'warning' | 'info' | 'success' | 'error' | 'default' | 'secondary' = 'warning';
    let label = status;

    switch (s) {
      case 'pending':
        color = 'warning';
        label = 'Pending Approval';
        break;
      case 'processing':
        color = 'info';
        label = 'Processing (Paystack)';
        break;
      case 'paid':
      case 'success':
        color = 'success';
        label = 'Paid';
        break;
      case 'failed':
        color = 'error';
        label = 'Failed';
        break;
      case 'rejected':
        color = 'default';
        label = 'Rejected';
        break;
      case 'reversed':
        color = 'secondary';
        label = 'Reversed';
        break;
      default:
        color = 'default';
    }

    const chipNode = (
      <Chip
        label={label}
        size="small"
        color={color}
        sx={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.75rem' }}
      />
    );

    if (failureReason) {
      return (
        <Tooltip title={`Reason: ${failureReason}`} arrowPlacement="top">
          <Box component="span" sx={{ display: 'inline-block' }}>
            {chipNode}
          </Box>
        </Tooltip>
      );
    }

    return chipNode;
  };

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
          justifyContent: 'space-between',
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
            Withdrawal Requests & Payouts
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search Requests"
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
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="reversed">Reversed</MenuItem>
          </Select>
        </Box>
      </Box>

      {/* Bulk Action Header Bar */}
      {selectedIds.length > 0 && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            bgcolor: '#F0FDF4',
            borderTop: '1px solid #BBF7D0',
            borderBottom: '1px solid #BBF7D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#166534' }}>
            {selectedIds.length} item(s) selected for bulk processing
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button
              size="small"
              variant="contained"
              disabled={actionLoading}
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={onBulkApprove}
              sx={{
                bgcolor: '#16A34A',
                '&:hover': { bgcolor: '#15803D' },
                color: '#FFFFFF',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
              }}
            >
              {actionLoading ? 'Processing Paystack...' : `Approve & Pay Selected (${selectedIds.length})`}
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={actionLoading}
              startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
              onClick={onBulkReject}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
              }}
            >
              Reject Selected
            </Button>
          </Box>
        </Box>
      )}

      {/* Table Section */}
      <TableContainer>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: '#F9FAFB' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  indeterminate={isSomeChecked}
                  checked={allSelectableChecked}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  disabled={loading || selectableRows.length === 0}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4B5563', fontSize: '0.8rem', py: 1.5 }}>
                Vendor
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4B5563', fontSize: '0.8rem', py: 1.5 }}>
                Bank Account Details
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4B5563', fontSize: '0.8rem', py: 1.5 }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4B5563', fontSize: '0.8rem', py: 1.5 }}>
                Reference / Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600, color: '#4B5563', fontSize: '0.8rem', py: 1.5 }}>
                Status
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: '#4B5563', fontSize: '0.8rem', py: 1.5 }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} sx={{ color: '#1A1FE8' }} />
                </TableCell>
              </TableRow>
            ) : dataList.length > 0 ? (
              dataList.map((row: any) => {
                const isChecked = selectedIds.includes(row.id);
                const vendorName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Vendor User';
                const vendorComp = row.business_name || 'Vendor Company';

                const accNum = row.account_number || (row.account_details || '').split('\n')[0] || 'N/A';
                const bankName = row.bank_name || (row.account_details || '').split('\n')[1] || row.payment_method || 'Bank Transfer';
                const accName = row.account_name || '';

                const dateStr = row.created_at
                  ? new Date(row.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A';

                const statusLower = (row.status || '').toLowerCase();
                const canApproveOrReject = !['paid', 'processing'].includes(statusLower);

                return (
                  <TableRow
                    key={row.id}
                    selected={isChecked}
                    sx={{
                      '&:hover': { bgcolor: '#F9FAFB' },
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={isChecked}
                        disabled={!canApproveOrReject || actionLoading}
                        onChange={(e) => onSelectOne(row.id, e.target.checked)}
                      />
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                        {vendorName}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: '0.78rem' }}>
                        {vendorComp} ({row.email})
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#111827' }}>
                        {accNum}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: '0.78rem', fontWeight: 500 }}>
                        {bankName} {accName ? `• ${accName}` : ''}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#111827', fontSize: '0.9rem', fontWeight: 700 }}>
                      {formatCurrency(parseFloat(row.amount) || 0)}
                    </TableCell>

                    <TableCell sx={{ py: 2 }}>
                      <Typography sx={{ color: '#374151', fontSize: '0.82rem', fontWeight: 500 }}>
                        {dateStr}
                      </Typography>
                      {row.transfer_reference && (
                        <Typography sx={{ color: '#9CA3AF', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                          {row.transfer_reference}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {renderStatusChip(row.status, row.failure_reason)}
                    </TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canApproveOrReject && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={actionLoading}
                              startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 16 }} />}
                              onClick={() => onSingleApprove(row.id)}
                              sx={{
                                borderRadius: '6px',
                                textTransform: 'none',
                                bgcolor: '#16A34A',
                                '&:hover': { bgcolor: '#15803D' },
                                color: '#FFFFFF',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                py: 0.4,
                                px: 1.2,
                              }}
                            >
                              Approve
                            </Button>

                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled={actionLoading}
                              startIcon={<HighlightOffOutlinedIcon sx={{ fontSize: 16 }} />}
                              onClick={() => onSingleReject(row.id)}
                              sx={{
                                borderRadius: '6px',
                                textTransform: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 500,
                                py: 0.4,
                                px: 1.2,
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {onSyncStatus && (row.transfer_reference || statusLower === 'processing' || statusLower === 'pending') && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            disabled={actionLoading}
                            startIcon={<SyncIcon sx={{ fontSize: 16 }} />}
                            onClick={() => onSyncStatus(row.id)}
                            sx={{
                              borderRadius: '6px',
                              textTransform: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              py: 0.4,
                              px: 1.2,
                            }}
                          >
                            Sync Status
                          </Button>
                        )}

                        {!canApproveOrReject && statusLower !== 'processing' && !onSyncStatus && (
                          <Typography sx={{ color: '#9CA3AF', fontSize: '0.8rem' }}>
                            Completed
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#6B7280' }}>
                  No withdrawal requests found.
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
