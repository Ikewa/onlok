import { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/admin/login', { email, password });
      login(data);
      toast.success('Admin login successful!');
      navigate('/admin/verifications');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F4F5FA', fontFamily: 'Inter, sans-serif' }}>
      <Container maxWidth="xs">
        <Paper elevation={0} sx={{ p: 4, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', textAlign: 'center' }}>
          <Box sx={{ mb: 3, display: 'inline-block' }}>
            <Box sx={{ height: 45, width: 160, overflow: 'hidden', position: 'relative', mb: 0.5 }}>
              <Box component="img" src="/logo.png" alt="Onlok Logo" sx={{ width: '180%', height: 'auto', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </Box>
            <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 500, letterSpacing: '0.05em' }}>Admin Portal</Typography>
          </Box>

          <Typography variant="h5" fontWeight={700} color="#111827" mb={3} sx={{ fontSize: '1.4rem' }}>
            Admin Login
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Admin Email"
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#F3F4F6', '& fieldset': { border: 'none' }, fontSize: '0.88rem' } }}
            />
            <TextField
              fullWidth
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#F3F4F6', '& fieldset': { border: 'none' }, fontSize: '0.88rem' } }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: '#5B5FEC',
                color: '#FFFFFF',
                py: 1.25,
                mt: 1,
                borderRadius: '8px',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.92rem',
                '&:hover': { bgcolor: '#4F52D4' }
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
