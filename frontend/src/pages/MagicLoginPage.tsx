import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function MagicLoginPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth(); // Auth context login function

  useEffect(() => {
    const handleMagicLogin = async () => {
      if (!token) {
        toast.error('Invalid magic link.');
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/magic-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          // Manually update localStorage and AuthContext
          localStorage.setItem('onlok_token', data.token);
          localStorage.setItem('onlok_user', JSON.stringify(data));
          
          // Re-load the page to trigger AuthContext initialization or directly redirect
          window.location.href = '/dashboard/subscription';
        } else {
          toast.error(data.message || 'Magic link expired or invalid.');
          navigate('/login');
        }
      } catch (err) {
        console.error('Magic login error:', err);
        toast.error('Failed to log in. Please try again.');
        navigate('/login');
      }
    };

    handleMagicLogin();
  }, [token, navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#F9FAFB' }}>
      <CircularProgress sx={{ color: '#0029FF', mb: 2 }} />
      <Typography variant="h6" color="#4B5563">Authenticating...</Typography>
    </Box>
  );
}
