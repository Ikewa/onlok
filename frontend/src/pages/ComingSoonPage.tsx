import { Box, Container, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function ComingSoonPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', py: 12 }}>
        <Box 
          sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            bgcolor: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            mb: 4,
            mx: 'auto'
          }}
        >
          🚀
        </Box>
        <Typography variant="h3" fontWeight={800} sx={{ color: '#1E293B', mb: 2, letterSpacing: '-0.02em' }}>
          Coming Soon
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748B', mb: 6, fontSize: '1.1rem' }}>
          We're working hard to bring this feature to you. Stay tuned for updates!
        </Typography>
        <Button 
          component={RouterLink} 
          to="/" 
          variant="contained" 
          size="large"
          sx={{ 
            borderRadius: 10, 
            px: 6, 
            py: 1.5,
            bgcolor: '#1A1FE8',
            textTransform: 'none',
            fontWeight: 700,
            '&:hover': { bgcolor: '#0F14B0' }
          }}
        >
          Back to Home
        </Button>
      </Container>
    </Box>
  );
}
