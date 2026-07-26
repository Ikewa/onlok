import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Alert, CircularProgress, Paper, FormControlLabel, Switch } from '@mui/material';
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and symbol.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(token, password);
      toast.success(response.message || 'Password reset successfully.');
      navigate('/login');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to reset password. Token may be expired.';
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

      <Typography variant="h3" fontWeight={800} sx={{ color: '#1E293B', mb: 1.5, letterSpacing: '-0.02em', textAlign: 'center' }}>
        Reset Password
      </Typography>
      <Typography variant="body1" sx={{ color: '#64748B', mb: 5, textAlign: 'center' }}>
        Enter your new password below
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
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B', mb: 1 }}>
                New Password
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
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
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B', mb: 1 }}>
                Confirm Password
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            <FormControlLabel
              control={<Switch checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} color="primary" size="small" />}
              label={<Typography variant="body2" sx={{ color: '#475569', fontWeight: 600 }}>Show Passwords</Typography>}
              sx={{ mb: 4 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
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
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
