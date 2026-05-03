import { MantineProvider } from '@mantine/core';
import { AuthProvider } from '@/lib/auth-context';
import { theme } from '../theme';

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
        <MantineProvider theme={theme} forceColorScheme="dark">
            <AuthProvider>
                {children}
            </AuthProvider>
        </MantineProvider>
    );
}
