import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Avatar, CircularProgress, Alert,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadProfilePicture } from '../api/auth';
import toast from 'react-hot-toast';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB client-side guard
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');

export default function ProfilePictureUpdatePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();
  const currentAvatarSrc = user?.profile_picture_url
    ? `${API_BASE}${user.profile_picture_url}`
    : undefined;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess(false);

    // Client-side MIME check
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are accepted.');
      return;
    }

    // Client-side size guard — fail fast before wasting bandwidth
    if (file.size > MAX_FILE_BYTES) {
      setError('Image must be smaller than 5 MB.');
      return;
    }

    // Generate a local preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setSelectedFile(file);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');

    try {
      const { profile_picture_url } = await uploadProfilePicture(selectedFile);
      updateUser({ profile_picture_url });
      setSuccess(true);
      setSelectedFile(null);
      // Replace preview with the actual server URL so it's consistent
      setPreview(`${API_BASE}${profile_picture_url}`);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to upload picture. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedFile, updateUser]);

  const handlePickFile = () => {
    // Clear the input value so re-selecting the same file still triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2.5, pt: 2.5, pb: 8 }}>

        {/* Back */}
        <Button
          onClick={() => navigate(-1)}
          startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 14 }} />}
          sx={{
            textTransform: 'none',
            color: '#475569',
            fontWeight: 600,
            fontSize: '0.9rem',
            pl: 0,
            mb: 2,
            '&:hover': { bgcolor: 'transparent', color: '#1A1FE8' },
          }}
        >
          Back
        </Button>

        {/* Heading */}
        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A', mb: 0.5 }}>
          Update Profile Picture
        </Typography>
        <Typography sx={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, mb: 4 }}>
          Upload a clear photo so customers can easily recognise your business. Images are automatically resized to 400×400 px.
        </Typography>

        {/* Avatar Preview */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Avatar
              src={preview ?? currentAvatarSrc}
              sx={{
                width: 140,
                height: 140,
                fontSize: '2.8rem',
                fontWeight: 800,
                bgcolor: '#334155',
                border: '4px solid #E2E8F0',
                boxShadow: '0 4px 24px rgba(26,31,232,0.10)',
              }}
            >
              {initials}
            </Avatar>

            {/* Camera overlay button */}
            <Box
              onClick={handlePickFile}
              sx={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 36,
                height: 36,
                bgcolor: '#1A1FE8',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'scale(1.1)', bgcolor: '#1318C0' },
              }}
            >
              <CameraAltIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
          </Box>

          <Typography sx={{ fontSize: '0.8rem', color: '#94A3B8', textAlign: 'center' }}>
            Click the camera icon or the button below to choose a photo
          </Typography>
        </Box>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Error alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Success alert */}
        {success && !selectedFile && (
          <Alert
            severity="success"
            icon={<CheckCircleOutlineIcon />}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            Profile picture updated successfully!
          </Alert>
        )}

        {/* File info */}
        {selectedFile && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            mb: 2,
            bgcolor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 2,
          }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A', noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.name}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                {(selectedFile.size / 1024).toFixed(0)} KB · Ready to upload
              </Typography>
            </Box>
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handlePickFile}
            disabled={loading}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              py: 1.3,
              borderColor: '#1A1FE8',
              color: '#1A1FE8',
              '&:hover': { bgcolor: '#EEF2FF', borderColor: '#1318C0' },
            }}
          >
            Choose Photo
          </Button>

          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={!selectedFile || loading}
            startIcon={loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : undefined}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              py: 1.3,
              bgcolor: '#1A1FE8',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#1318C0', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: '#C7D2FE', color: '#fff' },
            }}
          >
            {loading ? 'Uploading…' : 'Save Profile Picture'}
          </Button>
        </Box>

        {/* Guidelines */}
        <Box sx={{ mt: 4, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#0F172A', mb: 1 }}>
            Photo Guidelines
          </Typography>
          {[
            'Use a clear, well-lit photo of your face or business logo.',
            'Accepted formats: JPEG, PNG, WebP.',
            'Maximum file size: 5 MB.',
            'Image will be cropped and resized to 400×400 px automatically.',
          ].map((tip) => (
            <Box key={tip} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8, mb: 0.5 }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#1A1FE8', mt: 0.8, flexShrink: 0 }} />
              <Typography sx={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>{tip}</Typography>
            </Box>
          ))}
        </Box>

      </Box>
    </Box>
  );
}
