import { useState, useCallback } from 'react';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import GppBadIcon from '@mui/icons-material/GppBad';
import CategoryIcon from '@mui/icons-material/Category';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Box, Container, Typography, TextField, Button, Paper, Alert, InputAdornment, Checkbox, FormControlLabel } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { submitReport } from '../api/reports';
import Navbar from '../components/Navbar';
import type { ReportCategory } from '../types';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const categories: { value: ReportCategory; label: string; desc: string; icon: any }[] = [
  { value: 'fraud', label: 'Fraud', desc: 'Suspicious Financial Activity', icon: <MoneyOffIcon /> },
  { value: 'impersonation', label: 'Impersonation', desc: 'Claiming To Be Someone Else', icon: <FaceRetouchingNaturalIcon /> },
  { value: 'harassment', label: 'Harassment', desc: 'Repeated Unwanted Contact', icon: <VolumeOffIcon /> },
  { value: 'inaccurate_information', label: 'Inaccurate Info', desc: 'Misleading Profile Data', icon: <GppBadIcon /> },
  { value: 'others', label: 'Others', desc: 'Other violations', icon: <CategoryIcon /> },
];

export default function ReportPage() {
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(false);
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [context, setContext] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [], 'application/pdf': [], 'video/*': [] } });

  const handleSubmit = async () => {
    setError('');

    if (!vendorId.trim()) { setError('Please enter the Order/Vendor ID.'); return; }
    if (!email.trim()) { setError('Please enter your Contact Email.'); return; }
    if (!category) { setError('Please select a report category.'); return; }
    if (context.trim().length < 10) { setError('Please provide a detailed description (at least 10 characters).'); return; }
    if (!agreed) { setError('You must declare that the information provided is accurate.'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('reported_vendor_id', vendorId.trim());
      formData.append('category', category);
      formData.append('context', context);
      formData.append('contact_email', email);
      formData.append('phone_number', phone);
      formData.append('is_whatsapp', isWhatsapp.toString());
      
      files.forEach(file => {
        formData.append('evidence', file);
      });

      const response = await submitReport(formData);
      
      navigate('/report-success', { 
        state: { 
          reference_number: response.reference_number, 
          reported_vendor_id: vendorId, 
          category: category, 
          date: new Date().toLocaleString(),
          complainantName: 'Anonymous'
        } 
      });

    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit report. Please try again.');
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 }, pb: 10 }}>
        
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>Report User</Typography>
          <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.6, maxWidth: 500, mx: 'auto' }}>
            Identify And Report Behaviors That Violate Our Community Standards. This Report Is Secure And Confidential.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2, maxWidth: 800, mx: 'auto' }}>{error}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 4 }}>
          {categories.map((cat) => (
            <Paper
              key={cat.value}
              elevation={0}
              onClick={() => setCategory(cat.value)}
              sx={{
                p: 2, 
                borderRadius: 3, 
                border: '2px solid',
                borderColor: category === cat.value ? '#1A1FE8' : '#E2E8F0',
                bgcolor: category === cat.value ? '#F4F5FF' : '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                '&:hover': { borderColor: '#1A1FE8' }
              }}
            >
              <Box sx={{ color: category === cat.value ? '#1A1FE8' : '#64748B', mb: 1 }}>
                {cat.icon}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>{cat.label}</Typography>
            </Paper>
          ))}
        </Box>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, mb: 4 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>Order/Vendor ID *</Typography>
              <TextField
                fullWidth
                placeholder="E.G. OL-NG-00545"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                InputProps={{ sx: { borderRadius: 2, bgcolor: '#F8FAFC' } }}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>Your Email Address *</Typography>
              <TextField
                fullWidth
                placeholder="alex.johnson@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{ 
                  startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#94A3B8' }}/></InputAdornment>,
                  sx: { borderRadius: 2, bgcolor: '#F8FAFC' } 
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>Your Phone Number</Typography>
              <TextField
                fullWidth
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                InputProps={{ 
                  startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: '#94A3B8' }}/></InputAdornment>,
                  sx: { borderRadius: 2, bgcolor: '#F8FAFC' } 
                }}
              />
              <FormControlLabel
                control={<Checkbox checked={isWhatsapp} onChange={(e) => setIsWhatsapp(e.target.checked)} sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#25D366' }, py: 0.5 }} />}
                label={<Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>Is this number on WhatsApp?</Typography>}
                sx={{ mt: 0.5, ml: 0 }}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>Detailed Description *</Typography>
            <TextField
              fullWidth
              multiline
              rows={5}
              placeholder="Please provide a detailed description of the issue..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              InputProps={{ sx: { borderRadius: 2, bgcolor: '#F8FAFC' } }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>Evidence (Images, PDFs, Videos)</Typography>
            <Box 
              {...getRootProps()} 
              sx={{ 
                border: '2px dashed #CBD5E1', 
                borderRadius: 3, 
                p: 4, 
                textAlign: 'center',
                bgcolor: isDragActive ? '#F1F5F9' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: '#94A3B8' }
              }}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon sx={{ fontSize: 40, color: '#94A3B8', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>
                Drag & Drop files here, or click to browse
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
                Supports JPG, PNG, PDF, MP4 (Max 5 files)
              </Typography>
            </Box>
            {files.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {files.map((f, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F1F5F9', p: 1, pr: 2, borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#0F172A' }}>{f.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#EF4444', cursor: 'pointer', fontWeight: 700 }} onClick={() => removeFile(i)}>✕</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <FormControlLabel
            control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} sx={{ color: '#CBD5E1', '&.Mui-checked': { color: '#1A1FE8' } }} />}
            label={<Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>I hereby declare that the information provided is accurate to the best of my knowledge and understand that false reporting may lead to account suspension.</Typography>}
            sx={{ mb: 4, alignItems: 'flex-start' }}
          />

          <Button 
            fullWidth 
            onClick={handleSubmit}
            disabled={loading}
            variant="contained" 
            sx={{ bgcolor: '#1A1FE8', py: 2, borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '1.05rem', '&:hover': { bgcolor: '#1318C0' } }}
          >
            {loading ? 'Submitting...' : 'Submit Complaint >'}
          </Button>

        </Paper>
      </Container>
    </Box>
  );
}
