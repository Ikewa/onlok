import { Box, Container, Grid, Typography, Link, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', to: '/#how-it-works' },
      { label: 'Pricing', to: '/#pricing' },
      { label: 'Security', to: '/#security' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/#about' },
      { label: 'Contact', to: '/#contact' },
      { label: 'Blog', to: '/#blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/#privacy' },
      { label: 'Terms of Service', to: '/#terms' },
    ],
  },
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{ bgcolor: '#0A0E1A', color: 'rgba(255,255,255,0.75)', pt: 8, pb: 4, mt: 'auto' }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} mb={4}>
          <Grid item xs={12} md={4}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: '#fff', mb: 1.5, letterSpacing: '-0.03em' }}
            >
              Onlok
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: 280, lineHeight: 1.7 }}>
              The global standard for business verification. Build trust, reduce fraud, grow with confidence.
            </Typography>
          </Grid>
          {footerSections.map((section) => (
            <Grid item xs={6} md={2} key={section.title}>
              <Typography variant="overline" sx={{ color: '#fff', fontWeight: 700, letterSpacing: '0.1em' }}>
                {section.title}
              </Typography>
              <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {section.links.map((link) => (
                  <Link
                    key={link.label}
                    component={RouterLink}
                    to={link.to}
                    underline="none"
                    sx={{
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: '0.9rem',
                      transition: 'color 0.2s',
                      '&:hover': { color: '#fff' },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          © {new Date().getFullYear()} Onlok. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}
