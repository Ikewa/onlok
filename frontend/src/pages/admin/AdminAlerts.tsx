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
        <CircularProgress sx={{ color: '#5B5FEC' }} />
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
      case 'HIGH':
      case 'CRITICAL':
        return { bg: '#FEE2E2', color: '#DC2626', icon: <ReportGmailerrorredIcon sx={{ color: '#DC2626', fontSize: 24 }} /> };
      case 'MEDIUM':
        return { bg: '#FFEDD5', color: '#D97706', icon: <ErrorOutlinedIcon sx={{ color: '#D97706', fontSize: 24 }} /> };
      case 'LOW':
        return { bg: '#FEF3C7', color: '#B45309', icon: <HighlightOffIcon sx={{ color: '#D97706', fontSize: 24 }} /> };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', icon: <ErrorOutlinedIcon sx={{ color: '#6B7280', fontSize: 24 }} /> };
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
          Alerts & Risk Monitoring
        </Typography>
        <Typography variant="body1" color="#6B7280" sx={{ fontSize: '0.88rem' }}>
          Monitor suspicious activity and failed verifications
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', mb: 3 }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid #F3F4F6' }}>
          <Typography variant="h6" fontWeight={600} color="#111827" sx={{ fontSize: '1.05rem' }}>
            Active Alerts
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {activeAlerts.length === 0 && (
            <Typography variant="body2" color="#6B7280" textAlign="center" py={4} sx={{ fontSize: '0.88rem' }}>
              No active alerts
            </Typography>
          )}
          {activeAlerts.map((alert, idx) => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <Box key={alert.id}>
                <Box sx={{ display: 'flex', p: 2.5, alignItems: 'flex-start' }}>
                  <Box sx={{ mr: 2, mt: 0.5 }}>
                    {styles.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" color="#111827" fontWeight={600} mb={0.2} sx={{ fontSize: '0.9rem' }}>
                      {alert.name}
                    </Typography>
                    <Typography variant="body2" color="#6B7280" fontFamily="monospace" mb={1} sx={{ fontSize: '0.78rem' }}>
                      {alert.vendorId}
                    </Typography>
                    <Typography variant="body2" color="#374151" mb={1} sx={{ fontSize: '0.85rem' }}>
                      {alert.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.75rem' }}>
                        {alert.reason}
                      </Typography>
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#9CA3AF' }} />
                      <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.75rem' }}>
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
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderRadius: '9999px',
                        px: 1,
                      }} 
                    />
                  </Box>
                </Box>
                {idx < activeAlerts.length - 1 && (
                  <Divider sx={{ borderColor: '#F3F4F6' }} />
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReportGmailerrorredIcon sx={{ color: '#DC2626', fontSize: 20 }} />
              </Box>
              <Typography variant="body1" fontWeight={600} color="#111827" sx={{ fontSize: '0.9rem' }}>
                High Priority
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: '1.75rem' }}>
              {highCount}
            </Typography>
            <Typography variant="body2" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
              Requires immediate attention
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ErrorOutlinedIcon sx={{ color: '#D97706', fontSize: 20 }} />
              </Box>
              <Typography variant="body1" fontWeight={600} color="#111827" sx={{ fontSize: '0.9rem' }}>
                Medium Priority
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: '1.75rem' }}>
              {mediumCount}
            </Typography>
            <Typography variant="body2" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
              Review within 24 hours
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HighlightOffIcon sx={{ color: '#B45309', fontSize: 20 }} />
              </Box>
              <Typography variant="body1" fontWeight={600} color="#111827" sx={{ fontSize: '0.9rem' }}>
                Low Priority
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: '1.75rem' }}>
              {lowCount}
            </Typography>
            <Typography variant="body2" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
              Monitor and review
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
