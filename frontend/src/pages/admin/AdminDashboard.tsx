import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Divider, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { getDashboardMetrics, getAlerts, getWebsiteHits, type DashboardMetrics, type AuditLog } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hits, setHits] = useState<number>(0);
  const [hitsPeriod, setHitsPeriod] = useState<'week' | 'month' | 'quarterly' | 'all'>('week');

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

  useEffect(() => {
    const fetchHits = async () => {
      try {
        const res = await getWebsiteHits(hitsPeriod);
        setHits(res.totalHits);
      } catch (err) {
        console.error('Failed to load hits', err);
      }
    };
    fetchHits();
  }, [hitsPeriod]);

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

      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={600} color="#111827" sx={{ fontSize: '1.05rem' }}>
            Website Hits
          </Typography>
          <ToggleButtonGroup
            value={hitsPeriod}
            exclusive
            onChange={(_, newPeriod) => { if (newPeriod) setHitsPeriod(newPeriod); }}
            size="small"
            sx={{ 
              '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 500, color: '#6B7280', fontSize: '0.82rem', borderRadius: '6px' }, 
              '& .Mui-selected': { color: '#5B5FEC !important', bgcolor: 'rgba(91, 95, 236, 0.08) !important' } 
            }}
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="quarterly">Quarterly</ToggleButton>
            <ToggleButton value="all">All Time</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h2" fontWeight={800} color="#5B5FEC" sx={{ fontSize: '2.5rem' }}>
              {hits.toLocaleString()}
            </Typography>
            <Typography variant="body1" color="#6B7280" fontWeight={500} mt={1} sx={{ fontSize: '0.88rem' }}>
              Total visits this {hitsPeriod === 'quarterly' ? 'quarter' : hitsPeriod === 'all' ? 'time' : hitsPeriod}
            </Typography>
          </Box>
        </Box>
      </Paper>

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

