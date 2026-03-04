'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C4DFF',
      light: '#B47CFF',
      dark: '#5C35CC',
    },
    secondary: {
      main: '#00BCD4',
      light: '#62EFFF',
      dark: '#008BA3',
    },
    background: {
      default: '#0A0E1A',
      paper: '#121829',
    },
    text: {
      primary: '#E8EAED',
      secondary: '#9AA0A6',
    },
    error: {
      main: '#FF5252',
    },
    success: {
      main: '#69F0AE',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '12px 24px',
          fontSize: '1rem',
          borderRadius: 12,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #7C4DFF 0%, #448AFF 100%)',
          boxShadow: '0 4px 20px rgba(124, 77, 255, 0.4)',
          '&:hover': {
            background: 'linear-gradient(135deg, #9C6FFF 0%, #648FFF 100%)',
            boxShadow: '0 6px 28px rgba(124, 77, 255, 0.55)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.04)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.07)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(124,77,255,0.08)',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          background:
            'linear-gradient(145deg, rgba(18,24,41,0.9) 0%, rgba(18,24,41,0.7) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(124,77,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
      },
    },
  },
});

export default theme;
