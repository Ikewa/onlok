import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, CircularProgress, Chip, Grid } from '@mui/material';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { getAlerts, type AuditLog } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAlerts();
        setAlerts(data);
      } catch (err) {
        toast.error('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#1A1FE8' }} />
      </Box>
    );
  }

  // Map real data from backend
  const activeAlerts = alerts.filter(a => a.severity !== 'LOW').map(a => ({
    id: a.id,
    name: a.first_name ? `${a.first_name} ${a.last_name}` : 'System / Unknown User',
    vendorId: a.email || 'N/A',
    description: a.details,
    reason: a.action,
    date: new Date(a.created_at).toLocaleString(),
    severity: a.severity,
  }));

  const highCount = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length;
  const mediumCount = alerts.filter(a => a.severity === 'MEDIUM').length;
  const lowCount = alerts.filter(a => a.severity === 'LOW').length;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'HIGH': return { bg: '#FEE2E2', color: '#B91C1C', icon: <ReportGmailerrorredIcon sx={{ color: '#DC2626', fontSize: 28 }} /> };
      case 'MEDIUM': return { bg: '#FFEDD5', color: '#C2410C', icon: <ErrorOutlinedIcon sx={{ color: '#EA580C', fontSize: 28 }} /> };
      case 'LOW': return { bg: '#FEF3C7', color: '#B45309', icon: <HighlightOffIcon sx={{ color: '#D97706', fontSize: 28 }} /> };
      default: return { bg: '#F1F5F9', color: '#475569', icon: <ErrorOutlinedIcon sx={{ color: '#64748B', fontSize: 28 }} /> };
    }
  };

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h4" fontWeight={800} color="#0F172A" mb={0.5}>
        Alerts & Risk Monitoring
      </Typography>
      <Typography variant="body1" color="#64748B" mb={4}>
        Monitor suspicious activity and failed verifications
      </Typography>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 4 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #F1F5F9' }}>
          <Typography variant="h6" fontWeight={700} color="#0F172A">
            Active Alerts
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {activeAlerts.length === 0 && (
            <Typography variant="body2" color="#64748B" textAlign="center" py={4}>No active alerts</Typography>
          )}
          {activeAlerts.map((alert, idx) => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <Box key={alert.id}>
                <Box sx={{ display: 'flex', p: 3, alignItems: 'flex-start' }}>
                  <Box sx={{ mr: 2, mt: 0.5 }}>
                    {styles.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" color="#0F172A" fontWeight={700} mb={0.2}>
                      {alert.name}
                    </Typography>
                    <Typography variant="body2" color="#64748B" fontFamily="monospace" mb={1.5}>
                      {alert.vendorId}
                    </Typography>
                    <Typography variant="body2" color="#334155" mb={1.5}>
                      {alert.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="caption" color="#64748B">
                        {alert.reason}
                      </Typography>
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#CBD5E1' }} />
                      <Typography variant="caption" color="#64748B">
                        {alert.date}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Chip 
                      label={alert.severity} 
                      size="small"
                      sx={{ 
                        bgcolor: styles.bg, 
                        color: styles.color, 
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        borderRadius: 1
                      }} 
                    />
                  </Box>
                </Box>
                {idx < activeAlerts.length - 1 && (
                  <Divider sx={{ borderColor: '#F1F5F9' }} />
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReportGmailerrorredIcon sx={{ color: '#DC2626' }} />
              </Box>
              <Typography variant="body1" fontWeight={700} color="#0F172A">
                High Priority
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} color="#0F172A" mb={1}>
              {highCount}
            </Typography>
            <Typography variant="body2" color="#64748B">
              Requires immediate attention
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ErrorOutlinedIcon sx={{ color: '#EA580C' }} />
              </Box>
              <Typography variant="body1" fontWeight={700} color="#0F172A">
                Medium Priority
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} color="#0F172A" mb={1}>
              {mediumCount}
            </Typography>
            <Typography variant="body2" color="#64748B">
              Review within 24 hours
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HighlightOffIcon sx={{ color: '#D97706' }} />
              </Box>
              <Typography variant="body1" fontWeight={700} color="#0F172A">
                Low Priority
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} color="#0F172A" mb={1}>
              {lowCount}
            </Typography>
            <Typography variant="body2" color="#64748B">
              Monitor and review
            </Typography>
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
}
