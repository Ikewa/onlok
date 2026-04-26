import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1A1FE8',      // Onlok deep royal blue
      light: '#4B50F0',
      dark: '#0F14B0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00C8CC',      // Teal/cyan accent (Sign In button in mockup)
      light: '#33D5D9',
      dark: '#008C8F',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E53935',      // Red for Report button
    },
    background: {
      default: '#F4F6FF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0A0E1A',
      secondary: '#5A6072',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50,         // Pill-shaped buttons as per mockup
          padding: '12px 28px',
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(26, 31, 232, 0.25)',
          },
        },
        sizeLarge: {
          padding: '14px 36px',
          fontSize: '1.05rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 50,
            backgroundColor: '#FAFBFF',
            paddingLeft: '8px',
          },
          '& .MuiInputBase-input': {
            padding: '14px 20px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#0A0E1A',
          boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
        },
      },
    },
  },
});

export default theme;
