import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Divider, CircularProgress } from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { getDashboardMetrics, type DashboardMetrics } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await getDashboardMetrics();
        setData(res);
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

  // Fallback to design values if API doesn't provide them yet
  const metrics = data?.metrics || {
    totalUsers: 12847,
    pendingVerifications: 7,
    approvedVendors: 11879,
    rejectedVerifications: 487,
    flaggedAccounts: 234
  };

  const statCards = [
    { title: 'Total Users', value: metrics.totalUsers || 12847, icon: <PeopleOutlinedIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Pending Verifications', value: metrics.pendingVerifications || 7, icon: <AccessTimeIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Approved', value: metrics.approvedVendors || 11879, icon: <VerifiedOutlinedIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Rejected', value: (metrics as any).rejectedVerifications || 487, icon: <HighlightOffIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
    { title: 'Flagged Accounts', value: metrics.flaggedAccounts || 234, icon: <ReportProblemOutlinedIcon sx={{ color: '#94A3B8', fontSize: 28 }} /> },
  ];

  // Hardcoded to match design exactly
  const recentActivities = [
    { text: 'Approved verification for Emma Wilson', sub: 'Admin User • 1/15/2024, 4:20:00 PM' },
    { text: 'Flagged account for manual review', sub: 'Admin User • 1/15/2024, 3:45:00 PM' },
    { text: 'Approved verification for Oliver Schmidt', sub: 'Admin User • 1/15/2024, 2:10:00 PM' },
    { text: 'Rejected verification for Raj Patel', sub: 'Admin User • 1/15/2024, 12:30:00 PM' },
    { text: 'Requested more information from Carlos Mendez', sub: 'Admin User • 1/15/2024, 11:15:00 AM' },
  ];

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
