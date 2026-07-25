import React from 'react';
import { Box } from '@mui/material';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status ? status.toLowerCase() : '';

  let color = '#6B7280';
  let bgColor = '#F3F4F6';
  let label = status || 'Unknown';

  switch (normalized) {
    case 'available':
      color = '#16A34A';
      bgColor = '#DCFCE7';
      label = 'Available';
      break;
    case 'paid':
      color = '#2563EB';
      bgColor = '#DBEAFE';
      label = 'Paid';
      break;
    case 'pending':
      color = '#D97706';
      bgColor = '#FEF3C7';
      label = 'Pending';
      break;
    case 'processing':
    case 'process':
      color = '#D97706';
      bgColor = '#FFEDD5';
      label = 'Processing';
      break;
    case 'cancelled':
      color = '#6B7280';
      bgColor = '#F3F4F6';
      label = 'Cancelled';
      break;
    case 'failed':
      color = '#DC2626';
      bgColor = '#FEE2E2';
      label = 'Failed';
      break;
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 0.5,
        borderRadius: '9999px',
        bgcolor: bgColor,
        color: color,
        fontWeight: 600,
        fontSize: '0.78rem',
        textTransform: 'capitalize',
        lineHeight: 1.2,
      }}
    >
      {label}
    </Box>
  );
};

export default StatusBadge;
