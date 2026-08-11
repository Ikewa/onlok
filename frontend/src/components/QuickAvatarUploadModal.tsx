import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Avatar,
  IconButton,
  CircularProgress,
  Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useAuth } from '../context/AuthContext';
import { uploadProfilePicture } from '../api/auth';
import toast from 'react-hot-toast';

interface QuickAvatarUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickAvatarUploadModal({ open, onClose }: QuickAvatarUploadModalProps) {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000');
  const currentAvatarSrc = user?.profile_picture_url ? `${API_BASE}${user.profile_picture_url}` : undefined;
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP image files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const result = await uploadProfilePicture(selectedFile);
      
      // Force cache bust query string
      const updatedUrl = `${result.profile_picture_url}?t=${Date.now()}`;
      updateUser({ profile_picture_url: updatedUrl });

      toast.success('Profile picture updated successfully!');
      handleClear();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={uploading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" fontWeight={800} color="#0F172A">
          Update Profile Picture
        </Typography>
        <IconButton onClick={onClose} disabled={uploading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="#64748B" mb={3}>
          Upload a clear headshot or business logo. Changes take effect immediately.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            src={previewUrl || currentAvatarSrc}
            sx={{
              width: 110,
              height: 110,
              fontSize: '2.5rem',
              fontWeight: 800,
              bgcolor: '#1E293B',
              border: '3px solid #1A1FE8',
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              mb: 2
            }}
          >
            {initials}
          </Avatar>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
          />

          <Button
            variant="outlined"
            startIcon={<PhotoCameraIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{
              borderRadius: '20px',
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#CBD5E1',
              color: '#0F172A',
              '&:hover': { borderColor: '#1A1FE8', bgcolor: '#F8FAFC' }
            }}
          >
            {selectedFile ? 'Choose Different Image' : 'Select Photo'}
          </Button>

          {selectedFile && (
            <Typography variant="caption" color="#10B981" fontWeight={700} mt={1}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={uploading} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
          sx={{
            bgcolor: '#1A1FE8',
            color: '#fff',
            borderRadius: '20px',
            px: 3,
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: '#1318C0' }
          }}
        >
          {uploading ? 'Uploading...' : 'Save Picture'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
