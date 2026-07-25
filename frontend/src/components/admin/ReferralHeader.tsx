import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface ReferralHeaderProps {
  activeTab: number;
  onTabChange: (tabIndex: number) => void;
}

export const ReferralHeader: React.FC<ReferralHeaderProps> = ({ activeTab, onTabChange }) => {
  let breadcrumb = 'referral';
  let title = 'Referral';
  let subtitle = 'Overview of referral program performance and analytics';

  if (activeTab === 1) {
    title = 'Referral Records';
    subtitle = 'View and manage all referral commissions';
  } else if (activeTab === 2) {
    breadcrumb = 'referral withdrawal';
    title = 'Withdrawal Requests';
    subtitle = 'Review and process withdrawal requests';
  }

  const tabs = [
    { label: 'Overview', index: 0 },
    { label: 'Records', index: 1 },
    { label: 'Withdrawals', index: 2 },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main Title & Subtitle */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#111827',
            fontSize: { xs: '1.5rem', md: '1.75rem' },
            lineHeight: 1.2,
            mb: 0.5,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            color: '#6B7280',
            fontSize: '0.88rem',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {subtitle}
        </Typography>
      </Box>

      {/* Navigation Sub-Tabs */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid #E5E7EB',
          pb: 0.5,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.index;
          return (
            <Button
              key={tab.label}
              onClick={() => onTabChange(tab.index)}
              disableRipple
              sx={{
                textTransform: 'none',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                color: isActive ? '#5B5FEC' : '#6B7280',
                position: 'relative',
                py: 1,
                px: 2,
                borderRadius: '8px',
                bgcolor: isActive ? 'rgba(91, 95, 236, 0.08)' : 'transparent',
                '&:hover': {
                  bgcolor: isActive ? 'rgba(91, 95, 236, 0.12)' : '#F3F4F6',
                  color: '#5B5FEC',
                },
              }}
            >
              {tab.label}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
};

export default ReferralHeader;
