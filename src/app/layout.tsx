import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable} data-mantine-color-scheme="dark">
      <body>{children}</body>
    </html>
  );
}
