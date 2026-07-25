import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Divider, CircularProgress, Chip } from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { getDashboardMetrics, getAlerts, type DashboardMetrics, type AuditLog } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [res, alertsRes] = await Promise.all([
          getDashboardMetrics(),
          getAlerts()
        ]);
        setData(res);
        setAlerts(alertsRes);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#5B5FEC' }} />
      </Box>
    );
  }

  const metrics = data?.metrics || {
    totalUsers: 0,
    pendingVerifications: 0,
    approvedVendors: 0,
    rejectedVerifications: 0,
    flaggedAccounts: 0
  };

  const userTrends = data?.userTrends || [
    { month: 'Jan', newUsers: 0, verifiedUsers: 0 },
    { month: 'Feb', newUsers: 0, verifiedUsers: 0 },
    { month: 'Mar', newUsers: 0, verifiedUsers: 0 },
    { month: 'Apr', newUsers: 0, verifiedUsers: 0 },
    { month: 'May', newUsers: 0, verifiedUsers: 0 },
    { month: 'Jun', newUsers: 0, verifiedUsers: 0 },
  ];

  const statCards = [
    { title: 'Total Users', value: metrics.totalUsers, accentColor: '#818CF8', icon: <PeopleOutlinedIcon sx={{ color: '#818CF8', fontSize: 24 }} /> },
    { title: 'Pending Verification', value: metrics.pendingVerifications, accentColor: '#F97316', icon: <AccessTimeIcon sx={{ color: '#F97316', fontSize: 24 }} /> },
    { title: 'Verified Users', value: metrics.approvedVendors, accentColor: '#22C55E', icon: <VerifiedOutlinedIcon sx={{ color: '#22C55E', fontSize: 24 }} /> },
    { title: 'Rejected Users', value: (metrics as any).rejectedVerifications || 0, accentColor: '#EF4444', icon: <HighlightOffIcon sx={{ color: '#EF4444', fontSize: 24 }} /> },
    { title: 'Flagged Users', value: metrics.flaggedAccounts, accentColor: '#EAB308', icon: <ReportProblemOutlinedIcon sx={{ color: '#EAB308', fontSize: 24 }} /> },
  ];

  const recentActivities = alerts.slice(0, 5).map(log => ({
    text: log.action,
    sub: `${log.first_name ? `${log.first_name} ${log.last_name}` : 'System'} • ${new Date(log.created_at).toLocaleString()}`
  }));

  return (
    <Box sx={{ maxWidth: 1200, fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
          Dashboard Overview
        </Typography>
        <Typography variant="body1" color="#6B7280" sx={{ fontSize: '0.88rem' }}>
          Monitor verification activity and system performance
        </Typography>
      </Box>

      <Grid container spacing={2.5} mb={3}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={2.4} key={idx}>
            <Paper elevation={0} sx={{ 
              p: 2.5, 
              borderRadius: '12px', 
              border: '1px solid #E5E7EB', 
              borderLeft: `4px solid ${card.accentColor}`,
              bgcolor: '#FFFFFF',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              minHeight: 110
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="#6B7280" fontWeight={500} sx={{ fontSize: '0.78rem' }}>
                  {card.title}
                </Typography>
                {card.icon}
              </Box>
              <Typography variant="h4" fontWeight={700} color="#111827" mt={1.5} sx={{ fontSize: '1.5rem' }}>
                {card.value.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* User Trends Chart */}
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', p: 3, mb: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="#111827" sx={{ fontSize: '1.05rem' }}>
              User Growth & Registration Trends
            </Typography>
            <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
              Monthly new user signups vs verified vendor accounts over the past 6 months
            </Typography>
          </Box>
          <Chip
            label="Last 6 Months"
            size="small"
            sx={{ bgcolor: '#F3F4F6', color: '#4B5563', fontWeight: 500, borderRadius: '8px', fontSize: '0.78rem' }}
          />
        </Box>
        
        <Box sx={{ mt: 3, height: 260, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B5FEC" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#5B5FEC" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVerifiedUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <RechartsTooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Area 
                type="monotone" 
                dataKey="newUsers" 
                stroke="#5B5FEC" 
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#5B5FEC' }}
                activeDot={{ r: 6 }}
                fillOpacity={1} 
                fill="url(#colorNewUsers)" 
                name="New Registrations"
              />
              <Area 
                type="monotone" 
                dataKey="verifiedUsers" 
                stroke="#22C55E" 
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#22C55E' }}
                activeDot={{ r: 6 }}
                fillOpacity={1} 
                fill="url(#colorVerifiedUsers)" 
                name="Verified Accounts"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Recent Activity */}
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', p: 3 }}>
        <Typography variant="h6" fontWeight={600} color="#111827" mb={2.5} sx={{ fontSize: '1.05rem' }}>
          Recent Activity
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {recentActivities.length === 0 && (
            <Typography variant="body2" color="#6B7280" textAlign="center" py={3} sx={{ fontSize: '0.88rem' }}>No recent activity</Typography>
          )}
          {recentActivities.map((activity, idx) => (
            <Box key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', py: 1.5 }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: '#5B5FEC', 
                  mt: 0.8, 
                  mr: 2,
                  flexShrink: 0
                }} />
                <Box>
                  <Typography variant="body1" color="#111827" fontWeight={600} mb={0.25} sx={{ fontSize: '0.88rem' }}>
                    {activity.text}
                  </Typography>
                  <Typography variant="body2" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
                    {activity.sub}
                  </Typography>
                </Box>
              </Box>
              {idx < recentActivities.length - 1 && (
                <Divider sx={{ borderColor: '#F3F4F6' }} />
              )}
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

