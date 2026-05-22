import { useState } from 'react';
import {
  Box, Container, Typography, TextField, Button, CircularProgress, Paper, MenuItem, Select, FormControl, Stack, Chip, IconButton, InputAdornment, Switch, FormControlLabel
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/auth';
import { submitVerification } from '../api/verifications';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const STEPS = ['Personal Info', 'business', 'ID', 'Review'];

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
  category: string;
}

const initialData: FormData = {
  first_name: '', last_name: '', email: '', phone_number: '',
  country_code: 'NG', business_name: '',
  twitter_handle: '', instagram_handle: '', facebook_handle: '',
  password: '', confirm_password: '',
  gov_id_file: null, business_video_file: null,
  category: 'Consumer',
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
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // New state to hold the exact input text including spaces
  const [fullNameInput, setFullNameInput] = useState('');

  const set = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullNameInput(val); // Keep the UI responsive with spaces
    
    // Split for the database silently in the background
    const parts = val.trim().split(' ');
    set('first_name', parts[0] || '');
    set('last_name', parts.length > 1 ? parts.slice(1).join(' ') : '');
  };

  const validateStep = (): boolean => {
    if (activeStep === 0) {
      if (!form.first_name || !form.last_name || !form.email || !form.phone_number) {
        toast.error('Please enter your full First and Last name, email, and phone number.'); return false;
      }
      if (!form.password || form.password.length < 6) { 
        toast.error('Password must be at least 6 characters.'); return false; 
      }
      if (form.password !== form.confirm_password) { 
        toast.error('Passwords do not match.'); return false; 
      }
    }
    if (activeStep === 1 && !form.business_name) {
      toast.error('Business name or professional role is required.'); return false;
    }
    if (activeStep === 2) {
      if (!form.gov_id_file) { toast.error('Please upload your Government ID.'); return false; }
      if (!form.business_video_file) { toast.error('Please upload your business video.'); return false; }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (activeStep === 3) {
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
        toast.success('Verification submitted!');
        setActiveStep(4); // Success screen
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Registration failed. Please try again.';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    setActiveStep((s) => s + 1);
  };

  const handleBack = () => setActiveStep((s) => s - 1);

  // Custom Stepper UI
  const renderStepper = () => {
    if (activeStep === 4) return null; // hide on success

    return (
      <Box sx={{ mb: 6, position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Connecting line */}
        <Box sx={{ position: 'absolute', top: 15, left: '5%', right: '5%', height: 2, bgcolor: '#E2E8F0', zIndex: 0 }}>
          <Box sx={{ height: '100%', bgcolor: '#00BCD4', width: `${(activeStep / (STEPS.length - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
        </Box>

        {STEPS.map((label, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          return (
            <Box key={label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: 80 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isCompleted ? '#00BCD4' : (isActive ? '#0F172A' : '#fff'),
                  color: isCompleted || isActive ? '#fff' : '#64748B',
                  border: isCompleted || isActive ? 'none' : '2px solid #E2E8F0',
                  mb: 1,
                  transition: 'all 0.3s'
                }}
              >
                {isCompleted ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <Typography variant="caption" fontWeight={700}>{index + 1}</Typography>}
              </Box>
              <Typography variant="caption" sx={{ color: isActive ? '#0F172A' : '#64748B', fontWeight: isActive ? 700 : 500, fontSize: '0.7rem', textTransform: 'capitalize' }}>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  const stepContent = [
    // Step 1: Personal Info
    <Box key="step1">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Personal Information</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Please provide your legal name exactly as it appears on your ID.</Typography>
      
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Full Legal Name</Typography>
      <TextField fullWidth value={fullNameInput} onChange={handleFullNameChange} placeholder="e.g., Sarah Chen" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />
      
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Email Address</Typography>
      <TextField fullWidth type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="sarah@example.com" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Phone Number</Typography>
      <Stack direction="row" spacing={1} mb={4}>
        <FormControl sx={{ minWidth: 100 }}>
          <Select value={form.country_code} onChange={(e) => set('country_code', e.target.value)} sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}>
            {countryCodes.map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.dial}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} placeholder="(806) 000-0000" InputProps={{ sx: { borderRadius: 2 } }} />
      </Stack>

      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F8FAFC', mb: 4 }}>
        <Stack direction="row" spacing={2}>
          <LockOutlinedIcon sx={{ color: '#64748B' }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A" mb={0.5}>Why we need this</Typography>
            <Typography variant="caption" color="#64748B" sx={{ lineHeight: 1.5, display: 'block' }}>
              Your personal information is required to establish your baseline identity and communicate with you regarding your verification status. This data is encrypted and never shared publicly without your explicit consent.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Passwords required for registration but styled cleanly */}
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Create Password</Typography>
      <TextField 
        fullWidth 
        variant="outlined"
        type={showPassword ? 'text' : 'password'} 
        value={form.password} 
        onChange={(e) => set('password', e.target.value)} 
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': { borderRadius: '30px' }
        }} 
      />
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Confirm Password</Typography>
      <TextField 
        fullWidth 
        variant="outlined"
        type={showConfirmPassword ? 'text' : 'password'} 
        value={form.confirm_password} 
        onChange={(e) => set('confirm_password', e.target.value)} 
        sx={{ 
          mb: 2,
          '& .MuiOutlinedInput-root': { borderRadius: '30px' }
        }} 
      />
      <FormControlLabel
        control={
          <Switch 
            checked={showPassword} 
            onChange={(e) => {
              setShowPassword(e.target.checked);
              setShowConfirmPassword(e.target.checked);
            }} 
            color="primary" 
          />
        }
        label={<Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>Show Passwords</Typography>}
        sx={{ mb: 3 }}
      />
    </Box>,

    // Step 2: Business
    <Box key="step2">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Business / Service Details</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Tell us about what you do so we can display it on your public profile.</Typography>
      
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Business Name or Professional Role</Typography>
      <TextField fullWidth value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g., Chen Design Studio OR UX Designer" sx={{ mb: 4 }} InputProps={{ sx: { borderRadius: 2 } }} />
      
      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5}>social media presence</Typography>
      <Typography variant="body2" color="#64748B" mb={3}>used to understand your digital footprint abd brand presence</Typography>
      
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">X (formally tweeter) handle</Typography>
      <TextField fullWidth value={form.twitter_handle} onChange={(e) => set('twitter_handle', e.target.value)} placeholder="https://x.com/profile" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />
      
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Instagram Hanlde</Typography>
      <TextField fullWidth value={form.instagram_handle} onChange={(e) => set('instagram_handle', e.target.value)} placeholder="https://instagram.com/profile" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />
      
      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Facebook Handle</Typography>
      <TextField fullWidth value={form.facebook_handle} onChange={(e) => set('facebook_handle', e.target.value)} placeholder="https://facebook.com/profile" InputProps={{ sx: { borderRadius: 2 } }} />
    </Box>,

    // Step 3: ID Upload
    <Box key="step3">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Identity Verification</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Upload a valid, unexpired government-issued ID.</Typography>
      
      <FileUploadDropzone 
        file={form.gov_id_file} 
        onChange={(f: File) => set('gov_id_file', f)} 
        onRemove={() => set('gov_id_file', null)}
        title="passport_front.jpg"
        labels={['Passport', 'National ID', "Driver's License"]}
        accept=".svg,.png,.jpg,.pdf"
        maxSize="10MB"
        icon={<InsertDriveFileOutlinedIcon />}
      />

      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5} mt={4}>Business Registration</Typography>
      <Typography variant="body2" color="#64748B" mb={3}>Upload a valid, unexpired government-issued ID.</Typography>
      
      <FileUploadDropzone 
        file={null} 
        onChange={() => {}} 
        onRemove={() => {}}
        title="CAC upload"
        labels={['CAC Certificat']}
        accept=".svg,.png,.jpg,.pdf"
        maxSize="10MB"
        icon={<InsertDriveFileOutlinedIcon />}
      />

      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5} mt={4}>video upload</Typography>
      <Typography variant="body2" color="#64748B" mb={3}>Upload two minute of you and your business environment</Typography>
      
      <FileUploadDropzone 
        file={form.business_video_file} 
        onChange={(f: File) => set('business_video_file', f)} 
        onRemove={() => set('business_video_file', null)}
        title="2 minute shot video"
        labels={['Video']}
        accept=".mp4"
        maxSize="100mb"
        icon={<PlayCircleOutlinedIcon />}
      />

      <Box sx={{ p: 3, borderRadius: 3, bgcolor: '#F8FAFC', mt: 4 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <InfoOutlinedIcon sx={{ color: '#1A1FE8' }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A" mb={1.5}>Upload Instructions</Typography>
            <Stack spacing={1}>
              {['Ensure all 4 corners of the document are visible', 'Avoid glare or reflections on the document', 'Photo must be clear and text fully legible', 'Document must not be expired'].map((t) => (
                <Typography component="div" key={t} variant="body2" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#64748B', borderRadius: '50%' }} /> {t}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>,

    // Step 4: Review
    <Box key="step4">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Review & Submit</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Please review your information before submitting for verification.</Typography>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Personal Info</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(0)}>Edit</Typography>
        </Box>
        <GridRow label="Full Name" value={fullNameInput || '-'} />
        <GridRow label="Email" value={form.email || '-'} />
        <GridRow label="Phone" value={form.phone_number || '-'} />
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Documents</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(2)}>Edit</Typography>
        </Box>
        <GridRow label="ID Document" value={form.gov_id_file ? 'Submitted' : 'Missing'} />
        <GridRow label="Business Video" value={form.business_video_file ? 'Submitted' : 'Missing'} />
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: '#F8FAFC', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Business Details</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(1)}>Edit</Typography>
        </Box>
        <GridRow label="Name/Role" value={form.business_name || '-'} />
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body2" color="#64748B" sx={{ width: 150 }}>Category</Typography>
          <FormControl size="small" variant="standard" sx={{ minWidth: 100 }}>
            <Select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              disableUnderline
              sx={{ color: '#0F172A', fontWeight: 700, fontSize: '0.875rem', '& .MuiSelect-select': { py: 0 } }}
            >
              <MenuItem value="Consumer">Consumer</MenuItem>
              <MenuItem value="Vendor">Vendor</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#E0F2FE', mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <VerifiedUserOutlinedIcon sx={{ color: '#0284C7' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="#0F172A">Ready for Verification</Typography>
          <Typography variant="caption" color="#475569">By submitting, you agree to our Terms of Service and Privacy Policy. Verification typically takes 24-48 hours.</Typography>
        </Box>
      </Box>
    </Box>,

    // Step 5: Success (Index 4)
    <Box key="step5">
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 40, color: '#0284C7' }} />
        </Box>
        <Typography variant="h4" fontWeight={800} color="#0F172A" mb={2}>Verification Submitted!</Typography>
        <Typography variant="body1" color="#64748B" mb={5} sx={{ maxWidth: 400, mx: 'auto' }}>
          Thank you for completing the verification process. Our team will review your application and documents within 24-48 hours.
        </Typography>
        
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, mb: 5, bgcolor: '#F8FAFC', maxWidth: 400, mx: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" color="#64748B">Application ID</Typography>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A">APP-{Math.floor(Math.random() * 9000) + 1000}-KX</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="#64748B">Status</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#D97706' }} />
              Pending Review
            </Typography>
          </Box>
        </Paper>
        
        <Button variant="contained" size="large" onClick={() => navigate('/dashboard')} sx={{ px: 6, borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#1A1FE8', '&:hover': { bgcolor: '#0F14B0' } }}>
          Dashboard (Pending)
        </Button>
      </Box>
    </Box>
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, flexGrow: 1 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 3, md: 6 }, 
            borderRadius: 4, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            position: 'relative'
          }}
        >
          {renderStepper()}

          <Box>
            {stepContent[activeStep]}
          </Box>

          {activeStep < 4 && (
            <>
              {activeStep === 3 ? null : (
                 <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748B', mt: 4, mb: -2 }}>
                   Save & Continue Later
                 </Typography>
              )}
              <Box sx={{ mt: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {activeStep === 0 ? (
                  <Box /> // Empty box for flex spacing
                ) : (
                  <Button
                    onClick={handleBack}
                    variant="contained"
                    sx={{ bgcolor: '#E2E8F0', color: '#475569', px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#CBD5E1' } }}
                  >
                    Back
                  </Button>
                )}
                
                {activeStep === 3 ? (
                  <Button
                    onClick={handleNext}
                    variant="contained"
                    disabled={loading}
                    endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <VerifiedUserOutlinedIcon />}
                    sx={{ bgcolor: '#1A1FE8', px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0F14B0' } }}
                  >
                    Submit for Verification
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    variant="contained"
                    endIcon={<span>›</span>}
                    sx={{ bgcolor: '#1A1FE8', px: 4, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#0F14B0' } }}
                  >
                    Next Step
                  </Button>
                )}
              </Box>
              {activeStep === 3 && (
                 <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748B', mt: 4 }}>
                   Save & Continue Later
                 </Typography>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

// Helpers
const GridRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', mb: 1.5 }}>
    <Typography variant="body2" color="#64748B" sx={{ width: 150 }}>{label}</Typography>
    <Typography variant="subtitle2" sx={{ color: '#0F172A', fontWeight: 700 }}>{value}</Typography>
  </Box>
);

const FileUploadDropzone = ({ file, onChange, onRemove, title, labels, accept, maxSize, icon }: any) => {
  if (file) {
    return (
      <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #00BCD4', bgcolor: '#E0F7FA', display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00BCD4', mr: 2 }}>
          {icon}
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>{title || file.name}</Typography>
            <CheckCircleIcon sx={{ fontSize: 16, color: '#00BCD4' }} />
          </Stack>
          <Typography variant="caption" color="#64748B">
            {(file.size / 1024 / 1024).toFixed(1)} MB • Uploaded successfully
          </Typography>
        </Box>
        <Button size="small" onClick={onRemove} sx={{ color: '#EF4444', fontWeight: 700, textTransform: 'none' }}>
          Remove
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', p: 4, borderRadius: 3, border: '1px dashed #CBD5E1', textAlign: 'center', mb: 3, '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' } }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', mx: 'auto', mb: 2 }}>
        <FileUploadOutlinedIcon fontSize="small" />
      </Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
        Click To Upload {icon.type === PlayCircleOutlinedIcon ? 'Video' : 'Document'}
      </Typography>
      <Typography variant="caption" sx={{ color: '#64748B', mb: 2, display: 'block' }}>
        {accept.toUpperCase().replace(/\./g, '')} (max. {maxSize})
      </Typography>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
        {labels.map((l: string) => (
          <Chip key={l} label={l} size="small" variant="outlined" sx={{ borderRadius: 1, color: '#64748B', borderColor: '#E2E8F0' }} />
        ))}
      </Stack>
      <input type="file" accept={accept} hidden onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} style={{ display: 'none' }} id={`upload-${title}`} />
      <label htmlFor={`upload-${title}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer' }} />
    </Box>
  );
};