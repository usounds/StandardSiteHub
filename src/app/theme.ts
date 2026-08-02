import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'var(--font-inter), sans-serif',
  primaryColor: 'brand',
  defaultRadius: 'md',
  colors: {
    brand: [
      '#e8f4ff',
      '#cfe8ff',
      '#9dd0ff',
      '#69b7ff',
      '#3aa0ff',
      '#1185fe',
      '#006fdc',
      '#0056ad',
      '#004282',
      '#00315f',
    ],
  },
  primaryShade: { light: 6, dark: 5 },
  headings: {
    fontFamily: 'var(--font-inter), sans-serif',
    sizes: {
      h1: { fontSize: rem(42), fontWeight: '800', lineHeight: '1.08' },
      h2: { fontSize: rem(30), fontWeight: '750', lineHeight: '1.2' },
      h3: { fontSize: rem(22), fontWeight: '700', lineHeight: '1.25' },
      h4: { fontSize: rem(20), fontWeight: '600' },
    },
  },
  components: {
    Button: {
      defaultProps: {
        fw: 600,
        radius: 'md',
      },
      styles: {
        root: {
          boxShadow: '0 0 28px color-mix(in srgb, var(--app-brand) 28%, transparent)',
        },
      },
    },
    Card: {
      defaultProps: {
        shadow: 'none',
        radius: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          borderColor: 'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))',
        },
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'none',
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    FileInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Autocomplete: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
