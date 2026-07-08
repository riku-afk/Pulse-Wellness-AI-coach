import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Shield } from 'lucide-react-native';

const { width: SW } = require('react-native').Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

const LAST_UPDATED = 'July 8, 2026';

interface SectionProps {
    title: string;
    children: React.ReactNode;
    styles: ReturnType<typeof makeStyles>;
}

function Section({ title, children, styles }: SectionProps) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

export default function PrivacyPolicy() {
    const isDark = useColorScheme() === 'dark';
    const styles = makeStyles(isDark);
    const insets = useSafeAreaInsets();

    const P = ({ children }: { children: React.ReactNode }) => (
        <Text style={styles.body}>{children}</Text>
    );
    const B = ({ children }: { children: React.ReactNode }) => (
        <Text style={styles.bullet}>{'•'}  {children}</Text>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}
                    hitSlop={10}
                >
                    <ChevronLeft size={s(24)} color={isDark ? '#f8fafc' : '#0f172a'} />
                </Pressable>
                <Text style={styles.pageTitle}>Privacy Policy</Text>
                <View style={{ width: s(40) }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: s(20), paddingBottom: insets.bottom + s(40) }}
            >
                <View style={styles.heroRow}>
                    <Shield size={s(18)} color="#0ea5e9" />
                    <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>
                </View>

                <P>
                    Pulse is a personal wellness companion. Your mood, sleep, and journal are
                    some of the most private things you can record, and this policy explains
                    plainly what the app collects, where it goes, and what never leaves your phone.
                </P>

                <Section title="What we collect" styles={styles}>
                    <B>Account: your email address and a password (managed by Firebase Authentication — we never see or store your password itself).</B>
                    <B>Profile: your name, age, gender, and an optional profile photo.</B>
                    <B>Daily check-ins: your mood rating, sleep duration, and the wellness score computed from them.</B>
                    <B>Journal entries: the text you write and the optional mood tag.</B>
                    <B>Notifications: a device push token, used only to send the reminders you enable.</B>
                    <B>Preferences: settings such as reminder times and your AI engine choice.</B>
                </Section>

                <Section title="Where your data is stored" styles={styles}>
                    <P>
                        Your data is stored in Google Firebase (Firestore database, Firebase Storage
                        for profile photos, Firebase Authentication for your account), protected by
                        access rules so only your signed-in account can read it. The app also keeps
                        a local copy of recent data on your device so it works offline.
                    </P>
                </Section>

                <Section title="How AI processing works" styles={styles}>
                    <B>On-device AI (free plan): the AI model runs entirely on your phone. Your check-ins and journal text are processed locally and are never sent to any AI provider.</B>
                    <B>Cloud AI: your recent check-in numbers (mood, sleep, scores) are sent to our AI providers (such as Groq or Google Gemini) solely to generate your coaching responses.</B>
                    <B>Journal-aware AI is opt-in: excerpts from your recent journal entries are included in AI processing only while the "Journal-aware AI" setting is turned on. You can turn it off at any time in Settings.</B>
                </Section>

                <Section title="What we don't do" styles={styles}>
                    <B>We don't sell your data or share it with advertisers.</B>
                    <B>We don't show ads.</B>
                    <B>We don't use third-party analytics or tracking.</B>
                    <B>We don't use your data to train AI models.</B>
                </Section>

                <Section title="Notifications" styles={styles}>
                    <P>
                        If you enable reminders, a push token for your device is stored so we can
                        deliver them. Logging out or disabling notifications removes it. Reminder
                        history in the app is automatically deleted after 14 days.
                    </P>
                </Section>

                <Section title="Your control & deletion" styles={styles}>
                    <B>You can edit your profile, journal entries, and preferences in the app at any time.</B>
                    <B>You can delete the downloaded AI model from Settings to free storage.</B>
                    <B>To delete your account and all associated data, contact us at the email below and we'll process it promptly.</B>
                </Section>

                <Section title="Security" styles={styles}>
                    <P>
                        All data travels over encrypted connections (HTTPS/TLS). Access to stored
                        data requires your authenticated session.
                    </P>
                </Section>

                <Section title="Children" styles={styles}>
                    <P>Pulse is not directed at children under 13, and we do not knowingly collect data from them.</P>
                </Section>

                <Section title="Changes & contact" styles={styles}>
                    <P>
                        If this policy changes, the "Last updated" date above will change with it.
                        Questions or deletion requests: jerald.punzalan@itbs.com.ph
                    </P>
                </Section>
            </ScrollView>
        </View>
    );
}

const makeStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: s(16), paddingBottom: s(16),
    },
    backBtn: {
        width: s(40), height: s(40), borderRadius: s(20),
        backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
        justifyContent: 'center', alignItems: 'center',
    },
    pageTitle: { fontSize: s(20), fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(14) },
    updated: { fontSize: s(12.5), fontWeight: '600', color: isDark ? '#64748b' : '#94a3b8' },
    section: { marginTop: s(22) },
    sectionTitle: {
        fontSize: s(15), fontWeight: '700', marginBottom: s(8),
        color: isDark ? '#f8fafc' : '#0f172a',
    },
    body: { fontSize: s(13.5), lineHeight: s(21), color: isDark ? '#94a3b8' : '#475569' },
    bullet: {
        fontSize: s(13.5), lineHeight: s(21), marginBottom: s(6),
        color: isDark ? '#94a3b8' : '#475569',
    },
});
