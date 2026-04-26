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
      // The AuthContext login method just stores user state and token, it works for any user type.
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
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC' }}>
      <Container maxWidth="xs">
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Box sx={{ mb: 4, display: 'inline-block' }}>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1, color: '#1A1FE8' }}>
              <Box component="span" sx={{ position: 'relative', width: 24, height: 24, bgcolor: '#1A1FE8', borderRadius: '50%', display: 'inline-block' }}>
                <Box sx={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '50%', bgcolor: '#0EA5E9', borderTopRightRadius: '100%' }} />
              </Box>
              nlok
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Admin Portal</Typography>
          </Box>

          <Typography variant="h5" fontWeight={800} color="#0F172A" mb={3}>
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              label="Password"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                bgcolor: '#1A1FE8',
                color: '#fff',
                py: 1.5,
                mt: 1,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': { bgcolor: '#0F14B0' }
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
