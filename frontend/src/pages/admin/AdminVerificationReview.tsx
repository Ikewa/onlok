import { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, TextField, CircularProgress, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import { getVerificationDetails, updateVerificationStatus, type AdminVerification } from '../../api/admin';
import { MenuItem, Select } from '@mui/material';
import toast from 'react-hot-toast';
import api from '../../api/axiosInstance';

export default function AdminVerificationReview() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [details, setDetails] = useState<AdminVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedTier, setSelectedTier] = useState('Silver');
  const [actionLoading, setActionLoading] = useState(false);

  // Prembly Search State
  const [searchType, setSearchType] = useState('nin');
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getVerificationDetails(Number(id));
        setDetails(data);
        if (data.admin_notes) setNotes(data.admin_notes);
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
      await updateVerificationStatus(Number(id), status, notes, status === 'tier_assigned' ? selectedTier : undefined);
      toast.success(`Verification ${status} successfully`);
      navigate('/admin/verifications');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePremblySearch = async () => {
    if (!searchValue.trim()) return toast.error('Please enter a value to search');
    
    setIsSearching(true);
    setSearchResult(null);
    try {
      const { data } = await api.post(`/admin/prembly/${searchType}`, { [searchType]: searchValue });
      setSearchResult(data);
      toast.success('Search successful');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Search failed');
      setSearchResult({ error: error.response?.data || error.message });
    } finally {
      setIsSearching(false);
    }
  };

  const getMediaUrl = (path?: string) => {
    if (!path) return '';
    if (import.meta.env.PROD) {
      return path.startsWith('/') ? path : `/${path}`;
    }
    return `http://localhost:5000${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (loading || !details) {
    return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress sx={{ color: '#5B5FEC' }} /></Box>;
  }

  const isApproved = details.status === 'approved';
  const isRejected = details.status === 'rejected';
  const isFlagged = details.status === 'flagged';
  const isPending = details.status === 'pending';
  const isPaymentReceived = details.status === 'payment_received';
  const isTierAssigned = details.status === 'tier_assigned';

  return (
    <Box sx={{ maxWidth: 1100, pb: 10, fontFamily: 'Inter, sans-serif' }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/admin/verifications')}
        sx={{ color: '#6B7280', textTransform: 'none', mb: 2, fontWeight: 500, fontSize: '0.88rem', '&:hover': { bgcolor: 'transparent', color: '#111827' } }}
      >
        Back to Queue
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="#111827" sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
          User Verification Review
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column - Main Details */}
        <Grid item xs={12} md={8}>
          
          {/* Identity Information */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', mb: 3, bgcolor: '#FFFFFF' }}>
            <Typography variant="subtitle1" fontWeight={600} color="#111827" mb={2.5} sx={{ fontSize: '1.05rem' }}>
              Identity Information
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ width: 72, height: 72, bgcolor: '#F3F4F6', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontWeight: 700, fontSize: '1.2rem' }}>
                {details.first_name?.[0]}{details.last_name?.[0]}
              </Box>
              <Grid container spacing={2.5} sx={{ flexGrow: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#6B7280" display="block" sx={{ fontSize: '0.78rem' }}>Full Name</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>{details.first_name} {details.last_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#6B7280" display="block" sx={{ fontSize: '0.78rem' }}>ONLOK ID</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>{details.vendor_id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#6B7280" display="block" sx={{ fontSize: '0.78rem' }}>Email</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>{details.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#6B7280" display="block" sx={{ fontSize: '0.78rem' }}>Business Name</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>{details.business_name || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#6B7280" display="block" sx={{ fontSize: '0.78rem' }}>Verification Type</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>{details.type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#6B7280" display="block" sx={{ fontSize: '0.78rem' }}>Submission Date</Typography>
                  <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.88rem' }}>{new Date(details.submitted_at).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Uploaded Documents */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', mb: 3, bgcolor: '#FFFFFF' }}>
            <Typography variant="subtitle1" fontWeight={600} color="#111827" mb={2.5} sx={{ fontSize: '1.05rem' }}>
              Uploaded Documents
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="#6B7280" display="block" mb={1} sx={{ fontSize: '0.78rem' }}>ID Document</Typography>
                <Box 
                  sx={{ 
                    width: '100%', height: 180, bgcolor: '#F9FAFB', borderRadius: '8px', overflow: 'hidden', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB' 
                  }}
                >
                  {details.gov_id_url ? (
                    details.gov_id_url.endsWith('.pdf') ? 
                      <Typography variant="body2" color="#5B5FEC" component="a" href={getMediaUrl(details.gov_id_url)} target="_blank" sx={{ fontWeight: 600 }}>View PDF ID</Typography>
                    : <Box component="img" src={getMediaUrl(details.gov_id_url)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : <Typography variant="caption" color="#9CA3AF">No ID uploaded</Typography>}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="#6B7280" display="block" mb={1} sx={{ fontSize: '0.78rem' }}>CAC Document</Typography>
                <Box 
                  sx={{ 
                    width: '100%', height: 180, bgcolor: '#F9FAFB', borderRadius: '8px', overflow: 'hidden', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB' 
                  }}
                >
                  {details.cac_url ? (
                    details.cac_url.endsWith('.pdf') ? 
                      <Typography variant="body2" color="#5B5FEC" component="a" href={getMediaUrl(details.cac_url)} target="_blank" sx={{ fontWeight: 600 }}>View PDF CAC</Typography>
                    : <Box component="img" src={getMediaUrl(details.cac_url)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : <Typography variant="caption" color="#9CA3AF">No CAC uploaded</Typography>}
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="#6B7280" display="block" mb={1} sx={{ fontSize: '0.78rem' }}>Business Video</Typography>
                <Box 
                  sx={{ 
                    width: '100%', height: 180, bgcolor: '#111827', borderRadius: '8px', overflow: 'hidden', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}
                >
                  {details.video_url ? (
                    <video controls src={getMediaUrl(details.video_url)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : <Typography variant="caption" color="#9CA3AF">No video uploaded</Typography>}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Verification Breakdown */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF' }}>
            <Typography variant="subtitle1" fontWeight={600} color="#111827" mb={2.5} sx={{ fontSize: '1.05rem' }}>
              Verification Breakdown
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="#374151" sx={{ fontSize: '0.88rem' }}>Identity Verification</Typography>
                {isApproved ? <CheckCircleOutlinedIcon sx={{ color: '#16A34A' }} /> : isRejected ? <HighlightOffIcon sx={{ color: '#DC2626' }} /> : <CircularProgress size={18} sx={{ color: '#5B5FEC' }} />}
              </Box>
              <Divider sx={{ borderColor: '#F3F4F6' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="#374151" sx={{ fontSize: '0.88rem' }}>Business Verification</Typography>
                {isApproved ? <CheckCircleOutlinedIcon sx={{ color: '#16A34A' }} /> : isRejected ? <HighlightOffIcon sx={{ color: '#DC2626' }} /> : <CircularProgress size={18} sx={{ color: '#5B5FEC' }} />}
              </Box>
              <Divider sx={{ borderColor: '#F3F4F6' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="#374151" sx={{ fontSize: '0.88rem' }}>Referral Link</Typography>
                  <Typography variant="caption" color="#6B7280" display="block" sx={{ fontSize: '0.78rem' }}>
                    https://onlok.net/register?ref={details.vendor_id}
                  </Typography>
                </Box>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => {
                    navigator.clipboard.writeText(`https://onlok.net/register?ref=${details.vendor_id}`);
                    toast.success('Referral link copied');
                  }}
                  sx={{ textTransform: 'none', borderRadius: '8px', color: '#5B5FEC', borderColor: '#D1D5DB' }}
                >
                  Copy
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Prembly Search Section */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} color="#111827" mb={2.5} sx={{ fontSize: '1.05rem' }}>
              Identity Search (Prembly)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                select
                size="small"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                sx={{ width: 120 }}
              >
                <MenuItem value="nin">NIN</MenuItem>
                <MenuItem value="vnin">VNIN</MenuItem>
                <MenuItem value="cac">CAC</MenuItem>
              </TextField>
              <TextField
                size="small"
                fullWidth
                placeholder={`Enter ${searchType.toUpperCase()}`}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              <Button 
                variant="contained" 
                onClick={handlePremblySearch}
                disabled={isSearching}
                sx={{ bgcolor: '#111827', color: '#fff', '&:hover': { bgcolor: '#1f2937' }, textTransform: 'none' }}
              >
                {isSearching ? <CircularProgress size={20} color="inherit" /> : 'Search'}
              </Button>
            </Box>

            {searchResult && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                {searchResult.error || searchResult.status === false ? (
                  <Box>
                    <Typography variant="body2" color="#DC2626" fontWeight={600} mb={1}>
                      Search Failed
                    </Typography>
                    <Typography variant="caption" color="#DC2626" display="block">
                      {searchResult.error?.message || searchResult.message || 'Unknown error occurred'}
                    </Typography>
                    {searchResult.errors && (
                      <pre style={{ fontSize: '0.75rem', color: '#B91C1C', margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(searchResult.errors, null, 2)}
                      </pre>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} color="#111827">
                        Verification Successful
                      </Typography>
                      {searchResult.message?.includes('sandbox') && (
                        <Typography variant="caption" sx={{ bgcolor: '#FEF3C7', color: '#92400E', px: 1, py: 0.5, borderRadius: 1, fontWeight: 600 }}>
                          Sandbox Mode
                        </Typography>
                      )}
                    </Box>
                    
                    {searchResult.data && (
                      <Grid container spacing={2}>
                        {searchResult.data.photo && (
                          <Grid item xs={12} sm={4} md={3}>
                            <Box 
                              component="img" 
                              src={searchResult.data.photo.startsWith('data:') ? searchResult.data.photo : `data:image/jpeg;base64,${searchResult.data.photo}`}
                              sx={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                            />
                          </Grid>
                        )}
                        <Grid item xs={12} sm={searchResult.data.photo ? 8 : 12} md={searchResult.data.photo ? 9 : 12}>
                          <Grid container spacing={2}>
                            {Object.entries(searchResult.data).map(([key, value]) => {
                              if (key === 'photo' || !value) return null;
                              return (
                                <Grid item xs={6} sm={4} key={key}>
                                  <Typography variant="caption" color="#6B7280" display="block" sx={{ textTransform: 'capitalize' }}>
                                    {key.replace(/_/g, ' ')}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600} color="#111827" sx={{ wordBreak: 'break-word' }}>
                                    {String(value)}
                                  </Typography>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Grid>
                      </Grid>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Paper>

        </Grid>

        {/* Right Column - Sidebar */}
        <Grid item xs={12} md={4}>
          
          <Box sx={{ bgcolor: '#DBEAFE', p: 2.5, borderRadius: '8px', mb: 3 }}>
            <Typography variant="body2" fontWeight={700} color="#1E40AF" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, fontSize: '0.88rem' }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2563EB' }} />
              Review Guidelines
            </Typography>
            <Typography variant="caption" color="#1E3A8A" display="block" sx={{ fontSize: '0.78rem' }}>
              Verify all documents match the user's identity. Business details must be accurate and clearly visible in the video.
            </Typography>
          </Box>

          <Typography variant="caption" fontWeight={600} color="#6B7280" display="block" mb={1} sx={{ fontSize: '0.78rem' }}>
            Admin Notes
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="Add notes about this verification..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ 
              mb: 3, 
              '& .MuiOutlinedInput-root': { 
                borderRadius: '8px', 
                bgcolor: '#F3F4F6', 
                '& fieldset': { border: 'none' },
                fontSize: '0.88rem'
              } 
            }}
          />

          <Typography variant="subtitle1" fontWeight={600} color="#111827" mb={2} sx={{ fontSize: '1.05rem' }}>Actions</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            
            {/* First Approval Stage */}
            {isPending && (
              <Box sx={{ bgcolor: '#F3F4F6', p: 2, borderRadius: 2, border: '1px solid #E5E7EB', mb: 1 }}>
                <Typography variant="caption" fontWeight={600} color="#374151" display="block" mb={1}>
                  Assign Subscription Tier (First Approval)
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  sx={{ mb: 2, bgcolor: '#FFFFFF' }}
                >
                  <MenuItem value="Bronze">Bronze</MenuItem>
                  <MenuItem value="Silver">Silver</MenuItem>
                  <MenuItem value="Gold">Gold</MenuItem>
                </Select>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CheckCircleOutlinedIcon />}
                  onClick={() => handleAction('tier_assigned')}
                  disabled={actionLoading}
                  sx={{ bgcolor: '#0029FF', '&:hover': { bgcolor: '#0022D1' }, py: 1.25, borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem', mb: 1 }}
                >
                  Assign Tier & Request Payment
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CheckCircleOutlinedIcon />}
                  onClick={() => handleAction('approved')}
                  disabled={actionLoading}
                  sx={{ borderColor: '#16A34A', color: '#16A34A', '&:hover': { bgcolor: '#F0FDF4' }, py: 1.25, borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Promo: Assign Tier & Skip Payment (Approve)
                </Button>
              </Box>
            )}

            {/* Awaiting Payment Stage */}
            {isTierAssigned && (
              <Box sx={{ bgcolor: '#FFFBEB', p: 2, borderRadius: 2, border: '1px solid #FEF3C7', mb: 1 }}>
                <Typography variant="body2" color="#B45309" fontWeight={600} mb={1}>Awaiting Payment</Typography>
                <Typography variant="caption" color="#92400E" display="block" mb={1.5}>User was assigned {details.assigned_tier} tier. Waiting for them to complete payment.</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => handleAction('approved')}
                  disabled={actionLoading}
                  sx={{ borderColor: '#B45309', color: '#B45309', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#FEF3C7' } }}
                >
                  Override: Mark as Paid & Approve
                </Button>
              </Box>
            )}

            {/* Second Approval Stage (Final Approval) */}
            {isPaymentReceived && (
              <Box sx={{ bgcolor: '#F0FDF4', p: 2, borderRadius: 2, border: '1px solid #DCFCE7', mb: 1 }}>
                <Typography variant="body2" color="#166534" fontWeight={600} mb={1}>Payment Received</Typography>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CheckCircleOutlinedIcon />}
                  onClick={() => handleAction('approved')}
                  disabled={actionLoading}
                  sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, py: 1.25, borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Finalize Verification
                </Button>
              </Box>
            )}

            {!isPending && !isTierAssigned && !isPaymentReceived && (
              <Button
                variant="contained"
                fullWidth
                startIcon={<CheckCircleOutlinedIcon />}
                onClick={() => handleAction('approved')}
                disabled={actionLoading || isApproved}
                sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, py: 1.25, borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem' }}
              >
                Approve Verification
              </Button>
            )}
            <Button
              variant="contained"
              fullWidth
              startIcon={<HighlightOffIcon />}
              onClick={() => handleAction('rejected')}
              disabled={actionLoading || isRejected}
              sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, py: 1.25, borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem' }}
            >
              Reject Verification
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<InfoOutlinedIcon />}
              onClick={() => handleAction('pending')}
              disabled={actionLoading || isPending}
              sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, py: 1.25, borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem' }}
            >
              Request More Info
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<FlagOutlinedIcon />}
              onClick={() => handleAction('flagged')}
              disabled={actionLoading || isFlagged}
              sx={{ bgcolor: '#4B5563', '&:hover': { bgcolor: '#374151' }, py: 1.25, borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.88rem' }}
            >
              Flag as Suspicious
            </Button>
          </Box>

        </Grid>
      </Grid>
    </Box>
  );
}