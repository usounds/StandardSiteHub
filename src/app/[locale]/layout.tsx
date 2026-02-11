import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/lib/auth-context';
import { Shell } from '@/components/Shell';

export const metadata = {
  title: 'SSH',
  description: 'Manage your standard sites and articles',
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <MantineProvider>
            <Notifications />
            <AuthProvider>
              <Shell>
                {children}
              </Shell>
            </AuthProvider>
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
