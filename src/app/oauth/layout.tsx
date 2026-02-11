import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
    title: 'OAuth Processing',
    description: 'Authentication in progress...',
};

export default function OAuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <ColorSchemeScript />
            </head>
            <body>
                <MantineProvider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </MantineProvider>
            </body>
        </html>
    );
}
