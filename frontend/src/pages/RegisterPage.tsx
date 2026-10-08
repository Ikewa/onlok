import { useState, useRef, useEffect } from 'react';
import {
  Box, Container, Typography, TextField, Button, CircularProgress, Paper, MenuItem, Select, FormControl, Stack, Chip, Switch, FormControlLabel, LinearProgress, Alert, Tooltip, InputAdornment
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WorkIcon from '@mui/icons-material/Work';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import LinkIcon from '@mui/icons-material/Link';
import ScreenshotMonitorIcon from '@mui/icons-material/ScreenshotMonitor';

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

// Base steps always shown. Service provider/Both accounts get 3 extra steps between Business and Documents.
const BASE_STEPS = ['Personal Info', 'Business', 'Documents', 'Review'];
const SP_EXTRA_STEPS = ['Service Info', 'Portfolio', 'References'];

// Returns the ordered step labels depending on account type
const getSteps = (accountType: 'vendor' | 'service_provider' | 'both') =>
  accountType === 'vendor'
    ? BASE_STEPS
    : ['Personal Info', 'Business', ...SP_EXTRA_STEPS, 'Documents', 'Review'];

// Step indices for non-vendor accounts
const SP_STEP = { PERSONAL: 0, BUSINESS: 1, SERVICE_INFO: 2, PORTFOLIO: 3, REFERENCES: 4, DOCUMENTS: 5, REVIEW: 6 };
const V_STEP  = { PERSONAL: 0, BUSINESS: 1, DOCUMENTS: 2, REVIEW: 3 };

const SERVICE_CATEGORIES = [
  'Architecture & Interior Design',
  'Auto & Mechanical Services',
  'Beauty & Personal Care',
  'Catering & Food Services',
  'Cleaning & Sanitation',
  'Construction & Building',
  'Consulting & Advisory',
  'Creative Arts & Design',
  'Education & Tutoring',
  'Electrical & Electronics',
  'Event Planning & Management',
  'Fashion & Tailoring',
  'Fitness & Wellness',
  'Healthcare & Medical',
  'IT & Software Development',
  'Legal & Compliance',
  'Logistics & Delivery',
  'Marketing & Advertising',
  'Media & Photography',
  'Plumbing & Water Services',
  'Real Estate & Property',
  'Security Services',
  'Translation & Languages',
  'Writing & Content Creation',
  'Other',
];

interface FileUploadState {
  status: 'idle' | 'compressing' | 'uploading' | 'retrying' | 'resuming' | 'completed' | 'error';
  progress: number;
  error: string | null;
  uploadedUrl?: string;
  originalSize?: number;
  compressedSize?: number;
}

type AccountType = 'vendor' | 'service_provider' | 'both';

interface PortfolioItem {
  title: string;
  url: string;  // link OR will hold uploaded file name as placeholder
  description: string;
  file: File | null;
}

interface ReferenceItem {
  name: string;
  role: string;    // e.g. "Project Manager at Acme Ltd"
  contact: string; // phone or email
  project: string; // brief project description
}

interface FormData {
  // Account type
  account_type: AccountType;
  // Personal
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country_code: string;
  // Business
  business_name: string;
  business_address: string;
  twitter_handle: string;
  instagram_handle: string;
  facebook_handle: string;
  tiktok_handle: string;
  linkedin_handle: string;
  website_url: string;
  // Service Provider info
  service_category: string;
  years_experience: string;
  service_description: string;
  // Portfolio (2–5 items)
  portfolio: PortfolioItem[];
  // References (1–2)
  references: ReferenceItem[];
  // Auth
  password: string;
  confirm_password: string;
  // Documents
  gov_id_file: File | null;
  gov_id_url: string;
  gov_id_upload_id: string;
  business_video_file: File | null;
  business_video_url: string;
  video_upload_id: string;
  cac_file: File | null;
  cac_url: string;
  cac_upload_id: string;
  // Testimonials (optional screen recordings)
  testimonial_file: File | null;
  testimonial_url: string;
  testimonial_upload_id: string;
  // Legacy
  category: string;
  nin: string;
  rc_number: string;
}

const emptyPortfolioItem = (): PortfolioItem => ({ title: '', url: '', description: '', file: null });
const emptyReference = (): ReferenceItem => ({ name: '', role: '', contact: '', project: '' });

const initialData: FormData = {
  account_type: 'vendor',
  first_name: '', last_name: '', email: '', phone_number: '',
  country_code: 'NG', business_name: '', business_address: '',
  twitter_handle: '', instagram_handle: '', facebook_handle: '', tiktok_handle: '', linkedin_handle: '',
  website_url: '',
  service_category: '', years_experience: '', service_description: '',
  portfolio: [emptyPortfolioItem(), emptyPortfolioItem()],
  references: [emptyReference()],
  password: '', confirm_password: '',
  gov_id_file: null, gov_id_url: '',
  gov_id_upload_id: '',
  business_video_file: null, business_video_url: '', video_upload_id: '',
  cac_file: null, cac_url: '', cac_upload_id: '',
  testimonial_file: null, testimonial_url: '', testimonial_upload_id: '',
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
  const [testimonialState, setTestimonialState] = useState<FileUploadState>(initialFileState);

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
    const steps = getSteps(form.account_type);
    const isVendor = form.account_type === 'vendor';
    const reviewIdx = steps.length - 1;
    const docIdx = steps.indexOf('Documents');

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
    // Service Info step (SP/Both only)
    if (!isVendor && activeStep === SP_STEP.SERVICE_INFO) {
      if (!form.service_category) { toast.error('Please select your service category.'); return false; }
      if (!form.years_experience) { toast.error('Please enter your years of experience.'); return false; }
      if (!form.service_description || form.service_description.trim().length < 30) {
        toast.error('Please write at least 30 characters describing your service.'); return false;
      }
    }
    // Portfolio step (SP/Both only)
    if (!isVendor && activeStep === SP_STEP.PORTFOLIO) {
      const filled = form.portfolio.filter(p => p.title.trim() && (p.url.trim() || p.file));
      if (filled.length < 2) {
        toast.error('Please add at least 2 portfolio items (title + link or file each).'); return false;
      }
    }
    // References step (SP/Both only)
    if (!isVendor && activeStep === SP_STEP.REFERENCES) {
      const filled = form.references.filter(r => r.name.trim() && r.contact.trim());
      if (filled.length < 1) {
        toast.error('Please add at least 1 reference with a name and contact.'); return false;
      }
    }
    // Documents step
    if (activeStep === docIdx) {
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

  // Upload handler for testimonial screen recording
  const processAndUploadTestimonial = async (
    file: File,
    activeApplicationId: string,
  ): Promise<{ url: string; uploadId: string }> => {
    setTestimonialState({ status: 'uploading', progress: 0, error: null, originalSize: file.size });
    setSubmissionProgressLabel('Uploading testimonial...');

    const result = await uploadFileInChunks(file, 'testimonial', {
      applicationId: activeApplicationId,
      onStatus: (status) => setTestimonialState((prev) => ({ ...prev, status })),
      onProgress: (pct) => {
        setTestimonialState((prev) => ({ ...prev, progress: pct }));
        setSubmissionProgressLabel(`Uploading testimonial... ${pct}%`);
      },
    });

    setTestimonialState((prev) => ({ ...prev, status: 'completed', progress: 100, uploadedUrl: result.url }));
    set('testimonial_url', result.url);
    set('testimonial_upload_id', result.uploadId || '');
    return { url: result.url, uploadId: result.uploadId || '' };
  };


  const handleNext = async () => {
    if (!validateStep()) return;

    const steps = getSteps(form.account_type);
    const reviewIdx = steps.length - 1; // last real step before success

    // Moving from Review step to Final Submission
    if (activeStep === reviewIdx) {
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
            category: form.account_type === 'vendor' ? 'Vendor' : form.account_type === 'service_provider' ? 'Service Provider' : 'Both',
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
        const pendingUploads: { gov_id_upload_id?: string; cac_upload_id?: string; video_upload_id?: string; testimonial_upload_id?: string } = {};

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

        // Optional: testimonial upload
        let testimonialUploadId = testimonialState.status === 'completed' ? form.testimonial_upload_id : '';
        if (!testimonialUploadId && form.testimonial_file) {
          const tUpload = await processAndUploadTestimonial(form.testimonial_file, activeApplicationId);
          testimonialUploadId = tUpload.uploadId;
        }
        if (testimonialUploadId) pendingUploads.testimonial_upload_id = testimonialUploadId;

        // 5. Finalize Verification Record
        setSubmissionProgressLabel('Finalizing application review...');
        await submitVerification({
          application_id: activeApplicationId,
          ...pendingUploads,
        });

        toast.success('Verification submitted successfully!');
        localStorage.removeItem('onlok_registration_application_id');
        setActiveStep(steps.length); // Success screen index = steps.length
      } catch (err: any) {
        console.error('Submission error:', err);
        setGovIdState((prev) => prev.status === 'uploading' || prev.status === 'retrying' || prev.status === 'resuming' ? { ...prev, status: 'error', error: 'Upload interrupted. You can retry safely.' } : prev);
        setCacState((prev) => prev.status === 'uploading' || prev.status === 'retrying' || prev.status === 'resuming' ? { ...prev, status: 'error', error: 'Upload interrupted. You can retry safely.' } : prev);
        setVideoState((prev) => prev.status === 'uploading' || prev.status === 'retrying' || prev.status === 'resuming' ? { ...prev, status: 'error', error: 'Upload interrupted. You can retry safely.' } : prev);
        setTestimonialState((prev) => prev.status === 'uploading' || prev.status === 'retrying' || prev.status === 'resuming' ? { ...prev, status: 'error', error: 'Upload interrupted. You can retry safely.' } : prev);
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

  const steps = getSteps(form.account_type);
  const reviewIdx = steps.length - 1;
  const isSp = form.account_type !== 'vendor';

  // Stepper Header
  const renderStepper = () => {
    if (activeStep >= steps.length) return null;

    return (
      <Box sx={{ mb: 6, position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ position: 'absolute', top: 15, left: '5%', right: '5%', height: 2, bgcolor: '#E2E8F0', zIndex: 0 }}>
          <Box sx={{ height: '100%', bgcolor: '#00BCD4', width: `${(activeStep / (steps.length - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
        </Box>

        {steps.map((label, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          const isCompact = steps.length > 5;
          return (
            <Box key={label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: isCompact ? { xs: 40, sm: 60 } : { xs: 65, sm: 80 } }}>
              <Box
                sx={{
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
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
                {isCompleted ? <CheckCircleIcon sx={{ fontSize: isCompact ? 16 : 20 }} /> : <Typography variant="caption" fontWeight={700} sx={{ fontSize: isCompact ? '0.75rem' : '0.85rem' }}>{index + 1}</Typography>}
              </Box>
              <Typography variant="caption" sx={{ color: isActive ? '#0F172A' : '#64748B', fontWeight: isActive ? 700 : 500, fontSize: isCompact ? { xs: '0.55rem', sm: '0.65rem' } : { xs: '0.65rem', sm: '0.7rem' }, textTransform: 'capitalize', textAlign: 'center', lineHeight: 1.1 }}>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Step 1: Personal Info
  const personalStep = (
    <Box key="step-personal">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Personal Information</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Please provide your legal name exactly as it appears on your ID.</Typography>

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Full Legal Name <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField fullWidth value={fullNameInput} onChange={handleFullNameChange} placeholder="e.g., Sarah Chen" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Email Address <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField fullWidth type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="sarah@example.com" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Phone Number <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <Stack direction="row" spacing={1} mb={4}>
        <FormControl sx={{ minWidth: 100 }}>
          <Select value={form.country_code} onChange={(e) => set('country_code', e.target.value as string)} sx={{ borderRadius: 2, bgcolor: '#F8FAFC' }}>
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
    </Box>
  );

  // Step 2: Business Details with Account Type Selector
  const accountTypes: Array<{
    type: AccountType;
    title: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      type: 'vendor',
      title: '🏪 Vendor / Business Owner',
      description: 'Sells physical products or goods',
      icon: <StorefrontIcon sx={{ fontSize: 28 }} />,
    },
    {
      type: 'service_provider',
      title: '💼 Service Provider',
      description: 'Provides skills, professional services, or creative services',
      icon: <WorkIcon sx={{ fontSize: 28 }} />,
    },
    {
      type: 'both',
      title: '🔄 Both',
      description: 'Sells products AND provides services',
      icon: <SwapHorizIcon sx={{ fontSize: 28 }} />,
    },
  ];

  const businessStep = (
    <Box key="step-business">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Business / Service Details</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Tell us about what you do so we can display it on your public profile.</Typography>

      {/* Account Type Selector */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" fontWeight={800} color="#0F172A" mb={0.5}>What best describes you? <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
        <Typography variant="body2" color="#64748B" mb={2}>Select your account type:</Typography>

        <Stack spacing={2}>
          {accountTypes.map((item) => {
            const isSelected = form.account_type === item.type;
            return (
              <Paper
                key={item.type}
                elevation={0}
                onClick={() => set('account_type', item.type)}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: isSelected ? '#1A1FE8' : '#E2E8F0',
                  bgcolor: isSelected ? '#F4F5FF' : '#FFFFFF',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: isSelected ? '#1A1FE8' : '#CBD5E1',
                    bgcolor: isSelected ? '#F4F5FF' : '#F8FAFC',
                  },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: isSelected ? '#1A1FE8' : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" fontWeight={800} color={isSelected ? '#1A1FE8' : '#0F172A'}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="#64748B">
                    {item.description}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: isSelected ? '#1A1FE8' : '#CBD5E1',
                    bgcolor: isSelected ? '#1A1FE8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isSelected && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FFF' }} />}
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Box>

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Business Name or Professional Role <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField fullWidth value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="e.g., Chen Design Studio OR UX Designer" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Business Address / Location</Typography>
      <TextField fullWidth value={form.business_address} onChange={(e) => set('business_address', e.target.value)} placeholder="e.g., 12 Marina Boulevard, Marina Bay, Singapore" sx={{ mb: 3 }} InputProps={{ sx: { borderRadius: 2 } }} />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Website URL (Optional)</Typography>
      <TextField fullWidth value={form.website_url} onChange={(e) => set('website_url', e.target.value)} placeholder="https://yourwebsite.com" sx={{ mb: 4 }} InputProps={{ sx: { borderRadius: 2 }, startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: '#94A3B8' }} /></InputAdornment> }} />

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
    </Box>
  );

  // Step 3 (SP Only): Service Info
  const serviceInfoStep = (
    <Box key="step-service-info">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Step 1 — Tell us about your service</Typography>
      <Typography variant="body2" color="#64748B" mb={4}>Provide details about your core service, expertise, and background.</Typography>

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Primary Service Category <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <FormControl fullWidth sx={{ mb: 3 }}>
        <Select
          value={form.service_category}
          onChange={(e) => set('service_category', e.target.value as string)}
          displayEmpty
          sx={{ borderRadius: 2, bgcolor: '#FFFFFF' }}
        >
          <MenuItem value="" disabled><em>Select primary service category</em></MenuItem>
          {SERVICE_CATEGORIES.map((cat) => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Years of Experience <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField
        fullWidth
        type="number"
        value={form.years_experience}
        onChange={(e) => set('years_experience', e.target.value)}
        placeholder="e.g. 5"
        inputProps={{ min: 0, max: 60 }}
        InputProps={{
          sx: { borderRadius: 2 },
          endAdornment: <InputAdornment position="end">years</InputAdornment>
        }}
        sx={{ mb: 3 }}
      />

      <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Service Description <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={form.service_description}
        onChange={(e) => set('service_description', e.target.value)}
        placeholder="Describe what you do, who your target clients are, and what sets your work apart... (minimum 30 characters)"
        sx={{ mb: 1 }}
        InputProps={{ sx: { borderRadius: 2 } }}
      />
      <Typography variant="caption" color={form.service_description.trim().length >= 30 ? '#059669' : '#64748B'} display="block" mb={4}>
        {form.service_description.trim().length} / 30 minimum characters {form.service_description.trim().length >= 30 ? '✓' : ''}
      </Typography>
    </Box>
  );

  // Step 4 (SP Only): Portfolio
  const updatePortfolioItem = (index: number, key: keyof PortfolioItem, val: string) => {
    const updated = [...form.portfolio];
    updated[index] = { ...updated[index], [key]: val };
    set('portfolio', updated);
  };

  const removePortfolioItem = (index: number) => {
    if (form.portfolio.length <= 2) {
      toast.error('At least 2 portfolio items are required for Service Provider verification.');
      return;
    }
    set('portfolio', form.portfolio.filter((_, i) => i !== index));
  };

  const portfolioStep = (
    <Box key="step-portfolio">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Step 2 — Show us your work</Typography>
      <Typography variant="body2" color="#64748B" mb={3}>Upload or link 2–5 past projects or portfolio samples.</Typography>

      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F0FDFA', border: '1px solid #99F6E4', mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <WorkIcon sx={{ color: '#0D9488', mt: 0.2 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A">Portfolio Guidelines</Typography>
            <Typography variant="caption" color="#475569" sx={{ lineHeight: 1.5, display: 'block' }}>
              Add 2 to 5 portfolio items showcasing your recent client work or creative projects. Provide clear titles, live URLs, or brief project summaries.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {form.portfolio.map((item, idx) => (
        <Paper elevation={0} key={idx} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC', mb: 3, position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Chip label={`Project #${idx + 1}`} size="small" sx={{ fontWeight: 800, bgcolor: '#1A1FE8', color: '#FFF' }} />
            {form.portfolio.length > 2 && (
              <Button size="small" color="error" onClick={() => removePortfolioItem(idx)} startIcon={<DeleteOutlineIcon />}>
                Remove
              </Button>
            )}
          </Box>

          <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Project Title <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
          <TextField
            fullWidth
            value={item.title}
            onChange={(e) => updatePortfolioItem(idx, 'title', e.target.value)}
            placeholder="e.g., E-commerce Mobile App Redesign"
            sx={{ mb: 2.5 }}
            InputProps={{ sx: { borderRadius: 2, bgcolor: '#FFF' } }}
          />

          <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Project URL or Link</Typography>
          <TextField
            fullWidth
            value={item.url}
            onChange={(e) => updatePortfolioItem(idx, 'url', e.target.value)}
            placeholder="https://github.com/myproject OR https://behance.net/sample"
            sx={{ mb: 2.5 }}
            InputProps={{
              sx: { borderRadius: 2, bgcolor: '#FFF' },
              startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: '#94A3B8' }} /></InputAdornment>
            }}
          />

          <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Short Description</Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={item.description}
            onChange={(e) => updatePortfolioItem(idx, 'description', e.target.value)}
            placeholder="Brief overview of tools used, role, or outcome..."
            InputProps={{ sx: { borderRadius: 2, bgcolor: '#FFF' } }}
          />
        </Paper>
      ))}

      {form.portfolio.length < 5 && (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => set('portfolio', [...form.portfolio, emptyPortfolioItem()])}
          sx={{ py: 1.5, borderRadius: 2.5, textTransform: 'none', fontWeight: 700, borderColor: '#1A1FE8', color: '#1A1FE8', '&:hover': { bgcolor: '#F4F5FF' } }}
        >
          Add Another Project ({form.portfolio.length}/5)
        </Button>
      )}
    </Box>
  );

  // Step 5 (SP Only): References
  const updateReferenceItem = (index: number, key: keyof ReferenceItem, val: string) => {
    const updated = [...form.references];
    updated[index] = { ...updated[index], [key]: val };
    set('references', updated);
  };

  const removeReferenceItem = (index: number) => {
    if (form.references.length <= 1) {
      toast.error('At least 1 reference is required for Service Provider verification.');
      return;
    }
    set('references', form.references.filter((_, i) => i !== index));
  };

  const referencesStep = (
    <Box key="step-references">
      <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>Step 3 — Provide a reference</Typography>
      <Typography variant="body2" color="#64748B" mb={3}>Provide 1–2 previous clients or project managers we may contact to verify your work.</Typography>

      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#FEF3C7', border: '1px solid #FDE68A', mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <PersonOutlineIcon sx={{ color: '#D97706', mt: 0.2 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A">Reference Verification Notice</Typography>
            <Typography variant="caption" color="#78350F" sx={{ lineHeight: 1.5, display: 'block' }}>
              Onlok reviews submitted evidence and may contact your reference before issuing the verified service badge. Please notify your client in advance.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {form.references.map((item, idx) => (
        <Paper elevation={0} key={idx} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#F8FAFC', mb: 3, position: 'relative' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Chip label={`Reference #${idx + 1}`} size="small" sx={{ fontWeight: 800, bgcolor: '#0F172A', color: '#FFF' }} />
            {form.references.length > 1 && (
              <Button size="small" color="error" onClick={() => removeReferenceItem(idx)} startIcon={<DeleteOutlineIcon />}>
                Remove
              </Button>
            )}
          </Box>

          <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Client / Reference Name <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
          <TextField
            fullWidth
            value={item.name}
            onChange={(e) => updateReferenceItem(idx, 'name', e.target.value)}
            placeholder="e.g., Johnathan Smith"
            sx={{ mb: 2.5 }}
            InputProps={{ sx: { borderRadius: 2, bgcolor: '#FFF' } }}
          />

          <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Role & Company / Organization <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
          <TextField
            fullWidth
            value={item.role}
            onChange={(e) => updateReferenceItem(idx, 'role', e.target.value)}
            placeholder="e.g., Head of Engineering at Acme Corp"
            sx={{ mb: 2.5 }}
            InputProps={{ sx: { borderRadius: 2, bgcolor: '#FFF' } }}
          />

          <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Contact (Email or Phone Number) <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
          <TextField
            fullWidth
            value={item.contact}
            onChange={(e) => updateReferenceItem(idx, 'contact', e.target.value)}
            placeholder="johnathan@acme.com or +234 800 123 4567"
            sx={{ mb: 2.5 }}
            InputProps={{ sx: { borderRadius: 2, bgcolor: '#FFF' } }}
          />

          <Typography variant="caption" fontWeight={700} color="#0F172A" mb={1} display="block">Project Details / Scope <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={item.project}
            onChange={(e) => updateReferenceItem(idx, 'project', e.target.value)}
            placeholder="Briefly describe the project completed for this client..."
            InputProps={{ sx: { borderRadius: 2, bgcolor: '#FFF' } }}
          />
        </Paper>
      ))}

      {form.references.length < 2 && (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => set('references', [...form.references, emptyReference()])}
          sx={{ py: 1.5, borderRadius: 2.5, textTransform: 'none', fontWeight: 700, borderColor: '#0F172A', color: '#0F172A', '&:hover': { bgcolor: '#F1F5F9' } }}
        >
          Add Second Reference ({form.references.length}/2)
        </Button>
      )}
    </Box>
  );

  // Documents Step
  const documentsStep = (
    <Box key="step-documents">
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

      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5} mt={3}>Business or Professional Registration</Typography>
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

      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5} mt={3}>Video Verification <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
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

      {/* Client Testimonials Upload Box */}
      <Typography variant="h6" fontWeight={800} color="#0F172A" mb={0.5} mt={4}>Client Testimonials (Optional)</Typography>
      <Typography variant="body2" color="#64748B" mb={2}>Provide screen recordings or proof of client feedback to boost your verification rating.</Typography>

      <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <ScreenshotMonitorIcon sx={{ color: '#0284C7', mt: 0.2 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#0F172A">Anti-Falsification Testimonial Requirement</Typography>
            <Typography variant="caption" color="#0369A1" sx={{ lineHeight: 1.5, display: 'block' }}>
              We accept screen recordings showing timestamp and date clearly visible (optionally with a daily story attached) to reduce falsification. Live client interaction or app dashboard video proof is highly recommended.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <FileUploadDropzone
        file={form.testimonial_file}
        uploadState={testimonialState}
        onChange={(f: File) => {
          set('testimonial_file', f);
          set('testimonial_url', '');
          setTestimonialState(initialFileState);
        }}
        onRemove={() => {
          set('testimonial_file', null);
          set('testimonial_url', '');
          setTestimonialState(initialFileState);
        }}
        title="Testimonial Screen Recording or Proof"
        labels={['Screen Recording (MP4/WebM)', 'Date & Timestamp Visible', 'Max 50MB']}
        accept="video/*,image/*,.mp4,.webm,.mov,.png,.jpg,.jpeg"
        maxSize="50MB"
        icon={<ScreenshotMonitorIcon />}
      />
    </Box>
  );

  // Review Step
  const reviewStep = (
    <Box key="step-review">
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
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Business & Account Details</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(1)}>Edit</Typography>
        </Box>
        <GridRow label="Account Type" value={form.account_type === 'vendor' ? 'Vendor / Business Owner' : form.account_type === 'service_provider' ? 'Service Provider' : 'Both (Vendor & Service Provider)'} />
        <GridRow label="Name/Role" value={form.business_name || '-'} />
        <GridRow label="Address" value={form.business_address || '-'} />
        {form.website_url && <GridRow label="Website" value={form.website_url} />}
      </Paper>

      {isSp && (
        <>
          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Service Details</Typography>
              <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(SP_STEP.SERVICE_INFO)}>Edit</Typography>
            </Box>
            <GridRow label="Category" value={form.service_category || '-'} />
            <GridRow label="Experience" value={form.years_experience ? `${form.years_experience} years` : '-'} />
            <GridRow label="Description" value={form.service_description || '-'} />
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Portfolio ({form.portfolio.length} projects)</Typography>
              <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(SP_STEP.PORTFOLIO)}>Edit</Typography>
            </Box>
            {form.portfolio.map((p, i) => (
              <GridRow key={i} label={`Project #${i + 1}`} value={`${p.title}${p.url ? ` (${p.url})` : ''}`} />
            ))}
          </Paper>

          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0F172A">References ({form.references.length})</Typography>
              <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(SP_STEP.REFERENCES)}>Edit</Typography>
            </Box>
            {form.references.map((r, i) => (
              <GridRow key={i} label={`Ref #${i + 1}`} value={`${r.name} (${r.role}) - ${r.contact}`} />
            ))}
          </Paper>
        </>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#F8FAFC', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0F172A">Documents</Typography>
          <Typography variant="caption" fontWeight={700} color="#1A1FE8" sx={{ cursor: 'pointer' }} onClick={() => setActiveStep(isSp ? SP_STEP.DOCUMENTS : V_STEP.DOCUMENTS)}>Edit</Typography>
        </Box>
        <FileReviewRow label="ID Document" file={form.gov_id_file} state={govIdState} />
        <FileReviewRow label="CAC Certificate" file={form.cac_file} state={cacState} />
        <FileReviewRow label="Verification Video" file={form.business_video_file} state={videoState} />
        <FileReviewRow label="Client Testimonial" file={form.testimonial_file} state={testimonialState} />
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
    </Box>
  );

  // Success Step
  const successStep = (
    <Box key="step-success">
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
    </Box>
  );

  const stepContent = isSp
    ? [personalStep, businessStep, serviceInfoStep, portfolioStep, referencesStep, documentsStep, reviewStep, successStep]
    : [personalStep, businessStep, documentsStep, reviewStep, successStep];

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

          {activeStep < steps.length && (
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

              {activeStep === reviewIdx ? (
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