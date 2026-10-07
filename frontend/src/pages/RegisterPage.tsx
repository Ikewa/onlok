import { useState, useRef, useEffect } from 'react';
import {
  Box, Container, Typography, TextField, Button, CircularProgress, Paper, MenuItem, Select, FormControl, Stack, Chip, Switch, FormControlLabel, LinearProgress, Alert, Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import VideocamIcon from '@mui/icons-material/Videocam';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../api/auth';
import { createRegistrationApplication, submitVerification } from '../api/verifications';
import { compressImageFile, formatBytes } from '../utils/fileCompressor';
import { uploadFileInChunks } from '../utils/chunkUploader';
import { useVideoRecorder } from '../utils/useVideoRecorder';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const STEPS = ['Personal Info', 'Business', 'Documents', 'Review'];

interface FileUploadState {
  status: 'idle' | 'compressing' | 'uploading' | 'retrying' | 'resuming' | 'completed' | 'error';
  progress: number;
  error: string | null;
  uploadedUrl?: string;
  originalSize?: number;
  compressedSize?: number;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country_code: string;
  business_name: string;
  business_address: string;
  twitter_handle: string;
  instagram_handle: string;
  facebook_handle: string;
  tiktok_handle: string;
  linkedin_handle: string;
  password: string;
  confirm_password: string;
  gov_id_file: File | null;
  gov_id_url: string;
  gov_id_upload_id: string;
  business_video_file: File | null;
  business_video_url: string;
  video_upload_id: string;
  cac_file: File | null;
  cac_url: string;
  cac_upload_id: string;
  category: string;
  nin: string;
  rc_number: string;
}

const initialData: FormData = {
  first_name: '', last_name: '', email: '', phone_number: '',
  country_code: 'NG', business_name: '', business_address: '',
  twitter_handle: '', instagram_handle: '', facebook_handle: '', tiktok_handle: '', linkedin_handle: '',
  password: '', confirm_password: '',
  gov_id_file: null, gov_id_url: '',
  gov_id_upload_id: '',
  business_video_file: null, business_video_url: '', video_upload_id: '',
  cac_file: null, cac_url: '', cac_upload_id: '',
  category: 'Consumer', nin: '', rc_number: ''
};

const initialFileState: FileUploadState = {
  status: 'idle',
  progress: 0,
  error: null,
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
  const { login, user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const refCode = queryParams.get('ref');

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialData);
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submissionProgressLabel, setSubmissionProgressLabel] = useState<string>('');
  const [applicationId, setApplicationId] = useState<string>(() => localStorage.getItem('onlok_registration_application_id') || '');

  // Per-file upload tracking
  const [govIdState, setGovIdState] = useState<FileUploadState>(initialFileState);
  const [cacState, setCacState] = useState<FileUploadState>(initialFileState);
  const [videoState, setVideoState] = useState<FileUploadState>(initialFileState);

  const [fullNameInput, setFullNameInput] = useState('');

  const set = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullNameInput(val);
    const parts = val.trim().split(' ');
    set('first_name', parts[0] || '');
    set('last_name', parts.length > 1 ? parts.slice(1).join(' ') : '');
  };

  const validateStep = (): boolean => {
    if (activeStep === 0) {
      if (!form.first_name || !form.last_name || !form.email || !form.phone_number) {
        toast.error('Please enter your full First and Last name, email, and phone number.');
        return false;
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!form.password || !passwordRegex.test(form.password)) {
        toast.error('Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and symbol.');
        return false;
      }
      if (form.password !== form.confirm_password) {
        toast.error('Passwords do not match.');
        return false;
      }
    }
    if (activeStep === 1 && !form.business_name) {
      toast.error('Business name or professional role is required.');
      return false;
    }
    if (activeStep === 2) {
      if (!form.gov_id_file && !form.gov_id_url) {
        toast.error('Please select your Government ID.');
        return false;
      }
      if (!form.business_video_file && !form.business_video_url) {
        toast.error('Please select your business video.');
        return false;
      }
    }
    return true;
  };

  // Upload handler for single documents (with client compression)
  // Returns the upload id directly: React state updates are not visible to the
  // closure that is still running, so the caller must use the return value.
  const processAndUploadDoc = async (
    file: File,
    fieldName: string,
    setState: React.Dispatch<React.SetStateAction<FileUploadState>>,
    urlField: 'gov_id_url' | 'cac_url',
    uploadIdField: 'gov_id_upload_id' | 'cac_upload_id',
    activeApplicationId: string,
  ): Promise<{ url: string; uploadId: string }> => {
    setState({ status: 'compressing', progress: 0, error: null, originalSize: file.size });
    setSubmissionProgressLabel('Preparing your documents...');

    let finalFile = file;
    if (file.type.startsWith('image/')) {
      try {
        finalFile = await compressImageFile(file);
      } catch (compErr) {
        console.warn('Image compression fallback:', compErr);
      }
    }

    setState({
      status: 'uploading',
      progress: 10,
      error: null,
      originalSize: file.size,
      compressedSize: finalFile.size,
    });
    setSubmissionProgressLabel('Uploading documents...');

    const result = await uploadFileInChunks(finalFile, fieldName, {
      applicationId: activeApplicationId,
      onStatus: (status) => setState((prev) => ({ ...prev, status })),
      onProgress: (pct) => {
        setState((prev) => ({ ...prev, progress: pct }));
      },
    });

    setState((prev) => ({
      ...prev,
      status: 'completed',
      progress: 100,
      uploadedUrl: result.url,
    }));
    set(urlField, result.url);
    set(uploadIdField, result.uploadId || '');
    return { url: result.url, uploadId: result.uploadId || '' };
  };

  // Upload handler for chunked video
  const processAndUploadVideo = async (
    file: File,
    setState: React.Dispatch<React.SetStateAction<FileUploadState>>,
    activeApplicationId: string,
  ): Promise<{ url: string; uploadId: string }> => {
    setState({ status: 'uploading', progress: 0, error: null, originalSize: file.size });
    setSubmissionProgressLabel('Uploading video...');

    const result = await uploadFileInChunks(file, 'video', {
      applicationId: activeApplicationId,
      onStatus: (status) => setState((prev) => ({ ...prev, status })),
      onProgress: (pct) => {
        setState((prev) => ({ ...prev, progress: pct }));
        setSubmissionProgressLabel(`Uploading video... ${pct}%`);
      },
    });

    setState((prev) => ({
      ...prev,
      status: 'completed',
      progress: 100,
      uploadedUrl: result.url,
    }));
    set('business_video_url', result.url);
    set('video_upload_id', result.uploadId || '');
    return { url: result.url, uploadId: result.uploadId || '' };
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    // Moving from Review (Step 3) to Final Submission
    if (activeStep === 3) {
      setLoading(true);
      try {
        let user = registeredUser || authUser;

        // 1. Register or retrieve user session
        if (!user) {
          setSubmissionProgressLabel('Creating your account...');
          user = await registerUser({
            first_name: form.first_name,
            last_name: form.last_name,
            business_name: form.business_name,
            business_address: form.business_address,
            email: form.email,
            password: form.password,
            phone_number: form.phone_number,
            country_code: form.country_code,
            category: form.category,
            nin: form.nin,
            rc_number: form.rc_number,
            referred_by: refCode || undefined,
            twitter_handle: form.twitter_handle,
            instagram_handle: form.instagram_handle,
            facebook_handle: form.facebook_handle,
            tiktok_handle: form.tiktok_handle,
            linkedin_handle: form.linkedin_handle,
          });
          setRegisteredUser(user);
          login(user);
          localStorage.removeItem('onlok_registration_application_id');
          setApplicationId('');
        }

        let activeApplicationId = applicationId;
        if (!activeApplicationId) {
          setSubmissionProgressLabel('Preparing your application...');
          const application = await createRegistrationApplication();
          activeApplicationId = application.application_id;
          setApplicationId(activeApplicationId);
          localStorage.setItem('onlok_registration_application_id', activeApplicationId);
        }

        // 2-4. Decoupled uploads.
        // Values already recorded by an earlier attempt are reused; everything
        // produced during *this* attempt comes from the helpers' return values,
        // because the `form` state object is stale inside this async handler.
        const pendingUploads: { gov_id_upload_id?: string; cac_upload_id?: string; video_upload_id?: string } = {};

        let govIdUploadId = govIdState.status === 'completed' ? form.gov_id_upload_id : '';
        if (!govIdUploadId) {
          if (!form.gov_id_file) throw new Error('Please select your Government ID.');
          const govIdUpload = await processAndUploadDoc(
            form.gov_id_file, 'gov_id', setGovIdState, 'gov_id_url', 'gov_id_upload_id', activeApplicationId
          );
          govIdUploadId = govIdUpload.uploadId;
        }
        pendingUploads.gov_id_upload_id = govIdUploadId;

        let cacUploadId = cacState.status === 'completed' ? form.cac_upload_id : '';
        if (!cacUploadId && form.cac_file) {
          const cacUpload = await processAndUploadDoc(
            form.cac_file, 'cac_document', setCacState, 'cac_url', 'cac_upload_id', activeApplicationId
          );
          cacUploadId = cacUpload.uploadId;
        }
        if (cacUploadId) pendingUploads.cac_upload_id = cacUploadId;

        let videoUploadId = videoState.status === 'completed' ? form.video_upload_id : '';
        if (!videoUploadId) {
          if (!form.business_video_file) throw new Error('Please select your business video.');
          const videoUpload = await processAndUploadVideo(
            form.business_video_file, setVideoState, activeApplicationId
          );
          videoUploadId = videoUpload.uploadId;
        }
        pendingUploads.video_upload_id = videoUploadId;

        // 5. Finalize Verification Record
        setSubmissionProgressLabel('Finalizing application review...');
        await submitVerification({
          application_id: activeApplicationId,
          ...pendingUploads,
        });

        toast.success('Verification submitted successfully!');
        localStorage.removeItem('onlok_registration_application_id');
        setActiveStep(4); // Success screen
      } catch (err: any) {
        console.error('Submission error:', err);
        setGovIdState((prev) => prev.status === 'uploading' || prev.status === 'retrying' || prev.status === 'resuming' ? { ...prev, status: 'error', error: 'Upload interrupted. You can retry safely.' } : prev);
        setCacState((prev) => prev.status === 'uploading' || prev.status === 'retrying' || prev.status === 'resuming' ? { ...prev, status: 'error', error: 'Upload interrupted. You can retry safely.' } : prev);
        setVideoState((prev) => prev.status === 'uploading' || prev.status === 'retrying' || prev.status === 'resuming' ? { ...prev, status: 'error', error: 'Upload interrupted. You can retry safely.' } : prev);
        let msg = err?.serverMessage || err?.response?.data?.message;
        if (err?.response?.status === 413 || err?.status === 413) {
          msg = 'File size is too large. Please select a smaller video or image.';
        } else if (!msg) {
          msg = err?.message || 'Registration failed. Please check your connection and try again.';
        }
        // Quoting the trace id makes a failed upload traceable in the server log.
        const traceId = err?.traceId || err?.response?.headers?.['x-trace-id'] || err?.response?.data?.traceId;
        toast.error(traceId ? `${msg} (ref: ${traceId})` : msg);
      } finally {
        setLoading(false);
        setSubmissionProgressLabel('');
      }
      return;
    }

    setActiveStep((s) => s + 1);
  };

  const handleBack = () => setActiveStep((s) => s - 1);

  // Stepper Header
  const renderStepper = () => {
    if (activeStep === 4) return null;

    return (
      <Box sx={{ mb: 6, position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ position: 'absolute', top: 15, left: '5%', right: '5%', height: 2, bgcolor: '#E2E8F0', zIndex: 0 }}>
          <Box sx={{ height: '100%', bgcolor: '#00BCD4', width: `${(activeStep / (STEPS.length - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
        </Box>

        {STEPS.map((label, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          return (
            <Box key={label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: { xs: 65, sm: 80 } }}>
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
                  transition: 'all 0.3s',
                }}
              >
                {isCompleted ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <Typography variant="caption" fontWeight={700}>{index + 1}</Typography>}
              </Box>
              <Typography variant="caption" sx={{ color: isActive ? '#0F172A' : '#64748B', fontWeight: isActive ? 700 : 500, fontSize: { xs: '0.65rem', sm: '0.7rem' }, textTransform: 'capitalize', textAlign: 'center' }}>
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

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Full Legal Name <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField fullWidth value={fullNameInput} onChange={handleFullNameChange} placeholder="e.g., Sarah Chen" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Email Address <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField fullWidth type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="sarah@example.com" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Phone Number <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <Stack direction="row" spacing={1} mb={4}>
        <FormControl sx={{ minWidth: 100 }}>
          <Select value={form.country_code} onChange={(e) => set('country_code', e.target.value)} sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}>
            {countryCodes.map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.dial}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth value={form.phone_number} onChange={(e) => set('phone_number', e.target.value.slice(0, 11))} placeholder="(806) 000-0000" inputProps={{ maxLength: 11 }} InputProps={{ sx: { borderRadius: 2 } }} />
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

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Create Password <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField
        fullWidth
        variant="outlined"
        type={showPassword ? 'text' : 'password'}
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '30px' } }}
      />
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {[
          { label: '8+ chars', test: form.password.length >= 8 },
          { label: 'Uppercase', test: /[A-Z]/.test(form.password) },
          { label: 'Lowercase', test: /[a-z]/.test(form.password) },
          { label: 'Number', test: /\d/.test(form.password) },
          { label: 'Symbol', test: /[\W_]/.test(form.password) },
        ].map((req, i) => (
          <Chip
            key={i}
            label={req.label}
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: req.test ? '#D1FAE5' : '#F1F5F9',
              color: req.test ? '#059669' : '#94A3B8',
              '& .MuiChip-icon': {
                color: req.test ? '#10B981' : '#CBD5E1',
              }
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" fontWeight={700} color="#0F172A" display="block">Confirm Password <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
        {form.password && form.confirm_password && form.password === form.confirm_password && (
          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 14 }} /> Matches
          </Typography>
        )}
      </Box>
      <TextField
        fullWidth
        variant="outlined"
        type={showConfirmPassword ? 'text' : 'password'}
        value={form.confirm_password}
        onChange={(e) => set('confirm_password', e.target.value)}
        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '30px' } }}
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

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Business Name or Professional Role <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField fullWidth value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g., Chen Design Studio OR UX Designer" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Business Address / Location</Typography>
      <TextField fullWidth value={form.business_address} onChange={(e) => set('business_address', e.target.value)} placeholder="e.g., 12 Marina Boulevard, Marina Bay, Singapore" sx={{ mb: 4 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5}>Social Media Presence</Typography>
      <Typography variant="body2" color="#64748B" mb={1}>Helps us verify your online presence and credibility.</Typography>
      <Typography variant="body2" sx={{ color: '#1A1FE8', fontWeight: 800, mb: 3 }}>* Please provide at least one social media link.</Typography>

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">X (formerly Twitter) Handle</Typography>
      <TextField fullWidth value={form.twitter_handle} onChange={(e) => set('twitter_handle', e.target.value)} placeholder="https://x.com/profile" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Instagram Handle</Typography>
      <TextField fullWidth value={form.instagram_handle} onChange={(e) => set('instagram_handle', e.target.value)} placeholder="https://instagram.com/profile" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Facebook Handle</Typography>
      <TextField fullWidth value={form.facebook_handle} onChange={(e) => set('facebook_handle', e.target.value)} placeholder="https://facebook.com/profile" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">TikTok Handle</Typography>
      <TextField fullWidth value={form.tiktok_handle} onChange={(e) => set('tiktok_handle', e.target.value)} placeholder="https://tiktok.com/@profile" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">LinkedIn Profile</Typography>
      <TextField fullWidth value={form.linkedin_handle} onChange={(e) => set('linkedin_handle', e.target.value)} placeholder="https://linkedin.com/in/profile" InputProps={{ sx: { borderRadius: 2 } }} />
    </Box>,

    // Step 3: Documents
    <Box key="step3">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Identity Verification <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Upload a valid, unexpired government-issued ID.</Typography>

      <FileUploadDropzone
        file={form.gov_id_file}
        uploadState={govIdState}
        onChange={(f: File) => {
          set('gov_id_file', f);
          set('gov_id_url', '');
          setGovIdState(initialFileState);
        }}
        onRemove={() => {
          set('gov_id_file', null);
          set('gov_id_url', '');
          setGovIdState(initialFileState);
        }}
        title="Government ID"
        labels={['Passport', 'National ID', "Driver's License"]}
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        maxSize="15MB"
        icon={<InsertDriveFileOutlinedIcon />}
      />

      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5} mt={2}>Business or Professional Registration</Typography>
      <Typography variant="body2" color="#64748B" mb={3}>Upload your CAC certificate, business registration, or professional license (Optional).</Typography>

      <FileUploadDropzone
        file={form.cac_file}
        uploadState={cacState}
        onChange={(f: File) => {
          set('cac_file', f);
          set('cac_url', '');
          setCacState(initialFileState);
        }}
        onRemove={() => {
          set('cac_file', null);
          set('cac_url', '');
          setCacState(initialFileState);
        }}
        title="CAC Document"
        labels={['CAC Certificate', 'Business Registration', 'Professional License']}
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        maxSize="15MB"
        icon={<InsertDriveFileOutlinedIcon />}
      />

      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5} mt={2}>Video Verification <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <Typography variant="body2" color="#64748B" mb={3}>Upload a short 1–2 minute video of yourself and your work environment.</Typography>

      <VideoInput
        file={form.business_video_file}
        uploadState={videoState}
        onChange={(f: File) => {
          set('business_video_file', f);
          set('business_video_url', '');
          setVideoState(initialFileState);
        }}
        onRemove={() => {
          set('business_video_file', null);
          set('business_video_url', '');
          setVideoState(initialFileState);
        }}
      />
    </Box>,

    // Step 4: Review
    <Box key="step4">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Review & Submit</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Please review your information before submitting for verification.</Typography>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Personal Info</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(0)}>Edit</Typography>
        </Box>
        <GridRow label="Full Name" value={fullNameInput || '-'} />
        <GridRow label="Email" value={form.email || '-'} />
        <GridRow label="Phone" value={form.phone_number || '-'} />
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Documents</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(2)}>Edit</Typography>
        </Box>
        <FileReviewRow label="ID Document" file={form.gov_id_file} state={govIdState} />
        <FileReviewRow label="CAC Certificate" file={form.cac_file} state={cacState} />
        <FileReviewRow label="Verification Video" file={form.business_video_file} state={videoState} />
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#F8FAFC', mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Business / Service Details</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(1)}>Edit</Typography>
        </Box>
        <GridRow label="Name/Role" value={form.business_name || '-'} />
        <GridRow label="Address" value={form.business_address || '-'} />
      </Paper>

      {loading && submissionProgressLabel && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={700} mb={1}>{submissionProgressLabel}</Typography>
          <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
        </Alert>
      )}

      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#E0F2FE', mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <VerifiedUserOutlinedIcon sx={{ color: '#0284C7' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="#0F172A">Ready for Verification</Typography>
          <Typography variant="caption" color="#475569">
            By submitting, you agree to our Terms of Service and Privacy Policy. Verification typically takes 24-48 hours.
          </Typography>
        </Box>
      </Box>
    </Box>,

    // Step 5: Success (Index 4)
    <Box key="step5">
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 40, color: '#0284C7' }} />
        </Box>
        <Typography variant="h4" fontWeight={800} color="#0F172A" mb={2}>You're All Set!</Typography>
        <Typography variant="body1" color="#64748B" mb={5} sx={{ maxWidth: 440, mx: 'auto', lineHeight: 1.7 }}>
          Your account has been created and your verification documents are now with our review team. You'll receive an email at <strong style={{ color: '#0F172A' }}>{form.email}</strong> within 1–2 business days with your verification result.
        </Typography>

        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, mb: 5, bgcolor: '#F8FAFC', maxWidth: 400, mx: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" color="#64748B">Status</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#D97706' }} />
              Under Review
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" color="#64748B">Estimated Review</Typography>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A">1–2 business days</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="#64748B">Confirmation Sent To</Typography>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.email}</Typography>
          </Box>
        </Paper>

        <Button variant="contained" size="large" onClick={() => navigate('/dashboard')} sx={{ px: 6, borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: '#1A1FE8', '&:hover': { bgcolor: '#0F14B0' } }}>
          Go to My Dashboard
        </Button>
      </Box>
    </Box>,
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <Container maxWidth="md" sx={{ py: { xs: 3, md: 8 }, px: { xs: 1.5, sm: 3 }, flexGrow: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 4, md: 6 },
            borderRadius: { xs: 3, md: 4 },
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            position: 'relative',
          }}
        >
          {renderStepper()}

          <Box>{stepContent[activeStep]}</Box>

          {activeStep < 4 && (
            <Box sx={{ mt: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {activeStep === 0 ? (
                <Box />
              ) : (
                <Button
                  onClick={handleBack}
                  disabled={loading}
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
                  {loading ? 'Submitting Documents...' : 'Submit for Verification'}
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
          )}
        </Paper>
      </Container>
    </Box>
  );
}

// Helpers
const GridRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, mb: 1.5, minWidth: 0, width: '100%' }}>
    <Typography variant="body2" color="#64748B" sx={{ width: { xs: '100%', sm: 150 }, minWidth: { sm: 150 }, flexShrink: 0, mb: { xs: 0.2, sm: 0 } }}>{label}</Typography>
    <Typography variant="subtitle2" sx={{ color: '#0F172A', fontWeight: 700, flex: 1, minWidth: 0, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{value}</Typography>
  </Box>
);

const usePreviewUrl = (file: File | null) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return previewUrl;
};

const FileReviewRow = ({ label, file, state }: { label: string; file: File | null; state?: FileUploadState }) => {
  const previewUrl = usePreviewUrl(file);

  if (!file) {
    return <GridRow label={label} value="Missing" />;
  }
  const isImage = file.type.startsWith('image/');

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, mb: 2, alignItems: { xs: 'flex-start', sm: 'center' }, minWidth: 0, width: '100%' }}>
      <Typography variant="body2" color="#64748B" sx={{ width: { xs: '100%', sm: 150 }, minWidth: { sm: 150 }, flexShrink: 0, mb: { xs: 0.5, sm: 0 } }}>{label}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0, width: '100%' }}>
        {isImage && previewUrl && (
          <Box component="img" src={previewUrl} sx={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 1, border: '1px solid #E2E8F0', flexShrink: 0 }} />
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#0F172A', fontWeight: 700, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{file.name}</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
            {formatBytes(file.size)}
            {state?.status === 'completed' && ' • Ready'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

interface DropzoneProps {
  file: File | null;
  uploadState?: FileUploadState;
  onChange: (f: File) => void;
  onRemove: () => void;
  title: string;
  labels: string[];
  accept: string;
  maxSize: string;
  icon: React.ReactNode;
}

const FileUploadDropzone = ({ file, uploadState, onChange, onRemove, title, labels, accept, maxSize, icon }: DropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = usePreviewUrl(file);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    let maxBytes = 100 * 1024 * 1024;
    if (typeof maxSize === 'string' && maxSize.toLowerCase().includes('mb')) {
      const mbValue = parseInt(maxSize.toLowerCase().replace('mb', ''));
      if (!isNaN(mbValue)) maxBytes = mbValue * 1024 * 1024;
    }

    if (selectedFile.size > maxBytes) {
      toast.error(`File is too large. Maximum size is ${maxSize}.`);
      e.target.value = '';
      return;
    }

    onChange(selectedFile);
  };

  if (file) {
    const isImage = file.type.startsWith('image/');
    const isUploading = uploadState?.status === 'uploading' || uploadState?.status === 'compressing' || uploadState?.status === 'retrying' || uploadState?.status === 'resuming';
    const isError = uploadState?.status === 'error';

    return (
      <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, border: '1px solid', borderColor: isError ? '#EF4444' : '#00BCD4', bgcolor: isError ? '#FEF2F2' : '#F0FDFA', mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {isImage && previewUrl ? (
            <Box component="img" src={previewUrl} alt="preview" sx={{ width: 52, height: 52, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <Box sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00BCD4', flexShrink: 0 }}>
              {icon}
            </Box>
          )}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{title || file.name}</Typography>
              {!isUploading && !isError && <CheckCircleIcon sx={{ fontSize: 16, color: '#00BCD4', flexShrink: 0 }} />}
            </Stack>
            <Typography variant="caption" color="#64748B" display="block" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {file.name} ({formatBytes(file.size)})
            </Typography>

            {isUploading && (
              <Box sx={{ mt: 1, width: '100%' }}>
                <LinearProgress variant="determinate" value={uploadState?.progress || 0} sx={{ height: 6, borderRadius: 1 }} />
                <Typography variant="caption" sx={{ color: '#0284C7', mt: 0.5, display: 'block', fontWeight: 600 }}>
                  {uploadState?.status === 'compressing' ? 'Preparing...' : `Uploading... ${uploadState?.progress || 0}%`}
                </Typography>
              </Box>
            )}

            {isError && (
              <Typography variant="caption" sx={{ color: '#DC2626', mt: 0.5, display: 'block', fontWeight: 600 }}>
                {uploadState?.error || 'Upload failed. Click remove to try another file.'}
              </Typography>
            )}
          </Box>

          <Button size="small" onClick={onRemove} disabled={isUploading} sx={{ color: '#EF4444', fontWeight: 700, textTransform: 'none' }}>
            Remove
          </Button>
        </Stack>
      </Box>
    );
  }

  const isVideoInput = accept.includes('video');
  const formatLabel = isVideoInput ? 'MP4, MOV, WebM, MKV' : 'JPG, PNG, WebP, PDF';

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      sx={{
        position: 'relative',
        p: 4,
        borderRadius: 3,
        border: '1px dashed #CBD5E1',
        textAlign: 'center',
        mb: 3,
        cursor: 'pointer',
        '&:hover': { borderColor: '#94A3B8', bgcolor: '#F8FAFC' },
      }}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', mx: 'auto', mb: 2 }}>
        <FileUploadOutlinedIcon fontSize="small" />
      </Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
        Click To Upload {isVideoInput ? 'Video' : 'Document'}
      </Typography>
      <Typography variant="caption" sx={{ color: '#64748B', mb: 2, display: 'block' }}>
        {formatLabel} (max. {maxSize})
      </Typography>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        {labels.map((l: string) => (
          <Chip key={l} label={l} size="small" variant="outlined" sx={{ borderRadius: 1, color: '#64748B', borderColor: '#E2E8F0' }} />
        ))}
      </Stack>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={handleFileChange} style={{ display: 'none' }} id={`upload-${title}`} />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// VideoInput — wraps FileUploadDropzone + VideoRecorder behind a tab toggle
// ---------------------------------------------------------------------------

interface VideoInputProps {
  file: File | null;
  uploadState?: FileUploadState;
  onChange: (f: File) => void;
  onRemove: () => void;
}

const VideoInput = ({ file, uploadState, onChange, onRemove }: VideoInputProps) => {
  const [mode, setMode] = useState<'upload' | 'record'>('upload');

  const isRecordSupported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia;

  // Once a file is chosen (via upload OR recording) delegate entirely to the
  // existing dropzone so the user sees the standard file-selected card + upload
  // progress bar.
  if (file) {
    return (
      <FileUploadDropzone
        file={file}
        uploadState={uploadState}
        onChange={onChange}
        onRemove={onRemove}
        title="Verification Video"
        labels={['MP4', 'MOV', 'WebM', 'MKV']}
        accept=".mp4,.mov,.mkv,.webm,video/mp4,video/quicktime,video/x-matroska,video/webm"
        maxSize="100MB"
        icon={<PlayCircleOutlinedIcon />}
      />
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Mode Toggle */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          size="small"
          onClick={() => setMode('upload')}
          variant={mode === 'upload' ? 'contained' : 'outlined'}
          startIcon={<FileUploadOutlinedIcon />}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            fontWeight: 700,
            ...(mode === 'upload'
              ? { bgcolor: '#0F172A', '&:hover': { bgcolor: '#1E293B' } }
              : { borderColor: '#CBD5E1', color: '#64748B', '&:hover': { borderColor: '#94A3B8' } }),
          }}
        >
          Upload File
        </Button>

        <Tooltip
          title={!isRecordSupported ? 'Live recording is not supported in this browser' : ''}
          arrow
        >
          {/* span needed so Tooltip works on a disabled button */}
          <span>
            <Button
              size="small"
              onClick={() => setMode('record')}
              variant={mode === 'record' ? 'contained' : 'outlined'}
              disabled={!isRecordSupported}
              startIcon={<VideocamIcon />}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700,
                ...(mode === 'record'
                  ? { bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }
                  : { borderColor: '#CBD5E1', color: '#64748B', '&:hover': { borderColor: '#94A3B8' } }),
              }}
            >
              Record Live
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {mode === 'upload' ? (
        <FileUploadDropzone
          file={null}
          uploadState={uploadState}
          onChange={onChange}
          onRemove={onRemove}
          title="Verification Video"
          labels={['MP4', 'MOV', 'WebM', 'MKV']}
          accept=".mp4,.mov,.mkv,.webm,video/mp4,video/quicktime,video/x-matroska,video/webm"
          maxSize="100MB"
          icon={<PlayCircleOutlinedIcon />}
        />
      ) : (
        // VideoRecorder unmounts when mode switches back to 'upload', which
        // triggers its cleanup (stops stream, revokes blob URL).
        <VideoRecorder onChange={onChange} />
      )}
    </Box>
  );
};

// ---------------------------------------------------------------------------
// VideoRecorder — full camera / recording UI
// ---------------------------------------------------------------------------

interface VideoRecorderProps {
  onChange: (f: File) => void;
}

const VideoRecorder = ({ onChange }: VideoRecorderProps) => {
  const {
    status,
    recordedBlob,
    recordedUrl,
    duration,
    error,
    devices,
    selectedDeviceId,
    maxDuration,
    getStream,
    startCamera,
    startRecording,
    stopRecording,
    retake,
    switchCamera,
  } = useVideoRecorder();

  const liveRef = useRef<HTMLVideoElement>(null);

  // Attach the live MediaStream to the <video> element whenever it becomes
  // available. Using status as the trigger is intentional — the stream ref
  // itself is mutable and won't cause React to re-render.
  useEffect(() => {
    const el = liveRef.current;
    if (!el) return;
    if (status === 'ready' || status === 'recording') {
      const stream = getStream();
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
        el.play().catch(() => {
          // Autoplay may be blocked in some browsers; muted playsInline should
          // bypass the policy but we swallow the rejection gracefully.
        });
      }
    } else {
      el.srcObject = null;
    }
  }, [status, getStream]);

  const handleUseVideo = () => {
    if (!recordedBlob) return;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File(
      [recordedBlob],
      `workspace-recording-${Date.now()}.${ext}`,
      { type: recordedBlob.type, lastModified: Date.now() },
    );
    onChange(file);
  };

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const remaining = maxDuration - duration;

  /* ── idle ──────────────────────────────────────────────────────────────── */
  if (status === 'idle') {
    return (
      <Box
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px dashed #CBD5E1',
          textAlign: 'center',
          bgcolor: '#F8FAFC',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <VideocamIcon sx={{ fontSize: 28, color: '#3B82F6' }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={0.5}>
          Record Your Work Environment
        </Typography>
        <Typography
          variant="caption"
          color="#64748B"
          display="block"
          mb={3}
          sx={{ lineHeight: 1.7 }}
        >
          A short 1–2 minute video of yourself and your workspace.
          <br />
          Make sure you are in a well-lit area with the camera facing you.
        </Typography>
        <Button
          variant="contained"
          onClick={() => startCamera()}
          startIcon={<VideocamIcon />}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            fontWeight: 700,
            bgcolor: '#3B82F6',
            '&:hover': { bgcolor: '#2563EB' },
          }}
        >
          Enable Camera
        </Button>
      </Box>
    );
  }

  /* ── requesting ─────────────────────────────────────────────────────────── */
  if (status === 'requesting') {
    return (
      <Box
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px dashed #CBD5E1',
          textAlign: 'center',
          bgcolor: '#F8FAFC',
        }}
      >
        <CircularProgress
          size={40}
          sx={{ color: '#3B82F6', mb: 2, display: 'block', mx: 'auto' }}
        />
        <Typography variant="subtitle2" fontWeight={700} color="#0F172A">
          Requesting camera access…
        </Typography>
        <Typography variant="caption" color="#64748B" display="block" mt={0.5}>
          Please allow camera and microphone access when your browser prompts you.
        </Typography>
      </Box>
    );
  }

  /* ── error ──────────────────────────────────────────────────────────────── */
  if (status === 'error') {
    return (
      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid #EF4444',
          bgcolor: '#FEF2F2',
          textAlign: 'center',
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 36, color: '#EF4444', mb: 1 }} />
        <Typography variant="subtitle2" fontWeight={700} color="#DC2626" mb={1}>
          Camera Access Error
        </Typography>
        <Typography variant="body2" color="#64748B" mb={2.5}>
          {error}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => startCamera()}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            fontWeight: 700,
            borderColor: '#EF4444',
            color: '#EF4444',
            '&:hover': { borderColor: '#DC2626', bgcolor: '#FEE2E2' },
          }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  /* ── stopped — review recorded clip ─────────────────────────────────────── */
  if (status === 'stopped') {
    return (
      <Box
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid #00BCD4',
          bgcolor: '#F0FDFA',
        }}
      >
        <Box
          component="video"
          src={recordedUrl || undefined}
          controls
          sx={{ width: '100%', display: 'block', maxHeight: 320, bgcolor: '#000' }}
        />
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="#64748B" display="block" mb={2}>
            Recording: <strong>{fmt(duration)}</strong> — review your clip before continuing.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={retake}
              fullWidth
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700,
                borderColor: '#CBD5E1',
                color: '#475569',
              }}
            >
              Retake
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={handleUseVideo}
              fullWidth
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700,
                bgcolor: '#00BCD4',
                '&:hover': { bgcolor: '#0097A7' },
              }}
            >
              Use This Video
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  /* ── ready / recording — live camera feed ──────────────────────────────── */
  const isRecording = status === 'recording';

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${isRecording ? '#EF4444' : '#CBD5E1'}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Live video feed */}
      <Box sx={{ position: 'relative', bgcolor: '#000', lineHeight: 0 }}>
        <Box
          component="video"
          ref={liveRef}
          autoPlay
          muted
          playsInline
          sx={{ width: '100%', display: 'block', maxHeight: 320 }}
        />

        {/* REC indicator badge */}
        {isRecording && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              bgcolor: 'rgba(0,0,0,0.6)',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#EF4444',
                '@keyframes recPulse': {
                  '0%,100%': { opacity: 1 },
                  '50%': { opacity: 0.2 },
                },
                animation: 'recPulse 1s ease-in-out infinite',
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: '#fff', fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.5 }}
            >
              REC {fmt(duration)}
            </Typography>
          </Box>
        )}

        {/* Countdown warning — shown in the last 30 seconds */}
        {isRecording && remaining <= 30 && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              bgcolor: remaining <= 10 ? 'rgba(239,68,68,0.92)' : 'rgba(239,68,68,0.72)',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              transition: 'background-color 0.3s',
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>
              {fmt(remaining)} left
            </Typography>
          </Box>
        )}
      </Box>

      {/* Controls bar */}
      <Box sx={{ p: 2, bgcolor: '#F8FAFC' }}>
        {/* Camera selector — visible only when not recording and multiple cameras are available */}
        {!isRecording && devices.length > 1 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="#64748B" display="block" mb={0.5}>
              <CameraAltIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
              Camera
            </Typography>
            <Select
              size="small"
              fullWidth
              value={selectedDeviceId}
              onChange={(e) => switchCamera(e.target.value)}
              sx={{ borderRadius: 2, bgcolor: '#fff', fontSize: '0.85rem' }}
            >
              {devices.map((d, i) => (
                <MenuItem key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        {!isRecording ? (
          <Button
            variant="contained"
            fullWidth
            startIcon={<FiberManualRecordIcon />}
            onClick={startRecording}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 700,
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
            }}
          >
            Start Recording
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            startIcon={<StopIcon />}
            onClick={stopRecording}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 700,
              bgcolor: '#0F172A',
              '&:hover': { bgcolor: '#1E293B' },
            }}
          >
            Stop Recording
          </Button>
        )}

        {!isRecording && (
          <Typography
            variant="caption"
            color="#64748B"
            display="block"
            textAlign="center"
            mt={1.5}
          >
            Max. 2 minutes · Ensure good lighting and clear audio
          </Typography>
        )}
      </Box>
    </Box>
  );
};