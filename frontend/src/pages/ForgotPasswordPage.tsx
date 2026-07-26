import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Alert, CircularProgress, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await forgotPassword(email);
      setSuccess(true);
      toast.success(response.message || 'If an account exists, an email was sent.');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to process request. Please try again.';
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
        Forgot Password
      </Typography>
      <Typography variant="body1" sx={{ color: '#64748B', mb: 5, textAlign: 'center' }}>
        Enter your email to receive a password reset link
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
          {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>If that email is in our system, a reset link has been sent.</Alert>}

          {!success ? (
            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B', mb: 1 }}>
                  Email Address
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
              </Button>
            </Box>
          ) : (
            <Button
              component={RouterLink}
              to="/login"
              fullWidth
              variant="outlined"
              size="large"
              sx={{ 
                py: 2, 
                borderRadius: 3,
                fontWeight: 700, 
                fontSize: '1rem',
                textTransform: 'none',
              }}
            >
              Return to Login
            </Button>
          )}
        </Paper>

        <Typography variant="body2" textAlign="center" mt={4} color="#64748B">
          Remember your password?{' '}
          <Box
            component={RouterLink}
            to="/login"
            sx={{ color: '#1A1FE8', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Sign In
          </Box>
        </Typography>
      </Container>
    </Box>
  );
}
