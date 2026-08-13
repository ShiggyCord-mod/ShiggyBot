import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    primaryContainer: string;
    onPrimaryContainer: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
  }
  interface PaletteOptions {
    primaryContainer?: string;
    onPrimaryContainer?: string;
    surfaceContainerLow?: string;
    surfaceContainer?: string;
    surfaceContainerHigh?: string;
  }
}

const EASE_OUT = 'cubic-bezier(0, 0, 0.2, 1)';

export const theme = createTheme({
  cssVariables: true,
  defaultColorScheme: 'dark',
  colorSchemes: {
    light: {
      palette: {
        primaryContainer: '#D8E2FF',
        onPrimaryContainer: '#001A41',
        surfaceContainerLow: '#F7F8FA',
        surfaceContainer: '#ECEEF1',
        surfaceContainerHigh: '#E6E8EC',
      },
    },
    dark: {
      palette: {
        primaryContainer: '#D8E2FF',
        onPrimaryContainer: '#001A41',
        surfaceContainerLow: '#1E2022',
        surfaceContainer: '#24272A',
        surfaceContainerHigh: '#2A2D31',
      },
    },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600, letterSpacing: '-0.01em' },
    body1: { lineHeight: 1.5 },
    body2: { lineHeight: 1.5 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          scrollbarGutter: 'stable',
        },
        'h1, h2, h3, h4, h5, h6': {
          textWrap: 'balance',
        },
        body: {
          textWrap: 'pretty',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: '0.01ms !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          backgroundImage: 'none',
          transition: `background-color 200ms ${EASE_OUT}, border-color 200ms ${EASE_OUT}`,
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          transition: `transform 150ms ${EASE_OUT}, background-color 200ms ${EASE_OUT}, box-shadow 200ms ${EASE_OUT}, border-color 200ms ${EASE_OUT}`,
          '&:active': { transform: 'scale(0.97)' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: `transform 150ms ${EASE_OUT}, background-color 200ms ${EASE_OUT}, color 200ms ${EASE_OUT}`,
          '&:active': { transform: 'scale(0.94)' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: `background-color 200ms ${EASE_OUT}, color 200ms ${EASE_OUT}`,
          '&.Mui-selected': {
            backgroundColor: 'surfaceContainer',
            color: 'text.primary',
            '&:hover': { backgroundColor: 'surfaceContainer' },
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          transition: `background-color 200ms ${EASE_OUT}`,
        },
      },
    },
  },
});
