import { useState, useEffect } from 'react';
import { Box, Container, Paper, CircularProgress } from '@mui/material';
import Navbar from '../components/Navbar';

export default function TermsAndConditionsPage() {
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch('/legal/terms.html')
      .then(res => res.text())
      .then(html => setContent(html))
      .catch(err => console.error("Error loading terms:", err));
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 8, flexGrow: 1 }}>
        <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
          {!content ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                fontFamily: 'Inter, sans-serif',
                '& p': { mb: 2, color: '#334155', lineHeight: 1.7 },
                '& h1, & h2, & h3, & h4, & h5': { fontWeight: 800, color: '#0F172A', mt: 4, mb: 2 },
                '& ul': { pl: 3, mb: 2, color: '#334155', listStyleType: 'disc' },
                '& li': { mb: 1 },
                '& strong': { color: '#0F172A' },
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </Paper>
      </Container>
    </Box>
  );
}
