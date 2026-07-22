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
        borderRadius: 3,
        border: isDanger ? '1px solid #FECACA' : '1px solid #E2E8F0',
        bgcolor: isDanger ? '#EF4444' : '#fff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 120,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
        '&:hover': {
          boxShadow: isDanger
            ? '0 4px 24px rgba(239,68,68,0.25)'
            : '0 4px 16px rgba(0,0,0,0.06)',
        },
      }}
    >
      {/* Top row: title + icon */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{
            color: isDanger ? 'rgba(255,255,255,0.85)' : '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            lineHeight: 1.3,
            maxWidth: '75%',
          }}
        >
          {title}
        </Typography>
        {icon && (
          <Box
            sx={{
              color: isDanger ? 'rgba(255,255,255,0.7)' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </Box>
        )}
      </Box>

      {/* Value */}
      <Box>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            color: isDanger ? '#fff' : '#0F172A',
            lineHeight: 1.1,
            mt: 1,
            mb: subLabel ? 0.5 : 0,
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>

        {/* Sub-label */}
        {subLabel && (
          <Typography
            variant="caption"
            fontWeight={600}
            sx={{
              color: subLabelColor ?? (isDanger ? 'rgba(255,255,255,0.85)' : '#64748B'),
              display: 'block',
            }}
          >
            {subLabel}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
