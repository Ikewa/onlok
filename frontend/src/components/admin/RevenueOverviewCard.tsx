import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface RevenueOverviewCardProps {
  totalRevenue: number;
  revenueFromYesterday: number;
}

export const RevenueOverviewCard: React.FC<RevenueOverviewCardProps> = ({
  totalRevenue,
  revenueFromYesterday,
}) => {
  const formattedRevenue = `N${totalRevenue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedTrend = `${revenueFromYesterday >= 0 ? '+' : ''}${revenueFromYesterday.toLocaleString('en-US')}`;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        bgcolor: '#060B43',
        p: { xs: 3, md: 4 },
        mb: 3,
	mt: 3,
        color: '#000000',
        boxShadow: '0 4px 20px rgba(6, 11, 67, 0.2)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 2.5, md: 4 },
        }}
      >
        {/* Left Side: Revenue Amount & Trend */}
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: '#94A3B8',
              fontSize: '0.88rem',
              fontWeight: 500,
              mb: 1.25,
            }}
          >
            Total Revenue Generated
          </Typography>
          
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#FFFFFF',
              fontSize: { xs: '2.25rem', md: '2.75rem' },
              lineHeight: 1.1,
              mb: 1.25,
              letterSpacing: '-0.02em',
            }}
          >
            {formattedRevenue}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', color: '#38BDF8' }}>
            <TrendingUpIcon sx={{ fontSize: 18, mr: 0.5 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontSize: '0.82rem',
                color: '#38BDF8',
              }}
            >
              {formattedTrend} From Yesterday
            </Typography>
          </Box>
        </Box>

        {/* Right Side: Informational Wording */}
        <Box sx={{ maxWidth: 480 }}>
          <Typography
            variant="body2"
            sx={{
              color: '#CBD5E1',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            <strong>Revenue Overview:</strong> Displays the total revenue generated during the selected period, helping administrators monitor financial performance and track business growth over time.
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default RevenueOverviewCard;
