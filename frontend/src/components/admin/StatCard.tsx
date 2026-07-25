import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subLabel?: string;
  subLabelColor?: string;
  /** 'danger' renders the card with a red accent background (e.g. High Priority card) */
  variant?: 'default' | 'danger';
}

export default function StatCard({
  title,
  value,
  icon,
  subLabel,
  subLabelColor,
  variant = 'default',
}: StatCardProps) {
  const isDanger = variant === 'danger';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: '12px',
        border: isDanger ? '1px solid #FEE2E2' : '1px solid #E5E7EB',
        bgcolor: isDanger ? '#DC2626' : '#FFFFFF',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 110,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Top row: title + icon */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            color: isDanger ? 'rgba(255,255,255,0.9)' : '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.72rem',
            lineHeight: 1.3,
            maxWidth: '75%',
          }}
        >
          {title}
        </Typography>
        {icon && (
          <Box
            sx={{
              color: isDanger ? 'rgba(255,255,255,0.8)' : '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {/* Value */}
      <Box sx={{ mt: 1 }}>
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            color: isDanger ? '#FFFFFF' : '#111827',
            lineHeight: 1.1,
            fontSize: '1.5rem',
            mb: subLabel ? 0.5 : 0,
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>

        {/* Sub-label */}
        {subLabel && (
          <Typography
            variant="caption"
            fontWeight={500}
            sx={{
              color: subLabelColor ?? (isDanger ? 'rgba(255,255,255,0.9)' : '#6B7280'),
              display: 'block',
              fontSize: '0.75rem',
            }}
          >
            {subLabel}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
