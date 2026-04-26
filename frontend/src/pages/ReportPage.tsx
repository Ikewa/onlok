import { useState } from 'react';
import {
  Box, Container, Typography, TextField, Button, Paper, Alert,
  CircularProgress, Grid, RadioGroup, FormControlLabel, Radio, FormControl,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import { Link as RouterLink } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { submitReport } from '../api/reports';
import type { ReportCategory } from '../types';
import toast from 'react-hot-toast';

const categories: { value: ReportCategory; label: string; desc: string }[] = [
  { value: 'fraud', label: 'Fraud', desc: 'Scams, fake services, or financial deception.' },
  { value: 'impersonation', label: 'Impersonation', desc: 'Pretending to be another person or business.' },
  { value: 'harassment', label: 'Harassment', desc: 'Abusive, threatening, or harmful behaviour.' },
  { value: 'inaccurate_information', label: 'Inaccurate Information', desc: 'False or misleading business details.' },
];

export default function ReportPage() {
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vendorId.trim()) { setError('Please enter the vendor\'s Onlok ID.'); return; }
    if (!category) { setError('Please select a report category.'); return; }
    if (context.trim().length < 20) { setError('Please provide more detail (minimum 20 characters).'); return; }

    setLoading(true);
    try {
      await submitReport({ reported_vendor_id: vendorId.trim(), category: category as ReportCategory, context });
      setSubmitted(true);
      toast.success('Report submitted. Our team will review it shortly.');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      <Box sx={{ background: 'linear-gradient(135deg, #E53935, #8B0000)', py: 6 }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <FlagIcon sx={{ fontSize: 52, color: '#fff', mb: 1.5 }} />
          <Typography variant="h3" color="#fff" fontWeight={800} mb={1}>Report a Vendor</Typography>
          <Typography variant="body1" color="rgba(255,255,255,0.75)">
            Help keep the Onlok community safe. All reports are reviewed by our team.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ py: 6, flexGrow: 1 }}>
        {submitted ? (
          <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4 }}>
            <FlagIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={1}>Report Submitted</Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
              Thank you for helping keep Onlok safe. Our moderation team will review your report within 24–48 hours.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" component={RouterLink} to="/">Back to Home</Button>
              <Button variant="outlined" onClick={() => { setSubmitted(false); setVendorId(''); setCategory(''); setContext(''); }}>
                Submit Another
              </Button>
            </Box>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, boxShadow: '0 4px 40px rgba(0,0,0,0.07)' }}>
            {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Typography variant="h6" fontWeight={700} mb={0.5}>Vendor Onlok ID</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Enter the vendor ID you want to report (e.g. OL-NG-1234).
              </Typography>
              <TextField
                fullWidth
                placeholder="OL-NG-1234"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                sx={{ mb: 4, '& input': { fontFamily: 'monospace', letterSpacing: '0.05em' } }}
              />

              <Typography variant="h6" fontWeight={700} mb={0.5}>Report Category</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Select the type of issue you're reporting.
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
                <RadioGroup value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
                  <Grid container spacing={1.5}>
                    {categories.map((cat) => (
                      <Grid item xs={12} sm={6} key={cat.value}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.5, borderRadius: 2, cursor: 'pointer',
                            borderColor: category === cat.value ? 'error.main' : 'divider',
                            bgcolor: category === cat.value ? 'rgba(229,57,53,0.04)' : 'transparent',
                            transition: 'all 0.15s',
                          }}
                          onClick={() => setCategory(cat.value)}
                        >
                          <FormControlLabel
                            value={cat.value}
                            control={<Radio color="error" size="small" />}
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight={700}>{cat.label}</Typography>
                                <Typography variant="caption" color="text.secondary">{cat.desc}</Typography>
                              </Box>
                            }
                            sx={{ m: 0, width: '100%' }}
                          />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
              </FormControl>

              <Typography variant="h6" fontWeight={700} mb={0.5}>Additional Context</Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Describe what happened in detail. Minimum 20 characters.
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                placeholder="Please provide specific details about the incident…"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                helperText={`${context.length} characters`}
                sx={{ mb: 4 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="error"
                size="large"
                disabled={loading}
                endIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Submitting…' : 'Submit Report'}
              </Button>

              <Typography variant="caption" display="block" textAlign="center" color="text.secondary" mt={2}>
                🔒 Reports are anonymous unless you choose otherwise.
              </Typography>
            </Box>
          </Paper>
        )}
      </Container>

      <Footer />
    </Box>
  );
}
