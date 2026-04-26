import { useState } from 'react';
import {
  Box, Container, Typography, TextField, Button, Checkbox,
  FormControlLabel, Alert, CircularProgress, Paper, InputAdornment, IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/auth';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [vendorId, setVendorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await loginUser({ vendor_id: vendorId.trim(), password });
      login(user);
      toast.success(`Welcome back, ${user.first_name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 8,
        pb: 4
      }}
    >
      {/* Brand Logo */}
      <RouterLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
        <Box 
          sx={{ 
            height: 100, 
            width: 400, 
            overflow: 'hidden',
            position: 'relative',
            mb: 4
          }}
        >
          <Box 
            component="img"
            src="/logo.png"
            alt="Onlok Logo"
            sx={{ 
              width: '180%', 
              height: 'auto',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }} 
          />
        </Box>
      </RouterLink>

      <Typography variant="h3" fontWeight={800} sx={{ color: '#1E293B', mb: 1.5, letterSpacing: '-0.02em' }}>
        Welcome back
      </Typography>
      <Typography variant="body1" sx={{ color: '#64748B', mb: 5 }}>
        Sign in to your ONLOK account
      </Typography>

      <Container maxWidth="sm">
        <Paper 
          elevation={0} 
          sx={{ 
            p: 5, 
            borderRadius: 6, 
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}
        >
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 3.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B', mb: 1 }}>
                Onlok ID
              </Typography>
              <TextField
                fullWidth
                placeholder="example OL-NG-00545"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: '#fff'
                  }
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Password
                </Typography>
                <Typography 
                  component={RouterLink} 
                  to="/forgot-password" 
                  variant="caption" 
                  sx={{ color: '#1A1FE8', textDecoration: 'none', fontWeight: 600 }}
                >
                  Forgot password?
                </Typography>
              </Box>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: '#fff'
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small">
                        {showPassword ? <VisibilityOffIcon sx={{ fontSize: 20 }} /> : <VisibilityIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  color="primary"
                  size="small"
                  sx={{ color: '#CBD5E1' }}
                />
              }
              label={<Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Keep Me Signed In</Typography>}
              sx={{ mb: 4 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              endIcon={!loading && <Box sx={{ ml: 1 }}>→</Box>}
              sx={{ 
                py: 2, 
                borderRadius: 3, 
                bgcolor: '#1A1FE8', 
                fontWeight: 700, 
                fontSize: '1rem',
                textTransform: 'none',
                '&:hover': { bgcolor: '#0F14B0' }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>

        <Typography variant="body2" textAlign="center" mt={4} color="#64748B">
          Don't have an account?{' '}
          <Box
            component={RouterLink}
            to="/register"
            sx={{ color: '#1A1FE8', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Get Verified
          </Box>
        </Typography>
      </Container>
    </Box>
  );
}
