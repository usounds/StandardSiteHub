import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'var(--font-inter), sans-serif',
  primaryColor: 'indigo',
  defaultRadius: 'md',
  colors: {
    // Custom brand colors
    brand: [
      '#f3f4f6',
      '#e5e7eb',
      '#d1d5db',
      '#9ca3af',
      '#6b7280',
      '#4b5563',
      '#374151',
      '#1f2937',
      '#111827',
      '#030712',
    ],
  },
  headings: {
    fontFamily: 'var(--font-inter), sans-serif',
    sizes: {
      h1: { fontSize: rem(36), fontWeight: '800' },
      h2: { fontSize: rem(30), fontWeight: '700' },
      h3: { fontSize: rem(24), fontWeight: '600' },
      h4: { fontSize: rem(20), fontWeight: '600' },
    },
  },
  components: {
    Button: {
      defaultProps: {
        fw: 600,
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
      },
      styles: {
        root: {
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 'var(--mantine-shadow-md)',
          },
        },
      },
    },
    Paper: {
      defaultProps: {
        shadow: 'sm',
      },
    },
  },
});
