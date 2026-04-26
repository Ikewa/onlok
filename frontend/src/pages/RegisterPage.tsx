import { useState } from 'react';
import {
  Box, Container, Typography, TextField, Button, Stepper, Step, StepLabel,
  Alert, CircularProgress, Paper, MenuItem, Select, FormControl, InputLabel,
  Stack, Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/auth';
import { submitVerification } from '../api/verifications';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const STEPS = ['Personal Info', 'Business', 'ID Upload', 'Review'];

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country_code: string;
  business_name: string;
  twitter_handle: string;
  instagram_handle: string;
  facebook_handle: string;
  password: string;
  confirm_password: string;
  gov_id_file: File | null;
  business_video_file: File | null;
}

const initialData: FormData = {
  first_name: '', last_name: '', email: '', phone_number: '',
  country_code: 'NG', business_name: '',
  twitter_handle: '', instagram_handle: '', facebook_handle: '',
  password: '', confirm_password: '',
  gov_id_file: null, business_video_file: null,
};

const countryCodes = [
  { code: 'NG', dial: '+234', label: 'Nigeria' },
  { code: 'GH', dial: '+233', label: 'Ghana' },
  { code: 'KE', dial: '+254', label: 'Kenya' },
  { code: 'ZA', dial: '+27', label: 'South Africa' },
  { code: 'US', dial: '+1', label: 'USA' },
  { code: 'GB', dial: '+44', label: 'UK' },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  const set = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validateStep = (): boolean => {
    setError('');
    if (activeStep === 0) {
      if (!form.first_name || !form.last_name || !form.email || !form.phone_number) {
        setError('Please fill in all required fields.'); return false;
      }
      if (!form.email.includes('@')) { setError('Please enter a valid email.'); return false; }
      if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
      if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return false; }
    }
    if (activeStep === 1 && !form.business_name) {
      setError('Business name or professional role is required.'); return false;
    }
    if (activeStep === 2) {
      if (!form.gov_id_file) { setError('Please upload your Government ID.'); return false; }
      if (!form.business_video_file) { setError('Please upload your business video.'); return false; }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (activeStep === 2) {
      setLoading(true);
      try {
        const user = await registerUser({
          first_name: form.first_name,
          last_name: form.last_name,
          business_name: form.business_name,
          email: form.email,
          password: form.password,
          phone_number: form.phone_number,
          country_code: form.country_code,
        });
        setRegisteredUser(user);
        login(user);
        await submitVerification(form.gov_id_file!, form.business_video_file!);
        toast.success('Account created! Verification documents submitted.');
        setActiveStep((s) => s + 1);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Registration failed. Please try again.';
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    setActiveStep((s) => s + 1);
  };

  const handleBack = () => { setError(''); setActiveStep((s) => s - 1); };

  const stepContent = [
    // Step 1 — Personal Info
    <Box key="step1">
      <Typography variant="h5" fontWeight={700} mb={0.5}>Personal Information</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Tell us about yourself so we can establish your identity.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
        <TextField label="First Name" fullWidth value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
        <TextField label="Last Name" fullWidth value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
      </Stack>
      <TextField label="Email Address" type="email" fullWidth value={form.email} onChange={(e) => set('email', e.target.value)} required sx={{ mb: 2 }} />
      <Stack direction="row" spacing={1} mb={2}>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Country</InputLabel>
          <Select value={form.country_code} label="Country" onChange={(e) => set('country_code', e.target.value)}>
            {countryCodes.map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.label} ({c.dial})</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="Phone Number" fullWidth value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} required />
      </Stack>
      <TextField label="Password" type="password" fullWidth value={form.password} onChange={(e) => set('password', e.target.value)} required sx={{ mb: 2 }} helperText="Minimum 6 characters" />
      <TextField label="Confirm Password" type="password" fullWidth value={form.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} required />
    </Box>,

    // Step 2 — Business
    <Box key="step2">
      <Typography variant="h5" fontWeight={700} mb={0.5}>Business / Service Details</Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Tell us about what you do so we can display it on your public profile.
      </Typography>
      <TextField label="Business Name or Professional Role" fullWidth value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g. Chen Design Studio OR UX Designer" required sx={{ mb: 4 }} />
      
      <Typography variant="h6" fontWeight={700} mb={0.5}>Social Media Presence</Typography>
      <Typography variant="body2" color="text.secondary" mb={2.5}>Used to understand your digital footprint.</Typography>
      
      <Stack spacing={2}>
        <TextField label="X (Twitter) Handle" fullWidth value={form.twitter_handle} onChange={(e) => set('twitter_handle', e.target.value)} placeholder="e.g. @yourbrand" />
        <TextField label="Instagram Handle" fullWidth value={form.instagram_handle} onChange={(e) => set('instagram_handle', e.target.value)} placeholder="e.g. @yourbrand" />
        <TextField label="Facebook Handle" fullWidth value={form.facebook_handle} onChange={(e) => set('facebook_handle', e.target.value)} placeholder="e.g. facebook.com/yourbrand" />
      </Stack>
    </Box>,

    // Step 3 — ID Upload
    <Box key="step3">
      <Typography variant="h5" fontWeight={800} sx={{ color: '#1E293B', mb: 1, letterSpacing: '-0.02em' }}>
        Identity Verification
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 4 }}>
        Upload a valid, unexpired government-issued ID.
      </Typography>
      
      <FileUploadCard 
        label="Government ID" 
        accept=".jpg,.jpeg,.png,.pdf" 
        file={form.gov_id_file} 
        onChange={(f: File) => set('gov_id_file', f)} 
        onRemove={() => set('gov_id_file', null)}
      />
      
      <FileUploadCard 
        label="Passport front" 
        accept=".jpg,.jpeg,.png" 
        file={form.gov_id_file ? new File([], 'passport_front.jpg') : null} 
        onChange={() => {}} 
        onRemove={() => {}}
        isUploaded
      />

      <FileUploadCard 
        label="CAC upload" 
        accept=".jpg,.jpeg,.png,.pdf" 
        file={null} 
        onChange={() => {}} 
        onRemove={() => {}}
      />

      <FileUploadCard 
        label="2 minute shot video" 
        accept=".mp4,.mkv,.avi" 
        file={form.business_video_file} 
        onChange={(f: File) => set('business_video_file', f)} 
        onRemove={() => set('business_video_file', null)}
        isVideo
      />

      <Box sx={{ p: 3, borderRadius: 5, bgcolor: '#F0F7FF', border: '1px solid #E0EFFF', mt: 5 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box sx={{ bgcolor: '#1A1FE8', color: '#fff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0, mt: 0.2 }}>
            i
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#1E293B', mb: 1.5 }}>
              Upload Instructions
            </Typography>
            <Stack spacing={1}>
              {[
                'Ensure all 4 corners of the document are visible',
                'Avoid glare or reflections on the document',
                'Photo must be clear and text fully legible',
                'Document must not be expired'
              ].map((t) => (
                <Typography key={t} variant="body2" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 4, bgcolor: '#94A3B8', borderRadius: '50%' }} />
                  {t}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>,

    // Step 4 — Review & Confirmation
    <Box key="step4">
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: '#10B981', mb: 3 }} />
        <Typography variant="h4" fontWeight={800} mb={1}>Verification Submitted!</Typography>
        <Typography variant="body1" color="text.secondary" mb={5}>
          Your documents have been successfully uploaded and are under review.
        </Typography>
        
        {registeredUser && (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 5, mb: 4, bgcolor: '#F4F6FF', border: '1px solid #E0E4EC' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>YOUR ONLOK ID</Typography>
            <Typography variant="h3" color="primary.main" fontWeight={900} sx={{ letterSpacing: 2, my: 1 }}>
              {registeredUser.vendor_id}
            </Typography>
            <Typography variant="body2" color="text.secondary">Use this ID to log in and share your verified status.</Typography>
          </Paper>
        )}
        
        <Button variant="contained" size="large" onClick={() => navigate('/dashboard')} sx={{ px: 6, borderRadius: 10, textTransform: 'none', fontWeight: 700 }}>
          Go to Dashboard
        </Button>
      </Box>
    </Box>,
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F4F6FF', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, flexGrow: 1 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 3, md: 6 }, 
            borderRadius: 8, 
            boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Custom Stepper */}
          <Box sx={{ mb: 8 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {STEPS.map((label, index) => (
                <Step key={label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: index < activeStep ? '#10B981' : (index === activeStep ? '#1A1FE8' : '#F0F2F5'),
                          color: index <= activeStep ? '#fff' : '#98A2B3',
                          fontWeight: 700,
                          fontSize: '1rem',
                          border: index === activeStep ? '4px solid rgba(26,31,232,0.1)' : 'none',
                          transition: 'all 0.3s'
                        }}
                      >
                        {index < activeStep ? '✓' : index + 1}
                      </Box>
                    )}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: index === activeStep ? 700 : 500,
                        color: index === activeStep ? 'text.primary' : 'text.secondary',
                        mt: 1,
                        display: 'block'
                      }}
                    >
                      {label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

          <Box sx={{ minHeight: 400 }}>
            {stepContent[activeStep]}
          </Box>

          {activeStep < STEPS.length - 1 && (
            <Box sx={{ mt: 8 }}>
              <Divider sx={{ mb: 4, opacity: 0.6 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0}
                  variant="text"
                  sx={{ 
                    color: 'text.secondary',
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { background: 'rgba(0,0,0,0.04)' }
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  variant="contained"
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <span>→</span>}
                  sx={{ 
                    borderRadius: 50, 
                    px: 6,
                    py: 1.8,
                    bgcolor: '#1A1FE8',
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: '0 10px 25px rgba(26,31,232,0.2)'
                  }}
                >
                  {activeStep === 2 ? (loading ? 'Submitting…' : 'Next Step') : 'Next Step'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

// Sub-components
const FileUploadCard = ({ label, accept, file, onChange, onRemove, isVideo, fileName, isUploaded }: any) => {
  const displayFile = file || (isUploaded ? { name: fileName || label, size: 1024 * 1024 * 1.2 } : null);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2.5,
        mb: 2,
        borderRadius: 4,
        border: '1px solid #E2E8F0',
        bgcolor: displayFile ? '#F8FAFC' : '#fff',
        transition: 'all 0.2s',
        '&:hover': { borderColor: '#1A1FE8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: displayFile ? '#E0E7FF' : '#F1F5F9',
          color: '#1A1FE8',
          mr: 2.5,
          flexShrink: 0
        }}
      >
        {isVideo ? <Box sx={{ fontSize: 24 }}>▶️</Box> : <Box sx={{ fontSize: 24 }}>📄</Box>}
      </Box>
      
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>
          {displayFile ? (fileName || (file?.name) || label) : label}
        </Typography>
        {displayFile && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {(displayFile.size / 1024 / 1024).toFixed(1)} MB • Uploaded successfully
            </Typography>
            <CheckCircleIcon sx={{ fontSize: 16, color: '#10B981' }} />
          </Stack>
        )}
        {!displayFile && (
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            Click to upload {label}
          </Typography>
        )}
      </Box>

      {displayFile ? (
        <Button 
          size="small" 
          onClick={onRemove}
          sx={{ color: '#EF4444', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#FEF2F2' } }}
        >
          Remove
        </Button>
      ) : (
        <Button 
          component="label"
          size="small"
          sx={{ fontWeight: 700, textTransform: 'none', color: '#1A1FE8' }}
        >
          Upload
          <input type="file" accept={accept} hidden onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
        </Button>
      )}
    </Box>
  );
};
