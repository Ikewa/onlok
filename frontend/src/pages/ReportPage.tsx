import { useState } from 'react';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import GppBadIcon from '@mui/icons-material/GppBad';
import InfoIcon from '@mui/icons-material/Info';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShieldIcon from '@mui/icons-material/Shield';
import { Box, Container, Typography, TextField, Button, Paper, Alert, CircularProgress, Avatar } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { submitReport } from '../api/reports';
import { useAuth } from '../context/AuthContext';
import type { ReportCategory } from '../types';
import toast from 'react-hot-toast';

const categories: { value: ReportCategory; label: string; desc: string; icon: any }[] = [
  { value: 'fraud', label: 'Fraud', desc: 'Suspicious Financial Activity Or Deceptive Schemes.', icon: <MoneyOffIcon sx={{ color: '#1A1FE8' }} /> },
  { value: 'impersonation', label: 'Impersonation', desc: 'Claiming To Be Someone Else Or An Official Entity.', icon: <FaceRetouchingNaturalIcon sx={{ color: '#1A1FE8' }} /> },
  { value: 'harassment', label: 'Harassment', desc: 'Repeated Unwanted Contact Or Offensive Language.', icon: <VolumeOffIcon sx={{ color: '#1A1FE8' }} /> },
  { value: 'inaccurate_information', label: 'Inaccurate Information', desc: 'Misleading Profile Data Or False Credentials.', icon: <GppBadIcon sx={{ color: '#1A1FE8' }} /> },
];

export default function ReportPage() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!vendorId.trim()) { setError('Please enter the user ID.'); return; }
    if (!category) { setError('Please select a report category.'); return; }
    if (context.trim().length < 10) { setError('Please provide more detail.'); return; }

    setLoading(true);
    try {
      await submitReport({ reported_vendor_id: vendorId.trim(), category: category as ReportCategory, context });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit report. Please try again.');
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="sm" sx={{ py: 6, flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, bgcolor: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <ShieldIcon sx={{ fontSize: 40, color: '#1A1FE8' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>Report Submitted</Typography>
          <Typography variant="body1" sx={{ color: '#64748B', mb: 4, px: 2 }}>
            Thank you for keeping our community safe. We will review your report and take necessary actions.
          </Typography>
          <Button 
            fullWidth 
            variant="contained" 
            component={RouterLink} 
            to="/"
            sx={{ bgcolor: '#1A1FE8', borderRadius: 8, py: 1.8, textTransform: 'none', fontWeight: 700, fontSize: '1rem', '&:hover': { bgcolor: '#1318C0' } }}
          >
            Back To Dashboard
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#fff' }}>
      <Container maxWidth="sm" sx={{ pt: 2, pb: 10, px: 3, flexGrow: 1, position: 'relative' }}>
        
        {/* Top Header */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          {user ? (
            <Avatar sx={{ width: 44, height: 44, bgcolor: '#1A1FE8', fontSize: '1.2rem', fontWeight: 800 }}>
              {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
            </Avatar>
          ) : (
            <Avatar sx={{ width: 44, height: 44 }} />
          )}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>Report User</Typography>
        <Typography variant="body1" sx={{ color: '#64748B', mb: 4, lineHeight: 1.5 }}>
          Identify And Report Behaviors That Violate Our Community Standards. This Report Is Secure And Confidential.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {/* User ID */}
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>User ID</Typography>
        <TextField
          fullWidth
          placeholder="E.G. OL-NG-00545"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          sx={{ 
            mb: 4, 
            '& .MuiOutlinedInput-root': { 
              borderRadius: 3,
              '& fieldset': { borderColor: '#E2E8F0' },
            },
            '& input': { py: 2, fontSize: '0.9rem', color: '#64748B' }
          }}
        />

        {/* Category */}
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>Category</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
          {categories.map((cat) => (
            <Paper
              key={cat.value}
              elevation={0}
              onClick={() => setCategory(cat.value)}
              sx={{
                p: 2.5, 
                borderRadius: 3, 
                border: '1px solid',
                borderColor: category === cat.value ? '#1A1FE8' : '#E2E8F0',
                bgcolor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.2s',
                boxShadow: category === cat.value ? '0 4px 12px rgba(26,31,232,0.08)' : 'none'
              }}
            >
              <Box sx={{ width: 44, height: 44, bgcolor: '#EEF2FF', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {cat.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.3 }}>{cat.label}</Typography>
                <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.4 }}>{cat.desc}</Typography>
              </Box>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                border: '2px solid',
                borderColor: category === cat.value ? '#1A1FE8' : '#CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {category === cat.value && <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#1A1FE8' }} />}
              </Box>
            </Paper>
          ))}
        </Box>

        {/* Provide Context */}
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>Provide Context</Typography>
        <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', mb: 4 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Please Provide Specific Details Or Evidence Regarding This Report..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                p: 2.5,
                '& fieldset': { border: 'none' },
              },
              '& textarea': { fontSize: '0.9rem', color: '#64748B' }
            }}
          />
          <Box sx={{ bgcolor: '#EEF2FF', p: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <InfoIcon sx={{ color: '#1A1FE8', mt: 0.2, fontSize: 20 }} />
            <Typography variant="caption" sx={{ color: '#334155', fontWeight: 500, lineHeight: 1.4 }}>
              Detailed reports are prioritized for review. Ensure all information is objective and factual.
            </Typography>
          </Box>
        </Box>

        <Button
          onClick={handleSubmit}
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{ 
            bgcolor: '#1A1FE8', 
            color: '#fff', 
            borderRadius: 8, 
            py: 1.8, 
            textTransform: 'none', 
            fontWeight: 700, 
            fontSize: '1.05rem', 
            mb: 4,
            '&:hover': { bgcolor: '#1318C0' } 
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Submit Report'}
        </Button>

      </Container>

      {/* Bottom Navigation */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        bgcolor: '#fff', 
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-around',
        py: 1.5,
        pb: 3, // safe area
        zIndex: 100
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
          <DashboardIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Dashboard</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, color: '#1A1FE8' }}>
          <SearchIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Search</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
          <EmojiEventsIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Earning</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
          <ShieldIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Badge</Typography>
        </Box>
      </Box>
    </Box>
  );
}
