import React from 'react';
import { Box, Typography, Paper, Avatar, Divider, Grid } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import StorageIcon from '@mui/icons-material/Storage';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ReferralOverviewProps {
  data: any;
  formatCurrency: (val: number) => string;
}

export const ReferralOverview: React.FC<ReferralOverviewProps> = ({ data, formatCurrency }) => {
  const stats = data?.stats || {};
  const topReferrals = data?.topReferrals || [];
  const trendData = data?.commissionTrend || [];
  const recentActivity = data?.recentActivity || [];

  const totalReferralsVal = stats.totalReferrals ?? 0;
  const activeReferralsVal = stats.totalCommissionsGenerated ?? 0;
  const pendingCommissionsVal = stats.totalPendingCommissions ?? 0;
  const availableCommissionsVal = stats.totalAvailableCommissions ?? 0;
  const totalCommissionsVal = stats.totalCommissionsPaid ?? 0;

  const statCards = [
    {
      title: 'Total Referral',
      value: totalReferralsVal,
      trend: stats.trends?.totalReferrals || '+0.0%',
      icon: <PeopleAltOutlinedIcon sx={{ color: '#2563EB', fontSize: 18 }} />,
      bgColor: '#EFF6FF',
    },
    {
      title: 'Active Referral',
      value: formatCurrency(activeReferralsVal),
      trend: stats.trends?.activeReferrals || '+0.0%',
      icon: <ShowChartOutlinedIcon sx={{ color: '#7C3AED', fontSize: 18 }} />,
      bgColor: '#F5F3FF',
    },
    {
      title: 'Pending Commissions',
      value: formatCurrency(pendingCommissionsVal),
      trend: stats.trends?.pendingCommissions || '+0.0%',
      icon: <ErrorOutlinedIcon sx={{ color: '#D97706', fontSize: 18 }} />,
      bgColor: '#FEF3C7',
    },
    {
      title: 'Available Commissions',
      value: formatCurrency(availableCommissionsVal),
      trend: stats.trends?.availableCommissions || '+0.0%',
      icon: <AttachMoneyIcon sx={{ color: '#16A34A', fontSize: 18 }} />,
      bgColor: '#DCFCE7',
    },
    {
      title: 'Total Commissions',
      value: formatCurrency(totalCommissionsVal),
      trend: stats.trends?.totalCommissions || '+0.0%',
      icon: <StorageIcon sx={{ color: '#0284C7', fontSize: 18 }} />,
      bgColor: '#E0F2FE',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Stat Cards Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 2,
        }}
      >
        {statCards.map((card, idx) => (
          <Paper
            key={idx}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              bgcolor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  bgcolor: card.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                }}
              >
                {card.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#06B6D4',
                  bgcolor: 'rgba(6, 182, 212, 0.1)',
                  px: 1,
                  py: 0.25,
                  borderRadius: '9999px',
                }}
              >
                {card.trend}
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{
                  color: '#6B7280',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                {card.title}
              </Typography>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: '1.35rem',
                  color: '#111827',
                  lineHeight: 1.1,
                }}
              >
                {card.value}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Two-Column Section: Top Referrals + Commission Trend */}
      <Grid container spacing={3}>
        {/* Left Column (~55% width on desktop) */}
        <Grid item xs={12} lg={6.5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              bgcolor: '#FFFFFF',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '1.05rem',
                color: '#111827',
                mb: 2.5,
              }}
            >
              Top Referrals
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
              {topReferrals.length > 0 ? (
                topReferrals.map((item: any, i: number) => {
                  const name = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Referrer User';
                  const company = item.business_name || 'Vendor Company';
                  const amount = parseFloat(item.total_earned) || 0;
                  const count = item.referral_count || 0;

                  return (
                    <React.Fragment key={i}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          py: 0.5,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            src={item.profile_picture_url || ''}
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: '#374151',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                            }}
                          >
                            {name.substring(0, 1)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.92rem', color: '#111827' }}>
                              {name}
                            </Typography>
                            <Typography sx={{ color: '#6B7280', fontSize: '0.8rem' }}>
                              {company}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#16A34A' }}>
                            {formatCurrency(amount)}
                          </Typography>
                          <Typography sx={{ color: '#6B7280', fontSize: '0.78rem' }}>
                            {count} Referrals
                          </Typography>
                        </Box>
                      </Box>
                      {i < topReferrals.length - 1 && <Divider sx={{ borderColor: '#F3F4F6' }} />}
                    </React.Fragment>
                  );
                })
              ) : (
                <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', py: 4, textAlign: 'center' }}>
                  No top referrers found in database.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Right Column (~45% width on desktop) */}
        <Grid item xs={12} lg={5.5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              bgcolor: '#FFFFFF',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: '1.05rem',
                color: '#111827',
                mb: 2.5,
              }}
            >
              Commission Trend
            </Typography>

            <Box sx={{ width: '100%', height: 280, pt: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#5B5FEC"
                    strokeWidth={2.5}
                    dot={{ fill: '#FFFFFF', stroke: '#5B5FEC', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#5B5FEC' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity Full-Width Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          bgcolor: '#FFFFFF',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: '1.05rem',
            color: '#111827',
            mb: 2.5,
          }}
        >
          Recent Activity
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {recentActivity.length > 0 ? (
            recentActivity.map((act: any, idx: number) => {
              const title = act.title || act.action || 'Database referral log event';
              const time = act.created_at ? new Date(act.created_at).toLocaleString() : '';
              const amount = act.amount;

              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justify: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: '#2563EB',
                        mt: 0.8,
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 500,
                          fontSize: '0.9rem',
                          color: '#111827',
                        }}
                      >
                        {title}
                      </Typography>
                      {time && (
                        <Typography
                          sx={{
                            color: '#9CA3AF',
                            fontSize: '0.78rem',
                            mt: 0.25,
                          }}
                        >
                          {time}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {amount && (
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        color: '#16A34A',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCurrency(parseFloat(amount))}
                    </Typography>
                  )}
                </Box>
              );
            })
          ) : (
            <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', py: 2 }}>
              No recent activity recorded in database.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ReferralOverview;
