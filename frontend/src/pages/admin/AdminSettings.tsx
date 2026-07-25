import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Switch, Button, CircularProgress, Divider, Slider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getSettings, updateSettings, getAlerts, type AuditLog } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    face_match_threshold: '85',
    doc_quality_threshold: '75',
    biz_verification_threshold: '90',
    require_face_match: 'true',
    require_biz_docs: 'true',
    auto_approve_high: 'false',
    flag_low_scores: 'true',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [data, alerts] = await Promise.all([
          getSettings(),
          getAlerts()
        ]);
        setSettings(prev => ({ ...prev, ...data }));
        setAuditLogs(alerts);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#5B5FEC' }} />
      </Box>
    );
  }

  const renderThreshold = (label: string, key: string, color: string) => (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>{label}</Typography>
        <Typography variant="body2" fontWeight={700} color={color} sx={{ fontSize: '0.88rem' }}>{settings[key] || 0}%</Typography>
      </Box>
      <Slider 
        value={Number(settings[key] || 0)} 
        onChange={(_, val) => handleChange(key, String(val))}
        sx={{
          color: color,
          height: 6,
          '& .MuiSlider-thumb': {
            width: 14,
            height: 14,
            backgroundColor: '#FFFFFF',
            border: `2px solid ${color}`,
            boxShadow: '0px 1px 3px rgba(0,0,0,0.1)'
          },
          '& .MuiSlider-track': { border: 'none' }
        }}
      />
    </Box>
  );

  const renderRule = (label: string, key: string) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
      <Typography variant="body1" fontWeight={500} color="#374151" sx={{ fontSize: '0.88rem' }}>{label}</Typography>
      <Switch 
        checked={settings[key] === 'true'}
        onChange={(e) => handleChange(key, String(e.target.checked))}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: '#16A34A' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#16A34A' }
        }}
      />
    </Box>
  );

  const displayedLogs = auditLogs.slice(0, 10).map(log => ({
    action: log.action,
    admin: log.first_name ? `${log.first_name} ${log.last_name}` : 'System',
    timestamp: new Date(log.created_at).toLocaleString()
  }));

  return (
    <Box sx={{ maxWidth: 1200, fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
            Admin Settings
          </Typography>
          <Typography variant="body1" color="#6B7280" sx={{ fontSize: '0.88rem' }}>
            Global platform configurations
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={handleSave} 
          disabled={saving}
          sx={{ 
            bgcolor: '#5B5FEC', 
            '&:hover': { bgcolor: '#4F52D4' }, 
            px: 3, 
            py: 1, 
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.88rem',
            textTransform: 'none'
          }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
        </Button>
      </Box>

      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} color="#111827" mb={3} sx={{ fontSize: '1.05rem' }}>
              Trust Level Thresholds
            </Typography>
            {renderThreshold('Face Match Threshold', 'face_match_threshold', '#2563EB')}
            {renderThreshold('Document Quality Threshold', 'doc_quality_threshold', '#D97706')}
            {renderThreshold('Business Verification Threshold', 'biz_verification_threshold', '#16A34A')}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} color="#111827" mb={2.5} sx={{ fontSize: '1.05rem' }}>
              Verification Rules
            </Typography>
            {renderRule('Require Face Match', 'require_face_match')}
            <Divider sx={{ borderColor: '#F3F4F6' }} />
            {renderRule('Require Business Documents', 'require_biz_docs')}
            <Divider sx={{ borderColor: '#F3F4F6' }} />
            {renderRule('Auto-Approve High Scores', 'auto_approve_high')}
            <Divider sx={{ borderColor: '#F3F4F6' }} />
            {renderRule('Flag Low Scores', 'flag_low_scores')}
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid #F3F4F6' }}>
          <Typography variant="h6" fontWeight={600} color="#111827" sx={{ fontSize: '1.05rem' }}>
            Audit Log
          </Typography>
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#F9FAFB' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Admin</TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#6B7280', fontSize: '0.8rem', borderBottom: '1px solid #E5E7EB' }}>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#6B7280', fontSize: '0.88rem' }}>
                    No audit logs available
                  </TableCell>
                </TableRow>
              )}
              {displayedLogs.map((log, idx) => (
                <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: '#F9FAFB' }, borderBottom: '1px solid #F3F4F6' }}>
                  <TableCell sx={{ py: 1.75 }}>
                    <Typography variant="body2" color="#111827" fontWeight={600} sx={{ fontSize: '0.88rem' }}>
                      {log.action}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                    {log.admin}
                  </TableCell>
                  <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem' }}>
                    {log.timestamp}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
