import { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, TextField, CircularProgress, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import { getVerificationDetails, updateVerificationStatus, type AdminVerification } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminVerificationReview() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = useState<AdminVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getVerificationDetails(Number(id));
        setDetails(data);
      } catch (err) {
        toast.error('Failed to load details');
        navigate('/admin/verifications');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id, navigate]);

  const handleAction = async (status: string) => {
    setActionLoading(true);
    try {
      await updateVerificationStatus(Number(id), status, notes);
      toast.success(`Verification ${status} successfully`);
      navigate('/admin/verifications');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !details) {
    return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  const isApproved = details.status === 'approved';
  const isRejected = details.status === 'rejected';
  const isFlagged = details.status === 'flagged';
  const isPending = details.status === 'pending';

  return (
    <Box sx={{ maxWidth: 1100, pb: 10 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/admin/verifications')}
        sx={{ color: '#475569', textTransform: 'none', mb: 3, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
      >
        Back to Queue
      </Button>

      <Typography variant="h4" fontWeight={900} color="#0F172A" mb={4}>
        User Verification Review
      </Typography>

      <Grid container spacing={4}>
        {/* Left Column - Main Details */}
        <Grid item xs={12} md={8}>
          
          {/* Identity Information */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3, bgcolor: '#FAFAF9' }}>
            <Typography variant="subtitle1" fontWeight={800} mb={3}>Identity Information</Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box sx={{ width: 80, height: 80, bgcolor: '#E2E8F0', borderRadius: 2, flexShrink: 0 }} />
              <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Full Name</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{details.first_name} {details.last_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">ONLOK ID</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{details.vendor_id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Email</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{details.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Business Name</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{details.business_name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Verification Type</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{details.type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" display="block">Submission Date</Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">{new Date(details.submitted_at).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Uploaded Documents */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={800} mb={3}>Uploaded Documents</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="#64748B" display="block" mb={1}>ID Document</Typography>
                <Box 
                  sx={{ 
                    width: '100%', height: 200, bgcolor: '#F1F5F9', borderRadius: 2, overflow: 'hidden', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' 
                  }}
                >
                  {details.gov_id_url ? (
                    details.gov_id_url.endsWith('.pdf') ? 
                      <Typography variant="body2" color="#1A1FE8" component="a" href={`http://localhost:5000${details.gov_id_url}`} target="_blank">View PDF ID</Typography>
                    : <Box component="img" src={`http://localhost:5000${details.gov_id_url}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : <Typography variant="caption" color="#94A3B8">No ID uploaded</Typography>}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="#64748B" display="block" mb={1}>Business Video</Typography>
                <Box 
                  sx={{ 
                    width: '100%', height: 200, bgcolor: '#0F172A', borderRadius: 2, overflow: 'hidden', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}
                >
                  {details.video_url ? (
                    <video controls src={`http://localhost:5000${details.video_url}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : <Typography variant="caption" color="#94A3B8">No video uploaded</Typography>}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Verification Breakdown */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#FAFAF9' }}>
            <Typography variant="subtitle1" fontWeight={800} mb={3}>Verification Breakdown</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="#475569">Identity Verification</Typography>
                {isApproved ? <CheckCircleOutlinedIcon sx={{ color: '#15803D' }} /> : isRejected ? <HighlightOffIcon sx={{ color: '#DC2626' }} /> : <CircularProgress size={20} />}
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="#475569">Business Verification</Typography>
                {isApproved ? <CheckCircleOutlinedIcon sx={{ color: '#15803D' }} /> : isRejected ? <HighlightOffIcon sx={{ color: '#DC2626' }} /> : <CircularProgress size={20} />}
              </Box>
            </Box>
          </Paper>

        </Grid>

        {/* Right Column - Sidebar */}
        <Grid item xs={12} md={4}>
          
          <Box sx={{ bgcolor: '#EFF6FF', p: 2.5, borderRadius: 2, border: '1px solid #BFDBFE', mb: 4 }}>
            <Typography variant="body2" fontWeight={800} color="#1E3A8A" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1D4ED8' }} />
              Review Guidelines
            </Typography>
            <Typography variant="caption" color="#1E40AF" display="block">
              Verify all documents match the user's identity. Business details must be accurate and clearly visible in the video.
            </Typography>
          </Box>

          <Typography variant="caption" fontWeight={700} color="#475569" display="block" mb={1}>
            Admin Notes
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="Add notes about this verification..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 4, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <Typography variant="subtitle1" fontWeight={800} mb={2}>Actions</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<CheckCircleOutlinedIcon />}
              onClick={() => handleAction('approved')}
              disabled={actionLoading || isApproved}
              sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Approve Verification
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<HighlightOffIcon />}
              onClick={() => handleAction('rejected')}
              disabled={actionLoading || isRejected}
              sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Reject Verification
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<InfoOutlinedIcon />}
              disabled={actionLoading}
              sx={{ bgcolor: '#EA580C', '&:hover': { bgcolor: '#C2410C' }, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Request More Info
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<InfoOutlinedIcon />}
              onClick={() => handleAction('flagged')}
              disabled={actionLoading || isFlagged}
              sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Flag as Suspicious
            </Button>
          </Box>

        </Grid>
      </Grid>
    </Box>
  );
}
