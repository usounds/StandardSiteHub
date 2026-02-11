import { Container, Group, Text, Anchor } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { IconBrandBluesky, IconBrandGithub } from '@tabler/icons-react';
import classes from './Footer.module.css';

export function Footer() {
    const t = useTranslations('Footer');

    return (
        <footer className={classes.footer}>
            <Container className={classes.inner} size="lg">
                <Text c="dimmed" size="sm">
                    {t('developed_by')}
                </Text>

                <Group gap="md" my="sm" wrap="nowrap">
                    <Anchor
                        href="https://bsky.app/profile/rito.blue"
                        target="_blank"
                        rel="noopener noreferrer"
                        c="dimmed"
                        style={{ display: "inline-flex", alignItems: "center" }}
                    >
                        <IconBrandBluesky size={20} stroke={1.5} />
                    </Anchor>

                    <Anchor
                        href="https://github.com/usounds/StandardSiteHub"
                        target="_blank"
                        rel="noopener noreferrer"
                        c="dimmed"
                        style={{ display: "inline-flex", alignItems: "center" }}
                    >
                        <IconBrandGithub size={20} stroke={1.5} />
                    </Anchor>
                </Group>
            </Container>
        </footer >
    );
}
