import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Divider, CircularProgress } from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
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
        <CircularProgress sx={{ color: '#1A1FE8' }} />
      </Box>
    );
  }

  // Fallback to 0 if API doesn't provide them yet
  const metrics = data?.metrics || {
    totalUsers: 0,
    pendingVerifications: 0,
    approvedVendors: 0,
    rejectedVerifications: 0,
    flaggedAccounts: 0
  };

  const statCards = [
    { title: 'Total Users', value: metrics.totalUsers, icon: <PeopleOutlinedIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Pending Verifications', value: metrics.pendingVerifications, icon: <AccessTimeIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Approved', value: metrics.approvedVendors, icon: <VerifiedOutlinedIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Rejected', value: (metrics as any).rejectedVerifications || 0, icon: <HighlightOffIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Flagged Accounts', value: metrics.flaggedAccounts, icon: <ReportProblemOutlinedIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
  ];

  // Map real data for recent activities
  const recentActivities = alerts.slice(0, 5).map(log => ({
    text: log.action,
    sub: `${log.first_name ? `${log.first_name} ${log.last_name}` : 'System'} • ${new Date(log.created_at).toLocaleString()}`
  }));

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Typography variant="h4" fontWeight={800} color="#0F172A" mb={0.5}>
        Dashboard Overview
      </Typography>
      <Typography variant="body1" color="#64748B" mb={4}>
        Monitor verification activity and system health
      </Typography>

      <Grid container spacing={3} mb={5}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={2.4} key={idx}>
            <Paper elevation={0} sx={{ 
              p: 3, 
              borderRadius: 3, 
              border: '1px solid #E2E8F0', 
              bgcolor: '#fff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 120
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="body2" color="#475569" fontWeight={500} sx={{ maxWidth: '70%', lineHeight: 1.2 }}>
                  {card.title}
                </Typography>
                {card.icon}
              </Box>
              <Typography variant="h4" fontWeight={700} color="#0F172A" mt={2}>
                {card.value.toLocaleString()}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', p: 4 }}>
        <Typography variant="h6" fontWeight={700} color="#0F172A" mb={3}>
          Recent Activity
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {recentActivities.length === 0 && (
            <Typography variant="body2" color="#64748B" textAlign="center" py={3}>No recent activity</Typography>
          )}
          {recentActivities.map((activity, idx) => (
            <Box key={idx}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', py: 2 }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: '#3B82F6', 
                  mt: 0.8, 
                  mr: 2,
                  flexShrink: 0
                }} />
                <Box>
                  <Typography variant="body1" color="#0F172A" fontWeight={500} mb={0.5}>
                    {activity.text}
                  </Typography>
                  <Typography variant="body2" color="#64748B">
                    {activity.sub}
                  </Typography>
                </Box>
              </Box>
              {idx < recentActivities.length - 1 && (
                <Divider sx={{ borderColor: '#F1F5F9' }} />
              )}
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
